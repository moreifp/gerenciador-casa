import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, CalendarDays, Camera, Repeat2, X } from 'lucide-react';
import { format } from 'date-fns';
import { useApp, type Task } from '@/lib/context';
import { useAuth } from '@/lib/auth';
import { spToday } from '@/lib/dates';
import { profileInitials } from '@/lib/initials';
import { assignmentChanges } from '@/lib/assignmentChanges';
import { supabase } from '@/integrations/supabase/client';
import { uploadTaskMedia } from '@/lib/uploadMedia';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import AudioRecorder from '@/components/AudioRecorder';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';
const tomorrow = () => {
  const [y, m, d] = spToday().split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};
const scrollFocusedField = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const field = e.currentTarget;
  setTimeout(() => { if (field.isConnected && document.activeElement === field) field.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 300);
};

export default function TaskForm({ initialTask }: { initialTask?: Task }) {
  const navigate = useNavigate();
  const { employees, refreshTasks } = useApp();
  const { user } = useAuth();
  const [title, setTitle] = useState(initialTask?.title ?? '');
  const [dueDate, setDueDate] = useState(initialTask?.due_date ?? spToday());
  const [assigneeIds, setAssigneeIds] = useState<string[]>(initialTask?.assignee_ids ?? []);
  const [recurrenceType, setRecurrenceType] = useState<Recurrence>(initialTask?.recurrence_type === 'custom' ? 'weekly' : initialTask?.recurrence_type ?? 'none');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(initialTask?.recurrence_days ?? []);
  const [repeatOpen, setRepeatOpen] = useState(initialTask?.recurrence_type !== undefined && initialTask.recurrence_type !== 'none');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [existingAudio, setExistingAudio] = useState(initialTask?.audio_url ?? null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioTranscription, setAudioTranscription] = useState(initialTask?.audio_transcription ?? '');
  const [transcribing, setTranscribing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingPhoto, setExistingPhoto] = useState<string | null>(initialTask?.image_urls?.[0] ?? null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const photoPreview = photoFile ? URL.createObjectURL(photoFile) : existingPhoto;
  const people = employees.filter(e => e.full_name || e.id === user?.id);
  const selectedNames = people.filter(e => assigneeIds.includes(e.id)).map(e => e.full_name?.split(/\s+/)[0] ?? 'Sem nome');

  const handleTranscription = (text: string) => {
    if (!text.trim()) return;
    setAudioTranscription(text);
    setTitle(prev => [prev.trim(), text.trim()].filter(Boolean).join(' '));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user || saving || transcribing) return;
    if (!assigneeIds.length) { toast.error('Escolha quem vai fazer'); return; }
    if (recurrenceType === 'weekly' && !recurrenceDays.length) { toast.error('Marque pelo menos um dia'); return; }
    setSaving(true);
    try {
      const taskId = initialTask?.id ?? crypto.randomUUID();
      let audioUrl = existingAudio;
      if (audioBlob) audioUrl = await uploadTaskMedia('task-audio', `tasks/${taskId}`, audioBlob);
      let photoUrl = existingPhoto;
      if (photoFile) photoUrl = await uploadTaskMedia('task-images', `tasks/${taskId}`, photoFile);
      const payload = {
        title: title.trim(), description: null, type: recurrenceType === 'none' ? 'one_off' as const : 'routine' as const,
        priority: 'medium' as const, due_date: dueDate, is_shared: false,
        recurrence_type: recurrenceType, recurrence_days: recurrenceType === 'weekly' ? recurrenceDays : [],
        image_urls: photoUrl ? [photoUrl] : [], audio_url: audioUrl,
        audio_transcription: audioUrl ? audioTranscription || null : null,
      };
      if (initialTask) {
        const { error } = await supabase.from('tasks').update(payload).eq('id', taskId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tasks').insert({ ...payload, id: taskId, created_by: user.id });
        if (error) throw error;
      }
      const { added, removed } = assignmentChanges(initialTask?.assignee_ids ?? [], assigneeIds);
      if (added.length) {
        const { error } = await supabase.from('task_assignees').insert(added.map(user_id => ({ task_id: taskId, user_id })));
        if (error) throw error;
      }
      if (removed.length) {
        const { error } = await supabase.from('task_assignees').delete().eq('task_id', taskId).in('user_id', removed);
        if (error) throw error;
      }
      await refreshTasks();
      const targets = initialTask ? added : assigneeIds;
      if (targets.length) {
        const { data, error } = await supabase.functions.invoke('send-whatsapp', { body: { task_id: taskId, recipient_ids: targets } });
        if (error || data?.failed) toast.error('Não foi possível enviar para todos pelo WhatsApp');
        else toast.success('Tarefa enviada');
      } else toast.success('Tarefa salva');
      navigate('/tasks');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar');
    } finally { setSaving(false); }
  };

  const archiveTask = async () => {
    if (!initialTask) return;
    const { error } = await supabase.from('tasks').update({ is_archived: !initialTask.is_archived }).eq('id', initialTask.id);
    if (error) { toast.error('Não foi possível arquivar'); return; }
    await refreshTasks();
    navigate('/tasks');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-[26px] font-bold font-display">{initialTask ? 'Editar tarefa' : 'Nova tarefa'}</h1>
      <form onSubmit={handleSubmit} className="space-y-8 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <section className="space-y-3">
          <Label htmlFor="task-text">O quê</Label>
          <Textarea id="task-text" autoFocus required value={title} onChange={e => { setTitle(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px`; }} onFocus={scrollFocusedField} placeholder="O que precisa ser feito?" className="min-h-32 text-[20px] leading-relaxed resize-none" />
          {existingAudio && !audioBlob && <div className="flex items-center gap-2"><audio controls src={existingAudio} className="min-w-0 flex-1 h-14" /><Button type="button" variant="destructive" size="icon" aria-label="Remover áudio" onClick={() => { setExistingAudio(null); setAudioTranscription(''); }}><X className="h-6 w-6" /></Button></div>}
          {photoPreview && <div className="relative w-40"><img src={photoPreview} alt="Foto da tarefa" className="w-40 h-40 object-cover rounded-lg border-[1.5px] border-control-border" /><Button type="button" variant="destructive" size="icon" aria-label="Remover foto" className="absolute -top-3 -right-3" onClick={() => { setPhotoFile(null); setExistingPhoto(null); }}><X className="h-6 w-6" /></Button></div>}
          <div className="flex gap-3 items-start">
            <div className="flex-1 min-w-0"><AudioRecorder audioBlob={audioBlob} onAudioChange={setAudioBlob} onTranscriptionChange={handleTranscription} onBusyChange={setTranscribing} /></div>
            <Button type="button" variant="outline" className="shrink-0 gap-2" asChild>
              <label><Camera className="h-6 w-6" /> Foto<input type="file" accept="image/*" capture="environment" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) setPhotoFile(f); e.target.value = ''; }} /></label>
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <Label>Quem</Label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {people.map(person => {
              const selected = assigneeIds.includes(person.id);
              return <Button key={person.id} type="button" variant="outline" title={person.full_name ?? 'Sem nome'} aria-label={person.full_name ?? 'Sem nome'} aria-pressed={selected} onClick={() => setAssigneeIds(prev => selected ? prev.filter(id => id !== person.id) : [...prev, person.id])} className={cn('w-full aspect-square min-h-16 min-w-16 p-0 text-[22px] font-bold border-[1.5px] border-control-border rounded-md', selected ? '!bg-control-selected !text-control-selected-foreground' : '!bg-control !text-control-foreground')}>{person.initials || profileInitials(person.full_name)}</Button>;
            })}
          </div>
          {selectedNames.length > 0 && <p className="text-sm text-muted-foreground">{selectedNames.join(', ')}</p>}
        </section>

        <section className="space-y-3">
          <Label>Quando</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button type="button" variant="outline" onClick={() => { setDueDate(spToday()); setDatePickerOpen(false); }} className={cn('min-w-0 px-1', dueDate === spToday() && '!bg-control-selected !text-control-selected-foreground')}>Hoje</Button>
            <Button type="button" variant="outline" onClick={() => { setDueDate(tomorrow()); setDatePickerOpen(false); }} className={cn('min-w-0 px-1', dueDate === tomorrow() && '!bg-control-selected !text-control-selected-foreground')}>Amanhã</Button>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" aria-label="Escolher data" title="Escolher data" className={cn('min-w-0 px-1', ![spToday(), tomorrow()].includes(dueDate) && '!bg-control-selected !text-control-selected-foreground')}><CalendarDays className="h-6 w-6" /></Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="center">
                <Calendar
                  mode="single"
                  selected={(() => { const [y, m, d] = dueDate.split('-').map(Number); return new Date(y, m - 1, d); })()}
                  defaultMonth={(() => { const [y, m, d] = dueDate.split('-').map(Number); return new Date(y, m - 1, d); })()}
                  onSelect={(date) => { if (date) { setDueDate(format(date, 'yyyy-MM-dd')); setDatePickerOpen(false); } }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          {![spToday(), tomorrow()].includes(dueDate) && <p className="text-sm text-muted-foreground">Data escolhida: {format(new Date(dueDate + 'T12:00:00'), 'dd/MM/yyyy')}</p>}
          <Button type="button" variant="outline" onClick={() => setRepeatOpen(v => !v)} aria-expanded={repeatOpen} className="gap-2"><Repeat2 className="h-6 w-6" /> Repetir{recurrenceType !== 'none' ? ' · ' + ({ daily: 'Diária', weekly: 'Semanal', monthly: 'Mensal' } as Record<string, string>)[recurrenceType] : ''}</Button>
          {repeatOpen && <div className="space-y-3">
            <Select value={recurrenceType} onValueChange={v => setRecurrenceType(v as Recurrence)}><SelectTrigger aria-label="Recorrência"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem repetição</SelectItem><SelectItem value="daily">Diária</SelectItem><SelectItem value="weekly">Semanal</SelectItem><SelectItem value="monthly">Mensal</SelectItem></SelectContent></Select>
            {recurrenceType === 'weekly' && <div className="flex flex-wrap gap-2">{DAYS.map((day, i) => <Button type="button" variant="outline" key={i} aria-label={['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][i]} aria-pressed={recurrenceDays.includes(i)} onClick={() => setRecurrenceDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])} className={cn('h-14 w-14 rounded-full p-0', recurrenceDays.includes(i) && '!bg-control-selected !text-control-selected-foreground')}>{day}</Button>)}</div>}
          </div>}
        </section>
        {initialTask && <Button type="button" variant="outline" onClick={archiveTask} className="w-full"><Archive className="h-6 w-6" /> {initialTask.is_archived ? 'Desarquivar' : 'Arquivar'}</Button>}
        <Button type="submit" disabled={saving || transcribing} className="mt-6 w-full min-h-16 !bg-status-completed !border-status-completed !text-white text-lg font-bold hover:!bg-status-completed">{saving ? 'Enviando...' : transcribing ? 'Transcrevendo...' : 'Enviar'}</Button>
      </form>
    </div>
  );
}
