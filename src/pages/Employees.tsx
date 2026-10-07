import { useState } from 'react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { UserPlus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { profileInitials } from '@/lib/initials';
import { formatPhone, normalizePhone, isValidPhone } from '@/lib/phone';

export default function Employees() {
  const { employees, refreshEmployees } = useApp();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [initials, setInitials] = useState('');
  const [initialsTouched, setInitialsTouched] = useState(false);

  const reset = () => { setName(''); setPhone(''); setRoleTitle(''); setInitials(''); setInitialsTouched(false); };

  const onName = (v: string) => {
    setName(v);
    if (!initialsTouched) setInitials(v.trim() ? profileInitials(v) : '');
  };

  const save = async () => {
    if (!name.trim()) return toast.error('Digite o nome');
    if (!isValidPhone(phone)) return toast.error('WhatsApp inválido');
    if (initials && !/^\p{L}{2}$/u.test(initials)) return toast.error('Iniciais: duas letras');
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('create-employee-account', {
      body: { full_name: name.trim(), phone: normalizePhone(phone), role_title: roleTitle.trim(), initials },
    });
    setSaving(false);
    if (data?.error === 'duplicate_phone') return toast.error('Esse WhatsApp já está cadastrado');
    if (error || data?.error) {
      const details = error instanceof FunctionsHttpError ? await error.context.text() : (error?.message || data?.error || '');
      if (details.includes('duplicate_phone')) return toast.error('Esse WhatsApp já está cadastrado');
      return toast.error('Não foi possível salvar');
    }
    toast.success(`${name.trim().split(' ')[0]} cadastrado(a)`);
    reset();
    setOpen(false);
    await refreshEmployees();
  };

  const list = employees.filter(e => e.id !== user?.id);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[26px] font-bold font-display">Equipe</h1>
        <button
          type="button"
          aria-label="Adicionar funcionário"
          onClick={() => setOpen(true)}
          className="h-16 w-16 shrink-0 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg active:scale-95 transition"
        >
          <UserPlus className="h-7 w-7" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map(emp => (
          <Card
            key={emp.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/employees/${emp.id}`)}
            onKeyDown={e => e.key === 'Enter' && navigate(`/employees/${emp.id}`)}
            className="p-4 flex items-center gap-4 cursor-pointer active:bg-muted"
          >
            <div className="h-12 w-12 shrink-0 rounded-full bg-foreground text-background flex items-center justify-center text-lg font-bold">
              {(emp as any).initials || profileInitials(emp.full_name)}
            </div>
            <div className="min-w-0">
              <p className="text-[20px] font-bold leading-tight">{emp.full_name || 'Sem nome'}</p>
              {emp.role_title && <p className="text-base text-muted-foreground">{emp.role_title}</p>}
              {emp.phone && <p className="text-base">{formatPhone(emp.phone)}</p>}
            </div>
          </Card>
        ))}
        {list.length === 0 && (
          <Card className="p-8 col-span-full text-center text-lg text-muted-foreground">Ninguém cadastrado. Toque em +</Card>
        )}
      </div>

      <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <SheetHeader><SheetTitle className="text-[22px]">Novo funcionário</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="emp-name">Nome</Label>
              <Input id="emp-name" value={name} onChange={e => onName(e.target.value)} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-phone">WhatsApp</Label>
              <Input id="emp-phone" type="tel" inputMode="tel" placeholder="+55 (xx) 9xxxx-xxxx" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-role">Função</Label>
              <Input id="emp-role" placeholder="Ex.: Arrumadeira" value={roleTitle} onChange={e => setRoleTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-initials">Iniciais</Label>
              <Input id="emp-initials" className="w-24 uppercase" maxLength={2} value={initials}
                onChange={e => { setInitialsTouched(true); setInitials(e.target.value.toLocaleUpperCase('pt-BR')); }} />
            </div>
            <Button onClick={save} disabled={saving} className="w-full h-14 text-lg font-bold !border-status-completed !bg-status-completed !text-white hover:!bg-status-completed">
              {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Salvar'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
