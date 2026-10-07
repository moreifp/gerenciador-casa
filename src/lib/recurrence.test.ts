import { describe, expect, it } from 'vitest';
import { recurrenceLabel } from './recurrence';

describe('recurrenceLabel', () => {
  it('pontual', () => {
    expect(recurrenceLabel({ recurrence_type: 'none', recurrence_days: null, due_date: '2026-10-09' })).toBe('Tarefa pontual (não repete)');
  });
  it('diária', () => {
    expect(recurrenceLabel({ recurrence_type: 'daily', recurrence_days: null, due_date: '2026-10-09' })).toBe('Repete todos os dias');
  });
  it('semanal com um dia', () => {
    expect(recurrenceLabel({ recurrence_type: 'weekly', recurrence_days: [5], due_date: '2026-10-09' })).toBe('Repete toda sexta-feira');
  });
  it('custom com dois dias', () => {
    expect(recurrenceLabel({ recurrence_type: 'custom', recurrence_days: [5, 1], due_date: null })).toBe('Repete: segunda-feira, sexta-feira');
  });
  it('mensal usa o dia do vencimento', () => {
    expect(recurrenceLabel({ recurrence_type: 'monthly', recurrence_days: null, due_date: '2026-10-09' })).toBe('Repete todo dia 9 do mês');
  });
  it('semanal sem dias marcados', () => {
    expect(recurrenceLabel({ recurrence_type: 'weekly', recurrence_days: [], due_date: null })).toBe('Repete toda semana');
  });
});
