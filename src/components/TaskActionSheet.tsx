import { useRef, useState } from 'react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import AudioRecorder from '@/components/AudioRecorder';
import { Camera, Mic, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { uploadTaskMedia } from '@/lib/uploadMedia';
import { toast } from 'sonner';

export type SheetMode = 'completion' | 'question';

interface Props {
  mode: SheetMode | null;
  taskId: string;
  onClose: () => void;
}

export default function TaskActionSheet({ mode, taskId, onClose }: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showAudio, setShowAudio] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState('');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const isQuestion = mode === 'question';

  const reset = () => {
    setShowAudio(false); setAudioBlob(null); setTranscription(''); setComment(''); setPhotos([]);
  };
  const close = () => { reset(); onClose(); };

  const save = async (files: File[], blob: Blob | null) => {
    if (!user || !mode) return;
    setBusy(true);
    try {
      const photoUrls = await Promise.all(files.map(f => uploadTaskMedia('task-images', `proofs/${taskId}`, f)));
      const audioUrl = blob ? await uploadTaskMedia('task-audio', `proofs/${taskId}`, blob, 'proof') : null;
      const { data: proof, error } = await supabase.from('task_proofs').insert({
        task_id: taskId,
        submitted_by: user.id,
        kind: mode,
        comment: comment.trim() || null,
        photo_urls: photoUrls,
        audio_url: audioUrl,
        audio_transcription: transcription || null,
      }).select('id').single();
      if (error) throw error;

      if (mode === 'completion' && proof) {
        const { data: c } = await supabase.from('task_completions')
          .select('id').eq('task_id', taskId).eq('completed_by', user.id).is('undone_at', null)
          .order('completed_at', { ascending: false }).limit(1).maybeSingle();
        if (c) await supabase.from('task_completions').update({ proof_id: proof.id }).eq('id', c.id);
      }
      toast.success(isQuestion ? 'Dúvida enviada' : 'Enviado');
      close();
    } catch (e: any) {
      toast.error('Não foi possível enviar');
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (fileRef.current) fileRef.current.value = '';
    if (!files.length) return;
    if (isQuestion) setPhotos(p => [...p, ...files].slice(0, 5));
    else save(files, null);
  };

  const canSendQuestion = !!comment.trim() || !!audioBlob || photos.length > 0;

  return (
    <Drawer open={!!mode} onOpenChange={(o) => { if (!o) close(); }}>
      <DrawerContent className="pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="px-4 pt-2 space-y-4">
          <DrawerTitle className="font-display text-xl text-center">
            {isQuestion ? 'Dúvida' : 'Quer mandar foto ou áudio?'}
          </DrawerTitle>

          <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple={isQuestion} className="hidden" onChange={onPhoto} />

          {isQuestion && (
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Escreva aqui…"
              rows={2}
              maxLength={500}
              className="text-base"
            />
          )}

          {showAudio && (
            <AudioRecorder audioBlob={audioBlob} onAudioChange={setAudioBlob} transcription={transcription} onTranscriptionChange={setTranscription} />
          )}

          {isQuestion && photos.length > 0 && (
            <p className="text-sm text-muted-foreground text-center">📷 {photos.length}</p>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Button variant="outline" className="h-20 flex-col gap-1 text-base" disabled={busy} onClick={() => fileRef.current?.click()}>
              <Camera className="size-7" /> Foto
            </Button>
            <Button variant={showAudio ? 'secondary' : 'outline'} className="h-20 flex-col gap-1 text-base" disabled={busy} onClick={() => setShowAudio(s => !s)}>
              <Mic className="size-7" /> Áudio
            </Button>
            <Button variant="ghost" className="h-20 flex-col gap-1 text-base" disabled={busy} onClick={close}>
              <X className="size-7" /> Fechar
            </Button>
          </div>

          {(isQuestion || audioBlob) && (
            <Button
              className="w-full h-14 text-lg gap-2"
              disabled={busy || (isQuestion ? !canSendQuestion : !audioBlob)}
              onClick={() => save(photos, audioBlob)}
            >
              {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
              Enviar
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
