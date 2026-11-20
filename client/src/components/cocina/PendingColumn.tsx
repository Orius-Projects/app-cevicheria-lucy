import React from 'react';
import { OrderDTO } from '@cevicheria/shared';
import { KitchenOrderCard } from './KitchenOrderCard';
import { KitchenEmptyState } from './KitchenEmptyState';

interface PendingColumnProps {
  orders: OrderDTO[];
  markingOrderId: string | null;
  recentOrderIds: string[];
  onMarkReady: (order: OrderDTO) => Promise<void>;
  className?: string;
}

export const PendingColumn: React.FC<PendingColumnProps> = ({
  orders,
  markingOrderId,
  recentOrderIds,
  onMarkReady,
  className = ''
}) => {
  return (
    <section
      aria-labelledby="pending-heading"
      className={`flex flex-col space-y-4 ${className}`}
    >
      <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
        <div>
          <h2 id="pending-heading" className="text-lg font-black text-slate-900 flex items-center space-x-2">
            <span>📋 Pendientes en Cocina</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
              {orders.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Orden FIFO por llegada del pedido
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <KitchenEmptyState
          title="Sin pedidos pendientes"
          description="Todos los pedidos han sido preparados. Nuevas comandas ingresarán aquí de inmediato."
        />
      ) : (
        <div className="space-y-4 max-h-[calc(100vh-170px)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-sky-200">
          {orders.map((order) => (
            <KitchenOrderCard
              key={order.id}
              order={order}
              columnType="pending"
              isMarking={markingOrderId === order.id}
              isHighlighted={recentOrderIds.includes(order.id)}
              onMarkReady={onMarkReady}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default PendingColumn;
