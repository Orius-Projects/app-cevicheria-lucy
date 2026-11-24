import React, { useState } from 'react';
import { useOrderDraftStore } from '../../stores/orderDraftStore';
import { QuantityStepper } from './QuantityStepper';
import { ItemNotesModal } from './ItemNotesModal';
import { formatSoles } from '../../utils/money';

interface OrderCartProps {
  onConfirmOrder: () => void;
  isSubmitting?: boolean;
  className?: string;
}

export const OrderCart: React.FC<OrderCartProps> = ({
  onConfirmOrder,
  isSubmitting = false,
  className = ''
}) => {
  const {
    tableCode,
    items,
    notes,
    updateItemQuantity,
    updateItemNotes,
    removeItem,
    setGeneralNotes,
    clearDraft,
    totalCents
  } = useOrderDraftStore();

  const [editingNotesIndex, setEditingNotesIndex] = useState<number | null>(null);
  const [isGeneralNotesOpen, setIsGeneralNotesOpen] = useState(false);

  const total = totalCents();
  const hasItems = items.length > 0;

  return (
    <div className={`bg-white dark:bg-marine-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col justify-between p-4 sm:p-5 ${className}`}>
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Borrador de Comanda</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tableCode ? `Mesa ${tableCode}` : 'Sin mesa seleccionada'}
            </p>
          </div>

          {hasItems && (
            <button
              type="button"
              onClick={clearDraft}
              className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 font-semibold px-2 py-1 min-h-[44px] flex items-center"
            >
              Vaciar
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
            <span className="text-3xl block">📋</span>
            <p className="text-xs font-medium">El carrito está vacío.</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Selecciona platos de la carta para agregarlos.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div
                key={`${item.dishId}_${idx}`}
                className="bg-slate-50 dark:bg-marine-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2.5 text-xs"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{item.dishName}</h4>
                    <p className="text-brand-700 dark:text-brand-400 font-bold">{formatSoles(item.priceCents)} c/u</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    aria-label={`Eliminar ${item.dishName}`}
                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-bold text-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>

                {item.variations && item.variations.length > 0 && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    <strong>Variaciones:</strong> {item.variations.map((v) => v.name).join(', ')}
                  </p>
                )}

                {item.notes && (
                  <p className="text-[11px] text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg border border-amber-200 dark:border-amber-800 italic">
                    "{item.notes}"
                  </p>
                )}

                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-800">
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditingNotesIndex(idx)}
                      className="text-[11px] text-slate-600 dark:text-slate-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold underline min-h-[44px] flex items-center"
                    >
                      {item.notes ? 'Editar nota' : '+ Nota'}
                    </button>
                  </div>

                  <QuantityStepper
                    value={item.quantity}
                    max={item.remainingRations}
                    onChange={(newQty) => updateItemQuantity(idx, newQty)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 mt-4">
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => setIsGeneralNotesOpen(true)}
            className="text-xs text-brand-700 dark:text-brand-400 hover:text-brand-900 dark:hover:text-brand-300 font-semibold underline min-h-[44px] flex items-center"
          >
            {notes ? '📝 Editar nota de comanda' : '📝 + Nota para cocina'}
          </button>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total</span>
            <span className="text-xl font-black text-brand-700 dark:text-brand-400">{formatSoles(total)}</span>
          </div>
        </div>

        {notes && (
          <p className="text-[11px] text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-marine-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
            Nota general: "{notes}"
          </p>
        )}

        <button
          type="button"
          onClick={onConfirmOrder}
          disabled={!hasItems || !tableCode || isSubmitting}
          className="w-full py-3 bg-brand-500 hover:bg-brand-400 text-brand-950 rounded-xl text-sm font-bold min-h-[48px] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
        >
          <span>{isSubmitting ? 'Enviando comanda...' : 'Enviar Comanda a Cocina'}</span>
        </button>
      </div>

      {/* Modales */}
      {editingNotesIndex !== null && items[editingNotesIndex] && (
        <ItemNotesModal
          isOpen={true}
          onClose={() => setEditingNotesIndex(null)}
          title={`Nota para ${items[editingNotesIndex].dishName}`}
          initialNotes={items[editingNotesIndex].notes || ''}
          maxLength={140}
          onSave={(newNotes) => {
            updateItemNotes(editingNotesIndex, newNotes);
            setEditingNotesIndex(null);
          }}
        />
      )}

      {isGeneralNotesOpen && (
        <ItemNotesModal
          isOpen={true}
          onClose={() => setIsGeneralNotesOpen(false)}
          title="Nota General de la Comanda"
          initialNotes={notes || ''}
          maxLength={280}
          onSave={(newNotes) => {
            setGeneralNotes(newNotes);
            setIsGeneralNotesOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default OrderCart;
