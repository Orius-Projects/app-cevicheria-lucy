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
          className="bg-slate-900/90 rounded-xl p-3 border border-slate-700/80 space-y-1.5 transition-all"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start space-x-2">
              <span className="text-lg sm:text-xl font-black text-amber-400 leading-tight">
                {item.quantity}×
              </span>
              <div>
                <span className="text-sm sm:text-base font-bold text-slate-100 leading-tight block">
                  {item.dishName}
                </span>
                {item.sectionName && (
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
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
                  className="text-xs px-2.5 py-0.5 rounded-md bg-amber-950/90 text-amber-300 border border-amber-600/70 font-semibold flex items-center space-x-1"
                >
                  <span className="text-[10px] text-amber-500">✦</span>
                  <span>{v.name}</span>
                </span>
              ))}
            </div>
          )}

          {/* Notas de ítem completas sin truncar */}
          {item.notes && item.notes.trim() && (
            <div className="mt-1.5 p-2 bg-yellow-950/40 border border-yellow-700/60 rounded-lg text-xs text-yellow-200 font-medium">
              <span className="font-bold text-yellow-400 block text-[11px] uppercase tracking-wider">
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
