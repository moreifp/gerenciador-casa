import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
    <p className="font-display text-lg font-bold text-primary">🌸 Gerenciador Casa</p>
    <h1 className="font-display text-3xl font-bold text-foreground">Página não encontrada</h1>
    <Button asChild size="lg" className="h-14 gap-3 px-8 text-lg">
      <Link to="/"><Home className="h-6 w-6" /> Voltar ao início</Link>
    </Button>
  </div>
);

export default NotFound;
