import { useState, useEffect, useMemo } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useApp, type Task } from '@/lib/context';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import TaskCard from '@/components/TaskCard';
import { cn } from '@/lib/utils';
import { Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AllView } from '@/components/employee/EmployeeViews';

type TaskStatusFilter = Task['status'] | 'all';

const filters: { label: string; value: TaskStatusFilter }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Concluídas', value: 'completed' },
  { label: 'Bloqueadas', value: 'blocked' },
];

export default function Tasks() {
  const { tasks, role } = useApp();
  const { user } = useAuth();
  const [filter, setFilter] = useState<TaskStatusFilter>('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get('open');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [archivedOpen, setArchivedOpen] = useState<Task | null>(null);

  // Archived tasks are absent from the normal list. Keep their deep link editable too.
  useEffect(() => {
    if (!openId || role !== 'admin' || tasks.some(t => t.id === openId)) return;
    let active = true;
    (async () => {
      const [{ data: task }, { data: assignees }] = await Promise.all([
        supabase.from('tasks').select('*').eq('id', openId).eq('is_archived', true).maybeSingle(),
        supabase.from('task_assignees').select('user_id').eq('task_id', openId),
      ]);
      if (active && task) setArchivedOpen({ ...task, image_urls: task.image_urls ?? [], recurrence_days: task.recurrence_days ?? [], assignee_ids: (assignees ?? []).map(a => a.user_id) } as Task);
    })();
    return () => { active = false; };
  }, [openId, role, tasks]);

  // When ?open=<id> is present, switch to "Todas" filter, highlight, scroll, then clear param.
  useEffect(() => {
    if (!openId) return;
    const target = tasks.find(t => t.id === openId) ?? (role === 'admin' && archivedOpen?.id === openId ? archivedOpen : null);
    if (!target) return; // wait for tasks to load
    setFilter('all');
    setHighlightId(openId);
    // Clear the param so refresh won't re-trigger
    const next = new URLSearchParams(searchParams);
    next.delete('open');
    setSearchParams(next, { replace: true });
    // Scroll after render
    setTimeout(() => {
      const el = document.querySelector(`[data-task-id="${openId}"]`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 100);
    // Remove highlight after 3s
    const t = setTimeout(() => setHighlightId(null), 3000);
    return () => clearTimeout(t);
  }, [openId, tasks, role, archivedOpen, searchParams, setSearchParams]);

  const visible = useMemo(() => {
    let list = role === 'admin' ? tasks : tasks.filter(t => t.assignee_ids.includes(user?.id ?? ''));
    if (filter === 'pending') list = list.filter(t => t.status === 'pending' || t.status === 'in_progress');
    else if (filter !== 'all') list = list.filter(t => t.status === filter);
    // Put highlighted task on top
    if (highlightId) {
      const idx = list.findIndex(t => t.id === highlightId);
      if (idx > 0) {
        list = [list[idx], ...list.filter(t => t.id !== highlightId)];
      }
    }
    return list;
  }, [role, tasks, user?.id, filter, highlightId]);

  if (role === 'admin') return <Navigate to={`/${window.location.search}`} replace />;
  return <AllView highlightId={highlightId} />;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold font-display">Tarefas</h1>
        {role === 'admin' && (
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link to="/tasks/archived"><Archive className="h-3.5 w-3.5" /> Arquivadas</Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <Button
            type="button"
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-4 h-14 rounded-full text-[17px] font-semibold transition-all',
              filter === f.value ? '!bg-control-selected !text-control-selected-foreground' : '!bg-control !text-control-foreground'
            )}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {archivedOpen && <TaskCard key={archivedOpen.id} task={archivedOpen} showUnarchive highlighted={archivedOpen.id === highlightId} />}
        {visible.map(task => (
          <TaskCard key={task.id} task={task} highlighted={task.id === highlightId} />
        ))}
        {visible.length === 0 && !archivedOpen && (
          <div className="text-center py-12 text-muted-foreground">Nenhuma tarefa encontrada.</div>
        )}
      </div>
    </div>
  );
}
