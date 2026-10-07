const DONE_WORDS = [
  'feito', 'feita', 'pronto', 'pronta', 'ok', 'concluido', 'concluida', 'terminei',
  'ja fiz', 'fiz', 'resolvido', 'resolvida', 'resolvi', 'liguei', 'finalizado', 'finalizada',
];

export function normalizeReply(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 'done' when the reply contains a "done" word; never changes the task by itself. */
export function suggestReplyStatus(text: string | null | undefined): 'done' | 'pending' {
  const n = ` ${normalizeReply(text ?? '')} `;
  return DONE_WORDS.some((w) => n.includes(` ${w} `)) ? 'done' : 'pending';
}

/** Brazilian phone variants: with/without 55 and with/without the extra 9. */
export function phoneVariants(raw: string): string[] {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
  const out = new Set<string>([d]);
  if (d.length === 11 && d[2] === '9') out.add(d.slice(0, 2) + d.slice(3));
  if (d.length === 10) out.add(d.slice(0, 2) + '9' + d.slice(2));
  for (const v of [...out]) out.add('55' + v);
  return [...out];
}
