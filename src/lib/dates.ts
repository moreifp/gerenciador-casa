// All "today" logic uses the house time zone, never UTC.
export const HOUSE_TZ = 'America/Sao_Paulo';

const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: HOUSE_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

/** YYYY-MM-DD in São Paulo for the given instant (default: now). */
export function spDate(d: Date | string = new Date()): string {
  return fmt.format(typeof d === 'string' ? new Date(d) : d);
}

export const spToday = () => spDate();

/** Whole days a YYYY-MM-DD due date is behind `today` (0 if not late). */
export function daysLate(due: string | null, today = spToday()): number {
  if (!due) return 0;
  const diff = Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(due + 'T00:00:00Z')) / 86400000);
  return diff > 0 ? diff : 0;
}

export function lateLabel(days: number): string {
  return days === 1 ? 'Atrasada há 1 dia' : `Atrasada há ${days} dias`;
}
