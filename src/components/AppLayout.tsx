import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListTodo, Users, PlusCircle, LogOut, MessageSquare, Sun, Moon, Receipt, CalendarCheck, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApp } from '@/lib/context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/NotificationBell';
import OfflineIndicator from '@/components/OfflineIndicator';
import InstallBanner from '@/components/InstallBanner';
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useThemeToggle } from '@/hooks/useThemeToggle';
import { useCallback, useRef, useEffect } from 'react';

type NavItem = { to: string; label: string; icon: typeof ListTodo; highlight?: boolean };

// Desktop sidebar: everything
const adminSidebar: NavItem[] = [
  { to: '/', label: 'Tarefas', icon: ListTodo },
  { to: '/tasks/new', label: 'Nova Tarefa', icon: PlusCircle },
  { to: '/employees', label: 'Equipe', icon: Users },
  { to: '/messages', label: 'Mensagens', icon: MessageSquare },
  { to: '/expenses', label: 'Prestações', icon: Receipt },
];
const employeeSidebar: NavItem[] = [
  { to: '/', label: 'Hoje', icon: CalendarCheck },
  { to: '/tasks', label: 'Todas', icon: ListTodo },
  { to: '/expenses', label: 'Prestar contas', icon: Receipt },
];
// Mobile bottom bar: max 4 (admin) / 2 (employee)
const adminBottom: NavItem[] = [
  { to: '/', label: 'Tarefas', icon: ListTodo },
  { to: '/tasks/new', label: 'Nova', icon: PlusCircle, highlight: true },
  { to: '/employees', label: 'Equipe', icon: Users },
  { to: '/profile', label: 'Perfil', icon: UserRound },
];
const employeeBottom: NavItem[] = [
  { to: '/', label: 'Hoje', icon: CalendarCheck },
  { to: '/tasks', label: 'Todas', icon: ListTodo },
];

export default function AppLayout() {
  const { profile, signOut } = useAuth();
  const { role, refreshTasks, refreshEmployees } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme, resolvedTheme } = useThemeToggle();
  const mainRef = useRef<HTMLElement>(null);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refreshTasks(), refreshEmployees()]);
  }, [refreshTasks, refreshEmployees]);

  const { containerRef, pullDistance, refreshing } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  // Attach pull-to-refresh to main scroll container
  useEffect(() => {
    if (mainRef.current) {
      (containerRef as any).current = mainRef.current;
    }
  }, [containerRef]);

  const toggleTheme = () => {
    if (resolvedTheme === 'dark') setTheme('light');
    else setTheme('dark');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <OfflineIndicator />
      <InstallBanner />

      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="p-6">
          <h1 className="font-display text-xl font-bold text-sidebar-primary">
            <img src="/logo.png" alt="" className="inline-block h-10 w-auto mr-2 align-middle" />Gerenciador Casa
          </h1>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {(role === 'admin' ? adminSidebar : employeeSidebar).map((item) => {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/' || item.to === '/tasks'}
                className={({ isActive }) =>
                  cn(
                     'flex min-h-14 items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition-all duration-200',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )
                }
              >
                 <item.icon className="h-6 w-6" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-sidebar-border space-y-3">
          <div className="flex items-center gap-2 justify-between">
            <NotificationBell />
             <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema">
               {resolvedTheme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
             </Button>
          </div>
           <Button variant="ghost" onClick={() => navigate('/profile')} className="flex min-h-14 items-center justify-start gap-2 w-full text-left rounded-lg p-1 transition-colors">
            <div className="h-14 w-14 rounded-full overflow-hidden bg-control-selected flex items-center justify-center text-sm font-bold text-control-selected-foreground shrink-0">
              {profile?.photo_url ? (
                <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                profile?.full_name?.charAt(0)?.toUpperCase() || '?'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">{profile?.full_name || 'Usuário'}</p>
               <p className="text-sm text-sidebar-foreground capitalize">{role || 'carregando...'}</p>
            </div>
           </Button>
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full gap-2">
             <LogOut className="h-6 w-6" /> Sair
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
          <h1 className="font-display text-lg font-bold text-primary"><img src="/logo.png" alt="" className="inline-block h-10 w-auto mr-2 align-middle" />Gerenciador Casa</h1>
          <div className="flex items-center gap-1">
            <NotificationBell />
             <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} aria-label="Perfil" className="flex items-center justify-center">
              <span className="h-14 w-14 rounded-full overflow-hidden bg-control-selected flex items-center justify-center text-sm font-bold text-control-selected-foreground">
                {profile?.photo_url ? <img src={profile.photo_url} alt="" className="h-full w-full object-cover" /> : (profile?.full_name?.charAt(0)?.toUpperCase() || '?')}
              </span>
             </Button>
          </div>
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto pb-20 md:pb-8" style={{ WebkitOverflowScrolling: 'touch' }}>
          <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} />
          <div key={location.pathname} className="p-4 md:p-8 animate-fade-in">
            <Outlet />
          </div>
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t flex justify-around pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {(role === 'admin' ? adminBottom : employeeBottom).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.to === '/tasks'}
              className={({ isActive }) =>
                cn('flex flex-1 flex-col items-center justify-center gap-1 min-h-[56px] text-[13px] font-semibold', isActive ? 'text-control-foreground' : 'text-nav-inactive')
              }
            >
              {item.highlight ? (
                 <span className="h-14 w-14 -mt-1 rounded-full border-[1.5px] border-control-border bg-control flex items-center justify-center text-control-foreground shadow-md">
                  <item.icon className="size-7" fill={location.pathname === item.to ? 'currentColor' : 'none'} />
                </span>
              ) : (
                <item.icon className="size-7" fill={location.pathname === item.to ? 'currentColor' : 'none'} />
              )}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
