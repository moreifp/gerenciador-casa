import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useApp, type Task } from '@/lib/context';
import { useAuth } from '@/lib/auth';
import TaskCard from '@/components/TaskCard';
import { Button } from '@/components/ui/button';
import { spDate, spToday } from '@/lib/dates';

function useMyTasks() {
  const { tasks } = useApp();
  const { user } = useAuth();
  return useMemo(() => tasks.filter(t => t.assignee_ids.includes(user?.id ?? '')), [tasks, user?.id]);
}

const byDue = (a: Task, b: Task) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999');

function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/** "/" for employees */
export function TodayView() {
  const { loading } = useApp();
  const { profile } = useAuth();
  const mine = useMyTasks();
  const [showDone, setShowDone] = useState(false);
  const today = spToday();

  const open = mine.filter(t => t.status !== 'completed' && t.due_date && t.due_date <= today).sort(byDue);
  const doneToday = mine.filter(t => t.status === 'completed' && spDate(t.updated_at) === today);
  const firstName = profile?.full_name?.split(' ')[0] || '';

  if (loading) return <Spinner />;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <h1 className="text-[26px] font-bold font-display">Oi{firstName ? `, ${firstName}` : ''}</h1>

      {open.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-6xl">🎉</p>
          <p className="text-2xl font-display font-bold">Tudo feito por hoje</p>
        </div>
      ) : (
        <div className="space-y-3">
          {open.map(t => <TaskCard key={t.id} task={t} />)}
        </div>
      )}

      {doneToday.length > 0 && (
        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={() => setShowDone(s => !s)}
            className="w-full h-14 flex items-center justify-between px-4 text-[17px] font-semibold"
          >
            Feitas hoje ✅ ({doneToday.length})
            {showDone ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
          </Button>
          {showDone && doneToday.map(t => <TaskCard key={t.id} task={t} />)}
        </div>
      )}
    </div>
  );
}

/** "/tasks" for employees */
export function AllView({ highlightId }: { highlightId: string | null }) {
  const { loading } = useApp();
  const mine = useMyTasks();
  const today = spToday();

  const groups = useMemo(() => {
    const notDone = mine.filter(t => t.status !== 'completed');
    return [
      { title: 'Atrasadas', items: notDone.filter(t => t.due_date && t.due_date < today).sort(byDue) },
      { title: 'Hoje', items: notDone.filter(t => t.due_date === today) },
      { title: 'Próximas', items: notDone.filter(t => !t.due_date || t.due_date > today).sort(byDue) },
      { title: 'Feitas', items: mine.filter(t => t.status === 'completed').sort((a, b) => b.updated_at.localeCompare(a.updated_at)) },
    ];
  }, [mine, today]);

  if (loading) return <Spinner />;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-[26px] font-bold font-display">Todas</h1>
      {groups.every(g => g.items.length === 0) && (
        <p className="text-center text-xl py-16 text-muted-foreground">Nenhuma tarefa</p>
      )}
      {groups.filter(g => g.items.length > 0).map(g => (
        <section key={g.title} className="space-y-3">
          <h2 className={g.title === 'Atrasadas' ? 'text-lg font-bold text-destructive' : 'text-lg font-bold'}>
            {g.title} ({g.items.length})
          </h2>
          {g.items.map(t => <TaskCard key={t.id} task={t} highlighted={t.id === highlightId} />)}
        </section>
      ))}
    </div>
  );
}
