import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Receipt, ArrowDownLeft, ArrowUpRight, CheckCircle2, XCircle, Clock, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useReceiptUrls } from '@/lib/receiptUrl';

export const CREDIT_CARD_LABELS: Record<string, string> = {
  hipercard: 'Hipercard',
  pao_de_acucar: 'Pão de Açúcar',
  nubank: 'Nubank',
  c6: 'C6',
};

export type CreditCardType = 'hipercard' | 'pao_de_acucar' | 'nubank' | 'c6';

export interface ExpenseReport {
  id: string;
  user_id: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  receipt_photo_urls: string[];
  description: string | null;
  expense_type: 'reimbursement' | 'company_money';
  credit_card: CreditCardType | null;
  amount_spent: number | null;
  amount_received: number | null;
  change_amount: number | null;
  vendor_name: string | null;
  receipt_date: string | null;
  ocr_raw_text: string | null;
  admin_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}


interface Props {
  expense: ExpenseReport;
  employeeName?: string;
  onClick?: () => void;
}

const statusConfig = {
  pending: { label: 'Pendente', icon: Clock, className: 'bg-warning/10 text-warning border-warning/30' },
  approved: { label: 'Aprovado', icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  rejected: { label: 'Rejeitado', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export default function ExpenseCard({ expense, employeeName, onClick }: Props) {
  const st = statusConfig[expense.status];
  const StatusIcon = st.icon;

  const thumb = useReceiptUrls(expense.receipt_photo_urls?.slice(0, 1))[0];
  return (
    <Card
      className={cn('cursor-pointer hover:shadow-md transition-shadow', onClick && 'cursor-pointer')}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {thumb ? (
              <img src={thumb} alt="Recibo" className="h-12 w-12 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Receipt className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{expense.vendor_name || 'Sem estabelecimento'}</p>
              {employeeName && <p className="text-sm text-muted-foreground">{employeeName}</p>}
              <p className="text-sm text-muted-foreground">
                {expense.receipt_date
                  ? format(new Date(expense.receipt_date + 'T12:00:00'), "dd 'de' MMM, yyyy", { locale: ptBR })
                  : format(new Date(expense.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge variant="outline" className={cn('text-sm gap-1', st.className)}>
              <StatusIcon className="h-3 w-3" />
              {st.label}
            </Badge>
            {expense.amount_spent != null && (
              <span className="font-semibold text-sm">
                R$ {expense.amount_spent.toFixed(2)}
              </span>
            )}
            <Badge variant="outline" className="text-sm gap-1">
              {expense.expense_type === 'reimbursement' ? (
                <><ArrowDownLeft className="h-3 w-3" /> Reembolso</>
              ) : (
                <><ArrowUpRight className="h-3 w-3" /> Dinheiro empresa</>
              )}
            </Badge>
            {expense.credit_card && (
              <Badge variant="outline" className="text-sm gap-1">
                <CreditCard className="h-3 w-3" /> {CREDIT_CARD_LABELS[expense.credit_card]}
              </Badge>
            )}
          </div>

        </div>

        {expense.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{expense.description}</p>
        )}

        {expense.expense_type === 'company_money' && expense.change_amount != null && expense.change_amount > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Troco: <span className="font-medium text-foreground">R$ {expense.change_amount.toFixed(2)}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
