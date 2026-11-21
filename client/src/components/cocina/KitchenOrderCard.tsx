import React, { useEffect, useState } from 'react';
import { OrderDTO } from '@cevicheria/shared';
import { KitchenItems } from './KitchenItems';

interface KitchenOrderCardProps {
  order: OrderDTO;
  columnType: 'pending' | 'ready';
  onMarkReady?: (order: OrderDTO) => Promise<void>;
  isMarking?: boolean;
  isHighlighted?: boolean;
  className?: string;
}

function formatElapsedTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  if (safeSeconds < 60) {
    return `${safeSeconds}s`;
  }
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const paddedSeconds = seconds.toString().padStart(2, '0');

  if (hours > 0) {
    const paddedMinutes = minutes.toString().padStart(2, '0');
    return `${hours}h ${paddedMinutes}m ${paddedSeconds}s`;
  }
  return `${minutes}m ${paddedSeconds}s`;
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

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    const startMs = order.enviadoEn ? new Date(order.enviadoEn).getTime() : Date.now();
    if (Number.isNaN(startMs)) return 0;
    return Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  });

  useEffect(() => {
    const startMs = order.enviadoEn ? new Date(order.enviadoEn).getTime() : Date.now();
    if (Number.isNaN(startMs)) {
      setElapsedSeconds(0);
      return;
    }

    const updateTimer = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [order.enviadoEn]);

  return (
    <article
      data-testid="kitchen-order-card"
      data-order-id={order.id}
      aria-labelledby={`order-title-${order.id}`}
      className={`bg-white rounded-2xl border-2 p-4 sm:p-5 shadow-xs space-y-4 transition-all duration-300 flex flex-col justify-between ${
        isHighlighted
          ? 'ring-4 ring-brand-300 border-brand-500 bg-brand-50/20 scale-[1.01]'
          : isReady
          ? 'border-emerald-300 bg-emerald-50/25'
          : 'border-brand-200 hover:border-brand-400'
      } ${className}`}
    >
      <div className="space-y-3.5">
        {/* Cabecera de Comanda: Mesa y Número */}
        <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center space-x-2.5">
              <h2
                id={`order-title-${order.id}`}
                className="text-xl sm:text-2xl font-semibold text-slate-800 tracking-tight"
              >
                Mesa {order.tableCode}
              </h2>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-700">
                #{order.orderNumber}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center flex-wrap gap-1.5">
              <span>
                Mozo: <span className="text-slate-700 font-medium">{order.takenByName}</span>
              </span>
              <span>•</span>
              <span
                data-testid="order-elapsed-timer"
                className="inline-flex items-center gap-1 text-brand-700 font-medium bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200"
              >
                <svg
                  className="w-3.5 h-3.5 text-brand-700 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{formatElapsedTime(elapsedSeconds)}</span>
              </span>
            </div>
          </div>

          <div>
            {isPending && (
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-brand-100 text-brand-800 border border-brand-200 uppercase tracking-wider">
                ENVIADO
              </span>
            )}
            {isReady && (
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                LISTO
              </span>
            )}
          </div>
        </div>

        {/* Nota general de comanda */}
        {order.notes && order.notes.trim() && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            <span className="font-medium text-amber-800 block text-[11px] uppercase tracking-wider">
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
            className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-800 text-white rounded-xl text-sm font-medium min-h-[48px] shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {!isMarking && (
              <svg
                className="w-5 h-5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            <span>{isMarking ? 'Marcando listo...' : 'Marcar listo'}</span>
          </button>
        ) : (
          <div className="w-full py-2.5 px-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-medium text-emerald-800 flex items-center justify-center gap-1.5">
            <svg
              className="w-4 h-4 text-emerald-600 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Listo para recoger (esperando al mozo)</span>
          </div>
        )}
      </div>
    </article>
  );
};

export default KitchenOrderCard;
