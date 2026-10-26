#!/usr/bin/env node
/**
 * Keeps the sprint backlog, the PRD and the traceability matrix in agreement.
 *
 * Fails when:
 *   1. The CSV and docs/requirements/backlog.json disagree on tickets, sprints
 *      or points.
 *   2. A ticket references a requirement the PRD does not contain.
 *   3. A P0 or P1 requirement has no ticket.
 *   4. An R1 ticket depends on a P1 requirement (the backlog's own rule: R1
 *      must not need anything from R2).
 *   5. A ticket claims 'done' while a requirement it covers is still 'todo' in
 *      the traceability matrix, or vice versa.
 *   6. sprint-backlog.md disagrees with the CSV: a missing or misquoted ticket
 *      entry, a stale per-sprint total, or a stale plan-size line. The
 *      prose document is what people read, and its per-sprint totals had
 *      silently drifted for four tickets before this check existed.
 *
 * Run: node tools/check-backlog.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

const read = (rel) => {
  const p = join(root, rel);
  if (!existsSync(p)) {
    errors.push(`missing ${rel}`);
    return null;
  }
  return readFileSync(p, 'utf8');
};

/** Minimal CSV reader: handles quoted fields containing commas. */
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else { quoted = false; }
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.some((c) => c !== ''));
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
};

const csvText = read('docs/requirements/sprint-backlog.csv');
const backlogText = read('docs/requirements/backlog.json');
const reqText = read('docs/requirements/requirements.json');
const matrixText = read('docs/requirements/traceability.md');
const proseText = read('docs/requirements/sprint-backlog.md');

