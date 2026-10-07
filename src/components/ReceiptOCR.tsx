import { useState } from 'react';
import { Loader2, ScanText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OCRResult {
  vendor_name: string | null;
  receipt_date: string | null;
  total_amount: number | null;
  items: { description: string; amount?: number }[];
  raw_text: string | null;
}

interface Props {
  imageFile: File | null;
  onResult: (result: OCRResult) => void;
  disabled?: boolean;
}

export default function ReceiptOCR({ imageFile, onResult, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runOCR = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      const { data, error: fnError } = await supabase.functions.invoke('ocr-receipt', {
        body: { image_base64: base64 },
      });

      if (fnError) throw new Error(fnError.message);

      if (data?.error) {
        setError(data.error);
        toast.error(data.error);
        return;
      }

      const result: OCRResult = {
        vendor_name: data.vendor_name || null,
        receipt_date: data.receipt_date || null,
        total_amount: data.total_amount ?? null,
        items: data.items || [],
        raw_text: data.raw_text || null,
      };

      onResult(result);
      toast.success('Dados do recibo extraídos com sucesso!');
    } catch (e: any) {
      console.error('OCR error:', e);
      setError('Falha ao processar recibo. Tente novamente.');
      toast.error('Falha ao processar recibo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={runOCR}
        disabled={!imageFile || loading || disabled}
        className="gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}
        {loading ? 'Processando recibo...' : 'Extrair dados do recibo (OCR)'}
      </Button>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}
    </div>
  );
}
