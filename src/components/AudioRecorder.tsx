import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface AudioRecorderProps {
  audioBlob: Blob | null;
  onAudioChange: (blob: Blob | null) => void;
  transcription?: string;
  onTranscriptionChange?: (text: string) => void;
  onBusyChange?: (busy: boolean) => void;
  className?: string;
}

export default function AudioRecorder({ audioBlob, onAudioChange, transcription, onTranscriptionChange, onBusyChange, className }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const audioUrlRef = useRef<string | null>(null);

  const transcribeAudio = useCallback(async (blob: Blob) => {
    if (!onTranscriptionChange) return;
    if (blob.size < 2048) {
      console.warn('Gravação vazia, ignorando transcrição');
      return;
    }
    setTranscribing(true);
    onBusyChange?.(true);
    try {
      const mt = blob.type || 'audio/webm';
      const ext = mt.includes('mp4') ? 'mp4' : mt.includes('wav') ? 'wav' : mt.includes('mpeg') ? 'mp3' : 'webm';
      const form = new FormData();
      form.append('file', blob, `recording.${ext}`);

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: form,
      });

      if (error) throw error;
      if (data?.transcription) {
        onTranscriptionChange(data.transcription);
      }
    } catch (err) {
      console.error('Transcription error:', err);
    } finally {
      setTranscribing(false);
      onBusyChange?.(false);
    }
  }, [onTranscriptionChange, onBusyChange]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType =
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported?.('audio/mp4')
            ? 'audio/mp4'
            : '';
      const mediaRecorder = preferredType
        ? new MediaRecorder(stream, { mimeType: preferredType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setDuration(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const type = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        onAudioChange(blob);
        stream.getTracks().forEach(t => t.stop());
        clearInterval(timerRef.current);
        // Auto-transcribe
        transcribeAudio(blob);
      };

      mediaRecorder.start();
      setRecording(true);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      console.error('Microfone não disponível');
    }
  }, [onAudioChange, transcribeAudio]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  const removeAudio = () => {
    onAudioChange(null);
    onTranscriptionChange?.('');
    setDuration(0);
  };

  // Create object URL for playback
  if (audioBlob && !audioUrlRef.current) {
    audioUrlRef.current = URL.createObjectURL(audioBlob);
  }
  if (!audioBlob && audioUrlRef.current) {
    URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
  }

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className={cn('space-y-2', className)}>
      {!audioBlob && !recording && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 text-base"
          onClick={startRecording}
        >
          <Mic className="h-6 w-6" />
          Gravar
        </Button>
      )}

      {recording && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
          <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
          <span className="text-sm font-medium text-destructive">{formatTime(duration)}</span>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="gap-1 text-sm ml-auto"
            onClick={stopRecording}
          >
            <Square className="h-6 w-6" />
            Parar
          </Button>
        </div>
      )}

      {audioBlob && !recording && (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-muted border border-border">
          <audio src={audioUrlRef.current || undefined} controls className="h-14 flex-1" />
           <Button type="button" variant="ghost" size="icon" aria-label="Apagar áudio" onClick={removeAudio}>
            <Trash2 className="h-6 w-6 text-muted-foreground" />
          </Button>
           <Button type="button" variant="ghost" size="icon" aria-label="Gravar novamente" onClick={() => { removeAudio(); startRecording(); }}>
            <RotateCcw className="h-6 w-6 text-muted-foreground" />
          </Button>
        </div>
      )}

      {/* Transcription */}
      {transcribing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Transcrevendo áudio...
        </div>
      )}

      {!transcribing && transcription && (
        <div className="bg-muted/50 rounded-lg p-2.5 text-sm border border-border">
          <p className="font-medium text-foreground mb-0.5">Transcrição:</p>
          <p className="text-muted-foreground">{transcription}</p>
        </div>
      )}
    </div>
  );
}
