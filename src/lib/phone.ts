/** Dígitos locais (DDD + número, até 11), sem o código do país. */
function toLocalDigits(raw: string): string {
  let s = (raw || '').trim();
  if (/^\+\s*55/.test(s)) {
    // prefixo exibido pelo próprio campo (ou país digitado com "+")
    s = s.replace(/^\+\s*55/, '');
  } else {
    const d = s.replace(/\D/g, '');
    // "55" solto no início só é código do país se sobrarem ≥10 dígitos (DDD + número);
    // senão pode ser DDD 55 (RS) — não remove.
    s = d.startsWith('55') && d.length - 2 >= 10 ? d.slice(2) : d;
  }
  return s.replace(/\D/g, '').slice(0, 11);
}

/** Digits only, always starting with 55 (Brazil). */
export function normalizePhone(raw: string): string {
  const d = toLocalDigits(raw);
  return d ? '55' + d : '';
}

/** Mask as +55 (xx) 9xxxx-xxxx (mobile) or +55 (xx) xxxx-xxxx (landline) while typing. */
export function formatPhone(raw: string): string {
  const d = toLocalDigits(raw);
  if (!d) return '';
  let out = '+55';
  out += ' (' + d.slice(0, 2);
  if (d.length >= 2) out += ')';
  const rest = d.slice(2);
  const split = d.length > 10 ? 5 : 4;
  if (rest.length) out += ' ' + rest.slice(0, split);
  if (rest.length > split) out += '-' + rest.slice(split);
  return out;
}

/** Valid Brazilian phone: 55 + DDD + 8 or 9 digits (qualquer cidade). */
export function isValidPhone(raw: string): boolean {
  return /^55\d{10,11}$/.test(normalizePhone(raw));
}
