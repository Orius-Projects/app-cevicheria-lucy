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
          <h2 id="pending-heading" className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-brand-700 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="13" y2="16" />
            </svg>
            <span>Pendientes en Cocina</span>
            <span
              data-testid="pending-counter"
              className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800 border border-amber-200"
            >
              {orders.length}
            </span>
          </h2>
        </div>
      </div>

      {orders.length === 0 ? (
        <KitchenEmptyState title="Sin pedidos pendientes" />
      ) : (
        <div className="space-y-4 max-h-[calc(100vh-170px)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-brand-200">
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
