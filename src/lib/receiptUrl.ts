import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const MARK = '/receipt-images/';

/** Caminho dentro do bucket a partir da URL gravada (formato antigo de URL pública). */
export function receiptPath(url: string): string | null {
  const i = url.indexOf(MARK);
  return i >= 0 ? decodeURIComponent(url.slice(i + MARK.length).split('?')[0]) : null;
}

/** O bucket de recibos é privado: troca cada URL gravada por um link assinado de 1 hora. */
export function useReceiptUrls(urls: string[] | null | undefined): string[] {
  const [signed, setSigned] = useState<string[]>([]);
  const key = (urls ?? []).join('|');
  useEffect(() => {
    let alive = true;
    const list = urls ?? [];
    if (!list.length) { setSigned([]); return; }
    Promise.all(list.map(async (u) => {
      const path = receiptPath(u);
      if (!path) return u;
      const { data } = await supabase.storage.from('receipt-images').createSignedUrl(path, 3600);
      return data?.signedUrl ?? '';
    })).then((r) => { if (alive) setSigned(r.filter(Boolean)); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return signed;
}
