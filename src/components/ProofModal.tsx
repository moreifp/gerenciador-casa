import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import PhotoUploader from '@/components/PhotoUploader';
import AudioRecorder from '@/components/AudioRecorder';
import { uploadTaskMedia } from '@/lib/uploadMedia';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

interface ProofModalProps {
  open: boolean;
  onClose: () => void;
  targetStatus: TaskStatus;
  taskId: string;
  onSubmit: (data: { comment: string; photoUrls: string[]; audioUrl: string | null; audioTranscription: string | null }) => void;
}

export default function ProofModal({ open, onClose, targetStatus, taskId, onSubmit }: ProofModalProps) {
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioTranscription, setAudioTranscription] = useState('');
  const [uploading, setUploading] = useState(false);

  const isCompleting = targetStatus === 'completed';
  const isQuestion = targetStatus === 'in_progress';

  const handleSubmit = async () => {
    setUploading(true);
    try {
      // Upload photos
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        photoUrls = await Promise.all(
          photos.map(photo => uploadTaskMedia('task-images', `proofs/${taskId}`, photo))
        );
      }

      // Upload audio
      let audioUrl: string | null = null;
      if (audioBlob) {
        audioUrl = await uploadTaskMedia('task-audio', `proofs/${taskId}`, audioBlob, 'proof');
      }

      onSubmit({ comment, photoUrls, audioUrl, audioTranscription: audioTranscription || null });
      setComment('');
      setPhotos([]);
      setAudioBlob(null);
      setAudioTranscription('');
      onClose();
    } catch (err: any) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            {isCompleting ? (
              <>
                <CheckCircle className="h-5 w-5 text-status-completed" />
                Concluir Tarefa
              </>
            ) : isQuestion ? (
              <>
                <HelpCircle className="h-5 w-5 text-status-progress" />
                Dificuldade ou dúvida
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-status-blocked" />
                Reportar Bloqueio
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isCompleting && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Fotos de comprovação (opcional)</p>
              <PhotoUploader photos={photos} onPhotosChange={setPhotos} />
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Gravação de áudio (opcional)</p>
            <AudioRecorder audioBlob={audioBlob} onAudioChange={setAudioBlob} transcription={audioTranscription} onTranscriptionChange={setAudioTranscription} />
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">
              {isCompleting ? 'Comentário (opcional)' : isQuestion ? 'Qual sua dúvida ou dificuldade? *' : 'Descreva o problema *'}
            </p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={isCompleting ? 'Ex: Tudo feito conforme solicitado.' : isQuestion ? 'Ex: Não sei onde fica o produto de limpeza.' : 'Ex: Porta travada, preciso da chave.'}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={uploading || (!isCompleting && !comment.trim())}>
            {uploading ? 'Enviando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
