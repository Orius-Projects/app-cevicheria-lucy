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
        className={`relative transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
          variant === 'light'
            ? 'p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full min-w-[40px] min-h-[40px]'
            : 'p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 min-w-[44px] min-h-[44px]'
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
          className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl z-50 overflow-hidden font-sans flex flex-col max-h-[80vh] ${
            variant === 'light'
              ? 'bg-white border border-slate-200 text-slate-800'
              : 'bg-slate-900 border border-slate-800 text-slate-100'
          }`}
        >
          {/* Cabecera del panel */}
          <div
            className={`p-3.5 border-b flex justify-between items-center ${
              variant === 'light'
                ? 'bg-slate-50 border-slate-100'
                : 'bg-slate-950/60 border-slate-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span
                className={`font-black text-sm ${
                  variant === 'light' ? 'text-slate-900' : 'text-white'
                }`}
              >
                Avisos Recientes
              </span>
              {unreadCount > 0 && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    variant === 'light'
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : 'bg-rose-950 text-rose-300 border-rose-800'
                  }`}
                >
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
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border min-h-[36px] ${
                    variant === 'light'
                      ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      : 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {soundEnabled ? '🔊 Sonido ON' : '🔇 Silenciado'}
                </button>
              )}

              {toasts.length > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="px-2.5 py-1 text-[11px] font-semibold text-brand-600 hover:text-brand-800 rounded min-h-[36px]"
                >
                  Marcar leídos
                </button>
              )}
            </div>
          </div>

          {/* Lista de Notificaciones */}
          <div
            className={`overflow-y-auto flex-1 divide-y max-h-96 ${
              variant === 'light' ? 'divide-slate-100' : 'divide-slate-800/80'
            }`}
          >
            {toasts.length === 0 ? (
              <div
                className={`p-6 text-center text-xs ${
                  variant === 'light' ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                No hay avisos recientes.
              </div>
            ) : (
              toasts.map((toast) => (
                <div
                  key={toast.id}
                  className={`p-3 text-xs flex items-start justify-between gap-2.5 transition-colors ${
                    variant === 'light'
                      ? toast.read
                        ? 'bg-slate-50/50 opacity-75'
                        : 'bg-white hover:bg-slate-50'
                      : toast.read
                      ? 'bg-slate-900/40 opacity-75'
                      : 'bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start space-x-2.5">
                    <span className="text-base mt-0.5">
                      {toast.type === 'order:ready'
                        ? '🔔'
                        : toast.type === 'shift:closed'
                        ? '🔒'
                        : 'ℹ️'}
                    </span>
                    <div className="space-y-0.5">
                      <p
                        className={`font-bold ${
                          variant === 'light' ? 'text-slate-800' : 'text-slate-200'
                        }`}
                      >
                        {toast.message}
                      </p>
                      <span
                        className={`text-[10px] block ${
                          variant === 'light' ? 'text-slate-400' : 'text-slate-400'
                        }`}
                      >
                        {formatLimaTime(toast.createdAt)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => dismiss(toast.id)}
                    aria-label="Eliminar aviso"
                    className="text-slate-400 hover:text-slate-600 p-1 min-h-[36px] min-w-[36px] flex items-center justify-center font-bold"
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
