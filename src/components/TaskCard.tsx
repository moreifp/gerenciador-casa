import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, type Task, type TaskProof } from '@/lib/context';
import { supabase } from '@/integrations/supabase/client';
import MediaPreview from './MediaPreview';
import TaskActionSheet, { type SheetMode } from './TaskActionSheet';
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, RotateCcw, MessageSquare, ChevronDown, ChevronUp, Trash2, HelpCircle, Paperclip, Undo2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { daysLate, lateLabel } from '@/lib/dates';
import { profileInitials } from '@/lib/initials';
import { useAuth } from '@/lib/auth';
import { useTaskReplies, markRepliesReviewed, replyTime } from '@/lib/replies';
import { Mic } from 'lucide-react';

const statusBorder: Record<string, string> = {
  pending: 'border-l-status-pending',
  in_progress: 'border-l-status-pending',
  completed: 'border-l-status-completed',
  blocked: 'border-l-status-blocked',
};

/** Shared 1-tap complete / undo logic. */
function useCompletion(task: Task, onCompleted?: () => void) {
  const { refreshTasks } = useApp();
  const [localStatus, setLocalStatus] = useState<Task['status'] | null>(null);
  const status = localStatus ?? task.status;

  useEffect(() => { setLocalStatus(null); }, [task.status]);

  const setStatus = async (s: Task['status']) => {
    const { error } = await supabase.from('tasks').update({ status: s }).eq('id', task.id);
    return error;
  };

  const undo = async () => {
    setLocalStatus('pending');
    const error = await setStatus('pending');
    if (error) toast.error('Não foi possível desfazer');
    await refreshTasks();
  };

  const complete = async () => {
    setLocalStatus('completed');
    const error = await setStatus('completed');
    if (error) { setLocalStatus(null); toast.error('Não foi possível concluir'); return; }
    toast.success('Feito!', { duration: 5000, action: { label: 'Desfazer', onClick: undo } });
    onCompleted?.();
  };

  return { status, complete, undo };
}

export default function TaskCard({ task, showUnarchive, highlighted }: { task: Task; showUnarchive?: boolean; highlighted?: boolean }) {
  const { role } = useApp();
  if (role === 'admin') return <AdminTaskCard task={task} showUnarchive={showUnarchive} highlighted={highlighted} />;
  return <EmployeeTaskCard task={task} highlighted={highlighted} />;
}

// ------------------------------------------------------------------
// Employee: big title, 1-tap "Feito", optional sheet afterwards.
// ------------------------------------------------------------------
function EmployeeTaskCard({ task, highlighted }: { task: Task; highlighted?: boolean }) {
  const { refreshTasks } = useApp();
  const [sheet, setSheet] = useState<SheetMode | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const { status, complete, undo } = useCompletion(task, () => setSheet('completion'));

  const done = status === 'completed';
  const late = done ? 0 : daysLate(task.due_date);
  const hasMedia = (task.image_urls?.length ?? 0) > 0 || !!task.audio_url;

  const closeSheet = () => { setSheet(null); refreshTasks(); };

  return (
    <>
      <Card
        data-task-id={task.id}
        className={cn(
          'p-4 space-y-3 transition-all duration-300',
          done && 'bg-status-completed/10 border-status-completed/40',
          highlighted && 'ring-2 ring-primary ring-offset-2 shadow-lg animate-pulse',
        )}
      >
        <div className="flex items-start gap-3">
          <Button variant="ghost" className="flex-1 min-w-0 h-auto justify-start text-left whitespace-normal" onClick={() => setExpanded(e => !e)}>
            <span className="block">
            <h3 className={cn('text-[20px] font-bold leading-snug', done && 'line-through text-muted-foreground')}>{task.title}</h3>
            {task.description && (
              <p className={cn('text-[16px] text-muted-foreground mt-0.5', !expanded && 'line-clamp-1')}>{task.description}</p>
            )}
            {late > 0 && <p className="text-sm font-semibold text-destructive mt-1">{lateLabel(late)}</p>}
            </span>
          </Button>
          {hasMedia && (
            <Button variant="ghost" size="icon" className="h-14 w-14 shrink-0" onClick={() => setShowMedia(s => !s)} aria-label="Anexos">
              <Paperclip className="h-6 w-6" />
            </Button>
          )}
        </div>

        {showMedia && (
          <div className="space-y-2 text-sm">
            <MediaPreview imageUrls={task.image_urls} audioUrl={task.audio_url} />
            {task.audio_transcription && (
              <p className="bg-muted rounded-lg p-3 text-muted-foreground">{task.audio_transcription}</p>
            )}
          </div>
        )}

        {done ? (
          <Button variant="outline" className="w-full h-14 text-base gap-2" onClick={undo}>
            <Undo2 className="h-6 w-6" /> Desfazer
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button className="flex-1 h-14 text-lg font-bold gap-2 !border-status-completed !bg-status-completed !text-white hover:!bg-status-completed" onClick={complete}>
              <CheckCircle className="size-7" /> Feito
            </Button>
            <Button variant="outline" className="h-14 px-4 gap-2 text-base" onClick={() => setSheet('question')} aria-label="Dúvida">
              <HelpCircle className="h-6 w-6" /> Dúvida
            </Button>
          </div>
        )}
      </Card>

      <TaskActionSheet mode={sheet} taskId={task.id} onClose={closeSheet} />
    </>
  );
}

