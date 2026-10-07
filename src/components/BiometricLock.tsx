import { useState } from 'react';
import { Fingerprint, Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { verifyBiometric } from '@/lib/biometric';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface Props {
  onUnlock: () => void;
}

export default function BiometricLock({ onUnlock }: Props) {
  const { signOut } = useAuth();
  const [verifying, setVerifying] = useState(false);

  const handleUnlock = async () => {
    setVerifying(true);
    const ok = await verifyBiometric();
    setVerifying(false);
    if (ok) {
      onUnlock();
    } else {
      toast.error('Não foi possível verificar. Tente novamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center gap-6 p-6">
      <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
        <Fingerprint className="size-10 text-primary" />
      </div>
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold text-foreground">App bloqueado</h1>
        <p className="text-sm text-muted-foreground">Use Face ID ou sua digital para continuar</p>
      </div>
      <Button onClick={handleUnlock} disabled={verifying} size="lg" className="gap-2">
        {verifying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Fingerprint className="h-5 w-5" />}
        Desbloquear
      </Button>
       <Button variant="link"
        type="button"
        onClick={() => signOut()}
         className="flex items-center gap-2"
      >
         <LogOut className="h-6 w-6" /> Sair e entrar com senha
       </Button>
    </div>
  );
}
