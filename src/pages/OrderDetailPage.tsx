import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MapPin } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { StatusBadge } from '@/components/StatusBadge';
import { OrderTypeBadge } from '@/components/OrderTypeBadge';
import { formatPrice, formatTime } from '@/lib/format';

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, updateOrderStatus } = useStore();
  const order = orders.find(o => o.id === Number(id));

  if (!order) return (
    <div className="text-center py-16">
      <span className="text-5xl block mb-3">🔍</span>
      <p className="text-muted-foreground">Pedido no encontrado</p>
      <button onClick={() => navigate('/orders')} className="mt-3 text-sm text-primary font-medium">← Volver</button>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/orders')} className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="font-display font-bold text-lg">Pedido #{order.id}</h1>
          <p className="text-xs text-muted-foreground">{formatTime(order.createdAt)}</p>
        </div>
        <div className="ml-auto flex gap-1.5">
          <StatusBadge status={order.status} />
          <OrderTypeBadge type={order.type} />
        </div>
      </div>

      {/* Customer */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-card">
        <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Cliente</h3>
        <p className="font-display font-semibold">{order.customer.name}</p>
        {order.customer.phone && <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1"><Phone size={14} />{order.customer.phone}</p>}
        {order.customer.address && <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5"><MapPin size={14} />{order.customer.address}</p>}
      </div>

      {/* Items */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-card">
        <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Productos</h3>
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">{item.quantity}x {item.name}</span>
                {item.notes && <p className="text-xs text-muted-foreground">📝 {item.notes}</p>}
              </div>
              <span className="font-display font-semibold">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-border mt-3 pt-2 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          {order.deliveryFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Domicilio</span><span>{formatPrice(order.deliveryFee)}</span></div>}
          <div className="flex justify-between font-display font-bold text-base"><span>Total</span><span className="text-primary">{formatPrice(order.total)}</span></div>
        </div>
      </div>

      {/* Actions */}
      {order.status !== 'delivered' && order.status !== 'cancelled' && (
        <div className="flex gap-2">
          {order.status === 'pending' && (
            <button onClick={() => updateOrderStatus(order.id, 'preparing')}
              className="flex-1 py-2.5 rounded-lg gradient-primary text-primary-foreground font-display font-semibold text-sm">→ En preparación</button>
          )}
          {order.status === 'preparing' && (
            <button onClick={() => updateOrderStatus(order.id, 'ready')}
              className="flex-1 py-2.5 rounded-lg bg-success text-success-foreground font-display font-semibold text-sm">✅ Marcar Listo</button>
          )}
          {order.status === 'ready' && (
            <button onClick={() => updateOrderStatus(order.id, 'delivered')}
              className="flex-1 py-2.5 rounded-lg bg-muted text-foreground font-display font-semibold text-sm">📦 Entregado</button>
          )}
          <button onClick={() => updateOrderStatus(order.id, 'cancelled')}
            className="px-4 py-2.5 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5">Cancelar</button>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;
