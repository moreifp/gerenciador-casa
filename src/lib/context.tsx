import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, type AppRole } from './auth';

// ---- Types matching DB schema ----
export interface Profile {
  id: string;
  initials: string | null;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  role_title: string | null;
  photo_url: string | null;
  admission_date: string | null;
  bank_details: Record<string, string> | null;
  documents: Record<string, string> | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: 'routine' | 'one_off';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  recurrence_type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  recurrence_days: number[];
  is_shared: boolean;
  created_by: string | null;
  audio_url: string | null;
  audio_transcription: string | null;
  image_urls: string[];
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  assignee_ids: string[]; // populated from task_assignees
}

export interface TaskProof {
  id: string;
  task_id: string;
  submitted_by: string | null;
  photo_urls: string[];
  comment: string | null;
  audio_url: string | null;
  audio_transcription: string | null;
  created_at: string;
}

export interface TaskFeedback {
  id: string;
  task_id: string;
  proof_id: string | null;
  action: 'approved' | 'reopened';
  comment: string | null;
  created_by: string | null;
  created_at: string;
}

interface AppState {
  role: AppRole | null;
  employees: Profile[];
  tasks: Task[];
  loading: boolean;
  refreshTasks: () => Promise<void>;
  refreshEmployees: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role } = useAuth();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshEmployees = useCallback(async () => {
    if (!user) return;
    // Get all profiles that have employee role (or all profiles for admin)
    if (role === 'admin') {
      const [{ data }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('user_roles').select('user_id, role'),
      ]);
      const allowed = new Set((roles ?? []).filter(r => r.role === 'employee' || r.user_id === user.id).map(r => r.user_id));
      setEmployees((data ?? []).filter(p => allowed.has(p.id)) as Profile[]);
    }
  }, [user, role]);

  const refreshTasks = useCallback(async () => {
    if (!user) return;

    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (!tasksData) { setTasks([]); return; }

    // Fetch assignees for all tasks
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

    const enriched: Task[] = tasksData.map(t => ({
      ...t,
      type: t.type as Task['type'],
      priority: t.priority as Task['priority'],
      status: t.status as Task['status'],
      recurrence_type: t.recurrence_type as Task['recurrence_type'],
      recurrence_days: t.recurrence_days ?? [],
      image_urls: t.image_urls ?? [],
      is_archived: t.is_archived ?? false,
      assignee_ids: assigneeMap[t.id] ?? [],
    }));

    setTasks(enriched);
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([refreshTasks(), refreshEmployees()]).finally(() => setLoading(false));
    } else {
      setTasks([]);
      setEmployees([]);
      setLoading(false);
    }
  }, [user, role, refreshTasks, refreshEmployees]);

  return (
    <AppContext.Provider value={{ role, employees, tasks, loading, refreshTasks, refreshEmployees }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppState => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
