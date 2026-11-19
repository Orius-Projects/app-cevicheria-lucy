import React from 'react';
import { KitchenConnectionState } from '@cevicheria/shared';

interface KitchenConnectionBannerProps {
  connection: KitchenConnectionState;
  onRetry?: () => void;
}

export const KitchenConnectionBanner: React.FC<KitchenConnectionBannerProps> = ({
  connection,
  onRetry
}) => {
  if (connection === 'connected') return null;

  const isReconnecting = connection === 'reconnecting';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`px-4 py-3 border-b flex flex-wrap justify-between items-center gap-3 transition-colors ${
        isReconnecting
          ? 'bg-amber-950/90 border-amber-700 text-amber-200'
          : 'bg-rose-950/95 border-rose-700 text-rose-200'
      }`}
    >
      <div className="flex items-center space-x-2">
        <span className="text-xl">⚠️</span>
        <span className="text-sm font-bold">
          {isReconnecting
            ? 'Reconectando con el servidor...'
            : 'Sin conexión con el servidor. Los pedidos pueden no estar actualizados.'}
        </span>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold min-h-[44px] transition-all border border-white/20 active:scale-95"
        >
          Reintentar conexión
        </button>
      )}
    </div>
  );
};

export default KitchenConnectionBanner;
