import React, { useState } from 'react';
import { OrderDTO } from '@cevicheria/shared';

interface ManualCloseModalProps {
  order: OrderDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orderId: string, reason: string) => Promise<void>;
}

export const ManualCloseModal: React.FC<ManualCloseModalProps> = ({
  order,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setValidationError('El motivo debe tener al menos 3 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm(order.id, trimmed);
      setReason('');
      onClose();
    } catch (err: any) {
      setValidationError(
        err?.response?.data?.error?.message ||
          err?.message ||
          'Error al realizar el cierre manual.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90dvh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Cierre Manual de Pedido
            </h3>
            <p className="text-xs text-slate-500">
              {order.tableCode} — Pedido #{order.orderNumber}
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

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
          Usa esta acción solo si el pedido fue entregado al cliente pero no se marcó oportunamente en el sistema.
        </div>

        {validationError && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold"
          >
            {validationError}
          </div>
        )}

        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="manual-close-reason"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
            >
              Motivo del cierre manual *
            </label>
            <textarea
              id="manual-close-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indica el motivo (mínimo 3 caracteres)..."
              required
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600"
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
              className="min-h-[44px] px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              {submitting ? 'Confirmando...' : 'Confirmar cierre manual'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualCloseModal;
