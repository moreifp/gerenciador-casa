import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TaskReply {
  id: string;
  task_id: string | null;
  user_id: string;
  text: string | null;
  audio_url: string | null;
  audio_transcription: string | null;
  image_url: string | null;
  suggested_status: 'done' | 'pending' | null;
  reviewed_at: string | null;
  created_at: string;
}

// One shared fetch + realtime channel for every admin card.
let replies: TaskReply[] = [];
const listeners = new Set<() => void>();
let started = false;
const emit = () => listeners.forEach(l => l());

async function load() {
  const { data } = await supabase.from('task_replies').select('*').order('created_at', { ascending: false }).limit(500);
  replies = (data ?? []) as TaskReply[];
  emit();
}

function start() {
  if (started) return;
  started = true;
  load();
  supabase.channel('task-replies').on('postgres_changes', { event: '*', schema: 'public', table: 'task_replies' }, load).subscribe();
}

export function useTaskReplies(taskId: string) {
  useEffect(start, []);
  const all = useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => replies);
  return all.filter(r => r.task_id === taskId);
}

/** Admin's tap on Concluída/Pendente marks the task's replies as reviewed. */
export async function markRepliesReviewed(taskId: string, userId: string | undefined) {
  await supabase.from('task_replies').update({ reviewed_at: new Date().toISOString(), reviewed_by: userId ?? null })
    .eq('task_id', taskId).is('reviewed_at', null);
  load();
}

export function replyTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const day = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const time = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  if (day(d) === day(now)) return `hoje ${time}`;
  if (day(d) === day(new Date(now.getTime() - 86400000))) return 'ontem';
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });
}
