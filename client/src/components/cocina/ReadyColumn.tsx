import React from 'react';
import { OrderDTO } from '@cevicheria/shared';
import { KitchenOrderCard } from './KitchenOrderCard';

interface ReadyColumnProps {
  orders: OrderDTO[];
  className?: string;
}

export const ReadyColumn: React.FC<ReadyColumnProps> = ({
  orders,
  className = ''
}) => {
  return (
    <section
      aria-labelledby="ready-heading"
      className={`flex flex-col space-y-4 ${className}`}
    >
      <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
        <div>
          <h2 id="ready-heading" className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-emerald-600 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span>Listos para Recoger</span>
            <span
              data-testid="ready-counter"
              className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 border border-emerald-200"
            >
              {orders.length}
            </span>
          </h2>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-sky-100 rounded-2xl p-8 text-center space-y-2 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            No hay pedidos listos esperando ser recogidos.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[calc(100vh-170px)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-sky-200">
          {orders.map((order) => (
            <KitchenOrderCard
              key={order.id}
              order={order}
              columnType="ready"
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default ReadyColumn;
