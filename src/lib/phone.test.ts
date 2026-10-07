import { describe, it, expect } from 'vitest';
import { normalizePhone, formatPhone, isValidPhone } from './phone';

describe('phone', () => {
  it('normalizes to digits with 55', () => {
    expect(normalizePhone('(11) 99970-2000')).toBe('5511999702000');
    expect(normalizePhone('+55 11 99970-2000')).toBe('5511999702000');
  });
  it('accepts any city DDD, not just 11', () => {
    expect(normalizePhone('(85) 99999-1234')).toBe('5585999991234');
    expect(normalizePhone('21987654321')).toBe('5521987654321');
  });
  it('masks as +55 (11) 9xxxx-xxxx', () => {
    expect(formatPhone('11999702000')).toBe('+55 (11) 99970-2000');
  });
  it('masks other cities correctly', () => {
    expect(formatPhone('85999991234')).toBe('+55 (85) 99999-1234');
    expect(formatPhone('5585999991234')).toBe('+55 (85) 99999-1234');
  });
  it('does not eat DDD 55 (Rio Grande do Sul)', () => {
    expect(formatPhone('55999123456')).toBe('+55 (55) 99912-3456');
    expect(normalizePhone('55999123456')).toBe('5555999123456');
  });
  it('supports landline format (xx) xxxx-xxxx', () => {
    expect(formatPhone('1132511234')).toBe('+55 (11) 3251-1234');
    expect(isValidPhone('1132511234')).toBe(true);
  });
  it('does not accumulate 5s when reformatting its own output', () => {
    expect(formatPhone(formatPhone('1'))).toBe('+55 (1');
    expect(formatPhone(formatPhone('11999702000'))).toBe('+55 (11) 99970-2000');
  });
  it('rejects short numbers', () => {
    expect(isValidPhone('11999')).toBe(false);
    expect(isValidPhone('11999702000')).toBe(true);
  });
});
