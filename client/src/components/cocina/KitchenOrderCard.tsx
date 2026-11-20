import React from 'react';
import { OrderDTO } from '@cevicheria/shared';
import { formatLimaTime } from '../../utils/datetime';
import { KitchenItems } from './KitchenItems';

interface KitchenOrderCardProps {
  order: OrderDTO;
  columnType: 'pending' | 'ready';
  onMarkReady?: (order: OrderDTO) => Promise<void>;
  isMarking?: boolean;
  isHighlighted?: boolean;
  className?: string;
}

export const KitchenOrderCard: React.FC<KitchenOrderCardProps> = ({
  order,
  columnType,
  onMarkReady,
  isMarking = false,
  isHighlighted = false,
  className = ''
}) => {
  const isPending = columnType === 'pending';
  const isReady = columnType === 'ready';

  return (
    <article
      data-testid="kitchen-order-card"
      data-order-id={order.id}
      aria-labelledby={`order-title-${order.id}`}
      className={`bg-white rounded-2xl border-2 p-4 sm:p-5 shadow-xs space-y-4 transition-all duration-300 flex flex-col justify-between ${
        isHighlighted
          ? 'ring-4 ring-brand-300 border-brand-500 bg-sky-50/20 scale-[1.01]'
          : isReady
          ? 'border-emerald-300 bg-emerald-50/25'
          : 'border-sky-200 hover:border-brand-400'
      } ${className}`}
    >
      <div className="space-y-3.5">
        {/* Cabecera de Comanda: Mesa y Número */}
        <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center space-x-2.5">
              <h2
                id={`order-title-${order.id}`}
                className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight"
              >
                Mesa {order.tableCode}
              </h2>
              <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-brand-50 border border-brand-200 text-brand-700">
                #{order.orderNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Mozo: <strong className="text-slate-700">{order.takenByName}</strong> • Enviado a las{' '}
              <span className="text-slate-800 font-bold">{formatLimaTime(order.enviadoEn)}</span>
            </p>
          </div>

          <div>
            {isPending && (
              <span className="px-2.5 py-1 rounded-md text-xs font-black bg-sky-100 text-sky-800 border border-sky-200 uppercase tracking-wider">
                ENVIADO
              </span>
            )}
            {isReady && (
              <span className="px-2.5 py-1 rounded-md text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                LISTO
              </span>
            )}
          </div>
        </div>

        {/* Nota general de comanda */}
        {order.notes && order.notes.trim() && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            <span className="font-bold text-amber-800 block text-[11px] uppercase tracking-wider">
              Nota general para cocina:
            </span>
            <p className="italic mt-0.5">"{order.notes}"</p>
          </div>
        )}

        {/* Ítems del pedido */}
        <KitchenItems items={order.items} />
      </div>

      {/* Pie / Acción de Cocina */}
      <div className="pt-3 border-t border-slate-100 mt-2">
        {isPending ? (
          <button
            type="button"
            disabled={isMarking}
            onClick={() => onMarkReady && onMarkReady(order)}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-base font-black min-h-[48px] shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <span>{isMarking ? 'Marcando listo...' : '✓ Marcar listo'}</span>
          </button>
        ) : (
          <div className="w-full py-2.5 px-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-800 flex items-center justify-center space-x-1.5">
            <span>✓</span>
            <span>Listo para recoger (esperando al mozo)</span>
          </div>
        )}
      </div>
    </article>
  );
};

export default KitchenOrderCard;
