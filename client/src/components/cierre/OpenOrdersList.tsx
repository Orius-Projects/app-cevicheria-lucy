import React from 'react';
import { OrderDTO } from '@cevicheria/shared';

interface OpenOrdersListProps {
  orders: OrderDTO[];
  highlightedTableCode?: string | null;
  onManualClose: (order: OrderDTO) => void;
  disabled?: boolean;
}

export const OpenOrdersList: React.FC<OpenOrdersListProps> = ({
  orders,
  highlightedTableCode,
  onManualClose,
  disabled = false
}) => {
  if (orders.length === 0) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm text-slate-500">
        No hay pedidos pendientes
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const isHighlighted =
          highlightedTableCode &&
          highlightedTableCode.trim().toLowerCase() ===
            order.tableCode.trim().toLowerCase();

        const itemsSummary = order.items
          .map((item) => `${item.quantity}x ${item.dishName}`)
          .join(', ');

        return (
          <div
            key={order.id}
            className={`p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isHighlighted
                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-800 text-sm">
                  {order.tableCode}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  #{order.orderNumber}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                    order.status === 'LISTO'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-brand-100 text-brand-800 border border-brand-300'
                  }`}
                >
                  {order.status}
                </span>
                {isHighlighted && (
                  <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                    Mesa con pedidos activos
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 line-clamp-2">
                {itemsSummary || 'Sin platos registrados'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onManualClose(order)}
                disabled={disabled}
                className="min-h-[44px] px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg disabled:opacity-50 transition-colors"
                title="Cerrar manualmente este pedido si fue entregado físicamente"
              >
                Cerrar manualmente
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OpenOrdersList;
