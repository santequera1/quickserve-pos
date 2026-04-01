import { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Users, BarChart3, Settings, ChefHat, Package, Bell, LogOut, Plus, UsersRound, PanelLeftClose, PanelLeft, X, Utensils } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatPrice, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/orders', label: 'Pedidos', icon: ClipboardList },
  { path: '/kitchen', label: 'Cocina', icon: ChefHat },
  { path: '/tables', label: 'Mesas', icon: Utensils },
  { path: '/products', label: 'Menú', icon: Package },
  { path: '/customers', label: 'Clientes', icon: Users },
  { path: '/staff', label: 'Personal', icon: UsersRound },
  { path: '/reports', label: 'Reportes', icon: BarChart3 },
  { path: '/settings', label: 'Config', icon: Settings },
];


export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, orders, sidebarCollapsed, toggleSidebar, businessName } = useStore();
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pendingOrders = orders.filter(o => o.status === 'pending').slice(0, 5);

  const isKitchen = location.pathname === '/kitchen';
  if (isKitchen) return <Outlet />;

  const sideW = sidebarCollapsed ? 'w-16' : 'w-60';
  const mainML = sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60';
  const headerML = sidebarCollapsed ? 'lg:left-16' : 'lg:left-60';

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn('hidden lg:flex flex-col fixed left-0 top-0 bottom-0 bg-sidebar text-sidebar-foreground z-40 transition-all duration-300', sideW)}>
        <div className={cn('p-3 flex items-center gap-2', sidebarCollapsed ? 'flex-col' : '')}>
          <button onClick={() => navigate('/dashboard')} className={cn('flex items-center gap-2 flex-1 min-w-0', sidebarCollapsed && 'justify-center')}>
            <img src="/logo.webp" alt="Logo" className="w-8 h-8 rounded-md object-contain shrink-0" />
            {!sidebarCollapsed && <span className="font-display font-bold text-sm whitespace-nowrap truncate">{businessName}</span>}
          </button>
          <button onClick={toggleSidebar}
            className={cn('w-7 h-7 rounded-md hover:bg-sidebar-accent/50 flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground shrink-0',
              sidebarCollapsed && 'mt-1')}
            title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}>
            {sidebarCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        <nav className="flex-1 px-2 space-y-1">
          {navItems.map(item => {
            const active = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  sidebarCollapsed && 'justify-center px-0'
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon size={20} />
                {!sidebarCollapsed && item.label}
                {!sidebarCollapsed && item.path === '/orders' && pendingCount > 0 && (
                  <span className="ml-auto bg-warning text-warning-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{pendingCount}</span>
                )}
                {sidebarCollapsed && item.path === '/orders' && pendingCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-warning text-warning-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{pendingCount}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="p-2 border-t border-sidebar-border">
          <div className={cn('flex items-center gap-3 px-3 py-2', sidebarCollapsed && 'justify-center px-0')}>
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-bold shrink-0">
              {user?.name?.[0]}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">{user?.role}</p>
              </div>
            )}
            <button onClick={() => { logout(); navigate('/login'); }} className="text-sidebar-foreground/60 hover:text-sidebar-foreground shrink-0"
              title="Cerrar sesión">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Tablet Sidebar (icons only) */}
      <aside className="hidden md:flex lg:hidden flex-col fixed left-0 top-0 bottom-0 w-16 bg-sidebar text-sidebar-foreground z-40 items-center">
        <div className="p-3 mt-2">
          <img src="/logo.webp" alt="Logo" className="w-8 h-8 rounded-md object-contain" />
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
      <header className={cn('fixed top-0 right-0 left-0 h-14 bg-card border-b border-border z-30 flex items-center px-4 gap-3', 'md:left-16', headerML)}>
        <button onClick={() => navigate('/dashboard')} className="font-display font-semibold text-base flex-1 md:hidden flex items-center gap-2">
          <img src="/logo.webp" alt="Logo" className="w-7 h-7 rounded-md object-contain" /> {businessName}
        </button>
        <h1 className="font-display font-semibold text-base flex-1 hidden md:block capitalize">
          {navItems.find(n => location.pathname.startsWith(n.path))?.label || 'Dashboard'}
        </h1>
        {/* Notifications bell */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => { setShowNotifs(!showNotifs); setShowUserMenu(false); }}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors" title="Notificaciones">
            <Bell size={20} className="text-muted-foreground" />
            {pendingCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-card border border-border rounded-xl shadow-elevated z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold">Pedidos pendientes ({pendingCount})</p>
              </div>
              {pendingOrders.length > 0 ? (
                <div className="max-h-60 overflow-y-auto">
                  {pendingOrders.map(o => (
                    <button key={o.id} onClick={() => { navigate(`/orders/${o.id}`); setShowNotifs(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-muted transition-colors border-b border-border/50 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">#{o.id}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(o.createdAt)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{o.customer.name} • {formatPrice(o.total)}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs text-muted-foreground">No hay pedidos pendientes</p>
                </div>
              )}
              {pendingCount > 5 && (
                <button onClick={() => { navigate('/orders'); setShowNotifs(false); }}
                  className="w-full px-3 py-2 text-xs text-primary font-medium text-center border-t border-border hover:bg-muted">
                  Ver todos los pedidos →
                </button>
              )}
            </div>
          )}
        </div>

        {/* User avatar menu */}
        <div className="relative" ref={userMenuRef}>
          <button onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifs(false); }}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold cursor-pointer" title={user?.name}>
            {user?.name?.[0]}
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-elevated z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
              <button onClick={() => { navigate('/settings'); setShowUserMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2">
                <Settings size={14} /> Configuración
              </button>
              <button onClick={() => { logout(); navigate('/login'); setShowUserMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/5 transition-colors flex items-center gap-2 border-t border-border">
                <LogOut size={14} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className={cn('pt-14 pb-20 md:pb-4 md:ml-16 min-h-screen transition-all duration-300', mainML)}>
        <div className="p-4 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav navigate={navigate} location={location} pendingCount={pendingCount} logout={logout} />
    </div>
  );
};

const MobileNav = ({ navigate, location, pendingCount, logout }: { navigate: any; location: any; pendingCount: number; logout: () => void }) => {
  const [showMore, setShowMore] = useState(false);

  const mainItems = [
    { path: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
    { path: '/orders', label: 'Pedidos', icon: ClipboardList },
  ];

  const moreItems = [
    { path: '/kitchen', label: 'Cocina', icon: ChefHat },
    { path: '/tables', label: 'Mesas', icon: Utensils },
    { path: '/products', label: 'Menú', icon: Package },
    { path: '/customers', label: 'Clientes', icon: Users },
    { path: '/staff', label: 'Personal', icon: UsersRound },
    { path: '/reports', label: 'Reportes', icon: BarChart3 },
    { path: '/settings', label: 'Config', icon: Settings },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-40 flex items-center justify-around px-2 safe-area-bottom">
        {mainItems.map(item => {
          const active = location.pathname.startsWith(item.path);
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={cn('flex flex-col items-center gap-0.5 min-w-[48px] py-1', active ? 'text-primary' : 'text-muted-foreground')}>
              <div className="relative">
                <item.icon size={22} />
                {item.path === '/orders' && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-warning text-warning-foreground text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">{pendingCount}</span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}

        {/* Center new order button */}
        <button onClick={() => navigate('/orders/new')}
          className="w-12 h-12 -mt-4 rounded-full gradient-primary shadow-fab flex items-center justify-center text-primary-foreground">
          <Plus size={24} />
        </button>

        <button onClick={() => navigate('/customers')}
          className={cn('flex flex-col items-center gap-0.5 min-w-[48px] py-1', location.pathname.startsWith('/customers') ? 'text-primary' : 'text-muted-foreground')}>
          <Users size={22} />
          <span className="text-[10px] font-medium">Clientes</span>
        </button>

        <button onClick={() => setShowMore(true)}
          className={cn('flex flex-col items-center gap-0.5 min-w-[48px] py-1', showMore ? 'text-primary' : 'text-muted-foreground')}>
          <Settings size={22} />
          <span className="text-[10px] font-medium">Más</span>
        </button>
      </nav>

      {/* More menu overlay */}
      {showMore && (
        <div className="md:hidden fixed inset-0 bg-foreground/40 z-50" onClick={() => setShowMore(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl p-4 pb-8 safe-area-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-base">Menú</h3>
              <button onClick={() => setShowMore(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {moreItems.map(item => {
                const active = location.pathname.startsWith(item.path);
                return (
                  <button key={item.path} onClick={() => { navigate(item.path); setShowMore(false); }}
                    className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors',
                      active ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground')}>
                    <item.icon size={24} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => { logout(); navigate('/login'); setShowMore(false); }}
              className="w-full mt-4 py-2.5 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 flex items-center justify-center gap-2">
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </>
  );
};
