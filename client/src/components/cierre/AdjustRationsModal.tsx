import React, { useState } from 'react';

interface AdjustRationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dish: { dishId: string; dishName: string; remainingRations: number } | null;
  onConfirm: (
    dishId: string,
    newRemaining: number,
    reason: string
  ) => Promise<void>;
}

export const AdjustRationsModal: React.FC<AdjustRationsModalProps> = ({
  isOpen,
  onClose,
  dish,
  onConfirm
}) => {
  const [newRemaining, setNewRemaining] = useState<number>(
    dish?.remainingRations ?? 0
  );
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when dish changes or modal opens
  React.useEffect(() => {
    if (dish) {
      setNewRemaining(dish.remainingRations ?? 0);
      setReason('');
      setError(null);
    }
  }, [dish]);

  if (!isOpen || !dish) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newRemaining < 0 || !Number.isInteger(newRemaining)) {
      setError('El conteo de raciones debe ser un entero mayor o igual a 0.');
      return;
    }

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      setError('El motivo del ajuste es obligatorio (mínimo 3 caracteres).');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(dish.dishId, newRemaining, trimmedReason);
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          'Error al ajustar raciones'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 my-8">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Ajuste de Raciones
            </h2>
            <p className="text-xs text-slate-500">{dish.dishName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold min-h-[44px] px-2"
          >
            ×
          </button>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
          <p>
            Raciones registradas en sistema:{' '}
            <strong className="text-slate-900">{dish.remainingRations}</strong>
          </p>
          <p className="text-[11px] text-slate-500">
            Fija el valor exacto verificado físicamente. Esta acción quedará auditada en el historial.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs"
          >
            {error}
          </div>
        )}

        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="adjust-new-remaining"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Nuevo conteo de raciones restantes *
            </label>
            <input
              id="adjust-new-remaining"
              type="number"
              min="0"
              step="1"
              required
              value={newRemaining}
              onChange={(e) =>
                setNewRemaining(parseInt(e.target.value, 10) || 0)
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm min-h-[44px] focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label
              htmlFor="adjust-reason"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Motivo del ajuste *
            </label>
            <textarea
              id="adjust-reason"
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Conteo físico de porciones en cocina"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdjustRationsModal;
