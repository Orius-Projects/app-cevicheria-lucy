import React from 'react';
import { OrderDraftItem } from '@cevicheria/shared';
import { formatSoles } from '../../utils/money';

interface OrderSummaryProps {
  tableCode?: string | null;
  items: OrderDraftItem[];
  notes?: string;
  className?: string;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  tableCode,
  items,
  notes,
  className = ''
}) => {
  const totalCents = items.reduce((acc, curr) => acc + curr.priceCents * curr.quantity, 0);

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm ${className}`}>
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-900 text-base">Resumen de Comanda</h3>
        {tableCode && (
          <span className="px-3 py-1 bg-brand-50 text-brand-700 font-bold rounded-lg text-xs border border-brand-200">
            Mesa {tableCode}
          </span>
        )}
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">No hay ítems en la comanda.</p>
        ) : (
          items.map((item, idx) => {
            const lineTotal = item.priceCents * item.quantity;
            return (
              <div key={`${item.dishId}_${idx}`} className="flex justify-between items-start text-xs border-b border-slate-50 pb-2.5">
                <div className="space-y-0.5 flex-1 pr-2">
                  <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                    <span className="text-brand-700 font-black">{item.quantity}×</span>
                    <span>{item.dishName}</span>
                  </div>

                  {item.variations && item.variations.length > 0 && (
                    <p className="text-[11px] text-slate-500">
                      Variaciones: {item.variations.map((v) => v.name).join(', ')}
                    </p>
                  )}

                  {item.notes && (
                    <p className="text-[11px] text-amber-700 font-medium italic">
                      Nota: "{item.notes}"
                    </p>
                  )}
                </div>

                <div className="text-right font-bold text-slate-900">
                  {formatSoles(lineTotal)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {notes && (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Nota General de Comanda:</span>
          <p className="text-slate-800 italic">"{notes}"</p>
        </div>
      )}

      <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
        <span className="text-sm font-bold text-slate-700">Total Comanda</span>
        <span className="text-xl font-black text-brand-700">{formatSoles(totalCents)}</span>
      </div>
    </div>
  );
};

export default OrderSummary;
