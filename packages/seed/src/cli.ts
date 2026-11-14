import { createAdminClient } from '@tenaville/db';

import type { Ctx, OrgCtx } from './context';
import { readEnv } from './env';
import { supabaseIdentity, type Identity } from './identity';
import { lagosToday } from './lib/dates';
import { log } from './lib/log';
import { Rng } from './lib/rng';
import { runSeed } from './run';
import { NameFactory } from './world/pools';
import { ORGS } from './world';

const KNOWN_FIXTURE_ORGS = ['Lagos Lettings', 'Abuja Estates'];

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};
const flag = (name: string): boolean => process.argv.includes(`--${name}`);

const main = async (): Promise<void> => {
  const envFile = arg('env-file');
  if (envFile !== undefined) process.loadEnvFile(envFile);

  const env = readEnv(arg('confirm-project-ref'));
  const only = arg('only');
  const specs = ORGS.filter((o) => only === undefined || o.key === only);
  if (specs.length === 0) throw new Error(`--only ${only}: no such organisation`);

  log.info(`target: ${env.isLocal ? 'local' : `hosted project ${env.projectRef}`}`);
  const admin = createAdminClient('seed-demo');

  // Refuse to run twice, and refuse to mix demo data into a database that holds real tenants.
  const existing = await admin.from('organisations').select('name');
  if (existing.error !== null) throw new Error(`cannot read organisations: ${existing.error.message}`);
  const names = (existing.data ?? []).map((o) => o.name);
  const demoNames = ORGS.map((o) => o.name);
  const clash = names.filter((n) => demoNames.includes(n));
  if (clash.length > 0) {
    throw new Error(
      `Already seeded (${clash.join(', ')}). Reset first with packages/seed/sql/reset-demo.sql, or run against a fresh project.`,
    );
  }
  const foreign = names.filter((n) => !demoNames.includes(n) && !KNOWN_FIXTURE_ORGS.includes(n));
  if (foreign.length > 0 && !flag('allow-existing-data')) {
    throw new Error(
      `The database already holds other organisations (${foreign.slice(0, 3).join(', ')}…). ` +
        'Demo data should go into an empty staging project. Pass --allow-existing-data to override.',
    );
  }

  if (flag('dry-run')) {
    log.info('dry run: guards passed; nothing written');
    for (const spec of specs) log.info(`would seed ${spec.name} — ${spec.story}`);
    return;
  }

  const identity: Identity = supabaseIdentity(admin, env.url, env.anonKey, env.password);
  const rng = new Rng(env.seed);
  const ctx: Ctx = {
    env, identity, admin, today: process.env.SEED_TODAY ?? lagosToday(), rng,
    names: new NameFactory(rng.fork('names')), orgs: [], phoneSerial: 0,
  };
  const orgs: OrgCtx[] = specs.map((spec) => ({
    spec, rng: rng.fork(spec.key), id: '', people: new Map(), branchIds: new Map(),
    landlordIds: new Map(), landlordUserIds: new Map(), propertyIds: new Map(),
    units: [], tenants: [], leases: [], payments: [], vendorIds: [], stats: {},
  }));
  ctx.orgs.push(...orgs);
  for (const org of orgs) for (const s of org.spec.staff) ctx.names.reserve(s.name);
  for (const org of orgs) for (const l of org.spec.landlords) ctx.names.reserve(l.name);

  const started = Date.now();
  await runSeed(ctx);
  log.info(`done in ${Math.round((Date.now() - started) / 1000)}s`);
};

main().catch((error: unknown) => {
  console.error(`\nSeed failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
