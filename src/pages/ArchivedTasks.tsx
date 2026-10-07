import { useState, useEffect, useCallback } from 'react';
import { useApp, type Task } from '@/lib/context';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import TaskCard from '@/components/TaskCard';

export default function ArchivedTasks() {
  const { role, refreshTasks } = useApp();
  const { user } = useAuth();
  const [archived, setArchived] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArchived = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_archived', true)
      .order('updated_at', { ascending: false });

    if (!tasksData) { setArchived([]); setLoading(false); return; }

    const taskIds = tasksData.map(t => t.id);
    const { data: assigneesData } = await supabase
      .from('task_assignees')
      .select('task_id, user_id')
      .in('task_id', taskIds.length > 0 ? taskIds : ['none']);

    const assigneeMap: Record<string, string[]> = {};
    (assigneesData ?? []).forEach(a => {
      if (!assigneeMap[a.task_id]) assigneeMap[a.task_id] = [];
      assigneeMap[a.task_id].push(a.user_id);
    });

    setArchived(tasksData.map(t => ({
      ...t,
      type: t.type as Task['type'],
      priority: t.priority as Task['priority'],
      status: t.status as Task['status'],
      recurrence_type: t.recurrence_type as Task['recurrence_type'],
      recurrence_days: t.recurrence_days ?? [],
      image_urls: t.image_urls ?? [],
      is_archived: true,
      assignee_ids: assigneeMap[t.id] ?? [],
    })));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchArchived(); }, [fetchArchived]);

  // Re-fetch when refreshTasks is called (unarchive triggers it)
  const originalRefresh = refreshTasks;
  const wrappedRefresh = useCallback(async () => {
    await originalRefresh();
    await fetchArchived();
  }, [originalRefresh, fetchArchived]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-[26px] font-bold font-display">Tarefas Arquivadas</h1>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {archived.map(task => (
            <TaskCard key={task.id} task={task} showUnarchive />
          ))}
          {archived.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">Nenhuma tarefa arquivada.</div>
          )}
        </div>
      )}
    </div>
  );
}
