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
      <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
        <div>
          <h2 id="ready-heading" className="text-lg font-black text-white flex items-center space-x-2">
            <span>🔔 Listos para Recoger</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-600/70">
              {orders.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Comandas esperando que el mozo las lleve a mesa
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
          <span className="text-2xl block">✓</span>
          <p className="text-xs text-slate-400 font-medium">
            No hay pedidos listos esperando ser recogidos.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[calc(100vh-170px)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
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
