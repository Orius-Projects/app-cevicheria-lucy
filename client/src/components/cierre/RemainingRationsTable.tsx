import React from 'react';
import { RemainingRationRow } from '@cevicheria/shared';

interface RemainingRationsTableProps {
  remainingRations: RemainingRationRow[];
  onAdjust?: (dish: RemainingRationRow) => void;
  isReadOnly?: boolean;
}

export const RemainingRationsTable: React.FC<RemainingRationsTableProps> = ({
  remainingRations,
  onAdjust,
  isReadOnly = false
}) => {
  if (remainingRations.length === 0) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm text-slate-500">
        No hay platos con límite de raciones activo en este turno.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3">
              Plato
            </th>
            <th scope="col" className="px-4 py-3 text-center">
              Raciones restantes
            </th>
            {!isReadOnly && (
              <th scope="col" className="px-4 py-3 text-right">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {remainingRations.map((item) => (
            <tr key={item.dishId} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-800">
                {item.dishName}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    item.remainingRations === 0
                      ? 'bg-rose-100 text-rose-800'
                      : item.remainingRations <= 5
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {item.remainingRations}
                </span>
              </td>
              {!isReadOnly && (
                <td className="px-4 py-3 text-right">
                  {onAdjust && (
                    <button
                      type="button"
                      onClick={() => onAdjust(item)}
                      className="min-h-[44px] px-3 py-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors"
                    >
                      Ajustar raciones
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RemainingRationsTable;
