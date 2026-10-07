import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, MapPin, CreditCard, AlertTriangle, FileText, Upload, Loader2, Trash2, Download, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { profileInitials } from '@/lib/initials';
import { formatPhone, normalizePhone, isValidPhone } from '@/lib/phone';
import { useApp } from '@/lib/context';

const CATEGORY_LABELS: Record<string, string> = {
  rg: 'RG',
  cnh: 'CNH',
  ctps: 'CTPS',
  contrato: 'Contrato',
  atestado: 'Atestado',
  comprovante_residencia: 'Comprovante de Residência',
  certidao: 'Certidão',
  outro: 'Outro',
};

interface EmployeeDoc {
  id: string;
  category: string;
  label: string | null;
  file_url: string;
  file_name: string;
  created_at: string;
}

interface ProfileData {
  id: string;
  initials: string | null;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  role_title: string | null;
  photo_url: string | null;
  cpf: string | null;
  admission_date: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  bank_details: any;
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role, refreshEmployees } = useApp();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [initials, setInitials] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('');
  const [savingBasics, setSavingBasics] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [docs, setDocs] = useState<EmployeeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('outro');
  const [docLabel, setDocLabel] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    if (!id) return;
    const [profileRes, docsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('employee_documents').select('*').eq('user_id', id).order('created_at', { ascending: false }),
    ]);
    if (profileRes.data) {
      setProfile(profileRes.data as any);
      setInitials(profileRes.data.initials || profileInitials(profileRes.data.full_name));
      setEditName(profileRes.data.full_name || '');
      setEditPhone(formatPhone(profileRes.data.phone || ''));
      setEditRole(profileRes.data.role_title || '');
    }
    if (docsRes.data) {
      setDocs(docsRes.data as any);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !user) return;
    setUploading(true);

    const ext = file.name.split('.').pop();
    const path = `${id}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from('profile-documents').upload(path, file);
    if (uploadErr) {
      toast.error('Erro no upload: ' + uploadErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('profile-documents').getPublicUrl(path);

    const { error: insertErr } = await supabase.from('employee_documents').insert({
      user_id: id,
      uploaded_by: user.id,
      category: category as any,
      label: docLabel || null,
      file_url: urlData.publicUrl,
      file_name: file.name,
    });

    if (insertErr) {
      toast.error('Erro ao salvar documento: ' + insertErr.message);
    } else {
      toast.success('Documento enviado!');
      setDocLabel('');
      await fetchData();
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (docId: string) => {
    const { error } = await supabase.from('employee_documents').delete().eq('id', docId);
    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
    } else {
      toast.success('Documento excluído');
      setDocs(d => d.filter(doc => doc.id !== docId));
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }

  if (!profile) {
    return <div className="text-center text-muted-foreground py-12">Funcionário não encontrado.</div>;
  }

  const bank = profile.bank_details || {};

  const saveBasics = async () => {
    if (!id) return;
    if (!editName.trim()) { toast.error('Digite o nome'); return; }
    if (!isValidPhone(editPhone)) { toast.error('WhatsApp inválido'); return; }
    if (!/^[\p{L}]{2}$/u.test(initials.trim())) { toast.error('Iniciais: duas letras'); return; }
    const phone = normalizePhone(editPhone);
    const { data: others } = await supabase.from('profiles').select('id, phone').neq('id', id).not('phone', 'is', null);
    if ((others || []).some(o => normalizePhone(o.phone || '') === phone)) { toast.error('Esse WhatsApp já está cadastrado'); return; }
    setSavingBasics(true);
    const value = initials.trim().toLocaleUpperCase('pt-BR');
    const { error } = await supabase.from('profiles').update({ full_name: editName.trim(), phone, role_title: editRole.trim() || null }).eq('id', id);
    // Separate update: the initials trigger recalculates when full_name changes.
    const { error: e2 } = error ? { error } : await supabase.from('profiles').update({ initials: value }).eq('id', id);
    setSavingBasics(false);
    if (error || e2) { toast.error('Não foi possível salvar'); return; }
    setProfile(p => p ? { ...p, full_name: editName.trim(), phone, role_title: editRole.trim() || null, initials: value } : p);
    await refreshEmployees();
    toast.success('Salvo');
  };

  const removeEmployee = async () => {
    if (!id) return;
    setRemoving(true);
    const { data, error } = await supabase.functions.invoke('delete-employee', { body: { user_id: id } });
    setRemoving(false);
    if (error || data?.error) { toast.error('Não foi possível remover'); return; }
    toast.success(`${profile.full_name || 'Funcionário'} removido(a)`);
    await refreshEmployees();
    navigate('/employees');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate('/employees')} className="gap-2 -ml-2">
        <ArrowLeft className="h-6 w-6" /> Voltar
      </Button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 shrink-0 rounded-full bg-foreground text-background flex items-center justify-center text-lg font-bold">
          {profile.initials || profileInitials(profile.full_name)}
        </div>
        <div>
          <h1 className="text-[26px] font-bold font-display">{profile.full_name || 'Sem nome'}</h1>
          {profile.role_title && <p className="text-base text-muted-foreground">{profile.role_title}</p>}
        </div>
      </div>

      {role === 'admin' && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2"><Label htmlFor="ed-name">Nome</Label><Input id="ed-name" value={editName} onChange={e => setEditName(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="ed-phone">WhatsApp</Label><Input id="ed-phone" type="tel" inputMode="tel" placeholder="+55 (xx) 9xxxx-xxxx" value={editPhone} onChange={e => setEditPhone(formatPhone(e.target.value))} /></div>
            <div className="space-y-2"><Label htmlFor="ed-role">Função</Label><Input id="ed-role" placeholder="Ex.: Arrumadeira" value={editRole} onChange={e => setEditRole(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="initials">Iniciais</Label><Input id="initials" className="w-24 uppercase" maxLength={2} value={initials} onChange={e => setInitials(e.target.value.toLocaleUpperCase('pt-BR'))} /></div>
            <Button onClick={saveBasics} disabled={savingBasics} className="w-full h-14 text-lg font-bold !border-status-completed !bg-status-completed !text-white hover:!bg-status-completed">
              {savingBasics ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Salvar'}
            </Button>
            <Button variant="destructive" className="w-full gap-2" onClick={() => setConfirmRemove(true)}>
              <Trash2 className="h-6 w-6" /> Remover
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Remover {profile.full_name}?</DialogTitle></DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmRemove(false)} disabled={removing}>Cancelar</Button>
            <Button variant="destructive" onClick={removeEmployee} disabled={removing} className="gap-2">
              {removing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Trash2 className="h-6 w-6" />} Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Personal Info */}
      {(profile.address || profile.cpf || profile.admission_date) && (
      <Card>
        <CardHeader><CardTitle className="text-lg">Dados Pessoais</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
          {profile.address && <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-muted-foreground" /> {profile.address}</div>}
          {profile.cpf && <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-muted-foreground" /> CPF: {profile.cpf}</div>}
          {profile.admission_date && <div className="flex items-center gap-2"><Calendar className="h-5 w-5 text-muted-foreground" /> Admissão: {new Date(profile.admission_date).toLocaleDateString('pt-BR')}</div>}
        </CardContent>
      </Card>
      )}


      {/* Emergency Contact */}
      {(profile.emergency_contact_name || profile.emergency_contact_phone) && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Contato de Emergência</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            {profile.emergency_contact_name && <p>{profile.emergency_contact_name}</p>}
            {profile.emergency_contact_phone && <p className="text-muted-foreground">{profile.emergency_contact_phone}</p>}
          </CardContent>
        </Card>
      )}

      {/* Bank Details */}
      {(bank.bank || bank.pix) && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-4 w-4" /> Dados Bancários</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            {bank.bank && <div><span className="text-muted-foreground">Banco:</span> {bank.bank}</div>}
            {bank.agency && <div><span className="text-muted-foreground">Agência:</span> {bank.agency}</div>}
            {bank.account && <div><span className="text-muted-foreground">Conta:</span> {bank.account}</div>}
            {bank.account_type && <div><span className="text-muted-foreground">Tipo:</span> {bank.account_type === 'corrente' ? 'Corrente' : 'Poupança'}</div>}
            {bank.pix && <div className="col-span-2"><span className="text-muted-foreground">PIX:</span> {bank.pix}</div>}
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText className="h-4 w-4" /> Documentos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Upload area */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Descrição (opcional)" value={docLabel} onChange={e => setDocLabel(e.target.value)} />
            <div>
              <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'Enviando...' : 'Enviar Documento'}
              </Button>
            </div>
          </div>

          {/* Documents list */}
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum documento enviado.</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium bg-control text-control-foreground border border-control-border px-2 py-0.5 rounded">
                        {CATEGORY_LABELS[doc.category] || doc.category}
                      </span>
                      <span className="text-sm font-medium truncate">{doc.label || doc.file_name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {new Date(doc.created_at).toLocaleDateString('pt-BR')} • {doc.file_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                       <Button variant="ghost" size="icon" aria-label="Baixar documento"><Download className="h-6 w-6" /></Button>
                    </a>
                     <Button variant="destructive" size="icon" aria-label="Apagar documento" onClick={() => handleDelete(doc.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