// ------------------------------------------------------------------
// Admin: short task card and direct WhatsApp resend.
// ------------------------------------------------------------------
function AdminTaskCard({ task, showUnarchive, highlighted }: { task: Task; showUnarchive?: boolean; highlighted?: boolean }) {
  const navigate = useNavigate();
  const { employees, refreshTasks } = useApp();
  const { user } = useAuth();
  const replies = useTaskReplies(task.id);
  const unreviewed = replies.filter(r => !r.reviewed_at).length;
  const latestDone = replies[0]?.suggested_status === 'done' && task.status !== 'completed';
  const { status, complete: completeRaw } = useCompletion(task, refreshTasks);
  const complete = async () => { await completeRaw(); markRepliesReviewed(task.id, user?.id); };
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [proofs, setProofs] = useState<TaskProof[]>([]);
  const assignees = employees.filter(p => task.assignee_ids.includes(p.id));
  const late = status === 'completed' ? 0 : daysLate(task.due_date);

  useEffect(() => {
    if (!expanded) return;
    supabase.from('task_proofs').select('*').eq('task_id', task.id).order('created_at', { ascending: false })
      .then(({ data }) => setProofs((data ?? []).map(p => ({ ...p, photo_urls: p.photo_urls ?? [] }))));
  }, [expanded, task.id]);

  const resend = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', { body: { task_id: task.id, resend: true } });
      if (error || data?.failed) toast.error('Não foi possível reenviar pelo WhatsApp');
      else toast.success(data?.sent ? 'WhatsApp reenviado' : 'Nenhum responsável selecionado');
    } catch { toast.error('Não foi possível reenviar pelo WhatsApp'); }
    finally { setSending(false); }
  };

  const pending = async () => {
    const { error } = await supabase.from('tasks').update({ status: 'pending' }).eq('id', task.id);
    if (error) { toast.error('Não foi possível marcar como pendente'); return; }
    markRepliesReviewed(task.id, user?.id);
    await refreshTasks();
    toast.success('Tarefa pendente');
  };

  const isRecurring = task.type === 'routine' && task.recurrence_type !== 'none';
  const [askDelete, setAskDelete] = useState(false);

  const deleteForever = async () => {
    setAskDelete(false);
    await supabase.from('task_feedback').delete().eq('task_id', task.id);
    await supabase.from('task_proofs').delete().eq('task_id', task.id);
    await supabase.from('task_assignees').delete().eq('task_id', task.id);
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Tarefa apagada');
    await refreshTasks();
  };

  /** Repetitiva: conta como feita hoje e some da tela até a próxima repetição. */
  const clearToday = async () => {
    setAskDelete(false);
    const { error } = await supabase.from('tasks')
      .update({ status: 'completed', cleared_at: new Date().toISOString() }).eq('id', task.id);
    if (error) { toast.error('Não foi possível tirar da tela'); return; }
    markRepliesReviewed(task.id, user?.id);
    toast.success('Feita hoje. Volta na próxima repetição.');
    await refreshTasks();
  };

  const handleDelete = async () => {
    if (isRecurring) { setAskDelete(true); return; }
    if (!confirm('Apagar esta tarefa? Não dá para desfazer.')) return;
    await deleteForever();
  };

  return <Card data-task-id={task.id} className={cn('p-4 space-y-3 border-l-4', statusBorder[status], highlighted && 'ring-2 ring-primary')}>
    <h3 className={cn('text-[20px] font-bold leading-snug whitespace-pre-wrap', status === 'completed' && 'line-through text-muted-foreground')}>{task.title}</h3>
    <div className="flex flex-wrap items-center gap-2">
      {assignees.map(p => <span key={p.id} title={p.full_name ?? 'Sem nome'} className="flex size-10 items-center justify-center rounded-full bg-control-selected text-control-selected-foreground text-sm font-bold">{p.initials || profileInitials(p.full_name)}</span>)}
      {late > 0 ? <span className="text-sm font-semibold text-destructive">{lateLabel(late)}</span> : task.due_date && <span className="text-sm text-muted-foreground">{new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
    </div>
    <div className="grid grid-cols-2 gap-2">
      {status !== 'completed' ? <Button onClick={complete} className={cn("min-w-0 w-full", latestDone && "ring-4 ring-status-completed ring-offset-2 animate-pulse", "!bg-status-completed !border-status-completed !text-white font-bold hover:!bg-status-completed")}><CheckCircle className="size-7 shrink-0" /> Concluída</Button> : <Button variant="outline" onClick={pending} className="min-w-0 w-full"><RotateCcw className="h-6 w-6 shrink-0" /> Pendente</Button>}
      <Button variant="outline" onClick={resend} disabled={sending} className="min-w-0 w-full"><RotateCcw className="h-6 w-6 shrink-0" /> Reenviar</Button>
    </div>
    <div className="flex gap-2">
      <Button variant="outline" size="icon" title="Editar" aria-label="Editar tarefa" onClick={() => navigate(`/tasks/${task.id}/edit`)}><Pencil className="h-6 w-6" /></Button>
      <Button variant="destructive" size="icon" title="Apagar" aria-label="Apagar tarefa" onClick={handleDelete}><Trash2 className="h-6 w-6" /></Button>
    </div>
    <Button type="button" variant="ghost" className="w-full justify-start" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}><MessageSquare className="h-6 w-6" /> Respostas {unreviewed > 0 && <span className="rounded-full bg-control-selected text-control-selected-foreground px-2.5 py-0.5 text-sm font-bold">💬 {unreviewed}</span>} {expanded ? <ChevronUp className="h-6 w-6 ml-auto" /> : <ChevronDown className="h-6 w-6 ml-auto" />}</Button>
    {expanded && <div className="border-t border-border pt-3 space-y-3">
      {replies.length === 0 && <p className="text-base text-muted-foreground">Nenhuma resposta ainda.</p>}
      {replies.map(r => {
        const who = employees.find(e => e.id === r.user_id);
        return <div key={r.id} className="flex gap-3 border-b border-border pb-3">
          <span title={who?.full_name ?? ''} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-control-selected text-control-selected-foreground text-sm font-bold">{who?.initials || profileInitials(who?.full_name)}</span>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-base whitespace-pre-wrap">{r.audio_url && !r.text && <Mic className="inline h-5 w-5 mr-1" />}{r.text || r.audio_transcription || (r.image_url ? 'Foto' : 'Áudio')}</p>
            {r.audio_url && <audio controls src={r.audio_url} className="w-full" />}
            {r.image_url && <a href={r.image_url} target="_blank" rel="noreferrer"><img src={r.image_url} alt="Foto da resposta" className="max-h-48 rounded-lg" /></a>}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">{replyTime(r.created_at)}</span>
              {r.suggested_status === 'done'
                ? <span className="rounded-full bg-status-completed px-2.5 py-0.5 font-semibold text-white">Parece concluída</span>
                : <span className="rounded-full bg-status-attention px-2.5 py-0.5 font-semibold text-white">Parece pendente</span>}
            </div>
          </div>
        </div>;
      })}
      {(task.audio_url || task.image_urls.length > 0) && <MediaPreview imageUrls={task.image_urls} audioUrl={task.audio_url} />}
      {proofs.map(proof => <div key={proof.id} className="space-y-2 border-b border-border pb-2 text-base"><p>{proof.comment || proof.audio_transcription || 'Comprovação'}</p><MediaPreview imageUrls={proof.photo_urls} audioUrl={proof.audio_url} /></div>)}
    </div>}
    <AlertDialog open={askDelete} onOpenChange={setAskDelete}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[22px]">Tarefa que se repete</AlertDialogTitle>
          <AlertDialogDescription className="text-lg">{task.title}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-3">
          <Button onClick={clearToday} className="h-16 text-lg font-bold !bg-status-completed !border-status-completed !text-white"><CheckCircle className="size-7" /> Tirar da tela (volta na próxima)</Button>
          <Button variant="destructive" onClick={deleteForever} className="h-16 text-lg"><Trash2 className="size-7" /> Apagar para sempre</Button>
          <Button variant="outline" onClick={() => setAskDelete(false)} className="h-14 text-lg">Cancelar</Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  </Card>;
}
