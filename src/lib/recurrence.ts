export interface RecurrenceInfo {
  recurrence_type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  recurrence_days: number[] | null;
  due_date: string | null;
}

const DAY_NAMES = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

/** Human label shown in the message dialog: one-off vs recurring. */
export function recurrenceLabel(task: RecurrenceInfo | null | undefined): string {
  if (!task) return '—';
  if (task.recurrence_type === 'none') return 'Tarefa pontual (não repete)';
  if (task.recurrence_type === 'daily') return 'Repete todos os dias';
  if (task.recurrence_type === 'monthly') {
    const day = task.due_date ? Number(task.due_date.slice(8, 10)) : null;
    return day ? `Repete todo dia ${day} do mês` : 'Repete todo mês';
  }
  const days = (task.recurrence_days ?? []).filter(d => d >= 0 && d <= 6).sort((a, b) => a - b);
  if (days.length === 0) return 'Repete toda semana';
  const list = days.map(d => DAY_NAMES[d]);
  if (list.length === 1) return `Repete toda ${list[0]}`;
  return `Repete: ${list.join(', ')}`;
}
