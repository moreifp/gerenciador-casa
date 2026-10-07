import { describe, expect, it } from 'vitest';
import { assignmentMessage } from '../../supabase/functions/_shared/assignment-message';

describe('task assignment WhatsApp message', () => {
  it('says Hoje and uses the sender first name without an app link', () => {
    expect(assignmentMessage('Limpar cozinha', '2026-10-04', 'Fausto Moreira', '2026-10-04')).toBe('🌸 *Limpar cozinha*\n📅 Hoje\nDe: Fausto\n\nResponda esta mensagem com *feito* ou conte o que aconteceu.');
  });
  it('says Amanhã for the next day', () => {
    expect(assignmentMessage('Varrer', '2026-10-05', 'Fausto', '2026-10-04')).toContain('📅 Amanhã');
  });
  it('shows day and month for later tasks', () => {
    expect(assignmentMessage('Varrer', '2026-10-19', 'Fausto', '2026-10-04')).toContain('📅 19/10');
  });
});