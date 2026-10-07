/** First given name and last surname; one-word names receive X. */
export function profileInitials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'XX';
  return (words[0].charAt(0) + (words.length > 1 ? words[words.length - 1].charAt(0) : 'X')).toLocaleUpperCase('pt-BR');
}