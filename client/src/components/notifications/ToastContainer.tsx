import React from 'react';
import { useNotificationsStore, NotificationToast } from '../../stores/notificationsStore';

interface ToastContainerProps {
  className?: string;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  className = ''
}) => {
  const { toasts, hideFloating } = useNotificationsStore();

  // Mostrar únicamente los toasts cuyo período flotante de 5s sigue activo
  const activeToasts = toasts
    .filter((t) => t.floatingVisible !== false)
    .slice(0, 5);

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
            className={`pointer-events-auto p-4 rounded-2xl shadow-lg border flex items-start justify-between gap-3 transition-all ${
              isReady
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
                : isShiftClosed
                ? 'bg-rose-50/95 border-rose-200 text-rose-900'
                : 'bg-brand-50/95 border-brand-200 text-slate-800'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                  isReady
                    ? 'bg-emerald-100/80 border-emerald-200 text-emerald-700'
                    : isShiftClosed
                    ? 'bg-rose-100/80 border-rose-200 text-rose-700'
                    : 'bg-brand-100/80 border-brand-200 text-brand-700'
                }`}
              >
                {isReady ? (
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                ) : isShiftClosed ? (
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-normal leading-snug">{toast.message}</p>
                {toast.tableCode && (
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-normal border ${
                      isReady
                        ? 'bg-emerald-100/90 text-emerald-800 border-emerald-200'
                        : 'bg-white/80 text-slate-700 border-slate-200'
                    }`}
                  >
                    Mesa {toast.tableCode}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => hideFloating(toast.id)}
              aria-label="Cerrar aviso"
              className={`p-1 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center text-base transition-colors active:scale-90 cursor-pointer ${
                isReady
                  ? 'text-emerald-700/70 hover:text-emerald-900 hover:bg-emerald-100/60'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
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
