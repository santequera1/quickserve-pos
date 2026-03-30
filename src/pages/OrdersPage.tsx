import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { useStore, type OrderStatus } from '@/store/useStore';
import { StatusBadge } from '@/components/StatusBadge';
import { OrderTypeBadge } from '@/components/OrderTypeBadge';
import { formatPrice, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const tabs: { label: string; status: OrderStatus | 'all'; }[] = [
  { label: 'Todos', status: 'all' },
  { label: '🟡 Pendientes', status: 'pending' },
  { label: '🔵 Preparando', status: 'preparing' },
  { label: '🟢 Listos', status: 'ready' },
  { label: 'Entregados', status: 'delivered' },
];

const OrdersPage = () => {
  const navigate = useNavigate();
  const { orders, updateOrderStatus } = useStore();
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = orders.filter(o => {
    if (activeTab !== 'all' && o.status !== activeTab) return false;
    if (search && !`#${o.id} ${o.customer.name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getNextStatus = (s: OrderStatus): OrderStatus | null => {
    if (s === 'pending') return 'preparing';
    if (s === 'preparing') return 'ready';
    if (s === 'ready') return 'delivered';
    return null;
  };

  const nextStatusLabel: Record<string, string> = {
    preparing: '→ En preparación',
    ready: '→ Listo',
    delivered: '→ Entregado',
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar pedido..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const count = tab.status === 'all' ? orders.length : orders.filter(o => o.status === tab.status).length;
          return (
            <button key={tab.status} onClick={() => setActiveTab(tab.status)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                activeTab === tab.status ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Orders */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl block mb-2">📋</span>
            <p className="text-sm text-muted-foreground">No hay pedidos</p>
          </div>
        ) : (
          filtered.map(order => {
            const next = getNextStatus(order.status);
            return (
              <div key={order.id} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                <div className="flex">
                  <div className="w-1 shrink-0" style={{
                    backgroundColor: order.status === 'pending' ? 'hsl(var(--status-pending))' :
                      order.status === 'preparing' ? 'hsl(var(--status-preparing))' :
                      order.status === 'ready' ? 'hsl(var(--status-ready))' : 'hsl(var(--status-delivered))'
                  }} />
                  <div className="flex-1 p-3">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-display font-bold text-sm">#{order.id}</span>
                      <StatusBadge status={order.status} />
                      <OrderTypeBadge type={order.type} />
                      <span className="text-xs text-muted-foreground ml-auto">{formatTime(order.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 truncate">
                      {order.customer.name} • {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-sm">{formatPrice(order.total)}</span>
                      <span className="text-xs text-muted-foreground">• {order.paymentMethod === 'cash' ? '💵' : order.paymentMethod === 'transfer' ? '📱' : '💳'}</span>
                      <div className="flex-1" />
                      <button onClick={() => navigate(`/orders/${order.id}`)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-colors">
                        Ver detalle
                      </button>
                      {next && (
                        <button onClick={() => updateOrderStatus(order.id, next)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold gradient-primary text-primary-foreground hover:opacity-90 transition-opacity">
                          {nextStatusLabel[next]}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
