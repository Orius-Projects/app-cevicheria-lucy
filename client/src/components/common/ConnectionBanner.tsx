import React from 'react';
import { useRealtimeStore } from '../../stores/realtimeStore';

interface ConnectionBannerProps {
  className?: string;
  onRetry?: () => void;
}

/**
 * Banner superior visible cuando la sincronización en vivo WebSocket no está activa.
 * Sigue rigurosamente la Sección 15 del Design System de Cevichería Lucy.
 */
export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({
  className = '',
  onRetry
}) => {
  const { status } = useRealtimeStore();

  if (status === 'connected') {
    return null;
  }

  const isConnecting = status === 'connecting';

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`px-4 py-2.5 flex flex-wrap justify-between items-center gap-3 border-b text-xs font-semibold transition-colors ${
        isConnecting
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-rose-50 border-rose-200 text-rose-900'
      } ${className}`}
    >
      <div className="flex items-center space-x-2.5">
        {isConnecting ? (
          <svg
            className="w-4 h-4 animate-spin text-amber-700 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <svg
            className="w-4 h-4 text-rose-700 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
        <span>
          {isConnecting
            ? 'Reconectando con el servidor...'
            : 'Sin conexión con el servidor: los datos se sincronizan por respaldo REST.'}
        </span>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold min-h-[44px] transition-all border border-slate-300 shadow-xs active:scale-95"
        >
          Reintentar conexión
        </button>
      )}
    </div>
  );
};

export default ConnectionBanner;
