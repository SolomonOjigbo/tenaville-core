import { describe, expect, it } from 'vitest';

import { formatDate } from '../lib/format';

describe('formatDate', () => {
  it('turns a contractual date into a readable one', () => {
    expect(formatDate('2026-11-01')).toBe('1 Nov 2026');
    expect(formatDate('2026-01-31')).toBe('31 Jan 2026');
    expect(formatDate('2026-12-31')).toBe('31 Dec 2026');
  });

  it('does not shift the day for a reader outside West Africa Time', () => {
    // A date-only value parsed as local time would show 31 Oct for a reader
    // west of UTC. These are the dates a tenancy is enforced against (PRD §10.6).
    expect(formatDate('2026-11-01')).toContain('1 Nov');
    expect(formatDate('2026-01-01')).toContain('1 Jan');
  });

  it('returns a malformed value unchanged instead of inventing a date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
    expect(formatDate('')).toBe('');
  });
});
