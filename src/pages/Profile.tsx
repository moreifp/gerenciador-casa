import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, User, Phone, MapPin, CreditCard, FileText, Loader2, Upload, Trash2, Download, AlertTriangle, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { useThemeToggle } from '@/hooks/useThemeToggle';
import { Receipt, MessageSquare, Archive, Sun, Moon, LogOut } from 'lucide-react';
import { isBiometricAvailable, isBiometricEnabled, registerBiometric, disableBiometric } from '@/lib/biometric';

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

interface ProfileData {
  full_name: string;
  phone: string;
  address: string;
  cpf: string;
  admission_date: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  photo_url: string;
  bank_details: {
    bank?: string;
    agency?: string;
    account?: string;
    account_type?: string;
    pix?: string;
  };
}

interface EmployeeDoc {
  id: string;
  category: string;
  label: string | null;
  file_url: string;
  file_name: string;
  created_at: string;
}

const emptyProfile: ProfileData = {
  full_name: '',
  phone: '',
  address: '',
  cpf: '',
  admission_date: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  photo_url: '',
  bank_details: {},
};

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [docs, setDocs] = useState<EmployeeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docCategory, setDocCategory] = useState('outro');
  const [docLabel, setDocLabel] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(isBiometricEnabled());
  const [bioLoading, setBioLoading] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
  }, []);

  const handleToggleBiometric = async () => {
    if (bioEnabled) {
      disableBiometric();
      setBioEnabled(false);
      toast.success('Desbloqueio por biometria desativado');
      return;
    }
    if (!user) return;
    setBioLoading(true);
    try {
      const ok = await registerBiometric(user.id, profile.full_name || user.email || '');
      if (ok) {
        setBioEnabled(true);
        toast.success('Face ID / digital ativado! O app vai pedir biometria ao abrir.');
      } else {
        toast.error('Não foi possível ativar. Verifique se o aparelho tem Face ID ou digital configurada.');
      }
    } catch {
      toast.error('Biometria cancelada ou não disponível neste aparelho.');
    } finally {
      setBioLoading(false);
    }
  };

  const fetchDocs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('employee_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setDocs(data as any);
  };

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('employee_documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]).then(([profileRes, docsRes]) => {
      if (profileRes.data) {
        const d = profileRes.data;
        setProfile({
          full_name: d.full_name || '',
          phone: d.phone || '',
          address: d.address || '',
          cpf: (d as any).cpf || '',
          admission_date: d.admission_date || '',
          emergency_contact_name: (d as any).emergency_contact_name || '',
          emergency_contact_phone: (d as any).emergency_contact_phone || '',
          photo_url: d.photo_url || '',
          bank_details: (d.bank_details as any) || {},
        });
      }
      if (docsRes.data) setDocs(docsRes.data as any);
      setLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
        address: profile.address,
        admission_date: profile.admission_date || null,
        photo_url: profile.photo_url || null,
        bank_details: profile.bank_details as any,
        cpf: profile.cpf || null,
        emergency_contact_name: profile.emergency_contact_name || null,
        emergency_contact_phone: profile.emergency_contact_phone || null,
      } as any)
      .eq('id', user.id);
    setSaving(false);
    if (error) toast.error('Erro ao salvar: ' + error.message);
    else toast.success('Perfil atualizado com sucesso!');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingPhoto(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('profile-photos').upload(path, file, { upsert: true });
    if (error) { toast.error('Erro no upload: ' + error.message); setUploadingPhoto(false); return; }
    const { data } = supabase.storage.from('profile-photos').getPublicUrl(path);
    setProfile(p => ({ ...p, photo_url: data.publicUrl }));
    setUploadingPhoto(false);
    toast.success('Foto enviada!');
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingDoc(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('profile-documents').upload(path, file);
    if (uploadErr) { toast.error('Erro no upload: ' + uploadErr.message); setUploadingDoc(false); return; }
    const { data: urlData } = supabase.storage.from('profile-documents').getPublicUrl(path);

    const { error: insertErr } = await supabase.from('employee_documents').insert({
      user_id: user.id,
      uploaded_by: user.id,
      category: docCategory as any,
      label: docLabel || null,
      file_url: urlData.publicUrl,
      file_name: file.name,
    });

    if (insertErr) toast.error('Erro ao salvar documento: ' + insertErr.message);
    else { toast.success('Documento enviado!'); setDocLabel(''); await fetchDocs(); }
    setUploadingDoc(false);
    if (docRef.current) docRef.current.value = '';
  };

  const handleDeleteDoc = async (docId: string) => {
    const { error } = await supabase.from('employee_documents').delete().eq('id', docId);
    if (error) toast.error('Erro ao excluir: ' + error.message);
    else { toast.success('Documento excluído'); setDocs(d => d.filter(doc => doc.id !== docId)); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-[26px] font-bold text-foreground">Meu Perfil</h1>
      <ProfileShortcuts />

      {/* Photo Section */}
      <div className="flex items-center gap-4">
         <Button type="button" variant="outline" onClick={() => photoRef.current?.click()} aria-label="Alterar foto" className="relative h-20 w-20 rounded-full overflow-hidden p-0 group">
          {profile.photo_url ? (
            <img src={profile.photo_url} alt="Foto" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-muted flex items-center justify-center"><User className="size-8 text-muted-foreground" /></div>
          )}
          <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {uploadingPhoto ? <Loader2 className="h-5 w-5 animate-spin text-background" /> : <Camera className="h-5 w-5 text-background" />}
          </div>
         </Button>
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        <div>
          <p className="font-medium text-foreground">{profile.full_name || 'Sem nome'}</p>
          <p className="text-sm text-muted-foreground">Clique na foto para alterar</p>
        </div>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="w-full grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:justify-start h-auto bg-transparent p-0">
          <TabsTrigger value="personal" className="h-14 w-full rounded-lg gap-2"><User className="h-6 w-6" />Pessoal</TabsTrigger>
          <TabsTrigger value="emergency" className="h-14 w-full rounded-lg gap-2"><AlertTriangle className="h-6 w-6" />Emergência</TabsTrigger>
          <TabsTrigger value="documents" className="h-14 w-full rounded-lg gap-2"><FileText className="h-6 w-6" />Documentos</TabsTrigger>
          <TabsTrigger value="bank" className="h-14 w-full rounded-lg gap-2"><CreditCard className="h-6 w-6" />Bancário</TabsTrigger>
          <TabsTrigger value="security" className="h-14 w-full rounded-lg gap-2"><Fingerprint className="h-6 w-6" />Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardHeader><CardTitle className="text-lg">Dados Pessoais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Nome Completo</Label><Input value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Telefone</Label><Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="(11) 99999-9999" /></div>
                <div className="space-y-2"><Label>CPF</Label><Input value={profile.cpf} onChange={e => setProfile(p => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" /></div>
              </div>
              <div className="space-y-2"><Label>Endereço</Label><Input value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} placeholder="Rua, número, bairro, cidade" /></div>
              <div className="space-y-2"><Label>Data de Admissão</Label><Input type="date" value={profile.admission_date} onChange={e => setProfile(p => ({ ...p, admission_date: e.target.value }))} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emergency">
          <Card>
            <CardHeader><CardTitle className="text-lg">Contato de Emergência</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Nome do Contato</Label><Input value={profile.emergency_contact_name} onChange={e => setProfile(p => ({ ...p, emergency_contact_name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Telefone do Contato</Label><Input value={profile.emergency_contact_phone} onChange={e => setProfile(p => ({ ...p, emergency_contact_phone: e.target.value }))} placeholder="(11) 99999-9999" /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader><CardTitle className="text-lg">Meus Documentos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Envie documentos como RG, CNH, CTPS, comprovante de residência, etc.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select value={docCategory} onValueChange={setDocCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Descrição (opcional)" value={docLabel} onChange={e => setDocLabel(e.target.value)} />
                <div>
                  <input ref={docRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleDocUpload} />
                  <Button variant="outline" onClick={() => docRef.current?.click()} disabled={uploadingDoc} className="w-full gap-2">
                    {uploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploadingDoc ? 'Enviando...' : 'Enviar'}
                  </Button>
                </div>
              </div>

              {docs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum documento enviado.</p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {docs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium bg-control text-control-foreground border border-control-border px-2 py-0.5 rounded">{CATEGORY_LABELS[doc.category] || doc.category}</span>
                          <span className="text-sm font-medium truncate">{doc.label || doc.file_name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{new Date(doc.created_at).toLocaleDateString('pt-BR')} • {doc.file_name}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                           <Button variant="ghost" size="icon" aria-label="Baixar documento"><Download className="h-6 w-6" /></Button>
                        </a>
                         <Button variant="destructive" size="icon" aria-label="Apagar documento" onClick={() => handleDeleteDoc(doc.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank">
          <Card>
            <CardHeader><CardTitle className="text-lg">Dados Bancários</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Banco</Label><Input value={profile.bank_details?.bank || ''} onChange={e => setProfile(p => ({ ...p, bank_details: { ...p.bank_details, bank: e.target.value } }))} placeholder="Ex: Nubank, Itaú" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Agência</Label><Input value={profile.bank_details?.agency || ''} onChange={e => setProfile(p => ({ ...p, bank_details: { ...p.bank_details, agency: e.target.value } }))} /></div>
                <div className="space-y-2"><Label>Conta</Label><Input value={profile.bank_details?.account || ''} onChange={e => setProfile(p => ({ ...p, bank_details: { ...p.bank_details, account: e.target.value } }))} /></div>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Conta</Label>
                <Select value={profile.bank_details?.account_type || ''} onValueChange={v => setProfile(p => ({ ...p, bank_details: { ...p.bank_details, account_type: v } }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Chave PIX</Label><Input value={profile.bank_details?.pix || ''} onChange={e => setProfile(p => ({ ...p, bank_details: { ...p.bank_details, pix: e.target.value } }))} placeholder="CPF, e-mail, telefone ou chave aleatória" /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader><CardTitle className="text-lg">Segurança</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Fingerprint className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Desbloqueio com Face ID / digital</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Ao abrir o app neste aparelho, será pedido Face ID ou digital para continuar.
                  </p>
                </div>
              </div>
              {!bioAvailable && (
                <p className="text-sm text-muted-foreground">
                  Este aparelho/navegador não informou suporte à biometria. No iPhone, abra o app instalado na tela de início.
                </p>
              )}
              <Button
                variant={bioEnabled ? 'destructive' : 'default'}
                onClick={handleToggleBiometric}
                disabled={bioLoading || (!bioAvailable && !bioEnabled)}
                className="w-full gap-2"
              >
                {bioLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
                {bioEnabled ? 'Desativar biometria' : 'Ativar Face ID / digital'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : 'Salvar Perfil'}
      </Button>
      <p className="text-center text-sm text-muted-foreground pb-2">Versão {__BUILD_ID__}</p>
    </div>
  );
}

function ProfileShortcuts() {
  const navigate = useNavigate();
  const { role } = useApp();
  const { signOut } = useAuth();
  const { resolvedTheme, setTheme } = useThemeToggle();
  const dark = resolvedTheme === 'dark';
  const item = 'h-14 justify-start gap-3 text-base';
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button variant="outline" className={item} onClick={() => navigate('/expenses')}>
        <Receipt className="h-6 w-6" /> {role === 'admin' ? 'Prestações' : 'Prestar contas'}
      </Button>
      {role === 'admin' && (
        <>
          <Button variant="outline" className={item} onClick={() => navigate('/messages')}>
            <MessageSquare className="h-6 w-6" /> Mensagens
          </Button>
          <Button variant="outline" className={item} onClick={() => navigate('/tasks/archived')}>
            <Archive className="h-6 w-6" /> Arquivadas
          </Button>
        </>
      )}
      <Button variant="outline" className={item} onClick={() => setTheme(dark ? 'light' : 'dark')}>
        {dark ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />} {dark ? 'Tema claro' : 'Tema escuro'}
      </Button>
      <Button variant="outline" className={item + ' text-destructive hover:text-destructive'} onClick={signOut}>
        <LogOut className="h-6 w-6" /> Sair
      </Button>
    </div>
  );
}
