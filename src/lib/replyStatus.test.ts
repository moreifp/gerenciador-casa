import { describe, expect, it } from 'vitest';
import { phoneVariants, suggestReplyStatus } from '../../supabase/functions/_shared/reply-status';

describe('WhatsApp reply status', () => {
  it('detects done words ignoring case and accents', () => {
    expect(suggestReplyStatus('Já fiz, tá CONCLUÍDO')).toBe('done');
    expect(suggestReplyStatus('Feito!')).toBe('done');
    expect(suggestReplyStatus('liguei o gerador')).toBe('done');
  });
  it('defaults to pending', () => {
    expect(suggestReplyStatus('não consegui, falta material')).toBe('pending');
    expect(suggestReplyStatus('')).toBe('pending');
  });
  it('matches phones with/without 55 and the extra 9', () => {
    const v = phoneVariants('5511987654321');
    expect(v).toContain('11987654321');
    expect(v).toContain('1187654321');
    expect(phoneVariants('1187654321')).toContain('5511987654321');
  });
});
