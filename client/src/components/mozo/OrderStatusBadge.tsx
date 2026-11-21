import React from 'react';
import { OrderStatus } from '@cevicheria/shared';

interface OrderStatusBadgeProps {
  status: OrderStatus | 'BORRADOR';
  className?: string;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, className = '' }) => {
  const configs: Record<
    OrderStatus | 'BORRADOR',
    { label: string; bg: string; text: string; border: string; dot: string }
  > = {
    ENVIADO: {
      label: 'Enviado a cocina',
      bg: 'bg-brand-50',
      text: 'text-brand-700',
      border: 'border-brand-200',
      dot: 'bg-brand-500'
    },
    LISTO: {
      label: 'Listo para recoger',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300 font-bold',
      dot: 'bg-emerald-500 animate-pulse'
    },
    ENTREGADO: {
      label: 'Entregado',
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-300',
      dot: 'bg-slate-400'
    },
    CANCELADO: {
      label: 'Cancelado',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      dot: 'bg-rose-500'
    },
    BORRADOR: {
      label: 'Borrador',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      dot: 'bg-amber-500'
    }
  };

  const config = configs[status] || configs.ENVIADO;

  return (
    <span
      data-testid="order-status-badge"
      data-status={status}
      className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.dot}`} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
};

export default OrderStatusBadge;
