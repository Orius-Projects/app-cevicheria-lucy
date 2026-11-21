import React, { useState } from 'react';

interface CloseShiftButtonProps {
  hasPending: boolean;
  isClosed: boolean;
  onConfirmClose: () => Promise<void>;
  loading?: boolean;
}

export const CloseShiftButton: React.FC<CloseShiftButtonProps> = ({
  hasPending,
  isClosed,
  onConfirmClose,
  loading = false
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  if (isClosed) {
    return (
      <div className="flex items-center gap-2 p-3 bg-slate-100 border border-slate-300 rounded-xl text-slate-700 text-sm font-semibold">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
        Turno cerrado — Snapshot histórico inmutable
      </div>
    );
  }

  const handleOpenModal = () => {
    setCloseError(null);
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    setClosing(true);
    setCloseError(null);
    try {
      await onConfirmClose();
      setShowConfirmModal(false);
    } catch (err: any) {
      const code = err?.response?.data?.error?.code || err?.code;
      const msg =
        code === 'OPEN_ORDERS_REMAIN'
          ? 'No se puede cerrar el turno: aún existen pedidos pendientes o listos.'
          : code === 'OPEN_TABLES_REMAIN'
            ? 'No se puede cerrar el turno: aún existen mesas con sesión abierta.'
            : err?.response?.data?.error?.message ||
              err?.message ||
              'Error al cerrar el turno';
      setCloseError(msg);
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="space-y-3">
      {hasPending && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
          Hay pedidos o mesas abiertas pendientes. Debes cerrarlos antes de cerrar el turno.
        </p>
      )}

      <button
        type="button"
        onClick={handleOpenModal}
        disabled={hasPending || loading}
        className="w-full sm:w-auto min-h-[44px] px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors flex items-center justify-center gap-2"
      >
        Cerrar Turno
      </button>

      {/* Modal de confirmación explícita */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90dvh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900">
              ¿Cerrar el turno? No se podrán crear pedidos nuevos.
            </h3>
            <p className="text-xs text-slate-600">
              Esta acción finalizará la jornada, guardará el resumen inmutable y bloqueará el registro de nuevos pedidos por parte de los mozos.
            </p>

            {closeError && (
              <div
                role="alert"
                aria-live="polite"
                className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold"
              >
                {closeError}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={closing}
                className="min-h-[44px] px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={closing}
                className="min-h-[44px] px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                {closing ? 'Cerrando turno...' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CloseShiftButton;
