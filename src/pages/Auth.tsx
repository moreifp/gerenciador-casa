import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowRight, Phone, MessageCircle } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from || '/';

  const [mode, setMode] = useState<'login' | 'whatsapp' | 'otp'>('login');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error('Não foi possível entrar com o Google. Tente novamente.');
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error('Não foi possível entrar com a Apple. Tente novamente.');
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const { data, error } = await supabase.functions.invoke('send-otp-whatsapp', {
        body: { phone: cleanPhone },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Código enviado no seu WhatsApp!');
      setMode('otp');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;
    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phone: cleanPhone, code: otpCode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Use the magic link token to sign in
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'magiclink',
      });

      if (verifyError) throw verifyError;
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Código inválido ou expirado');
      setOtpCode('');
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 13);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `+${digits.slice(0, 2)} (${digits.slice(2)}`;
    if (digits.length <= 9) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4)}`;
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="font-display text-[26px] font-bold text-primary"><img src="/logo.png" alt="" className="mx-auto mb-2 h-28 w-auto" />Gerenciador Casa</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'login' && 'Entre com sua conta'}
            {mode === 'whatsapp' && 'Entrar via WhatsApp'}
            {mode === 'otp' && 'Digite o código recebido'}
          </p>
        </div>

        {mode === 'login' && (
          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
                <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
              </svg>
              Entrar com Google
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleAppleLogin}
              disabled={loading}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Entrar com Apple
            </Button>

            <Button
              type="button"
              variant="outline"
               className="w-full gap-2"
              onClick={() => setMode('whatsapp')}
            >
              <MessageCircle className="h-4 w-4" /> Entrar via WhatsApp
            </Button>

          </div>
        )}

        {mode === 'whatsapp' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone com DDD</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(formatPhone(e.target.value))}
                  placeholder="+55 (11) 99999-9999"
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Um código será enviado no seu WhatsApp
              </p>
            </div>
             <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Código'} <MessageCircle className="h-4 w-4" />
            </Button>
             <Button type="button" variant="link" onClick={() => setMode('login')} className="w-full text-center">
              Voltar
             </Button>
          </form>
        )}

        {mode === 'otp' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-2">
                <MessageCircle className="size-8 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Código enviado para <strong>{phone}</strong>
              </p>
            </div>

            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
               className="w-full gap-2"
              disabled={loading || otpCode.length !== 6}
              onClick={handleVerifyOtp}
            >
              {loading ? 'Verificando...' : 'Verificar e Entrar'} <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="flex justify-between text-sm">
               <Button variant="link"
                type="button"
                onClick={() => { setOtpCode(''); setMode('whatsapp'); }}
              >
                Reenviar código
               </Button>
               <Button variant="link" type="button" onClick={() => setMode('login')}>
                Voltar ao login
               </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
