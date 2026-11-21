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
        <svg
          className="w-5 h-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
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
