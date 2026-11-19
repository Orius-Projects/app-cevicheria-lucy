import React from 'react';
import { useRealtimeStore } from '../../stores/realtimeStore';

interface ConnectionBannerProps {
  className?: string;
  onRetry?: () => void;
}

/**
 * Banner visible cuando la conexión de sincronización instantánea no está activa.
 * Notifica al usuario que el sistema sigue operando mediante el mecanismo de respaldo REST.
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
      className={`px-4 py-2.5 flex flex-wrap justify-between items-center gap-2 border-b text-xs font-bold transition-colors ${
        isConnecting
          ? 'bg-amber-950/90 border-amber-700/80 text-amber-200'
          : 'bg-rose-950/95 border-rose-700/80 text-rose-200'
      } ${className}`}
    >
      <div className="flex items-center space-x-2">
        <span className="text-base">{isConnecting ? '⏳' : '⚠️'}</span>
        <span>
          {isConnecting
            ? 'Reconectando con el servidor...'
            : 'Sin conexión en vivo: los datos se actualizan por REST.'}
        </span>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold min-h-[44px] transition-all"
        >
          Reintentar
        </button>
      )}
    </div>
  );
};

export default ConnectionBanner;
