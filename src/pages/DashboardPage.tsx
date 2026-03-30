import { useNavigate } from 'react-router-dom';
import { DollarSign, Package, Truck, Star, Plus, ClipboardList, Users, BarChart3 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { StatusBadge } from '@/components/StatusBadge';
import { OrderTypeBadge } from '@/components/OrderTypeBadge';
import { formatPrice } from '@/lib/format';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { orders, products } = useStore();

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const todaySales = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const deliveryActive = orders.filter(o => o.type === 'delivery' && !['delivered', 'cancelled'].includes(o.status)).length;
  const urgentOrders = orders.filter(o => o.status === 'pending').length;

  // Top product
  const productCounts: Record<string, number> = {};
  orders.forEach(o => o.items.forEach(i => { productCounts[i.name] = (productCounts[i.name] || 0) + i.quantity; }));
  const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];

  const kpis = [
    { label: 'Ventas hoy', value: formatPrice(todaySales), sub: '+12% vs ayer', icon: DollarSign, color: 'text-success' },
    { label: 'Pedidos activos', value: activeOrders.length.toString(), sub: `${urgentOrders} pendientes`, icon: Package, color: 'text-info' },
    { label: 'Domicilios', value: deliveryActive.toString(), sub: 'en camino', icon: Truck, color: 'text-destructive' },
    { label: 'Más vendido', value: topProduct?.[0] || '-', sub: `x${topProduct?.[1] || 0} hoy`, icon: Star, color: 'text-warning' },
  ];

  const quickActions = [
    { label: 'Pedidos', icon: ClipboardList, path: '/orders', emoji: '📦' },
    { label: 'Menú', icon: Package, path: '/products', emoji: '🍔' },
    { label: 'Clientes', icon: Users, path: '/customers', emoji: '👥' },
    { label: 'Reportes', icon: BarChart3, path: '/reports', emoji: '📊' },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-card rounded-xl p-4 shadow-card border border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${kpi.color}`}>
                <kpi.icon size={16} />
              </div>
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="font-display font-bold text-lg truncate">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-display font-semibold text-sm mb-3">Acceso rápido</h2>
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map(a => (
            <button key={a.path} onClick={() => navigate(a.path)}
              className="bg-card rounded-xl p-3 shadow-card border border-border flex flex-col items-center gap-1.5 hover:shadow-elevated transition-shadow">
              <span className="text-2xl">{a.emoji}</span>
              <span className="text-xs font-medium">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-sm">Pedidos recientes</h2>
          <button onClick={() => navigate('/orders')} className="text-xs text-primary font-medium">Ver todos →</button>
        </div>
        <div className="space-y-2">
          {orders.slice(0, 5).map(order => (
            <button key={order.id} onClick={() => navigate(`/orders/${order.id}`)}
              className="w-full bg-card rounded-xl p-3 shadow-card border border-border flex items-center gap-3 hover:shadow-elevated transition-shadow text-left">
              <div className="w-1 h-10 rounded-full" style={{
                backgroundColor: order.status === 'pending' ? 'hsl(var(--status-pending))' :
                  order.status === 'preparing' ? 'hsl(var(--status-preparing))' :
                  order.status === 'ready' ? 'hsl(var(--status-ready))' : 'hsl(var(--status-delivered))'
              }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-semibold text-sm">#{order.id}</span>
                  <StatusBadge status={order.status} />
                  <OrderTypeBadge type={order.type} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {order.customer.name} • {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                </p>
              </div>
              <span className="font-display font-semibold text-sm whitespace-nowrap">{formatPrice(order.total)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/orders/new')}
        className="fixed bottom-20 right-4 md:bottom-6 w-14 h-14 rounded-full gradient-primary shadow-fab flex items-center justify-center text-primary-foreground z-30 hover:scale-105 transition-transform animate-pulse-glow"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};

export default DashboardPage;
