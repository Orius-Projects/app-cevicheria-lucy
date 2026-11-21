import React, { useState } from 'react';
import { MenuItemDTO } from '@cevicheria/shared';
import { menuApi } from '../../api/menu.api';

interface AdjustRationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItem: MenuItemDTO;
  onSuccess: (updated: MenuItemDTO) => void;
}

export const AdjustRationsModal: React.FC<AdjustRationsModalProps> = ({
  isOpen,
  onClose,
  menuItem,
  onSuccess
}) => {
  const [newRemaining, setNewRemaining] = useState<number>(menuItem.remainingRations ?? 0);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newRemaining < 0 || !Number.isInteger(newRemaining)) {
      setError('El nuevo conteo de raciones debe ser un entero mayor o igual a 0.');
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError('El motivo del ajuste físico es obligatorio (para balance de inventario).');
      return;
    }

    setLoading(true);
    try {
      const updated = await menuApi.adjustRations(menuItem.id, newRemaining, trimmedReason);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message || err.message || 'Error al ajustar raciones'
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
            <h2 className="text-lg font-bold text-slate-900">Ajuste de Conteo Físico</h2>
            <p className="text-xs text-slate-500">{menuItem.dishName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold min-h-[44px] px-2"
          >
            ×
          </button>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
          <p>
            Raciones registradas en sistema:{' '}
            <strong className="text-slate-900">{menuItem.remainingRations ?? 0}</strong>
          </p>
          <p className="text-[11px] text-slate-500">
            Fija el valor exacto verificado por conteo físico en cocina. Este cambio quedará 100% auditado.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nuevo valor físico verificado *
            </label>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={newRemaining}
              onChange={(e) => setNewRemaining(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm min-h-[44px] focus:outline-none focus:ring-1 focus:ring-brand-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Motivo del ajuste físico *
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Conteo físico a mitad de servicio: quedaban 8 porciones listas."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-600"
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
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold min-h-[44px] disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Guardando...' : 'Aplicar Ajuste Físico'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdjustRationsModal;
