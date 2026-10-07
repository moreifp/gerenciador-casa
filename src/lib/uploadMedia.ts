import { supabase } from '@/integrations/supabase/client';

export async function uploadTaskMedia(
  bucket: 'task-images' | 'task-audio',
  folder: string,
  file: File | Blob,
  fileName?: string
): Promise<string> {
  const name = fileName || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ext = file instanceof File ? file.name.split('.').pop() : (bucket === 'task-audio' ? 'webm' : 'jpg');
  const path = `${folder}/${name}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
