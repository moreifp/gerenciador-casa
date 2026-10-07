import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { Button } from '@/components/ui/button';
import TaskCard from '@/components/TaskCard';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Task } from '@/lib/context';
import { TodayView } from '@/components/employee/EmployeeViews';
import { spToday } from '@/lib/dates';

export default function Dashboard() {
  const { role } = useApp();
  if (role !== 'admin') return <TodayView />;
  return <AdminDashboard />;
}

type GroupKey = 'late' | 'today' | 'done' | 'next';
const GROUPS: { key: GroupKey; label: string; open: boolean }[] = [
  { key: 'late', label: '⚠️ Atrasadas', open: true },
  { key: 'today', label: '📅 Hoje', open: true },
  { key: 'done', label: '✅ Concluídas', open: false },
  { key: 'next', label: 'Próximas', open: false },
];

export function groupOf(t: Task, today: string): GroupKey {
  if (t.status === 'completed') return 'done';
  if (t.due_date && t.due_date < today) return 'late';
  if (!t.due_date || t.due_date === today) return 'today';
  return 'next';
}

function AdminDashboard() {
  const { tasks, loading } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const openId = params.get('open');
  const today = spToday();
  const [openGroups, setOpenGroups] = useState<Record<GroupKey, boolean>>(
    Object.fromEntries(GROUPS.map(g => [g.key, g.open])) as Record<GroupKey, boolean>,
  );
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const g: Record<GroupKey, Task[]> = { late: [], today: [], done: [], next: [] };
    for (const t of tasks) g[groupOf(t, today)].push(t);
    g.late.sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
    g.next.sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
    g.done.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return g;
  }, [tasks, today]);

  // Deep link ?open=<id>: open its group, highlight and scroll. Archived tasks go to edit.
  useEffect(() => {
    if (!openId || loading) return;
    const t = tasks.find(x => x.id === openId);
    const next = new URLSearchParams(params); next.delete('open'); setParams(next, { replace: true });
    if (!t) { navigate(`/tasks/${openId}/edit`); return; }
    setOpenGroups(o => ({ ...o, [groupOf(t, today)]: true }));
    setHighlightId(openId);
    setTimeout(() => document.querySelector(`[data-task-id="${openId}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150);
    const timer = setTimeout(() => setHighlightId(null), 3000);
    return () => clearTimeout(timer);
  }, [openId, loading, tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-20">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-[26px] font-bold font-display">Tarefas</h1>
      {GROUPS.map(g => {
        const list = grouped[g.key];
        const open = openGroups[g.key];
        return (
          <section key={g.key} className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-between text-[20px] font-bold"
              aria-expanded={open}
              onClick={() => setOpenGroups(o => ({ ...o, [g.key]: !o[g.key] }))}
            >
              <span>{g.label} ({list.length})</span>
              {open ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
            </Button>
            {open && list.map(t => <TaskCard key={t.id} task={t} highlighted={t.id === highlightId} />)}
          </section>
        );
      })}
    </div>
  );
}
