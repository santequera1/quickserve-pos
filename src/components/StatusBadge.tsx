import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/store/useStore';

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-warning/15 text-warning' },
  preparing: { label: 'En preparación', className: 'bg-info/15 text-info' },
  ready: { label: 'Listo', className: 'bg-success/15 text-success' },
  delivered: { label: 'Entregado', className: 'bg-muted text-muted-foreground' },
  cancelled: { label: 'Cancelado', className: 'bg-destructive/15 text-destructive' },
};

export const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const config = statusConfig[status];
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', config.className)}>
      {config.label}
    </span>
  );
};
