import React, { useState, useRef, useEffect } from 'react';
import { useNotificationsStore } from '../../stores/notificationsStore';
import { formatLimaTime } from '../../utils/datetime';

interface NotificationCenterProps {
  showSoundToggle?: boolean;
  className?: string;
  variant?: 'light' | 'dark';
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  showSoundToggle = true,
  className = '',
  variant = 'light'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    toasts,
    unreadCount,
    soundEnabled,
    markAllRead,
    toggleSound,
    dismiss
  } = useNotificationsStore();

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      markAllRead();
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Botón de Campana con Badge */}
      <button
        type="button"
        onClick={handleToggleOpen}
        aria-label="Avisos y notificaciones"
        aria-expanded={isOpen}
        className={`relative transition-all active:scale-95 flex items-center justify-center cursor-pointer min-w-[44px] min-h-[44px] ${
          variant === 'light'
            ? 'p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full'
            : 'p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700'
        }`}
      >
        <svg
          className="w-5 h-5"
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
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute top-0.5 right-0.5 bg-rose-500 text-white font-black text-[10px] rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center shadow-xs animate-pulse"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel Desplegable de Notificaciones */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Panel de avisos"
          className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-80 md:w-96 rounded-2xl shadow-2xl z-50 overflow-hidden font-sans flex flex-col max-h-[80vh] bg-white dark:bg-marine-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 animate-in fade-in"
        >
          {/* Cabecera del panel */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-700/80 flex justify-between items-center bg-slate-50 dark:bg-marine-900/60">
            <div className="flex items-center space-x-2">
              <span className="font-black text-sm text-slate-900 dark:text-white">
                Avisos Recientes
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800">
                  {unreadCount} sin leer
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5">
              {showSoundToggle && (
                <button
                  type="button"
                  onClick={toggleSound}
                  title={soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border min-h-[44px] flex items-center border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  {soundEnabled ? '🔊 Sonido ON' : '🔇 Silenciado'}
                </button>
              )}

              {toasts.length > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:text-brand-400 hover:underline rounded min-h-[44px] flex items-center cursor-pointer"
                >
                  Marcar leídos
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-lg min-h-[44px] min-w-[32px] flex items-center justify-center sm:hidden"
                aria-label="Cerrar panel de avisos"
              >
                ×
              </button>
            </div>
          </div>

          {/* Lista de Notificaciones */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-700/60 max-h-96">
            {toasts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                No hay avisos recientes.
              </div>
            ) : (
              toasts.map((toast) => (
                <div
                  key={toast.id}
                  className={`p-3 text-xs flex items-start justify-between gap-2.5 transition-colors ${
                    toast.read
                      ? 'bg-slate-50/50 dark:bg-marine-900/30 opacity-75'
                      : 'bg-white dark:bg-marine-800 hover:bg-slate-50 dark:hover:bg-marine-900/50'
                  }`}
                >
                  <div className="flex items-start space-x-2.5">
                    <span className="mt-0.5 text-emerald-600 shrink-0">
                      {toast.type === 'order:ready' ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                      ) : toast.type === 'shift:closed' ? (
                        <svg className="w-4 h-4 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-brand-700 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                      )}
                    </span>
                    <div className="space-y-0.5">
                      <p className="font-normal text-slate-800 dark:text-slate-200">
                        {toast.message}
                      </p>
                      <span className="text-[10px] block text-slate-400 dark:text-slate-500">
                        {formatLimaTime(toast.createdAt)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => dismiss(toast.id)}
                    aria-label="Eliminar aviso"
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center font-bold cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
