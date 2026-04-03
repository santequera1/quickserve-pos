import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutGrid, List, Columns, Truck, Plus, Calendar, Trash2, CheckSquare2 } from 'lucide-react';
import { useStore, type OrderStatus, type OrderType, type Driver } from '@/store/useStore';
import { StatusBadge } from '@/components/StatusBadge';
import { OrderTypeBadge } from '@/components/OrderTypeBadge';
import { formatPrice, formatTime, getColombiaTodayStr, getColombiaYesterdayStr, getColombiaNow, getOrderDateStr } from '@/lib/format';
import { cn } from '@/lib/utils';

const getDriverDisplayName = (d: Driver) => {
  const parts = d.name.split(':');
  return parts.length === 2 ? parts[1] : d.name;
};

const statusTabs: { label: string; status: OrderStatus | 'all' }[] = [
  { label: 'Todos', status: 'all' },
  { label: '🟡 Pendientes', status: 'pending' },
  { label: '🔵 Preparando', status: 'preparing' },
  { label: '🟢 Listos', status: 'ready' },
  { label: '🛵 Enviados', status: 'shipped' },
  { label: '✅ Completados', status: 'delivered' },
];

type ViewMode = 'list' | 'cards' | 'compact';

const OrdersPage = () => {
  const navigate = useNavigate();
  const { orders, updateOrderStatus, drivers, assignDriver, tableCount, deleteOrder, deleteOrders, updateOrdersStatus } = useStore();
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [typeFilter, setTypeFilter] = useState<OrderType | 'all'>('all');
  const [showDriverModal, setShowDriverModal] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [showBulkStatusPicker, setShowBulkStatusPicker] = useState(false);

  const filtered = useMemo(() => {
    const todayStr = getColombiaTodayStr();
    const yesterdayStr = getColombiaYesterdayStr();
    const nowColombia = getColombiaNow();

    return orders.filter(o => {
      // Date filter
      if (dateFilter !== 'all') {
        const orderDate = getOrderDateStr(o.createdAt);
        if (dateFilter === 'today' && orderDate !== todayStr) return false;
        if (dateFilter === 'yesterday' && orderDate !== yesterdayStr) return false;
        if (dateFilter === 'week') {
          const w = new Date(nowColombia); w.setDate(w.getDate() - 7);
          const wStr = w.toISOString().split('T')[0];
          if (orderDate < wStr) return false;
        }
        if (dateFilter === 'month') {
          const m = new Date(nowColombia); m.setDate(m.getDate() - 30);
          const mStr = m.toISOString().split('T')[0];
          if (orderDate < mStr) return false;
        }
        if (dateFilter === 'custom') {
          if (customFrom && orderDate < customFrom) return false;
          if (customTo && orderDate > customTo) return false;
        }
      }
      if (activeTab !== 'all' && o.status !== activeTab) return false;
      if (typeFilter !== 'all' && o.type !== typeFilter) return false;
      if (search && !`#${o.id} ${o.customer.name}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [orders, dateFilter, customFrom, customTo, activeTab, typeFilter, search]);

  // Table status
  const tableOrders = orders.filter(o => o.type === 'dine-in' && o.tableNumber && !['delivered', 'cancelled'].includes(o.status));
  const occupiedTables = tableOrders.map(o => o.tableNumber!);
  const freeTables = tableCount - occupiedTables.length;

  const handleAssignDriver = (orderId: number, driverId: number) => {
    assignDriver(orderId, driverId);
    setShowDriverModal(null);
  };

  // Available domiciliarios
  const domiciliarios = drivers.filter(d => {
    const parts = d.name.split(':');
    const role = parts.length === 2 ? parts[0] : 'domiciliario';
    return role === 'domiciliario' && d.available;
  });

  // Summary based on current filtered orders (excluding delivery fees)
  const summaryOrders = filtered.filter(o => o.status !== 'cancelled');
  const summarySales = summaryOrders.reduce((sum, o) => sum + o.total - o.deliveryFee, 0);
  const summaryDeliveryFees = summaryOrders.reduce((sum, o) => sum + o.deliveryFee, 0);
  const summaryDelivery = summaryOrders.filter(o => o.type === 'delivery').length;
  const summaryPickup = summaryOrders.filter(o => o.type === 'pickup').length;
  const summaryDineIn = summaryOrders.filter(o => o.type === 'dine-in').length;
  const summaryAvg = summaryOrders.length > 0 ? Math.round(summarySales / summaryOrders.length) : 0;

  // Bulk selection handlers
  const toggleSelectOrder = (orderId: number) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === filtered.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filtered.map(o => o.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedOrders.size === 0) return;
    if (window.confirm(`¿Eliminar ${selectedOrders.size} pedido(s)? Esta acción no se puede deshacer.`)) {
      deleteOrders(Array.from(selectedOrders));
      setSelectedOrders(new Set());
    }
  };

  const handleBulkStatusChange = (status: OrderStatus) => {
    if (selectedOrders.size === 0) return;
    updateOrdersStatus(Array.from(selectedOrders), status);
    setSelectedOrders(new Set());
    setShowBulkStatusPicker(false);
  };

  return (
    <div className="space-y-4">
      {/* Header with new order button */}
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg">Pedidos</h2>
        <button onClick={() => navigate('/orders/new')}
          className="px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold shadow-fab hover:opacity-90 flex items-center gap-2">
          <Plus size={16} /> Nuevo pedido
        </button>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Calendar size={14} className="text-muted-foreground shrink-0" />
        {([
          { key: 'today' as const, label: 'Hoy' },
          { key: 'yesterday' as const, label: 'Ayer' },
          { key: 'week' as const, label: 'Esta semana' },
          { key: 'month' as const, label: 'Este mes' },
          { key: 'all' as const, label: 'Todo' },
          { key: 'custom' as const, label: 'Rango' },
        ]).map(d => (
          <button key={d.key} onClick={() => setDateFilter(d.key)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
              dateFilter === d.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
            {d.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {dateFilter === 'custom' && (
        <div className="flex gap-2 items-center flex-wrap">
          <label className="text-xs text-muted-foreground font-medium">Desde</label>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-input bg-card text-sm outline-none" />
          <label className="text-xs text-muted-foreground font-medium">Hasta</label>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-input bg-card text-sm outline-none" />
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="bg-card rounded-lg border border-border p-3">
          <p className="text-[10px] text-muted-foreground font-semibold mb-1">💰 Ventas</p>
          <p className="font-display font-bold text-lg text-primary">{formatPrice(summarySales)}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-3">
          <p className="text-[10px] text-muted-foreground font-semibold mb-1">🛵 Domicilios</p>
          <p className="font-display font-bold text-lg text-warning">{formatPrice(summaryDeliveryFees)}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-3">
          <p className="text-[10px] text-muted-foreground font-semibold mb-1">📦 Pedidos</p>
          <p className="font-display font-bold text-lg">{summaryOrders.length}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-3">
          <p className="text-[10px] text-muted-foreground font-semibold mb-1">🏠 / 🛍️ / 🍽️</p>
          <p className="font-display font-bold text-lg">{summaryDelivery} / {summaryPickup} / {summaryDineIn}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-3">
          <p className="text-[10px] text-muted-foreground font-semibold mb-1">📊 Vta. prom.</p>
          <p className="font-display font-bold text-lg">{formatPrice(summaryAvg)}</p>
        </div>
      </div>

      {/* Quick stats bar */}
      <div className="flex gap-2 text-xs overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-card border border-border shrink-0">
          <span>🍽️</span>
          <span className="text-success font-semibold">{freeTables} libres</span>
          <span className="text-muted-foreground">/{tableCount}</span>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-card border border-border shrink-0">
          <span>📦</span>
          <span className="font-semibold">{orders.filter(o => o.status === 'pending').length} pend.</span>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-card border border-border shrink-0">
          <span>🔵</span>
          <span className="font-semibold">{orders.filter(o => o.status === 'preparing').length} prep.</span>
        </div>
      </div>

      {/* Search + type filter + view toggle */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por # o nombre..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
        </div>
        {/* View toggle */}
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <button onClick={() => setViewMode('list')} className={cn('p-2 rounded-md transition-colors', viewMode === 'list' ? 'bg-card shadow-sm' : '')} title="Lista">
            <List size={16} className={viewMode === 'list' ? 'text-primary' : 'text-muted-foreground'} />
          </button>
          <button onClick={() => setViewMode('cards')} className={cn('p-2 rounded-md transition-colors', viewMode === 'cards' ? 'bg-card shadow-sm' : '')} title="Tarjetas">
            <LayoutGrid size={16} className={viewMode === 'cards' ? 'text-primary' : 'text-muted-foreground'} />
          </button>
          <button onClick={() => setViewMode('compact')} className={cn('p-2 rounded-md transition-colors', viewMode === 'compact' ? 'bg-card shadow-sm' : '')} title="Tabla">
            <Columns size={16} className={viewMode === 'compact' ? 'text-primary' : 'text-muted-foreground'} />
          </button>
        </div>
      </div>

      {/* Type filter - clear text labels */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          { type: 'all' as const, label: 'Todos los tipos', emoji: '' },
          { type: 'delivery' as const, label: '🏠 Domicilio', emoji: '' },
          { type: 'pickup' as const, label: '🛍️ Recoger en restaurante', emoji: '' },
          { type: 'dine-in' as const, label: '🍽️ Comer aquí', emoji: '' },
        ]).map(t => (
          <button key={t.type} onClick={() => setTypeFilter(t.type)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
              typeFilter === t.type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statusTabs.map(tab => {
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

      {/* Bulk actions bar */}
      {selectedOrders.size > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare2 size={18} className="text-primary" />
              <span className="text-sm font-semibold text-primary">{selectedOrders.size} seleccionado(s)</span>
            </div>
            <button onClick={() => setSelectedOrders(new Set())}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted">
              Cancelar
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <button onClick={() => setShowBulkStatusPicker(!showBulkStatusPicker)}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">
                Cambiar estado
              </button>
              {showBulkStatusPicker && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-elevated p-2 z-40 w-40">
                  {([
                    { status: 'pending' as OrderStatus, label: '🟡 Pendiente' },
                    { status: 'preparing' as OrderStatus, label: '🔵 Preparando' },
                    { status: 'ready' as OrderStatus, label: '🟢 Listo' },
                    { status: 'shipped' as OrderStatus, label: '🛵 Enviado' },
                    { status: 'delivered' as OrderStatus, label: '✅ Entregado' },
                    { status: 'cancelled' as OrderStatus, label: '❌ Cancelado' },
                  ]).map(s => (
                    <button key={s.status} onClick={() => handleBulkStatusChange(s.status)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted rounded transition-colors">
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleBulkDelete}
              className="px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-semibold hover:bg-destructive/30 flex items-center gap-1">
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        </div>
      )}

      {/* Select all button */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2">
          <button onClick={toggleSelectAll}
            className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted flex items-center gap-1.5">
            <CheckSquare2 size={14} />
            {selectedOrders.size === filtered.length ? 'Deseleccionar todos' : `Seleccionar todos (${filtered.length})`}
          </button>
        </div>
      )}

      {/* Orders */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl block mb-2">📋</span>
          <p className="text-sm text-muted-foreground">No hay pedidos con estos filtros</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-2">
          {filtered.map(order => <OrderListItem key={order.id} order={order} navigate={navigate}
            updateOrderStatus={updateOrderStatus}
            drivers={drivers} onAssignDriver={() => setShowDriverModal(order.id)}
            isSelected={selectedOrders.has(order.id)}
            onSelect={toggleSelectOrder}
            onDelete={deleteOrder} />)}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(order => <OrderCard key={order.id} order={order} navigate={navigate}
            updateOrderStatus={updateOrderStatus}
            drivers={drivers} onAssignDriver={() => setShowDriverModal(order.id)}
            isSelected={selectedOrders.has(order.id)}
            onSelect={toggleSelectOrder}
            onDelete={deleteOrder} />)}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-3 py-2 font-semibold text-xs w-10">
                  <input type="checkbox" checked={selectedOrders.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll} className="w-4 h-4 cursor-pointer" />
                </th>
                <th className="text-left px-3 py-2 font-semibold text-xs">#</th>
                <th className="text-left px-3 py-2 font-semibold text-xs">Cliente</th>
                <th className="text-left px-3 py-2 font-semibold text-xs">Tipo</th>
                <th className="text-left px-3 py-2 font-semibold text-xs">Estado</th>
                <th className="text-left px-3 py-2 font-semibold text-xs">Pago</th>
                <th className="text-right px-3 py-2 font-semibold text-xs">Total</th>
                <th className="text-right px-3 py-2 font-semibold text-xs">Hora</th>
                <th className="text-right px-3 py-2 font-semibold text-xs">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <tr key={order.id} className={cn('border-b border-border last:border-0 hover:bg-muted/30',
                  selectedOrders.has(order.id) ? 'bg-primary/5' : '')}>
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedOrders.has(order.id)}
                      onChange={() => toggleSelectOrder(order.id)} className="w-4 h-4 cursor-pointer" />
                  </td>
                  <td className="px-3 py-2.5 font-display font-bold cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>{order.id}</td>
                  <td className="px-3 py-2.5 cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>{order.customer.name}</td>
                  <td className="px-3 py-2.5 cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}><OrderTypeBadge type={order.type} /></td>
                  <td className="px-3 py-2.5 cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}><StatusBadge status={order.status} orderType={order.type} /></td>
                  <td className="px-3 py-2.5 cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                      order.paymentStatus === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
                      {order.paymentStatus === 'paid' ? '✅ Pagado' : '⏳ Pendiente'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-display font-semibold cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>{formatPrice(order.total)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>{formatTime(order.createdAt)}</td>
                  <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={() => deleteOrder(order.id)}
                      className="text-destructive hover:text-destructive/80 font-medium">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Driver assignment modal */}
      {showDriverModal && (
        <div className="fixed inset-0 bg-foreground/40 z-50 flex items-center justify-center p-4" onClick={() => setShowDriverModal(null)}>
          <div className="bg-card rounded-2xl w-full max-w-sm p-5 shadow-elevated" onClick={e => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg mb-3">Asignar Domiciliario</h3>
            <div className="space-y-2">
              {domiciliarios.map(d => (
                <button key={d.id} onClick={() => handleAssignDriver(showDriverModal, d.id)}
                  className="w-full p-3 rounded-lg border border-border text-left text-sm hover:bg-muted transition-colors flex items-center gap-3">
                  <Truck size={16} className="text-success" />
                  <div>
                    <p className="font-semibold">{getDriverDisplayName(d)}</p>
                    <p className="text-xs text-muted-foreground">{d.phone}</p>
                  </div>
                </button>
              ))}
              {domiciliarios.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No hay domiciliarios disponibles</p>
              )}
            </div>
            <button onClick={() => setShowDriverModal(null)} className="w-full mt-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// List item
const OrderListItem = ({ order, navigate, updateOrderStatus, drivers, onAssignDriver, isSelected, onSelect, onDelete }: any) => {
  const driver = order.driverId ? drivers.find((d: Driver) => d.id === order.driverId) : null;
  const typeLabel = order.type === 'delivery' ? '🏠 Domicilio' : order.type === 'pickup' ? '🛍️ Recoger' : '🍽️ Mesa ' + (order.tableNumber || '');
  return (
    <div className={cn('bg-card rounded-xl border shadow-card overflow-hidden', isSelected ? 'border-primary bg-primary/5' : 'border-border')}>
      <div className="flex">
        <div className="w-1.5 shrink-0" style={{
          backgroundColor: order.status === 'pending' ? 'hsl(var(--status-pending))' :
            order.status === 'preparing' ? 'hsl(var(--status-preparing))' :
            order.status === 'ready' ? 'hsl(var(--status-ready))' :
            order.status === 'cancelled' ? '#EF4444' : 'hsl(var(--status-delivered))'
        }} />
        <div className="flex-1 p-3">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <input type="checkbox" checked={isSelected} onChange={() => onSelect(order.id)}
              className="w-4 h-4 cursor-pointer" onClick={e => e.stopPropagation()} />
            <span className="font-display font-bold text-sm">#{order.id}</span>
            <StatusBadge status={order.status} orderType={order.type} />
            <span className="text-xs font-medium text-muted-foreground">{typeLabel}</span>
            {order.paymentStatus === 'pending' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-semibold">⏳ Sin pagar</span>
            )}
            {driver && <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">🛵 {getDriverDisplayName(driver)}</span>}
            <span className="text-xs text-muted-foreground ml-auto">{formatTime(order.createdAt)}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2 truncate">
            {order.customer.name} • {order.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-semibold text-sm">{formatPrice(order.total)}</span>
            <span className="text-xs text-muted-foreground">• {order.paymentMethod === 'cash' ? '💵 Efectivo' : order.paymentMethod === 'transfer' ? '📱 Transferencia' : '💳 Tarjeta'}</span>
            <div className="flex-1" />
            {order.type === 'delivery' && !driver && order.status !== 'delivered' && order.status !== 'cancelled' && (
              <button onClick={onAssignDriver}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-success/30 text-success hover:bg-success/10 transition-colors flex items-center gap-1">
                <Truck size={12} /> Asignar domiciliario
              </button>
            )}
            <button onClick={() => navigate(`/orders/${order.id}`)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-colors">
              Ver / Editar
            </button>
            <button onClick={() => onDelete(order.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 flex items-center gap-1">
              <Trash2 size={12} /> Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Card
const OrderCard = ({ order, navigate, updateOrderStatus, drivers, onAssignDriver, isSelected, onSelect, onDelete }: any) => {
  const driver = order.driverId ? drivers.find((d: Driver) => d.id === order.driverId) : null;
  const typeLabel = order.type === 'delivery' ? '🏠 Domicilio' : order.type === 'pickup' ? '🛍️ Recoger' : '🍽️ Mesa ' + (order.tableNumber || '');
  return (
    <div className={cn('bg-card rounded-xl border shadow-card p-4 hover:shadow-elevated transition-all', isSelected ? 'border-primary bg-primary/5' : 'border-border')}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={isSelected} onChange={() => onSelect(order.id)}
            className="w-4 h-4 cursor-pointer" />
          <span className="font-display font-bold">#{order.id}</span>
        </div>
        <StatusBadge status={order.status} orderType={order.type} />
      </div>
      <p className="font-medium text-sm mb-1">{order.customer.name}</p>
      <p className="text-xs text-muted-foreground mb-2">{typeLabel}</p>
      <div className="space-y-1 mb-3">
        {order.items.slice(0, 3).map((item: any, i: number) => (
          <p key={i} className="text-xs text-muted-foreground truncate">{item.quantity}x {item.name}</p>
        ))}
        {order.items.length > 3 && <p className="text-xs text-muted-foreground">+{order.items.length - 3} más...</p>}
      </div>
      {driver && <p className="text-xs text-success font-medium mb-2">🛵 {getDriverDisplayName(driver)}</p>}
      {order.paymentStatus === 'pending' && <p className="text-xs text-warning font-medium mb-2">⏳ Sin pagar</p>}
      <div className="flex items-center justify-between pt-2 border-t border-border" onClick={e => e.stopPropagation()}>
        <span className="font-display font-bold text-primary">{formatPrice(order.total)}</span>
        <div className="flex gap-1">
          <button onClick={() => navigate(`/orders/${order.id}`)}
            className="px-2 py-1 rounded text-xs font-medium border border-border hover:bg-muted">
            Ver / Editar
          </button>
          <button onClick={() => onDelete(order.id)}
            className="px-2 py-1 rounded text-xs font-medium border border-destructive/30 text-destructive hover:bg-destructive/10">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
