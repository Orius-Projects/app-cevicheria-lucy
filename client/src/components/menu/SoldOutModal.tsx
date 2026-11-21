import React, { useState } from 'react';
import { MenuItemDTO } from '@cevicheria/shared';
import { menuApi } from '../../api/menu.api';

interface SoldOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItem: MenuItemDTO;
  onSuccess: (updated: MenuItemDTO) => void;
}

export const SoldOutModal: React.FC<SoldOutModalProps> = ({
  isOpen,
  onClose,
  menuItem,
  onSuccess
}) => {
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError('El motivo por el cual se marca agotado es obligatorio.');
      return;
    }

    setLoading(true);
    try {
      const updated = await menuApi.markSoldOut(menuItem.id, trimmedReason);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message || err.message || 'Error al marcar plato como agotado'
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
            <h2 className="text-lg font-bold text-rose-700">Marcar Plato como Agotado</h2>
            <p className="text-xs text-slate-500">{menuItem.dishName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold min-h-[44px] px-2"
          >
            ×
          </button>
        </div>

        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs space-y-1">
          <p className="font-semibold">
            Esta acción bloqueará de inmediato la venta de este plato en el salón y la cocina.
          </p>
          {menuItem.hasRationsLimit && (
            <p className="text-rose-600">
              Quedan registradas {menuItem.remainingRations ?? 0} raciones físicas en el sistema, pero no podrán pedirse por falta del insumo principal.
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Motivo del agotamiento de insumo *
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Falta de mariscos frescos en plaza; pescado del día terminado."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
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
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold min-h-[44px] disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Guardando...' : 'Marcar Agotado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SoldOutModal;
