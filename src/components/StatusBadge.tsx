import { cn } from '@/lib/utils';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
  blocked: 'Bloqueada',
};

const statusStyles: Record<TaskStatus, string> = {
  pending: 'bg-control text-control-foreground border border-control-border',
  in_progress: 'bg-control text-control-foreground border border-control-border',
  completed: 'bg-control text-control-foreground border border-control-border',
  blocked: 'bg-control text-control-foreground border border-control-border',
};

export default function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold', statusStyles[status])}>
      <span className={cn('h-1.5 w-1.5 rounded-full', {
        'bg-status-pending': status === 'pending',
        'bg-status-progress': status === 'in_progress',
        'bg-status-completed': status === 'completed',
        'bg-status-blocked': status === 'blocked',
      })} />
      {STATUS_LABELS[status]}
    </span>
  );
}
