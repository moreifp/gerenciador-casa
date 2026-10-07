import { useState, useEffect } from 'react';
import { Download, Share, Plus, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Download className="size-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">App já instalado!</h2>
            <p className="text-muted-foreground text-sm">
              O Gerenciador Casa já está instalado no seu dispositivo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 py-8 px-4">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Instalar o App</h1>
        <p className="text-muted-foreground text-sm">
          Instale o Gerenciador Casa para acesso rápido e experiência offline.
        </p>
      </div>

      {deferredPrompt && (
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <Button onClick={handleInstall} size="lg" className="gap-2">
              <Download className="h-5 w-5" /> Instalar Agora
            </Button>
          </CardContent>
        </Card>
      )}

      {isIOS && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Como instalar no iPhone/iPad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Abra no Safari</p>
                <p className="text-sm text-muted-foreground">Certifique-se de estar usando o Safari</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-1">
                  Toque em Compartilhar <Share className="h-4 w-4" />
                </p>
                <p className="text-sm text-muted-foreground">Ícone na barra inferior do Safari</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-1">
                  Toque em "Adicionar à Tela Inicial" <Plus className="h-4 w-4" />
                </p>
                <p className="text-sm text-muted-foreground">Role para baixo se necessário</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isIOS && !deferredPrompt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Como instalar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Abra o menu do navegador</p>
                <p className="text-sm text-muted-foreground">Toque nos 3 pontos no canto superior</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-1">
                  Selecione "Instalar aplicativo" <ArrowDown className="h-4 w-4" />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
