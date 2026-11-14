import { describe, expect, it } from 'vitest';

import { planPayments } from './payment-plan';
import { Rng } from './rng';
import type { Behaviour } from '../world/types';

const dues = [
  { dueOn: '2026-01-10', amountKobo: 120_000_000n },
  { dueOn: '2026-04-10', amountKobo: 120_000_000n },
  { dueOn: '2026-07-10', amountKobo: 120_000_000n },
  { dueOn: '2026-10-10', amountKobo: 120_000_000n },
];
const TODAY = '2026-11-13';
const BEHAVIOURS: Behaviour[] = ['prompt', 'usual', 'slow', 'partial', 'defaulter'];

describe('planPayments', () => {
  for (const behaviour of BEHAVIOURS) {
    it(`${behaviour}: never pays in the future, before the lease, for nothing, or for more than is due`, () => {
      for (let seed = 0; seed < 200; seed += 1) {
        const plan = planPayments(
          { start: '2026-01-10', cutoff: null, dues, behaviour, commercial: false, today: TODAY },
          new Rng(`${behaviour}-${seed}`),
        );
        let total = 0n;
        for (const p of plan) {
          expect(p.paidOn <= TODAY).toBe(true);
          expect(p.paidOn >= '2026-01-10').toBe(true);
          expect(p.amountKobo > 0n).toBe(true);
          total += p.amountKobo;
        }
        expect(total <= 480_000_000n).toBe(true);
      }
    });
  }

  it('is reproducible', () => {
    const input = { start: '2026-01-10', cutoff: null, dues, behaviour: 'usual' as const, commercial: false, today: TODAY };
    expect(planPayments(input, new Rng('x'))).toEqual(planPayments(input, new Rng('x')));
  });

  it('stops at an early-termination cutoff', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const plan = planPayments(
        { start: '2026-01-10', cutoff: '2026-05-01', dues, behaviour: 'slow', commercial: false, today: TODAY },
        new Rng(`cut-${seed}`),
      );
      for (const p of plan) expect(p.paidOn <= '2026-05-01').toBe(true);
    }
  });

  it('a defaulter leaves the latest instalment unpaid', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const plan = planPayments(
        { start: '2026-01-10', cutoff: null, dues, behaviour: 'defaulter', commercial: false, today: TODAY },
        new Rng(`d-${seed}`),
      );
      const total = plan.reduce((sum, p) => sum + p.amountKobo, 0n);
      expect(total < 480_000_000n).toBe(true);
    }
  });
});
