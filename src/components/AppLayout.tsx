import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, UtensilsCrossed, Users, BarChart3, Settings, ChefHat, Package, Bell, LogOut, Plus } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/orders', label: 'Pedidos', icon: ClipboardList },
  { path: '/kitchen', label: 'Cocina', icon: ChefHat },
  { path: '/products', label: 'Menú', icon: Package },
  { path: '/customers', label: 'Clientes', icon: Users },
  { path: '/reports', label: 'Reportes', icon: BarChart3 },
  { path: '/settings', label: 'Config', icon: Settings },
];

const mobileNav = [
  { path: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { path: '/orders', label: 'Pedidos', icon: ClipboardList },
  { path: '/orders/new', label: 'Nuevo', icon: Plus, isCenter: true },
  { path: '/customers', label: 'Clientes', icon: Users },
  { path: '/more', label: 'Más', icon: Settings },
];

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, orders } = useStore();
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  const isKitchen = location.pathname === '/kitchen';

  if (isKitchen) return <Outlet />;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-60 bg-sidebar text-sidebar-foreground z-40">
        <div className="p-5 flex items-center gap-2">
          <span className="text-2xl">🍔</span>
          <span className="font-display font-bold text-lg">RÁPIDO POS</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(item => {
            const active = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <item.icon size={20} />
                {item.label}
                {item.path === '/orders' && pendingCount > 0 && (
                  <span className="ml-auto bg-warning text-warning-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{pendingCount}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-bold">
              {user?.name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{user?.role}</p>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }} className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Tablet Sidebar (icons only) */}
      <aside className="hidden md:flex lg:hidden flex-col fixed left-0 top-0 bottom-0 w-16 bg-sidebar text-sidebar-foreground z-40 items-center">
        <div className="p-3 mt-2">
          <span className="text-xl">🍔</span>
        </div>
        <nav className="flex-1 flex flex-col items-center gap-1 mt-2">
          {navItems.map(item => {
            const active = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'w-11 h-11 flex items-center justify-center rounded-lg transition-colors relative',
                  active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50'
                )}
                title={item.label}
              >
                <item.icon size={20} />
                {item.path === '/orders' && pendingCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-warning text-warning-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{pendingCount}</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Topbar */}
      <header className={cn('fixed top-0 right-0 left-0 h-14 bg-card border-b border-border z-30 flex items-center px-4 gap-3', 'md:left-16 lg:left-60')}>
        <h1 className="font-display font-semibold text-base flex-1 md:hidden flex items-center gap-2">
          <span>🍔</span> RÁPIDO POS
        </h1>
        <h1 className="font-display font-semibold text-base flex-1 hidden md:block capitalize">
          {navItems.find(n => location.pathname.startsWith(n.path))?.label || 'Dashboard'}
        </h1>
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
          <Bell size={20} className="text-muted-foreground" />
          {pendingCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />}
        </button>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
          {user?.name?.[0]}
        </div>
      </header>

      {/* Main content */}
      <main className={cn('pt-14 pb-20 md:pb-4 md:ml-16 lg:ml-60 min-h-screen')}>
        <div className="p-4 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-40 flex items-center justify-around px-2 safe-area-bottom">
        {mobileNav.map(item => {
          const active = location.pathname === item.path || (item.path !== '/' && item.path !== '/orders/new' && item.path !== '/more' && location.pathname.startsWith(item.path));
          if (item.isCenter) {
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className="w-12 h-12 -mt-4 rounded-full gradient-primary shadow-fab flex items-center justify-center text-primary-foreground">
                <Plus size={24} />
              </button>
            );
          }
          return (
            <button key={item.path}
              onClick={() => {
                if (item.path === '/more') {
                  // Could open a sheet with more options
                  navigate('/settings');
                } else {
                  navigate(item.path);
                }
              }}
              className={cn('flex flex-col items-center gap-0.5 min-w-[48px] py-1', active ? 'text-primary' : 'text-muted-foreground')}
            >
              <item.icon size={22} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
