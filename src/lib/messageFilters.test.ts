import { describe, expect, it } from 'vitest';
import { matchesMessageFilters } from './messageFilters';

const message = { created_at: '2026-10-06T01:00:00Z', user_id: 'van', status: 'sent', task_status: 'pending' };

describe('WhatsApp message filters', () => {
  it('filters by the sending date in São Paulo', () => {
    expect(matchesMessageFilters(message, '2026-10-05', 'all', 'all')).toBe(true);
    expect(matchesMessageFilters(message, '2026-10-06', 'all', 'all')).toBe(false);
  });
  it('filters by employee', () => {
    expect(matchesMessageFilters(message, 'all', 'van', 'all')).toBe(true);
    expect(matchesMessageFilters(message, 'all', 'ft', 'all')).toBe(false);
  });
  it('updates status filtering when the linked task is completed', () => {
    expect(matchesMessageFilters(message, 'all', 'all', 'completed')).toBe(false);
    const completed = { ...message, task_status: 'completed' };
    expect(matchesMessageFilters(completed, 'all', 'all', 'completed')).toBe(true);
    expect(matchesMessageFilters(completed, 'all', 'all', 'sent')).toBe(false);
  });
  it('combines all filters', () => {
    expect(matchesMessageFilters(message, '2026-10-05', 'van', 'sent')).toBe(true);
    expect(matchesMessageFilters(message, '2026-10-05', 'ft', 'sent')).toBe(false);
  });
});