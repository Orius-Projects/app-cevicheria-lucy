import React from 'react';
import { SoldOutRow } from '@cevicheria/shared';

interface SoldOutListProps {
  soldOutDishes: SoldOutRow[];
}

export const SoldOutList: React.FC<SoldOutListProps> = ({ soldOutDishes }) => {
  if (soldOutDishes.length === 0) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm text-slate-500">
        No se registran platos agotados en este turno.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {soldOutDishes.map((item, idx) => (
        <div
          key={`${item.dishId}-${idx}`}
          className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-sm"
        >
          <div>
            <p className="text-sm font-bold text-slate-800">{item.dishName}</p>
            <p className="text-xs text-rose-600 font-medium mt-0.5">
              Motivo: {item.reason || 'Raciones agotadas'}
            </p>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-full shrink-0">
            Agotado
          </span>
        </div>
      ))}
    </div>
  );
};

export default SoldOutList;
