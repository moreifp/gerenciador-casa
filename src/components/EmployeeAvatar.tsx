import { cn } from '@/lib/utils';

interface EmployeeAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = { sm: 'h-14 w-14 text-sm', md: 'h-14 w-14 text-sm', lg: 'h-14 w-14 text-sm' };

export default function EmployeeAvatar({ name, photoUrl, size = 'md', className }: EmployeeAvatarProps) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (photoUrl) {
    return (
      <div className={cn('rounded-full overflow-hidden shrink-0', sizeClasses[size], className)}>
        <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className={cn('rounded-full flex items-center justify-center font-semibold shrink-0 bg-control text-control-foreground border border-control-border', sizeClasses[size], className)}>
      {initials}
    </div>
  );
}
