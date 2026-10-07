export function assignmentMessage(title: string, dueDate: string | null, sender: string, today: string) {
  const [year, month, day] = today.split('-').map(Number);
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
  const date = dueDate === today ? 'Hoje' : dueDate === tomorrow ? 'Amanhã' : dueDate ? `${dueDate.slice(8, 10)}/${dueDate.slice(5, 7)}` : 'Hoje';
  return `🌸 *${title}*\n📅 ${date}\nDe: ${sender.trim().split(/\s+/)[0] || 'Admin'}\n\nResponda esta mensagem com *feito* ou conte o que aconteceu.`;
}