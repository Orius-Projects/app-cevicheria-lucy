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
          <h2 id="ready-heading" className="text-lg font-black text-slate-900 flex items-center space-x-2">
            <span>🔔 Listos para Recoger</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {orders.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Comandas esperando que el mozo las lleve a mesa
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-sky-100 rounded-2xl p-8 text-center space-y-2 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto text-sm font-bold">
            ✓
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
