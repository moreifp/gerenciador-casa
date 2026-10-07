import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Receipt, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import ExpenseCard, { type ExpenseReport, CREDIT_CARD_LABELS } from '@/components/ExpenseCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useApp } from '@/lib/context';
import { toast } from 'sonner';

export default function Expenses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role, employees } = useApp();
  const [expenses, setExpenses] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoTaken = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      navigate('/expenses/new', { state: { initialPhoto: file } });
    }
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Detail dialog
  const [selected, setSelected] = useState<ExpenseReport | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchExpenses = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('expense_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setExpenses(data as unknown as ExpenseReport[]);
    setLoading(false);
  };

  useEffect(() => { fetchExpenses(); }, [user]);

  const filtered = expenses.filter(e => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (role === 'admin' && employeeFilter !== 'all' && e.user_id !== employeeFilter) return false;
    return true;
  });

  const getEmployeeName = (userId: string) =>
    employees.find(e => e.id === userId)?.full_name || 'Funcionário';

  const handleAction = async (action: 'approved' | 'rejected') => {
    if (!selected || !user) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('expense_reports')
        .update({
          status: action,
          admin_comment: adminComment || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        } as any)
        .eq('id', selected.id);

      if (error) throw error;
      toast.success(action === 'approved' ? 'Prestação aprovada!' : 'Prestação rejeitada');
      setSelected(null);
      setAdminComment('');
      fetchExpenses();
    } catch (e: any) {
      toast.error('Erro ao atualizar prestação');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold flex items-center gap-2">
          <Receipt className="h-5 w-5" /> Prestações de Contas
        </h1>
        <Button size="sm" className="gap-2" onClick={() => navigate('/expenses/new')}>
          <PlusCircle className="h-4 w-4" /> Nova
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="h-4 w-4" />
          Tirar foto
        </Button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoTaken}
          className="hidden"
        />

        {role === 'admin' && (
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Funcionário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>{emp.full_name || emp.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="size-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma prestação encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(exp => (
            <ExpenseCard
              key={exp.id}
              expense={exp}
              employeeName={role === 'admin' ? getEmployeeName(exp.user_id) : undefined}
              onClick={() => { setSelected(exp); setAdminComment(exp.admin_comment || ''); }}
            />
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Prestação</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {/* Photos */}
              {selected.receipt_photo_urls?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {selected.receipt_photo_urls.map((url, i) => (
                    <img key={i} src={url} alt={`Recibo ${i + 1}`} className="h-40 rounded-lg object-cover" />
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Estabelecimento</span>
                  <p className="font-medium">{selected.vendor_name || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Data</span>
                  <p className="font-medium">{selected.receipt_date || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor gasto</span>
                  <p className="font-medium">R$ {selected.amount_spent?.toFixed(2) || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo</span>
                  <p className="font-medium">{selected.expense_type === 'reimbursement' ? 'Reembolso' : 'Dinheiro empresa'}</p>
                </div>
                {selected.credit_card && (
                  <div>
                    <span className="text-muted-foreground">Cartão</span>
                    <p className="font-medium">{CREDIT_CARD_LABELS[selected.credit_card]}</p>
                  </div>
                )}
                {selected.expense_type === 'company_money' && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Valor recebido</span>
                      <p className="font-medium">R$ {selected.amount_received?.toFixed(2) || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Troco</span>
                      <p className="font-medium">R$ {selected.change_amount?.toFixed(2) || '0.00'}</p>
                    </div>
                  </>
                )}
              </div>

              {selected.description && (
                <div>
                  <span className="text-sm text-muted-foreground">Descrição</span>
                  <p className="text-sm whitespace-pre-wrap">{selected.description}</p>
                </div>
              )}

              {/* Admin actions */}
              {role === 'admin' && selected.status === 'pending' && (
                <div className="space-y-3 border-t pt-3">
                  <div className="space-y-2">
                    <Label>Comentário (opcional)</Label>
                    <Textarea
                      value={adminComment}
                      onChange={(e) => setAdminComment(e.target.value)}
                      placeholder="Comentário sobre a prestação..."
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleAction('approved')}
                      disabled={actionLoading}
                    >
                      Aprovar
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleAction('rejected')}
                      disabled={actionLoading}
                    >
                      Rejeitar
                    </Button>
                  </div>
                </div>
              )}

              {selected.admin_comment && selected.status !== 'pending' && (
                <div className="border-t pt-3">
                  <span className="text-sm text-muted-foreground">Comentário do admin</span>
                  <p className="text-sm">{selected.admin_comment}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