if (csvText && backlogText && reqText && matrixText) {
  const csv = parseCsv(csvText);
  const backlog = JSON.parse(backlogText);
  const prd = new Map(JSON.parse(reqText).map((r) => [r.id, r]));

  const byTicket = new Map(backlog.map((t) => [t.ticket, t]));

  // 1. CSV is the source; backlog.json must mirror it.
  for (const row of csv) {
    const t = byTicket.get(row.Ticket);
    if (!t) { errors.push(`${row.Ticket} is in the CSV but not in backlog.json`); continue; }
    if (t.sprint !== Number(row.Sprint)) {
      errors.push(`${t.ticket} sprint mismatch: CSV ${row.Sprint}, backlog.json ${t.sprint}`);
    }
    if (t.points !== Number(row['Story points'])) {
      errors.push(`${t.ticket} points mismatch: CSV ${row['Story points']}, backlog.json ${t.points}`);
    }
  }
  const csvTickets = new Set(csv.map((r) => r.Ticket));
  for (const t of byTicket.keys()) {
    if (!csvTickets.has(t)) errors.push(`${t} is in backlog.json but not in the CSV`);
  }

  // 2 and 4. Ticket requirement references.
  const covered = new Set();
  for (const t of backlog) {
    for (const id of t.requirements) {
      const req = prd.get(id);
      if (!req) { errors.push(`${t.ticket} references ${id}, which is not in the PRD`); continue; }
      covered.add(id);
      if (t.release === 'R1' && req.pri === 'P1') {
        errors.push(`${t.ticket} is R1 but depends on ${id}, which is P1 (R2)`);
      }
    }
  }

  // 3. Every P0 and P1 requirement needs a ticket.
  for (const [id, req] of prd) {
    if ((req.pri === 'P0' || req.pri === 'P1') && !covered.has(id)) {
      errors.push(`${id} (${req.pri}) has no ticket in the backlog`);
    }
  }

  // 5. Ticket status must not contradict the traceability matrix.
  const reqStatus = new Map();
  for (const line of matrixText.split('\n')) {
    if (!line.startsWith('| ')) continue;
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.length === 6 && prd.has(cells[0])) reqStatus.set(cells[0], cells[4]);
  }
  for (const t of backlog) {
    for (const id of t.requirements) {
      const status = reqStatus.get(id);
      if (status === undefined) continue;
      if (t.status === 'done' && status === 'todo') {
        errors.push(`${t.ticket} is 'done' but ${id} is still 'todo' in the traceability matrix`);
      }
      if (t.status === 'todo' && status === 'done') {
        errors.push(`${t.ticket} is 'todo' but ${id} is 'done' in the traceability matrix`);
      }
    }
  }

  // 6. The prose document must agree with the CSV.
  if (proseText) {
    const sprintPoints = new Map();
    const sprintTickets = new Map();
    for (const t of backlog) {
      sprintPoints.set(t.sprint, (sprintPoints.get(t.sprint) ?? 0) + t.points);
      sprintTickets.set(t.sprint, (sprintTickets.get(t.sprint) ?? 0) + 1);
    }

    for (const t of backlog) {
      const heading = `**${t.ticket} \u00b7 ${t.title}**`;
      const at = proseText.indexOf(heading);
      if (at === -1) {
        errors.push(`${t.ticket} is missing from sprint-backlog.md, or its title there differs`);
        continue;
      }
      const detail = proseText.slice(at + heading.length, at + heading.length + 400);
      const expected = `${t.module} \u00b7 ${t.points} pts \u00b7 PRD: ${t.requirements.join(', ')}`;
      if (!detail.includes(expected)) {
        errors.push(`${t.ticket} in sprint-backlog.md should read "${expected}"`);
      }
    }
    for (const [, ticket] of proseText.matchAll(/\*\*(TV-\d+) \u00b7/g)) {
      if (!byTicket.has(ticket)) {
        errors.push(`sprint-backlog.md lists ${ticket}, which is not in the backlog`);
      }
    }

    for (const [, sprint, , points] of proseText.matchAll(
      /^#### Sprint (\d+): (.+) \((\d+) points\)$/gm,
    )) {
      const actual = sprintPoints.get(Number(sprint));
      if (Number(points) !== actual) {
        errors.push(
          `sprint-backlog.md heading for Sprint ${sprint} says ${points} points, but its tickets total ${actual}`,
        );
      }
    }

    for (const [, sprint, tickets, points] of proseText.matchAll(
      // Padding varies: Prettier aligns these columns, the generator does not.
      /^\|\s*(\d+)\s*\|\s*[\d-]+\s*\|\s*R\d\s*\|[^|]+\|\s*(\d+)\s*\|\s*(\d+)\s*\|$/gm,
    )) {
      const s = Number(sprint);
      if (Number(tickets) !== sprintTickets.get(s) || Number(points) !== sprintPoints.get(s)) {
        errors.push(
          `the sprint overview row for Sprint ${sprint} says ${tickets} tickets and ${points} points, ` +
            `but the backlog has ${sprintTickets.get(s)} and ${sprintPoints.get(s)}`,
        );
      }
    }

    const total = backlog.reduce((a, t) => a + t.points, 0);
    const size = /^\*\*Plan size:\*\* 23 sprints, (\d+) tickets, (\d+) story points/m.exec(proseText);
    if (!size) errors.push('sprint-backlog.md has no recognisable plan-size line');
    else if (Number(size[1]) !== backlog.length || Number(size[2]) !== total) {
      errors.push(
        `the plan-size line says ${size[1]} tickets and ${size[2]} points, ` +
          `but the backlog has ${backlog.length} and ${total}`,
      );
    }
  }

  if (errors.length === 0) {
    const pts = backlog.reduce((a, t) => a + t.points, 0);
    const landed = backlog
      .filter((t) => t.status === 'done' || t.status === 'backend-done')
      .reduce((a, t) => a + t.points, 0);
    console.log(
      `backlog ok — ${backlog.length} tickets, ${pts} points, ` +
        `${covered.size} requirements covered, ${landed} points landed`,
    );
  }
}

if (errors.length > 0) {
  console.error('backlog check failed:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
