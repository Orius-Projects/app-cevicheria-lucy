import React, { useState } from 'react';
import { MenuItemDTO } from '@cevicheria/shared';
import { menuApi } from '../../api/menu.api';

interface ReplenishRationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItem: MenuItemDTO;
  onSuccess: (updated: MenuItemDTO) => void;
}

export const ReplenishRationsModal: React.FC<ReplenishRationsModalProps> = ({
  isOpen,
  onClose,
  menuItem,
  onSuccess
}) => {
  const [quantity, setQuantity] = useState<number>(5);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (quantity < 1 || !Number.isInteger(quantity)) {
      setError('La cantidad a reponer debe ser un número entero mayor o igual a 1.');
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError('El motivo de la reposición es obligatorio (ej. "Sobraron porciones; confirmado con cocina").');
      return;
    }

    setLoading(true);
    try {
      const updated = await menuApi.replenishRations(menuItem.id, quantity, trimmedReason);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message || err.message || 'Error al reponer raciones'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 my-8 max-h-[90dvh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Reponer Raciones</h2>
            <p className="text-xs text-slate-500">{menuItem.dishName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold min-h-[44px] px-2"
          >
            ×
          </button>
        </div>

        {menuItem.manuallySoldOut && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-1">
            <span className="font-bold">⚠️ Atención:</span>
            <p>
              Este plato fue marcado como agotado por falta de insumo. Reponer raciones incrementará el stock, pero seguirá <strong>AGOTADO</strong> hasta que un encargado lo reactive manualmente.
            </p>
          </div>
        )}

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
          <p>
            Raciones actuales restantes:{' '}
            <strong className="text-slate-900">{menuItem.remainingRations ?? 0}</strong>
          </p>
          <p>
            Raciones tras reposición:{' '}
            <strong className="text-emerald-700 font-bold">
              {(menuItem.remainingRations ?? 0) + (quantity >= 1 ? quantity : 0)}
            </strong>
          </p>
        </div>

        {error && (
          <div data-testid="replenish-error" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
            {error}
          </div>
        )}

        <form data-testid="replenish-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="replenish-quantity"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Cantidad a reponer (unidades) *
            </label>
            <input
              id="replenish-quantity"
              type="number"
              min="1"
              step="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm min-h-[44px] focus:outline-none focus:ring-1 focus:ring-brand-600"
            />
          </div>

          <div>
            <label
              htmlFor="replenish-reason"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Motivo de la reposición *
            </label>
            <textarea
              id="replenish-reason"
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Sobraron porciones preparadas; confirmado con cocinero de turno."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-600"
            />
            <p className="text-[11px] text-slate-400 mt-0.5">
              Requerido por auditoría para el balance de cocina.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-semibold min-h-[44px] disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Guardando...' : 'Confirmar Reposición'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReplenishRationsModal;
