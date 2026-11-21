import React, { useState } from 'react';
import { CreateManualRecordInput } from '@cevicheria/shared';
import { formatSoles } from '../../utils/money';

interface ManualRecordFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateManualRecordInput) => Promise<void>;
}

interface FormItem {
  name: string;
  quantity: number;
  soles: string; // user input as string, e.g. "25.00"
}

export const ManualRecordForm: React.FC<ManualRecordFormProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [tableCode, setTableCode] = useState('');
  const [items, setItems] = useState<FormItem[]>([
    { name: '', quantity: 1, soles: '' }
  ]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [...prev, { name: '', quantity: 1, soles: '' }]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (
    idx: number,
    field: keyof FormItem,
    val: string | number
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  // Compute total cents in real-time
  const computedTotalCents = items.reduce((acc, it) => {
    const s = parseFloat(it.soles);
    const cents = !isNaN(s) && s >= 0 ? Math.round(s * 100) : 0;
    return acc + cents;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    const errors: string[] = [];

    const trimmedTable = tableCode.trim();
    if (!trimmedTable) {
      errors.push('El código de mesa es obligatorio.');
    }

    if (items.length === 0) {
      errors.push('Debe incluir al menos un plato/ítem.');
    }

    const processedItems: { name: string; quantity: number; amountCents: number }[] = [];

    items.forEach((item, idx) => {
      const trimmedName = item.name.trim();
      if (!trimmedName) {
        errors.push(`El nombre del ítem #${idx + 1} es obligatorio.`);
      }

      const q = Number(item.quantity);
      if (!Number.isInteger(q) || q < 1) {
        errors.push(`La cantidad del ítem #${idx + 1} debe ser un entero mayor o igual a 1.`);
      }

      const s = parseFloat(item.soles);
      if (isNaN(s) || s < 0) {
        errors.push(`El monto del ítem #${idx + 1} debe ser un número mayor o igual a 0.`);
      }

      const amountCents = !isNaN(s) && s >= 0 ? Math.round(s * 100) : 0;

      processedItems.push({
        name: trimmedName,
        quantity: q,
        amountCents
      });
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        tableCode: trimmedTable,
        items: processedItems,
        totalCents: computedTotalCents,
        notes: notes.trim() || undefined
      });
      // Reset form
      setTableCode('');
      setItems([{ name: '', quantity: 1, soles: '' }]);
      setNotes('');
      onClose();
    } catch (err: any) {
      setValidationErrors([
        err?.response?.data?.error?.message ||
          err?.message ||
          'Error al registrar pedido manual'
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 my-8 max-h-[90dvh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Registrar Pedido Manual (PAPER)
            </h3>
            <p className="text-xs text-slate-500">
              Para consumos atendidos en papel durante contingencias o caída del sistema
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold min-h-[44px] px-2"
          >
            ×
          </button>
        </div>

        {validationErrors.length > 0 && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs space-y-1"
          >
            {validationErrors.map((err, i) => (
              <p key={i}>• {err}</p>
            ))}
          </div>
        )}

        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="manual-table-code"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
            >
              Mesa *
            </label>
            <input
              id="manual-table-code"
              type="text"
              value={tableCode}
              onChange={(e) => setTableCode(e.target.value)}
              placeholder="Ej. Mesa 03 o Barra 1"
              required
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl min-h-[44px] focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Platos / Ítems atendidos *
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-brand-700 font-bold hover:text-brand-800 min-h-[44px] px-2"
              >
                + Agregar ítem
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) =>
                      handleItemChange(idx, 'name', e.target.value)
                    }
                    placeholder="Nombre del plato"
                    required
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg min-h-[44px] bg-white focus:outline-none focus:ring-1 focus:ring-brand-600"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(
                          idx,
                          'quantity',
                          parseInt(e.target.value, 10) || 1
                        )
                      }
                      placeholder="Cant."
                      required
                      className="w-20 px-2 py-2 text-sm text-center border border-slate-300 rounded-lg min-h-[44px] bg-white focus:outline-none focus:ring-1 focus:ring-brand-600"
                    />
                    <div className="relative flex-1 sm:w-28">
                      <span className="absolute left-2.5 top-3 text-xs text-slate-400 font-semibold">
                        S/
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.10"
                        value={item.soles}
                        onChange={(e) =>
                          handleItemChange(idx, 'soles', e.target.value)
                        }
                        placeholder="00.00"
                        required
                        className="w-full pl-7 pr-2 py-2 text-sm text-right border border-slate-300 rounded-lg min-h-[44px] bg-white focus:outline-none focus:ring-1 focus:ring-brand-600"
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-500 hover:text-rose-700 min-h-[44px] px-2 text-sm font-bold"
                        title="Eliminar ítem"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center bg-slate-100 p-3 rounded-xl">
            <span className="text-xs font-bold text-slate-600 uppercase">
              Total informativo calculado:
            </span>
            <span className="text-base font-extrabold text-slate-900">
              {formatSoles(computedTotalCents)}
            </span>
          </div>

          <div>
            <label
              htmlFor="manual-notes"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
            >
              Notas adicionales (opcional)
            </label>
            <input
              id="manual-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Atendido por libreta durante corte"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl min-h-[44px] focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-[44px] px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] px-4 py-2 bg-brand-500 hover:bg-brand-400 text-brand-950 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Registrar consumo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualRecordForm;
