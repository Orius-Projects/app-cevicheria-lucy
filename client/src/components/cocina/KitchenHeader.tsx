import React from 'react';
import { KitchenConnectionState } from '@cevicheria/shared';
import { NotificationCenter } from '../notifications/NotificationCenter';

interface KitchenHeaderProps {
  pendingCount: number;
  readyCount: number;
  connection: KitchenConnectionState;
  onRefresh: () => void;
  onLogout: () => void;
  userDisplayName?: string;
}

export const KitchenHeader: React.FC<KitchenHeaderProps> = ({
  pendingCount,
  readyCount,
  connection,
  onRefresh,
  onLogout,
  userDisplayName = 'Cocinero'
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3.5 flex flex-wrap justify-between items-center gap-4 sticky top-0 z-40 shadow-lg">
      <div className="flex items-center space-x-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-amber-400 tracking-tight">
              Cevichería Lucy — Cocina
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              KDS
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {userDisplayName} • Tablero de Comandas en Vivo
          </p>
        </div>
      </div>

      {/* Contadores centrales */}
      <div className="flex items-center space-x-3">
        <div
          data-testid="pending-counter"
          className="flex items-center space-x-2 bg-amber-950/60 border border-amber-600/60 text-amber-200 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span>Pendientes:</span>
          <span className="text-base font-black text-amber-400">{pendingCount}</span>
        </div>

        <div
          data-testid="ready-counter"
          className="flex items-center space-x-2 bg-emerald-950/60 border border-emerald-600/60 text-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span>Listos:</span>
          <span className="text-base font-black text-emerald-400">{readyCount}</span>
        </div>
      </div>

      {/* Estado de conexión y controles */}
      <div className="flex items-center space-x-2">
        <div
          title={`Estado de conexión: ${connection}`}
          className="hidden md:flex items-center space-x-1.5 text-xs text-slate-400 px-2 py-1 bg-slate-800/80 rounded-lg border border-slate-700"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              connection === 'connected'
                ? 'bg-emerald-400'
                : connection === 'reconnecting'
                ? 'bg-amber-400 animate-ping'
                : 'bg-rose-500'
            }`}
          />
          <span className="font-medium text-[11px]">
            {connection === 'connected'
              ? 'En línea'
              : connection === 'reconnecting'
              ? 'Reconectando...'
              : 'Desconectado'}
          </span>
        </div>

        <NotificationCenter showSoundToggle={false} />

        <button
          type="button"
          onClick={onRefresh}
          title="Refrescar tablero"
          aria-label="Refrescar tablero"
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-sm transition-all active:scale-95"
        >
          ↻
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-xl min-h-[44px] transition-all"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
};

export default KitchenHeader;
