import React, { useState } from 'react';
import { OrderDTO } from '@cevicheria/shared';

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderDTO;
  onConfirm: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onConfirm,
  isLoading = false
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isReady = order.status === 'LISTO';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('El motivo de cancelación es obligatorio.');
      return;
    }
    setError(null);
    try {
      await onConfirm(trimmed);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Error al cancelar el pedido');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-marine-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90dvh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Cancelar Pedido #{order.orderNumber}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Mesa {order.tableCode}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl font-bold min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {isReady && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-300 space-y-1">
            <span className="font-bold text-amber-950 dark:text-amber-200 block">⚠️ Atención - Pedido ya preparado</span>
            <p>
              Este pedido ya se encuentra en estado <strong>LISTO</strong>. Coordina de inmediato con cocina para avisar la cancelación. Recuerda que no se repondrán raciones a cocina.
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl" aria-live="polite">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cancel-reason" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Motivo de la cancelación *
            </label>
            <textarea
              id="cancel-reason"
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. El cliente se retiró antes de ser atendido."
              className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-marine-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-marine-800 min-h-[44px]"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={isLoading || !reason.trim()}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold min-h-[44px] shadow-sm disabled:opacity-50"
            >
              {isLoading ? 'Cancelando...' : 'Confirmar Cancelación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancelOrderModal;
