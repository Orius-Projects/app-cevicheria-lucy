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
      className={`bg-slate-800/95 rounded-2xl border-2 p-4 sm:p-5 shadow-xl space-y-4 transition-all duration-300 flex flex-col justify-between ${
        isHighlighted
          ? 'ring-4 ring-emerald-500/80 border-emerald-400 bg-slate-800 scale-[1.01]'
          : isReady
          ? 'border-emerald-700/60 bg-slate-800/80'
          : 'border-slate-700 hover:border-slate-600'
      } ${className}`}
    >
      <div className="space-y-3.5">
        {/* Cabecera de Comanda: Mesa y Número */}
        <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-700/80 pb-3">
          <div>
            <div className="flex items-center space-x-2.5">
              <h2
                id={`order-title-${order.id}`}
                className="text-2xl sm:text-3xl font-black text-white tracking-tight"
              >
                Mesa {order.tableCode}
              </h2>
              <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-600/70 text-amber-300">
                #{order.orderNumber}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Mozo: <strong className="text-slate-300">{order.takenByName}</strong> • Enviado a las{' '}
              <span className="text-slate-300 font-bold">{formatLimaTime(order.enviadoEn)}</span>
            </p>
          </div>

          <div>
            {isPending && (
              <span className="px-2.5 py-1 rounded-md text-xs font-black bg-blue-950 text-blue-300 border border-blue-700/60 uppercase tracking-wider">
                ENVIADO
              </span>
            )}
            {isReady && (
              <span className="px-2.5 py-1 rounded-md text-xs font-black bg-emerald-950 text-emerald-300 border border-emerald-600/60 uppercase tracking-wider">
                LISTO
              </span>
            )}
          </div>
        </div>

        {/* Nota general de comanda */}
        {order.notes && order.notes.trim() && (
          <div className="p-2.5 bg-yellow-950/40 border border-yellow-700/50 rounded-xl text-xs text-yellow-200">
            <span className="font-bold text-yellow-400 block text-[11px] uppercase tracking-wider">
              Nota general para cocina:
            </span>
            <p className="italic mt-0.5">"{order.notes}"</p>
          </div>
        )}

        {/* Ítems del pedido */}
        <KitchenItems items={order.items} />
      </div>

      {/* Pie / Acción de Cocina */}
      <div className="pt-3 border-t border-slate-700/80 mt-2">
        {isPending ? (
          <button
            type="button"
            disabled={isMarking}
            onClick={() => onMarkReady && onMarkReady(order)}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-base font-black min-h-[48px] shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <span>{isMarking ? 'Marcando listo...' : '✓ Marcar listo'}</span>
          </button>
        ) : (
          <div className="w-full py-2.5 px-4 bg-emerald-950/80 border border-emerald-600/60 rounded-xl text-center text-xs font-bold text-emerald-300 flex items-center justify-center space-x-1.5">
            <span>✓</span>
            <span>Listo para recoger (esperando al mozo)</span>
          </div>
        )}
      </div>
    </article>
  );
};

export default KitchenOrderCard;
