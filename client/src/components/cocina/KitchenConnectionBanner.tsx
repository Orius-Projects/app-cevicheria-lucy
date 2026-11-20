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
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-rose-50 border-rose-200 text-rose-800'
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
          className="px-4 py-1.5 bg-white hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold min-h-[44px] transition-all border border-slate-300 shadow-xs active:scale-95"
        >
          Reintentar conexión
        </button>
      )}
    </div>
  );
};

export default KitchenConnectionBanner;
