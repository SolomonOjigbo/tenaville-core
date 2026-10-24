#!/usr/bin/env node
/**
 * Keeps PRD requirements, the traceability matrix and the repo layout in sync.
 *
 * Fails when:
 *   1. A requirement ID in the PRD is missing from docs/requirements/requirements.json.
 *   2. requirements.json lists an ID the PRD no longer contains.
 *   3. A priority differs between the PRD and requirements.json.
 *   4. requirements.json and traceability.md disagree on which IDs exist.
 *   5. A module path named as an owner does not exist on disk.
 *
 * Run: node tools/check-traceability.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const prdPath = join(root, 'docs/prd/Tenaville_Property_Management_PRD_v3.md');
const jsonPath = join(root, 'docs/requirements/requirements.json');
const mdPath = join(root, 'docs/requirements/traceability.md');

const errors = [];
const read = (p, label) => {
  if (!existsSync(p)) {
    errors.push(`missing ${label}: ${p.replace(`${root}/`, '')}`);
    return null;
  }
  return readFileSync(p, 'utf8');
};

const prd = read(prdPath, 'PRD');
const jsonRaw = read(jsonPath, 'requirements.json');
const md = read(mdPath, 'traceability.md');

if (prd && jsonRaw && md) {
  // 1-3: PRD vs requirements.json
  const prdReqs = new Map();
  for (const line of prd.split('\n')) {
    const m = /^- \*\*([A-Z]+-\d+) \(P(\d)\):\*\*/.exec(line.trim());
    if (m) prdReqs.set(m[1], `P${m[2]}`);
  }
  const tracked = JSON.parse(jsonRaw);
  const trackedById = new Map(tracked.map((r) => [r.id, r]));

  for (const [id, pri] of prdReqs) {
    const r = trackedById.get(id);
    if (!r) errors.push(`${id} is in the PRD but not in requirements.json`);
    else if (r.pri !== pri)
      errors.push(`${id} priority mismatch: PRD says ${pri}, requirements.json says ${r.pri}`);
  }
  for (const id of trackedById.keys()) {
    if (!prdReqs.has(id)) errors.push(`${id} is in requirements.json but no longer in the PRD`);
  }

  // 4: requirements.json vs traceability.md table rows
  const inMarkdown = new Set(
    [...md.matchAll(/^\|\s*([A-Z]+-\d+)\s*\|/gm)].map((m) => m[1]),
  );
  for (const id of trackedById.keys()) {
    if (!inMarkdown.has(id)) errors.push(`${id} is missing a row in traceability.md`);
  }
  for (const id of inMarkdown) {
    if (!trackedById.has(id)) errors.push(`${id} has a traceability.md row but is not in requirements.json`);
  }

  // 5: owner paths exist
  for (const owner of new Set(tracked.map((r) => r.module))) {
    if (!existsSync(join(root, owner))) errors.push(`owner path does not exist: ${owner}`);
  }

  if (errors.length === 0) {
    const counts = tracked.reduce((a, r) => ({ ...a, [r.pri]: (a[r.pri] ?? 0) + 1 }), {});
    console.log(
      `traceability ok — ${tracked.length} requirements ` +
        `(P0 ${counts.P0 ?? 0} / P1 ${counts.P1 ?? 0} / P2 ${counts.P2 ?? 0})`,
    );
  }
}

if (errors.length > 0) {
  console.error('traceability check failed:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
