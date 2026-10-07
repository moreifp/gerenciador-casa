import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useApp, type Task } from '@/lib/context';
import TaskForm from '@/components/TaskForm';

export default function EditTask() {
  const { id } = useParams();
  const { role } = useApp();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id || role !== 'admin') return;
    let active = true;
    Promise.all([
      supabase.from('tasks').select('*').eq('id', id).maybeSingle(),
      supabase.from('task_assignees').select('user_id').eq('task_id', id),
    ]).then(([{ data, error }, { data: assignees, error: assignmentError }]) => {
      if (!active) return;
      if (!error && !assignmentError && data) setTask({ ...data, image_urls: data.image_urls ?? [], recurrence_days: data.recurrence_days ?? [], assignee_ids: (assignees ?? []).map(a => a.user_id) } as Task);
      setLoading(false);
    });
    return () => { active = false; };
  }, [id, role]);
  if (role !== 'admin') return <Navigate to="/" replace />;
  if (loading) return <div className="py-12 text-center">Carregando...</div>;
  if (!task) return <div className="py-12 text-center">Tarefa não encontrada.</div>;
  return <TaskForm key={task.id} initialTask={task} />;
}
