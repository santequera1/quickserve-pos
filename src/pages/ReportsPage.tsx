import { useState, useMemo } from 'react';
import { useStore, type Order } from '@/store/useStore';
import { formatPrice, formatTime, getColombiaTodayStr, getColombiaYesterdayStr, getColombiaNow, getOrderDateStr, plural } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';
import { OrderTypeBadge } from '@/components/OrderTypeBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Download, Printer, Calendar, Filter, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

type PeriodKey = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

const periodLabels: Record<PeriodKey, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  week: 'Esta semana',
  month: 'Este mes',
  year: 'Este año',
  custom: 'Personalizado',
};

const ReportsPage = () => {
  const { orders, customers, drivers } = useStore();

  // Filters
  const [period, setPeriod] = useState<PeriodKey>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filter orders by period (using Colombia timezone)
  const filtered = useMemo(() => {
    const todayStr = getColombiaTodayStr();
    const yesterdayStr = getColombiaYesterdayStr();
    const nowColombia = getColombiaNow();

    return orders.filter(o => {
      // Period filter
      const orderDate = getOrderDateStr(o.createdAt);
      if (period === 'today' && orderDate !== todayStr) return false;
      if (period === 'yesterday' && orderDate !== yesterdayStr) return false;
      if (period === 'week') {
        const weekAgo = new Date(nowColombia);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const wStr = weekAgo.toISOString().split('T')[0];
        if (orderDate < wStr) return false;
      }
      if (period === 'month') {
        const monthAgo = new Date(nowColombia);
        monthAgo.setDate(monthAgo.getDate() - 30);
        const mStr = monthAgo.toISOString().split('T')[0];
        if (orderDate < mStr) return false;
      }
      if (period === 'year') {
        const yearStart = new Date(nowColombia);
        yearStart.setMonth(0);
        yearStart.setDate(1);
        const yStr = yearStart.toISOString().split('T')[0];
        if (orderDate < yStr) return false;
      }
      if (period === 'custom') {
        if (customFrom && orderDate < customFrom) return false;
        if (customTo && orderDate > customTo) return false;
      }

      // Type filter
      if (typeFilter !== 'all' && o.type !== typeFilter) return false;
      // Payment filter
      if (paymentFilter !== 'all' && o.paymentMethod !== paymentFilter) return false;
      // Status filter
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      // Driver filter
      if (driverFilter !== 'all') {
        if (driverFilter === 'none' && o.driverId) return false;
        if (driverFilter !== 'none' && o.driverId !== Number(driverFilter)) return false;
      }

      return true;
    });
  }, [orders, period, customFrom, customTo, typeFilter, paymentFilter, statusFilter, driverFilter]);

  // Non-cancelled for revenue calc
  const validOrders = filtered.filter(o => o.status !== 'cancelled');
  const totalSales = validOrders.reduce((s, o) => s + o.total, 0);
  const totalOrders = validOrders.length;
  const avgTicket = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

  // Payment totals
  const cashTotal = validOrders.filter(o => o.paymentMethod === 'cash').reduce((s, o) => s + o.total, 0);
  const transferTotal = validOrders.filter(o => o.paymentMethod === 'transfer').reduce((s, o) => s + o.total, 0);
  const cardTotal = validOrders.filter(o => o.paymentMethod === 'card').reduce((s, o) => s + o.total, 0);

  // Paid vs pending
  const paidTotal = validOrders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0);
  const pendingPayment = validOrders.filter(o => o.paymentStatus === 'pending').reduce((s, o) => s + o.total, 0);

  // Cancelled orders count and percentage
  const cancelledCount = filtered.filter(o => o.status === 'cancelled').length;
  const cancelledPercentage = totalOrders > 0 ? Math.round((cancelledCount / (totalOrders + cancelledCount)) * 100) : 0;

  // Peak hour data
  let peakHour = { hour: 0, count: 0, sales: 0 };
  if (period === 'today' || period === 'yesterday') {
    const hours: Record<number, { count: number; sales: number }> = {};
    for (let h = 0; h < 24; h++) hours[h] = { count: 0, sales: 0 };
    validOrders.forEach(o => {
      const h = new Date(o.createdAt).getHours();
      hours[h].count += 1;
      hours[h].sales += o.total;
    });
    const peakByCount = Object.entries(hours).reduce((max, [h, data]) => data.count > max[1].count ? [h, data] : max, ['8', hours[8]]);
    peakHour = { hour: Number(peakByCount[0]), count: peakByCount[1].count, sales: peakByCount[1].sales };
  }

  // Delivery fee income
  const deliveryFeeTotal = validOrders.reduce((s, o) => s + o.deliveryFee, 0);

  // Calculate previous period metrics for comparison
  const getPreviousPeriodOrders = () => {
    const nowColombia = getColombiaNow();
    const todayStr = getColombiaTodayStr();
    const yesterdayStr = getColombiaYesterdayStr();

    return orders.filter(o => {
      const orderDate = getOrderDateStr(o.createdAt);

      if (period === 'today') {
        if (orderDate !== yesterdayStr) return false;
      } else if (period === 'yesterday') {
        const dayBeforeYesterday = new Date(new Date(yesterdayStr).getTime() - 86400000);
        const dbStr = dayBeforeYesterday.toISOString().split('T')[0];
        if (orderDate !== dbStr) return false;
      } else if (period === 'week') {
        const currentWeekAgo = new Date(nowColombia);
        currentWeekAgo.setDate(currentWeekAgo.getDate() - 7);
        const prevWeekAgo = new Date(currentWeekAgo);
        prevWeekAgo.setDate(prevWeekAgo.getDate() - 7);
        const pwStr = prevWeekAgo.toISOString().split('T')[0];
        const cwStr = currentWeekAgo.toISOString().split('T')[0];
        if (orderDate < pwStr || orderDate >= cwStr) return false;
      } else if (period === 'month') {
        const currentMonthAgo = new Date(nowColombia);
        currentMonthAgo.setDate(currentMonthAgo.getDate() - 30);
        const prevMonthAgo = new Date(currentMonthAgo);
        prevMonthAgo.setDate(prevMonthAgo.getDate() - 30);
        const pmStr = prevMonthAgo.toISOString().split('T')[0];
        const cmStr = currentMonthAgo.toISOString().split('T')[0];
        if (orderDate < pmStr || orderDate >= cmStr) return false;
      } else if (period === 'year') {
        const currentYear = new Date(nowColombia).getFullYear();
        const prevYear = currentYear - 1;
        const orderYear = new Date(orderDate).getFullYear();
        if (orderYear !== prevYear) return false;
      } else {
        return false;
      }

      // Apply same filters
      if (typeFilter !== 'all' && o.type !== typeFilter) return false;
      if (paymentFilter !== 'all' && o.paymentMethod !== paymentFilter) return false;
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (driverFilter !== 'all') {
        if (driverFilter === 'none' && o.driverId) return false;
        if (driverFilter !== 'none' && o.driverId !== Number(driverFilter)) return false;
      }

      return true;
    });
  };

  const prevFiltered = period !== 'custom' ? getPreviousPeriodOrders() : [];
  const prevValidOrders = prevFiltered.filter(o => o.status !== 'cancelled');
  const prevTotalSales = prevValidOrders.reduce((s, o) => s + o.total, 0);
  const prevTotalOrders = prevValidOrders.length;
  const prevAvgTicket = prevTotalOrders > 0 ? Math.round(prevTotalSales / prevTotalOrders) : 0;

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const salesChange = calculateChange(totalSales, prevTotalSales);
  const ordersChange = calculateChange(totalOrders, prevTotalOrders);
  const avgTicketChange = calculateChange(avgTicket, prevAvgTicket);

  // Top products
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  validOrders.forEach(o => o.items.forEach(i => {
    if (!productMap[i.name]) productMap[i.name] = { name: i.name, qty: 0, revenue: 0 };
    productMap[i.name].qty += i.quantity;
    productMap[i.name].revenue += i.price * i.quantity;
  }));
  const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);

  // Hourly data (for today/yesterday) or daily data (for week/month)
  const chartData = useMemo(() => {
    if (period === 'today' || period === 'yesterday') {
      const hours: Record<number, number> = {};
      for (let h = 0; h < 24; h++) hours[h] = 0;
      validOrders.forEach(o => {
        const h = new Date(o.createdAt).getHours();
        hours[h] += o.total;
      });
      return Object.entries(hours)
        .filter(([h]) => Number(h) >= 8 && Number(h) <= 23)
        .map(([h, total]) => ({ label: `${h}:00`, ventas: total }));
    } else {
      const days: Record<string, number> = {};
      validOrders.forEach(o => {
        const d = getOrderDateStr(o.createdAt);
        days[d] = (days[d] || 0) + o.total;
      });
      return Object.entries(days)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([d, total]) => ({ label: d.slice(5), ventas: total }));
    }
  }, [validOrders, period]);

  // By type
  const deliveryOrders = validOrders.filter(o => o.type === 'delivery');
  const pickupOrders = validOrders.filter(o => o.type === 'pickup');
  const dineInOrders = validOrders.filter(o => o.type === 'dine-in');
  const typeBreakdown = [
    { name: 'Domicilio', emoji: '🏠', count: deliveryOrders.length, total: deliveryOrders.reduce((s, o) => s + o.total, 0), color: '#EF4444' },
    { name: 'Recoger', emoji: '🛍️', count: pickupOrders.length, total: pickupOrders.reduce((s, o) => s + o.total, 0), color: '#F59E0B' },
    { name: 'En mesa', emoji: '🍽️', count: dineInOrders.length, total: dineInOrders.reduce((s, o) => s + o.total, 0), color: '#10B981' },
  ];

  // Top customers
  const customerMap: Record<string, { name: string; phone: string; orders: number; spent: number }> = {};
  validOrders.forEach(o => {
    const key = o.customer.phone || o.customer.name;
    if (!customerMap[key]) customerMap[key] = { name: o.customer.name, phone: o.customer.phone || '', orders: 0, spent: 0 };
    customerMap[key].orders++;
    customerMap[key].spent += o.total;
  });
  const topCustomers = Object.values(customerMap).sort((a, b) => b.spent - a.spent).slice(0, 10);

  // Top drivers (domiciliarios) - enhanced metrics
  const driverMap: Record<number, {
    id: number;
    name: string;
    phone: string;
    orders: number;
    deliveries: number;
    revenue: number;
    deliveryFees: number;
    avgValue: number;
  }> = {};
  validOrders.filter(o => o.driverId).forEach(o => {
    const d = drivers.find(dr => dr.id === o.driverId);
    if (!d) return;
    const parts = d.name.split(':');
    const role = parts.length === 2 ? parts[0] : 'domiciliario';
    if (role !== 'domiciliario') return;
    const displayName = parts.length === 2 ? parts[1] : d.name;
    if (!driverMap[d.id]) driverMap[d.id] = {
      id: d.id,
      name: displayName,
      phone: d.phone,
      orders: 0,
      deliveries: 0,
      revenue: 0,
      deliveryFees: 0,
      avgValue: 0
    };
    driverMap[d.id].orders++;
    if (o.type === 'delivery') driverMap[d.id].deliveries++;
    driverMap[d.id].revenue += o.total;
    driverMap[d.id].deliveryFees += o.deliveryFee;
  });

  // Calculate average value per delivery
  Object.values(driverMap).forEach(driver => {
    driver.avgValue = driver.deliveries > 0 ? Math.round(driver.revenue / driver.deliveries) : 0;
  });
  const topDrivers = Object.values(driverMap).sort((a, b) => b.deliveries - a.deliveries);

  // Available domiciliarios for filter
  const domiciliarios = drivers.filter(d => {
    const parts = d.name.split(':');
    return (parts.length === 2 ? parts[0] : 'domiciliario') === 'domiciliario';
  });

  // Payment pie
  const paymentPie = [
    { name: 'Efectivo', value: cashTotal },
    { name: 'Transferencia', value: transferTotal },
    { name: 'Tarjeta', value: cardTotal },
  ].filter(d => d.value > 0);
  const pieColors = ['#10B981', '#6366F1', '#F59E0B'];

  // Export CSV
  const exportCSV = () => {
    const headers = ['#Pedido', 'Cliente', 'Teléfono', 'Tipo', 'Estado', 'Total', 'Método Pago', 'Estado Pago', 'Domiciliario', 'Fecha'];
    const rows = filtered.map(o => {
      const d = o.driverId ? drivers.find(dr => dr.id === o.driverId) : null;
      const dName = d ? (d.name.split(':')[1] || d.name) : '';
      return [
        o.id, o.customer.name, o.customer.phone || '', o.type, o.status, o.total, o.paymentMethod, o.paymentStatus, dName, o.createdAt
      ];
    });
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${period}-${getColombiaTodayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  const noData = validOrders.length === 0;

  return (
    <div className="space-y-5 print:space-y-3">
      {/* SECTION 1: FILTERS */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-card space-y-3">
        {/* Period selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={16} className="text-muted-foreground" />
          {(Object.keys(periodLabels) as PeriodKey[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                period === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
              {periodLabels[p]}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={() => setShowFilters(!showFilters)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors',
              showFilters ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
            <Filter size={14} /> Filtros
          </button>
        </div>

        {/* Custom date range */}
        {period === 'custom' && (
          <div className="flex gap-2 items-center flex-wrap">
            <label className="text-xs text-muted-foreground font-medium">Desde</label>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-input bg-card text-sm outline-none" />
            <label className="text-xs text-muted-foreground font-medium">Hasta</label>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-input bg-card text-sm outline-none" />
          </div>
        )}

        {/* Advanced filters */}
        {showFilters && (
          <div className="flex gap-3 flex-wrap pt-2 border-t border-border">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Tipo</label>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-input bg-card text-xs outline-none">
                <option value="all">Todos</option>
                <option value="delivery">🏠 Domicilio</option>
                <option value="pickup">🛍️ Recoger</option>
                <option value="dine-in">🍽️ Mesa</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Pago</label>
              <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-input bg-card text-xs outline-none">
                <option value="all">Todos</option>
                <option value="cash">💵 Efectivo</option>
                <option value="transfer">📱 Transferencia</option>
                <option value="card">💳 Tarjeta</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Estado</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-input bg-card text-xs outline-none">
                <option value="all">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="preparing">Preparando</option>
                <option value="ready">Listo</option>
                <option value="shipped">Enviado</option>
                <option value="delivered">Entregado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Domiciliario</label>
              <select value={driverFilter} onChange={e => setDriverFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-input bg-card text-xs outline-none">
                <option value="all">Todos</option>
                <option value="none">Sin asignar</option>
                {domiciliarios.map(d => {
                  const name = d.name.split(':')[1] || d.name;
                  return <option key={d.id} value={d.id}>{name}</option>;
                })}
              </select>
            </div>
            <button onClick={() => { setTypeFilter('all'); setPaymentFilter('all'); setStatusFilter('all'); setDriverFilter('all'); }}
              className="self-end px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {noData ? (
        <div className="text-center py-16">
          <span className="text-5xl block mb-3">📊</span>
          <p className="font-display font-semibold text-lg mb-1">No hay datos en este rango</p>
          <p className="text-sm text-muted-foreground">Intenta cambiar el período o los filtros</p>
        </div>
      ) : (
        <>
          {/* SECTION 2: SUMMARY CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-card rounded-xl border border-border p-4 shadow-card">
              <p className="text-xs text-muted-foreground mb-1">💰 Total vendido</p>
              <p className="font-display font-bold text-2xl text-primary">{formatPrice(totalSales)}</p>
              {period !== 'custom' && prevTotalSales > 0 && (
                <p className={cn('text-[10px] font-semibold mt-1', salesChange >= 0 ? 'text-success' : 'text-destructive')}>
                  {salesChange >= 0 ? '📈 +' : '📉'}{Math.abs(salesChange)}% vs período anterior
                </p>
              )}
            </div>
            <div className="bg-card rounded-xl border border-border p-4 shadow-card">
              <p className="text-xs text-muted-foreground mb-1">📦 Pedidos</p>
              <p className="font-display font-bold text-2xl">{totalOrders}</p>
              {cancelledPercentage > 0 && <p className="text-[10px] text-destructive">❌ {cancelledCount} ({cancelledPercentage}%)</p>}
              {period !== 'custom' && prevTotalOrders > 0 && (
                <p className={cn('text-[10px] font-semibold mt-1', ordersChange >= 0 ? 'text-success' : 'text-destructive')}>
                  {ordersChange >= 0 ? '📈 +' : '📉'}{Math.abs(ordersChange)}% vs período anterior
                </p>
              )}
            </div>
            <div className="bg-card rounded-xl border border-border p-4 shadow-card">
              <p className="text-xs text-muted-foreground mb-1">🎫 Ticket promedio</p>
              <p className="font-display font-bold text-2xl">{formatPrice(avgTicket)}</p>
              {period !== 'custom' && prevAvgTicket > 0 && (
                <p className={cn('text-[10px] font-semibold mt-1', avgTicketChange >= 0 ? 'text-success' : 'text-destructive')}>
                  {avgTicketChange >= 0 ? '📈 +' : '📉'}{Math.abs(avgTicketChange)}% vs período anterior
                </p>
              )}
            </div>
            <div className="bg-card rounded-xl border border-border p-4 shadow-card">
              <p className="text-xs text-muted-foreground mb-1">✅ Cobrado</p>
              <p className="font-display font-bold text-xl text-success">{formatPrice(paidTotal)}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 shadow-card">
              <p className="text-xs text-muted-foreground mb-1">⏳ Pendiente cobro</p>
              <p className="font-display font-bold text-xl text-warning">{formatPrice(pendingPayment)}</p>
            </div>
            {deliveryFeeTotal > 0 && (
              <div className="bg-card rounded-xl border border-border p-4 shadow-card">
                <p className="text-xs text-muted-foreground mb-1">🚚 Ingresos domicilio</p>
                <p className="font-display font-bold text-xl text-primary">{formatPrice(deliveryFeeTotal)}</p>
              </div>
            )}
            {peakHour.count > 0 && (period === 'today' || period === 'yesterday') && (
              <div className="bg-card rounded-xl border border-border p-4 shadow-card">
                <p className="text-xs text-muted-foreground mb-1">⏰ Hora pico</p>
                <p className="font-display font-bold text-xl">{peakHour.hour}:00</p>
                <p className="text-[10px] text-muted-foreground">{peakHour.count} pedidos • {formatPrice(peakHour.sales)}</p>
              </div>
            )}
          </div>

          {/* Payment methods summary */}
          <div className="bg-card rounded-xl border border-border p-4 shadow-card">
            <div className="grid grid-cols-3 gap-3">
              {cashTotal > 0 && <div className="flex justify-between text-sm"><span>💵 Efectivo</span><span className="font-display font-semibold">{formatPrice(cashTotal)}</span></div>}
              {transferTotal > 0 && <div className="flex justify-between text-sm"><span>📱 Transferencia</span><span className="font-display font-semibold">{formatPrice(transferTotal)}</span></div>}
              {cardTotal > 0 && <div className="flex justify-between text-sm"><span>💳 Tarjeta</span><span className="font-display font-semibold">{formatPrice(cardTotal)}</span></div>}
            </div>
          </div>

          {/* SECTION 3: SALES CHART */}
          <div className="bg-card rounded-xl border border-border p-4 shadow-card">
            <h3 className="font-display font-semibold text-sm mb-3">
              📈 {period === 'today' || period === 'yesterday' ? 'Ventas por hora' : 'Ventas por día'}
            </h3>
            {chartData.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  {period === 'today' || period === 'yesterday' ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${Math.round(v / 1000)}k`} />
                      <Tooltip formatter={(v: number) => formatPrice(v)} labelFormatter={l => `Hora: ${l}`} />
                      <Bar dataKey="ventas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${Math.round(v / 1000)}k`} />
                      <Tooltip formatter={(v: number) => formatPrice(v)} />
                      <Line type="monotone" dataKey="ventas" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos para graficar</p>
            )}
          </div>

          {/* SECTION 4: TOP PRODUCTS + TYPE BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top products */}
            <div className="bg-card rounded-xl border border-border p-4 shadow-card">
              <h3 className="font-display font-semibold text-sm mb-3">🏆 Productos más vendidos</h3>
              {topProducts.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {topProducts.map((p, i) => {
                    const maxQty = topProducts[0].qty;
                    const pct = maxQty > 0 ? (p.qty / maxQty) * 100 : 0;
                    return (
                      <div key={p.name} className="flex items-center gap-3">
                        <span className={cn('text-xs font-display font-bold w-5 text-center',
                          i < 3 ? 'text-warning' : 'text-muted-foreground')}>
                          {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <span className="font-display font-semibold text-sm ml-2 shrink-0">{formatPrice(p.revenue)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">x{p.qty}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>}
            </div>

            {/* Type breakdown + payment pie */}
            <div className="space-y-4">
              {/* Type breakdown */}
              <div className="bg-card rounded-xl border border-border p-4 shadow-card">
                <h3 className="font-display font-semibold text-sm mb-3">📊 Desglose por tipo</h3>
                <div className="grid grid-cols-3 gap-2">
                  {typeBreakdown.map(t => (
                    <div key={t.name} className="text-center p-3 rounded-xl" style={{ backgroundColor: t.color + '10', border: `1px solid ${t.color}25` }}>
                      <span className="text-2xl block mb-1">{t.emoji}</span>
                      <p className="text-xs font-medium" style={{ color: t.color }}>{t.name}</p>
                      <p className="font-display font-bold text-lg">{t.count}</p>
                      <p className="text-xs text-muted-foreground">{formatPrice(t.total)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment methods pie */}
              <div className="bg-card rounded-xl border border-border p-4 shadow-card">
                <h3 className="font-display font-semibold text-sm mb-3">💳 Métodos de pago</h3>
                {paymentPie.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-32 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={paymentPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                            {paymentPie.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatPrice(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 flex-1">
                      {paymentPie.map((d, i) => {
                        const pct = totalSales > 0 ? Math.round((d.value / totalSales) * 100) : 0;
                        return (
                          <div key={d.name} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
                            <span className="text-xs flex-1">{d.name}</span>
                            <span className="text-xs font-display font-semibold">{formatPrice(d.value)} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>}
              </div>
            </div>
          </div>

          {/* SECTION 5: TOP DRIVERS */}
          <div className="bg-card rounded-xl border border-border p-4 shadow-card">
            <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
              <Truck size={16} className="text-success" /> Ranking de Domiciliarios
            </h3>
            {topDrivers.length > 0 ? (
              <div className="space-y-3">
                {topDrivers.map((d, i) => {
                  const maxDeliveries = topDrivers[0].deliveries;
                  const pct = maxDeliveries > 0 ? (d.deliveries / maxDeliveries) * 100 : 0;
                  return (
                    <div key={d.id} className="p-3 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-sm font-display font-bold text-success shrink-0">
                            {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{d.name}</p>
                            <p className="text-[10px] text-muted-foreground">{d.phone}</p>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-success/60" style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      {/* Metrics grid */}
                      <div className="grid grid-cols-4 gap-1 text-[10px]">
                        <div className="text-center p-1.5 rounded bg-card/50">
                          <p className="text-muted-foreground mb-0.5">Entregas</p>
                          <p className="font-display font-bold text-lg text-success">{d.deliveries}</p>
                        </div>
                        <div className="text-center p-1.5 rounded bg-card/50">
                          <p className="text-muted-foreground mb-0.5">Ingresos</p>
                          <p className="font-display font-bold">{formatPrice(d.revenue)}</p>
                        </div>
                        <div className="text-center p-1.5 rounded bg-card/50">
                          <p className="text-muted-foreground mb-0.5">Fees</p>
                          <p className="font-display font-bold text-primary">{formatPrice(d.deliveryFees)}</p>
                        </div>
                        <div className="text-center p-1.5 rounded bg-card/50">
                          <p className="text-muted-foreground mb-0.5">Promedio</p>
                          <p className="font-display font-bold">{formatPrice(d.avgValue)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No hay pedidos con domiciliario asignado en este período</p>
            )}
          </div>

          {/* SECTION 6: TOP CUSTOMERS */}
          <div className="bg-card rounded-xl border border-border p-4 shadow-card">
            <h3 className="font-display font-semibold text-sm mb-3">👥 Clientes destacados</h3>
            {topCustomers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {topCustomers.map((c, i) => (
                  <div key={c.name + c.phone} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-display font-bold text-primary shrink-0">
                      {i < 3 ? ['🥇', '🥈', '🥉'][i] : c.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{plural(c.orders, 'pedido')}{c.phone ? ` • ${c.phone}` : ''}</p>
                    </div>
                    <span className="font-display font-semibold text-sm text-primary shrink-0">{formatPrice(c.spent)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-4">Sin datos de clientes</p>}
          </div>

          {/* SECTION 7: RECENT ORDERS */}
          <div className="bg-card rounded-xl border border-border p-4 shadow-card">
            <h3 className="font-display font-semibold text-sm mb-3">📋 Pedidos del período ({filtered.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-2 py-2 text-xs font-semibold text-muted-foreground">#</th>
                    <th className="text-left px-2 py-2 text-xs font-semibold text-muted-foreground">Cliente</th>
                    <th className="text-left px-2 py-2 text-xs font-semibold text-muted-foreground">Tipo</th>
                    <th className="text-left px-2 py-2 text-xs font-semibold text-muted-foreground">Estado</th>
                    <th className="text-left px-2 py-2 text-xs font-semibold text-muted-foreground">Pago</th>
                    <th className="text-left px-2 py-2 text-xs font-semibold text-muted-foreground">Domiciliario</th>
                    <th className="text-right px-2 py-2 text-xs font-semibold text-muted-foreground">Total</th>
                    <th className="text-right px-2 py-2 text-xs font-semibold text-muted-foreground">Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 30).map(o => {
                    const d = o.driverId ? drivers.find(dr => dr.id === o.driverId) : null;
                    const dName = d ? (d.name.split(':')[1] || d.name) : '';
                    return (
                      <tr key={o.id} className="border-b border-border/50 last:border-0">
                        <td className="px-2 py-2 font-display font-bold">{o.id}</td>
                        <td className="px-2 py-2 truncate max-w-[120px]">{o.customer.name}</td>
                        <td className="px-2 py-2"><OrderTypeBadge type={o.type} /></td>
                        <td className="px-2 py-2"><StatusBadge status={o.status} orderType={o.type} /></td>
                        <td className="px-2 py-2">
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                            o.paymentStatus === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
                            {o.paymentStatus === 'paid' ? '✅' : '⏳'}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-xs text-muted-foreground">{dName || '—'}</td>
                        <td className="px-2 py-2 text-right font-display font-semibold">{formatPrice(o.total)}</td>
                        <td className="px-2 py-2 text-right text-muted-foreground text-xs">{formatTime(o.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length > 30 && (
                <p className="text-xs text-muted-foreground text-center py-2">Mostrando 30 de {filtered.length} pedidos</p>
              )}
            </div>
          </div>

          {/* SECTION 8: EXPORT */}
          <div className="flex gap-3 justify-end print:hidden">
            <button onClick={exportCSV}
              className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2">
              <Download size={16} /> Exportar CSV
            </button>
            <button onClick={handlePrint}
              className="px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold shadow-fab hover:opacity-90 flex items-center gap-2">
              <Printer size={16} /> Imprimir
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
