import React from 'react';
import { useNotificationsStore, NotificationToast } from '../../stores/notificationsStore';

interface ToastContainerProps {
  className?: string;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ className = '' }) => {
  const { toasts, dismiss } = useNotificationsStore();

  // Mostrar los primeros 5 toasts más recientes que estén activos
  const activeToasts = toasts.slice(0, 5);

  if (activeToasts.length === 0) return null;

  return (
    <aside
      aria-live="polite"
      aria-label="Avisos y notificaciones"
      className={`fixed bottom-4 right-4 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none ${className}`}
    >
      {activeToasts.map((toast: NotificationToast) => {
        const isReady = toast.type === 'order:ready';
        const isShiftClosed = toast.type === 'shift:closed';

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto p-4 rounded-xl shadow-2xl border-2 flex items-start justify-between gap-3 transition-all animate-bounce-short ${
              isReady
                ? 'bg-emerald-950 border-emerald-500 text-white'
                : isShiftClosed
                ? 'bg-rose-950 border-rose-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-100'
            }`}
          >
            <div className="flex items-start space-x-2.5">
              <span className="text-xl leading-none">
                {isReady ? '🔔' : isShiftClosed ? '🔒' : 'ℹ️'}
              </span>
              <div className="space-y-1">
                <p className="text-sm font-black leading-snug">{toast.message}</p>
                {toast.tableCode && (
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-white/20 text-white">
                    Mesa {toast.tableCode}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Cerrar aviso"
              className="text-white/80 hover:text-white p-1 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center font-bold text-lg active:scale-90"
            >
              ×
            </button>
          </div>
        );
      })}
    </aside>
  );
};

export default ToastContainer;
