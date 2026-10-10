import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'install-banner-dismissed';
const DISMISS_DAYS = 7;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;
}

function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const ios = isIOS();

  useEffect(() => {
    if (isStandalone()) return;

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = new Date(dismissed).getTime();
      if (Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
    }

    // Show after a short delay
    const timer = setTimeout(() => setShow(true), 3000);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setShow(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-16 left-2 right-2 md:bottom-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-fade-in">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <img src="/logo.png" alt="" className="size-10 object-contain shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Instale o App</p>
            {ios ? (
              <p className="text-sm text-muted-foreground mt-1">
                Toque em <Share className="inline h-3 w-3 -mt-0.5" /> <strong>Compartilhar</strong> e depois <strong>"Adicionar à Tela de Início"</strong>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                Tenha acesso rápido direto da tela inicial do seu celular.
              </p>
            )}
            {!ios && deferredPrompt && (
               <Button size="sm" onClick={handleInstall} className="mt-2 gap-1.5">
                <Download className="h-3 w-3" /> Instalar agora
              </Button>
            )}
          </div>
           <Button variant="ghost" size="icon" onClick={dismiss} aria-label="Fechar aviso">
             <X className="h-6 w-6" />
           </Button>
        </div>
      </div>
    </div>
  );
}
