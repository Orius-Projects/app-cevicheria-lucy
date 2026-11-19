import React from 'react';
import { OrderDTO } from '@cevicheria/shared';
import { OrderStatusBadge } from './OrderStatusBadge';
import { formatLimaTime } from '../../utils/datetime';

interface ReadyOrderCardProps {
  order: OrderDTO;
  onDeliver: (order: OrderDTO) => void;
  onCancel: (order: OrderDTO) => void;
  isDelivering?: boolean;
}

export const ReadyOrderCard: React.FC<ReadyOrderCardProps> = ({
  order,
  onDeliver,
  onCancel,
  isDelivering = false
}) => {
  return (
    <div
      data-testid="ready-order-card"
      data-order-id={order.id}
      className="bg-emerald-50/40 border-2 border-emerald-400 rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between space-y-4 animate-fade-in"
    >
      <div className="space-y-3">
        <div className="flex justify-between items-start gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black text-slate-900">Mesa {order.tableCode}</span>
              <span className="text-xs font-bold text-slate-500">#{order.orderNumber}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Tomado por: <span className="font-semibold text-slate-700">{order.takenByName}</span> • Enviado a las {formatLimaTime(order.enviadoEn)}
            </p>
          </div>

          <OrderStatusBadge status="LISTO" />
        </div>

        <div className="bg-white rounded-xl p-3 border border-emerald-200/60 space-y-1.5 text-xs">
          <span className="font-bold text-emerald-950 uppercase text-[10px] tracking-wider block">
            Platos a Servir:
          </span>
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start">
              <span className="font-semibold text-slate-800">
                {item.quantity}× {item.dishName}
                {item.variations && item.variations.length > 0 && (
                  <span className="text-[11px] font-normal text-slate-500 block">
                    ({item.variations.map((v) => v.name).join(', ')})
                  </span>
                )}
                {item.notes && (
                  <span className="text-[11px] font-normal text-amber-800 block italic">
                    "{item.notes}"
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>

        {order.notes && (
          <p className="text-xs text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 italic">
            Nota general: "{order.notes}"
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-emerald-200/50">
        <button
          type="button"
          onClick={() => onCancel(order)}
          disabled={isDelivering}
          className="px-4 py-2.5 border border-slate-300 text-slate-600 hover:bg-white rounded-xl text-xs font-bold min-h-[44px] flex items-center justify-center transition-colors"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={() => onDeliver(order)}
          disabled={isDelivering}
          className="flex-1 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-sm font-black min-h-[44px] shadow-md flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
        >
          <span>{isDelivering ? 'Entregando...' : '✓ Entregar a Mesa'}</span>
        </button>
      </div>
    </div>
  );
};

export default ReadyOrderCard;
