import React, { useEffect, useState } from 'react';
import { MenuItemDTO, RationAdjustmentDTO } from '@cevicheria/shared';
import { menuApi } from '../../api/menu.api';

interface AdjustmentHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  menuItem: MenuItemDTO;
}

export const AdjustmentHistory: React.FC<AdjustmentHistoryProps> = ({
  isOpen,
  onClose,
  menuItem
}) => {
  const [adjustments, setAdjustments] = useState<RationAdjustmentDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      menuApi
        .getRationAdjustments(menuItem.id)
        .then((data) => setAdjustments(data))
        .catch((err) => {
          setError(
            err.response?.data?.error?.message || err.message || 'Error al cargar historial'
          );
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, menuItem.id]);

  if (!isOpen) return null;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'REPLENISH':
        return (
          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
            Reposición
          </span>
        );
      case 'ADJUSTMENT':
        return (
          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-bold">
            Ajuste Físico
          </span>
        );
      case 'CANCELLATION_REVERSAL':
        return (
          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-bold">
            Reversión Cancelación
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] font-bold">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200 my-8">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Historial de Ajustes de Raciones</h2>
            <p className="text-xs text-slate-500">{menuItem.dishName} • Auditoría 100%</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold min-h-[44px] px-2"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Cargando historial de auditoría...
          </div>
        ) : adjustments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 italic">
            No se han registrado ajustes manuales o reversiones en este plato hoy.
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {adjustments.map((adj) => {
              const dateStr = new Date(adj.at).toLocaleString('es-PE', {
                timeZone: 'America/Lima',
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit'
              });

              const actorName =
                typeof adj.actorId === 'object' && adj.actorId !== null
                  ? adj.actorId.displayName || adj.actorId.username
                  : null;

              return (
                <div
                  key={adj.id}
                  className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      {getTypeBadge(adj.type)}
                      <span className="font-semibold text-slate-700">
                        {actorName ? `${actorName} (${adj.actorRole})` : `Rol: ${adj.actorRole}`}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{dateStr}</span>
                  </div>

                  <p className="text-slate-800 font-medium pt-1">
                    Motivo: <span className="font-normal">{adj.reason}</span>
                  </p>

                  <div className="flex items-center space-x-2 text-[11px] text-slate-500 pt-0.5">
                    <span>
                      Raciones antes: <strong>{adj.previousRemaining ?? '-'}</strong>
                    </span>
                    <span>→</span>
                    <span>
                      Raciones después:{' '}
                      <strong className="text-brand-700">{adj.newRemaining ?? '-'}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 min-h-[44px]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdjustmentHistory;
