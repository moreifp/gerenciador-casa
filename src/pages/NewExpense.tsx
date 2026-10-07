import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PhotoUploader from '@/components/PhotoUploader';
import ReceiptOCR, { type OCRResult } from '@/components/ReceiptOCR';
import { CREDIT_CARD_LABELS, type CreditCardType } from '@/components/ExpenseCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

import { toast } from 'sonner';


export default function NewExpense() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const initialPhoto = (location.state as { initialPhoto?: File } | null)?.initialPhoto;
  const [photos, setPhotos] = useState<File[]>(initialPhoto ? [initialPhoto] : []);

  useEffect(() => {
    if (initialPhoto) {
      window.history.replaceState({}, '');
    }
  }, [initialPhoto]);
  const [expenseType, setExpenseType] = useState<'reimbursement' | 'company_money'>('reimbursement');
  const [creditCard, setCreditCard] = useState<CreditCardType | 'none'>('none');
  const [vendorName, setVendorName] = useState('');
  const [receiptDate, setReceiptDate] = useState('');
  const [amountSpent, setAmountSpent] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [description, setDescription] = useState('');
  const [ocrRawText, setOcrRawText] = useState('');
  const [submitting, setSubmitting] = useState(false);


  const changeAmount =
    expenseType === 'company_money' && amountReceived && amountSpent
      ? Math.max(0, parseFloat(amountReceived) - parseFloat(amountSpent))
      : null;

  const handleOCRResult = (result: OCRResult) => {
    if (result.vendor_name) setVendorName(result.vendor_name);
    if (result.receipt_date) setReceiptDate(result.receipt_date);
    if (result.total_amount != null) setAmountSpent(result.total_amount.toFixed(2));
    if (result.raw_text) setOcrRawText(result.raw_text);
    if (result.items?.length) {
      const itemsText = result.items.map(i => `${i.description}${i.amount ? ` - R$${i.amount.toFixed(2)}` : ''}`).join('\n');
      setDescription(prev => prev ? `${prev}\n\n${itemsText}` : itemsText);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!amountSpent || parseFloat(amountSpent) <= 0) {
      toast.error('Informe o valor gasto');
      return;
    }

    setSubmitting(true);
    try {
      // Upload photos
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const ext = photo.name.split('.').pop() || 'jpg';
        const path = `${user.id}/${name}.${ext}`;
        const { error: upErr } = await supabase.storage.from('receipt-images').upload(path, photo, { cacheControl: '3600', upsert: false });
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
        const { data: urlData } = supabase.storage.from('receipt-images').getPublicUrl(path);
        photoUrls.push(urlData.publicUrl);
      }

      const { error } = await supabase.from('expense_reports').insert({
        user_id: user.id,
        receipt_photo_urls: photoUrls,
        expense_type: expenseType,
        credit_card: creditCard === 'none' ? null : creditCard,
        vendor_name: vendorName || null,
        receipt_date: receiptDate || null,
        amount_spent: parseFloat(amountSpent),
        amount_received: expenseType === 'company_money' && amountReceived ? parseFloat(amountReceived) : null,
        change_amount: changeAmount,
        description: description || null,
        ocr_raw_text: ocrRawText || null,
      } as any);


      if (error) throw error;

      toast.success('Prestação de contas enviada!');
      navigate('/expenses');
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao enviar prestação');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/expenses')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Nova Prestação de Contas</h1>
      </div>

      {/* Photos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Foto do recibo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <PhotoUploader photos={photos} onPhotosChange={setPhotos} maxPhotos={3} />
          {photos.length > 0 && (
            <ReceiptOCR imageFile={photos[0]} onResult={handleOCRResult} />
          )}
        </CardContent>
      </Card>

      {/* Expense type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tipo de gasto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={expenseType} onValueChange={(v) => setExpenseType(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reimbursement">Preciso de reembolso</SelectItem>
              <SelectItem value="company_money">Usei dinheiro da empresa</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-2">
            <Label>Cartão de crédito</Label>
            <Select value={creditCard} onValueChange={(v) => setCreditCard(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {Object.entries(CREDIT_CARD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          <div className="space-y-2">
            <Label>Valor gasto (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amountSpent}
              onChange={(e) => setAmountSpent(e.target.value)}
            />
          </div>

          {expenseType === 'company_money' && (
            <>
              <div className="space-y-2">
                <Label>Valor recebido (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                />
              </div>
              {changeAmount != null && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">Troco a devolver:</p>
                  <p className="text-lg font-bold text-primary">R$ {changeAmount.toFixed(2)}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Estabelecimento</Label>
            <Input placeholder="Nome do local" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Data do recibo</Label>
            <Input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descrição / Observação</Label>
            <Textarea
              placeholder="Descreva o que foi comprado..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Button className="w-full gap-2" onClick={handleSubmit} disabled={submitting}>
        <Send className="h-4 w-4" />
        {submitting ? 'Enviando...' : 'Enviar para aprovação'}
      </Button>
    </div>
  );
}
