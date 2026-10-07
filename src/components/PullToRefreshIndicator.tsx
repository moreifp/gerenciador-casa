import { Loader2, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  pullDistance: number;
  refreshing: boolean;
  threshold?: number;
}

export default function PullToRefreshIndicator({ pullDistance, refreshing, threshold = 80 }: Props) {
  if (pullDistance === 0 && !refreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const ready = progress >= 1;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
      style={{ height: pullDistance }}
    >
      <div className={cn(
        'flex items-center gap-2 text-sm font-medium transition-all',
        ready ? 'text-primary' : 'text-muted-foreground'
      )}>
        {refreshing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Atualizando...</span>
          </>
        ) : (
          <>
            <ArrowDown
              className="h-4 w-4 transition-transform duration-200"
              style={{ transform: ready ? 'rotate(180deg)' : `rotate(${progress * 180}deg)` }}
            />
            <span>{ready ? 'Solte para atualizar' : 'Puxe para atualizar'}</span>
          </>
        )}
      </div>
    </div>
  );
}
