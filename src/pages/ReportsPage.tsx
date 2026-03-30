import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { formatPrice } from '@/lib/format';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const ReportsPage = () => {
  const { orders } = useStore();
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  const completedOrders = orders.filter(o => o.status !== 'cancelled');
  const totalSales = completedOrders.reduce((s, o) => s + o.total, 0);
  const totalOrders = completedOrders.length;
  const avgTicket = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

  // Top products
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  completedOrders.forEach(o => o.items.forEach(i => {
    if (!productMap[i.name]) productMap[i.name] = { name: i.name, qty: 0, revenue: 0 };
    productMap[i.name].qty += i.quantity;
    productMap[i.name].revenue += i.price * i.quantity;
  }));
  const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // By payment
  const paymentData = [
    { name: '💵 Efectivo', value: completedOrders.filter(o => o.paymentMethod === 'cash').reduce((s, o) => s + o.total, 0) },
    { name: '📱 Transfer', value: completedOrders.filter(o => o.paymentMethod === 'transfer').reduce((s, o) => s + o.total, 0) },
    { name: '💳 Tarjeta', value: completedOrders.filter(o => o.paymentMethod === 'card').reduce((s, o) => s + o.total, 0) },
  ].filter(d => d.value > 0);

  // By type
  const typeData = [
    { name: '🏠 Domicilio', value: completedOrders.filter(o => o.type === 'delivery').length, color: '#EF4444' },
    { name: '🛍️ Recoger', value: completedOrders.filter(o => o.type === 'pickup').length, color: '#F59E0B' },
    { name: '🍽️ Mesa', value: completedOrders.filter(o => o.type === 'dine-in').length, color: '#10B981' },
  ].filter(d => d.value > 0);

  const pieColors = ['#4F46E5', '#6366F1', '#818CF8'];

  // Hourly chart mock
  const hourlyData = Array.from({ length: 12 }, (_, i) => ({
    hour: `${i + 10}:00`,
    ventas: Math.floor(Math.random() * 80000) + 10000,
  }));

  return (
    <div className="space-y-6">
      {/* Period tabs */}
      <div className="flex gap-2">
        {(['today', 'week', 'month'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold ${period === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            {p === 'today' ? 'Hoy' : p === 'week' ? 'Semana' : 'Mes'}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
          <p className="text-xs text-muted-foreground">Total ventas</p>
          <p className="font-display font-bold text-lg text-primary">{formatPrice(totalSales)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
          <p className="text-xs text-muted-foreground">Pedidos</p>
          <p className="font-display font-bold text-lg">{totalOrders}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
          <p className="text-xs text-muted-foreground">Ticket prom.</p>
          <p className="font-display font-bold text-lg">{formatPrice(avgTicket)}</p>
        </div>
      </div>

      {/* Sales chart */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-card">
        <h3 className="font-display font-semibold text-sm mb-3">Ventas por hora</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => formatPrice(v)} />
              <Bar dataKey="ventas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top products */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-card">
        <h3 className="font-display font-semibold text-sm mb-3">Top productos</h3>
        <div className="space-y-2">
          {topProducts.map((p, i) => (
            <div key={p.name} className="flex items-center gap-3">
              <span className="text-xs font-display font-bold text-muted-foreground w-4">{i + 1}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">x{p.qty}</p>
              </div>
              <span className="font-display font-semibold text-sm">{formatPrice(p.revenue)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 shadow-card">
          <h3 className="font-display font-semibold text-sm mb-3">Métodos de pago</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={35}>
                  {paymentData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatPrice(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1">
            {paymentData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pieColors[i] }} />
                <span className="flex-1">{d.name}</span>
                <span className="font-display font-semibold">{formatPrice(d.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4 shadow-card">
          <h3 className="font-display font-semibold text-sm mb-3">Tipo de pedido</h3>
          <div className="space-y-2">
            {typeData.map(d => {
              const pct = totalOrders > 0 ? Math.round((d.value / totalOrders) * 100) : 0;
              return (
                <div key={d.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{d.name}</span>
                    <span className="font-display font-semibold">{d.value} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
