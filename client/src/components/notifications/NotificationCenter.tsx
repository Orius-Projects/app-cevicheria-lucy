import React, { useState, useRef, useEffect } from 'react';
import { useNotificationsStore } from '../../stores/notificationsStore';
import { formatLimaTime } from '../../utils/datetime';

interface NotificationCenterProps {
  showSoundToggle?: boolean;
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  showSoundToggle = true,
  className = ''
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
        className="relative p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center transition-all active:scale-95"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute -top-1 -right-1 bg-rose-600 text-white font-black text-[11px] rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-md animate-pulse"
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
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden font-sans text-slate-100 flex flex-col max-h-[80vh]"
        >
          {/* Cabecera del panel */}
          <div className="p-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
            <div className="flex items-center space-x-2">
              <span className="font-black text-sm text-white">Avisos Recientes</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
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
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 min-h-[44px]"
                >
                  {soundEnabled ? '🔊 Sonido ON' : '🔇 Silenciado'}
                </button>
              )}

              {toasts.length > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="px-2.5 py-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 rounded min-h-[44px]"
                >
                  Marcar leídos
                </button>
              )}
            </div>
          </div>

          {/* Lista de Notificaciones */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-800/80 max-h-96">
            {toasts.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No hay avisos recientes.
              </div>
            ) : (
              toasts.map((toast) => (
                <div
                  key={toast.id}
                  className={`p-3 text-xs flex items-start justify-between gap-2.5 transition-colors ${
                    toast.read ? 'bg-slate-900/40 opacity-75' : 'bg-slate-800/50'
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
                      <p className="font-bold text-slate-200">{toast.message}</p>
                      <span className="text-[10px] text-slate-400 block">
                        {formatLimaTime(toast.createdAt)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => dismiss(toast.id)}
                    aria-label="Eliminar aviso"
                    className="text-slate-500 hover:text-slate-300 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center font-bold"
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
