import React from 'react';
import { OrderItem } from '@cevicheria/shared';

interface KitchenItemsProps {
  items: OrderItem[];
  className?: string;
}

export const KitchenItems: React.FC<KitchenItemsProps> = ({
  items,
  className = ''
}) => {
  return (
    <div className={`space-y-2.5 max-h-72 overflow-y-auto pr-1 ${className}`}>
      {items.map((item, idx) => (
        <div
          key={`${item.dishId}_${idx}`}
          className="bg-brand-50/50 dark:bg-marine-950/60 rounded-xl p-3 border border-brand-100 dark:border-marine-800 space-y-1.5 transition-all"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start space-x-2">
              <span className="text-base sm:text-lg font-bold text-brand-700 dark:text-brand-300 leading-tight">
                {item.quantity}×
              </span>
              <div>
                <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight block">
                  {item.dishName}
                </span>
                {item.sectionName && (
                  <span className="text-[10px] uppercase font-bold text-brand-700 dark:text-brand-400 tracking-wider">
                    {item.sectionName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Variaciones destacadas */}
          {item.variations && item.variations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {item.variations.map((v) => (
                <span
                  key={v.id}
                  className="text-xs px-2.5 py-0.5 rounded-md bg-white dark:bg-marine-900 text-brand-800 dark:text-brand-200 border border-brand-200 dark:border-marine-700 font-medium flex items-center gap-1 shadow-xs"
                >
                  <svg
                    className="w-3 h-3 text-brand-700 dark:text-brand-300 shrink-0"
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
                  <span>{v.name}</span>
                </span>
              ))}
            </div>
          )}

          {/* Notas de preparación de ítem */}
          {item.notes && item.notes.trim() && (
            <div className="mt-1.5 p-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-900 dark:text-amber-200 font-normal">
              <span className="font-bold text-amber-800 dark:text-amber-300 block text-[11px] uppercase tracking-wider">
                Nota de preparación:
              </span>
              <span>"{item.notes}"</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default KitchenItems;
