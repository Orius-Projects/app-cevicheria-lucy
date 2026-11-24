import React from 'react';
import { DishDTO, MenuItemDTO } from '@cevicheria/shared';
import { AvailabilityBadge } from './AvailabilityBadge';
import { RationBadge } from './RationBadge';
import { deriveDishStatus } from '../../utils/dishState';

export interface DishRationCardProps {
  item: MenuItemDTO;
  dish?: DishDTO;
  sectionName: string;
  isPending?: boolean;
  onOpen: (item: MenuItemDTO) => void;
  onIncrement: (item: MenuItemDTO) => void;
  onDecrement: (item: MenuItemDTO) => void;
  onMarkSoldOut: (item: MenuItemDTO) => void;
  onReactivate: (item: MenuItemDTO) => void;
}

const actionButtonClass =
  'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export const DishRationCard: React.FC<DishRationCardProps> = ({
  item,
  dish,
  sectionName,
  isPending = false,
  onOpen,
  onIncrement,
  onDecrement,
  onMarkSoldOut,
  onReactivate
}) => {
  const status = deriveDishStatus({
    active: item.active,
    manuallySoldOut: item.manuallySoldOut,
    hasRationsLimit: item.hasRationsLimit,
    remainingRations: item.remainingRations,
    lowStockThreshold: item.lowStockThreshold
  });

  const description = dish?.description || '';
  const remaining = item.remainingRations ?? 0;
  const total = item.totalRations;
  const canDecrement = item.hasRationsLimit && remaining > 0;
  const canIncrement =
    item.hasRationsLimit && (total === null || total === undefined || remaining < total);

  return (
    <article
      data-testid="dish-ration-card"
      data-dish-id={item.dishId}
      className={`flex min-w-0 flex-col justify-between rounded-2xl border bg-white dark:bg-marine-900 p-4 shadow-sm transition-shadow sm:p-5 ${
        item.manuallySoldOut
          ? 'border-rose-200 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/20'
          : item.active
            ? 'border-slate-200 dark:border-slate-800 hover:shadow-md'
            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-marine-950'
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="w-full min-w-0 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
        aria-label={`Editar ${item.dishName}`}
      >
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 space-y-1.5">
            <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-marine-800 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {sectionName}
            </span>
            <h3 className="break-words text-base font-bold leading-snug text-slate-900 dark:text-slate-100">
              {item.dishName}
            </h3>
          </div>
          <span className="shrink-0 text-base font-black text-brand-700 dark:text-brand-400">
            S/ {(item.priceCents / 100).toFixed(2)}
          </span>
        </div>

        {description && (
          <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <AvailabilityBadge status={status} />
          <RationBadge
            hasRationsLimit={item.hasRationsLimit}
            remainingRations={item.remainingRations}
            totalRations={item.totalRations}
            lowStockThreshold={item.lowStockThreshold}
            showTotal
          />
        </div>
      </button>

      <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Raciones
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200" aria-live="polite">
              {item.hasRationsLimit
                ? `${remaining} / ${item.totalRations ?? '—'}`
                : 'Sin límite'}
            </span>
          </div>

          {item.hasRationsLimit && (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onDecrement(item)}
                disabled={!canDecrement || isPending}
                aria-label={`Quitar una ración a ${item.dishName}`}
                className={`${actionButtonClass} border-slate-300 dark:border-slate-700 bg-white dark:bg-marine-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-marine-700`}
              >
                −
              </button>
              <span className="min-w-[2.75rem] text-center text-sm font-black text-slate-900 dark:text-slate-100">
                {remaining}
              </span>
              <button
                type="button"
                onClick={() => onIncrement(item)}
                disabled={!canIncrement || isPending}
                aria-label={`Agregar una ración a ${item.dishName}`}
                className={`${actionButtonClass} border-slate-300 dark:border-slate-700 bg-white dark:bg-marine-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-marine-700`}
              >
                +
              </button>
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {item.manuallySoldOut ? (
            <button
              type="button"
              onClick={() => onReactivate(item)}
              disabled={isPending}
              className={`${actionButtonClass} border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100`}
            >
              Reactivar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onMarkSoldOut(item)}
              disabled={isPending}
              className={`${actionButtonClass} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`}
            >
              Agotado
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpen(item)}
            className={`${actionButtonClass} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
          >
            Editar
          </button>
        </div>
      </div>
    </article>
  );
};

export default DishRationCard;
