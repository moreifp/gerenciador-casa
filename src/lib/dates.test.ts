import { describe, it, expect } from 'vitest';
import { daysLate, spDate } from './dates';

describe('house dates (America/Sao_Paulo)', () => {
  it('02:30 UTC is still the previous day in São Paulo', () => {
    expect(spDate(new Date('2026-10-04T02:30:00Z'))).toBe('2026-10-03');
  });
  it('counts days late from the due date', () => {
    expect(daysLate('2026-10-01', '2026-10-03')).toBe(2);
  });
  it('a task due today or later is not late', () => {
    expect(daysLate('2026-10-03', '2026-10-03')).toBe(0);
    expect(daysLate('2026-10-05', '2026-10-03')).toBe(0);
  });
});
