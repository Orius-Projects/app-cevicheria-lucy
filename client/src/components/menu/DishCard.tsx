import React from 'react';
import { MenuItemDTO, DishDTO, DishStatus, DishVariation } from '@cevicheria/shared';
import { AvailabilityBadge } from './AvailabilityBadge';
import { RationBadge } from './RationBadge';

interface DishCardProps {
  item: MenuItemDTO & {
    description?: string;
    course?: string;
    isFixed?: boolean;
    isRotating?: boolean;
    state?: DishStatus;
    status?: DishStatus;
    variations?: Array<{ id: string; name: string; active?: boolean }>;
    dish?: DishDTO | null;
  };
  onAdd?: (item: MenuItemDTO) => void;
  showAddButton?: boolean;
}

export const DishCard: React.FC<DishCardProps> = ({
  item,
  onAdd,
  showAddButton = true
}) => {
  const status: DishStatus = item.status || (item.state as DishStatus) || 'DISPONIBLE';
  const isAvailable = status === 'DISPONIBLE' || status === 'ULTIMAS_RACIONES';
  const isSoldOut = status === 'AGOTADO';
  const isInactive = status === 'INACTIVO';

  const description = item.description ?? item.dish?.description;
  const rawVariations = item.variations ?? item.dish?.variations ?? [];
  const variations = rawVariations.filter(
    (v: DishVariation | { id: string; name: string; active?: boolean }) => v.active !== false
  );

  return (
    <div
      data-testid="dish-card"
      data-dish-id={item.dishId}
      className={`bg-white dark:bg-marine-900 rounded-2xl border p-4 sm:p-5 flex flex-col justify-between shadow-sm transition-all ${
        isSoldOut
          ? 'border-rose-200 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/20 opacity-80'
          : isInactive
          ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-marine-950 opacity-60'
          : 'border-slate-200 dark:border-slate-800 hover:shadow-md'
      }`}
    >
      <div className="space-y-3">
        {/* Header de la tarjeta */}
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-1">
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-marine-800 text-slate-600 dark:text-slate-300 font-semibold tracking-wide uppercase">
              {item.sectionKey}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {item.dishName}
            </h3>
          </div>

          <div className="text-right">
            <span className="text-lg font-black text-brand-700 dark:text-brand-400">
              S/ {(item.priceCents / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Badges de Disponibilidad y Raciones */}
        <div className="flex flex-wrap items-center gap-2">
          <AvailabilityBadge status={status} />
          <RationBadge
            hasRationsLimit={item.hasRationsLimit}
            remainingRations={item.remainingRations}
            totalRations={item.totalRations}
            lowStockThreshold={item.lowStockThreshold}
          />
        </div>

        {/* Descripción del plato */}
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            {description}
          </p>
        )}

        {/* Variaciones sin costo */}
        {variations.length > 0 && (
          <div className="pt-1">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mb-1">
              Variaciones sin costo adicional:
            </p>
            <div className="flex flex-wrap gap-1">
              {variations.map((v) => (
                <span
                  key={v.id}
                  className="text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-marine-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700"
                >
                  {v.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Botón Agregar para toma de pedidos */}
      {showAddButton && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
          <button
            type="button"
            disabled={!isAvailable}
            onClick={() => onAdd && onAdd(item)}
            className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold min-h-[44px] flex items-center justify-center space-x-2 transition-all ${
              isAvailable
                ? 'bg-brand-500 hover:bg-brand-400 text-brand-950 shadow-sm active:scale-[0.98]'
                : 'bg-slate-100 dark:bg-marine-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
            }`}
          >
            {isSoldOut ? (
              <span>Plato Agotado</span>
            ) : isInactive ? (
              <span>No disponible</span>
            ) : (
              <span>+ Agregar</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default DishCard;
