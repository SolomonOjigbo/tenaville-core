import type { Ctx, OrgCtx } from './context';
import { seedOrganisation, seedOrganisationWideAssignments } from './steps/01-organisations';
import { seedPortfolio } from './steps/02-portfolio';
import { seedTenancy } from './steps/03-tenancy';
import { confirmPayments, seedPayments, seedRemittances, seedReversals, seedStatements } from './steps/04-money';
import { seedMaintenance } from './steps/05-maintenance';
import { seedBilling, seedOperations } from './steps/06-operations';

const seedOne = async (ctx: Ctx, org: OrgCtx): Promise<void> => {
  await seedOrganisation(ctx, org);
  await seedOrganisationWideAssignments(ctx, org);
  await seedPortfolio(ctx, org);
  await seedTenancy(ctx, org);
  await seedPayments(ctx, org);
  const reversed = await seedReversals(ctx, org);
  await confirmPayments(ctx, org, reversed);
  // Maintenance before remittances and statements: repair costs post to the ledger.
  await seedMaintenance(ctx, org);
  if (org.spec.landlords.some((l) => l.mandate !== undefined)) {
    await seedRemittances(ctx, org);
    await seedStatements(ctx, org);
  }
  await seedOperations(ctx, org);
  await seedBilling(ctx, org);
};

export const runSeed = async (ctx: Ctx): Promise<void> => {
  // Sequential on purpose: reproducible receipt numbers, gentle on auth rate limits.
  for (const org of ctx.orgs) await seedOne(ctx, org);
  printSummary(ctx);
};

const printSummary = (ctx: Ctx): void => {
  console.log('\n══════════════ DEMO DATA READY ══════════════');
  for (const org of ctx.orgs) {
    console.log(`\n${org.spec.name}  (${org.spec.plan})`);
    console.log(`  ${org.spec.story}`);
    console.log(`  rows: ${Object.entries(org.stats).map(([k, v]) => `${k}=${v}`).join('  ')}`);
    console.log('  logins (password = SEED_DEMO_PASSWORD):');
    for (const p of org.people.values()) {
      console.log(`    ${p.role.padEnd(24)} ${p.email}`);
    }
  }
};
