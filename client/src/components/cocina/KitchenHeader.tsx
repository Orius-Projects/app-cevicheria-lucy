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
  isShiftOpen?: boolean;
}

export const KitchenHeader: React.FC<KitchenHeaderProps> = ({
  pendingCount,
  readyCount,
  connection,
  onRefresh,
  onLogout,
  userDisplayName = 'Cocinero',
  isShiftOpen = true
}) => {
  return (
    <header className="bg-white border-b border-sky-100 px-4 sm:px-6 py-3.5 flex flex-wrap justify-between items-center gap-4 sticky top-0 z-40 shadow-xs">
      <div className="flex items-center space-x-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-brand-700 tracking-tight">
              Cevichería Lucy — Cocina
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
              KDS
            </span>
            {isShiftOpen ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Turno Abierto
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                Turno Finalizado
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {userDisplayName} • Tablero de Comandas en Vivo
          </p>
        </div>
      </div>

      {/* Contadores centrales */}
      <div className="flex items-center space-x-3">
        <div
          data-testid="pending-counter"
          className="flex items-center space-x-2 bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span>Pendientes:</span>
          <span className="text-base font-black text-amber-700">{pendingCount}</span>
        </div>

        <div
          data-testid="ready-counter"
          className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-900 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Listos:</span>
          <span className="text-base font-black text-emerald-700">{readyCount}</span>
        </div>
      </div>

      {/* Estado de conexión y controles */}
      <div className="flex items-center space-x-2">
        <div
          title={`Estado de conexión: ${connection}`}
          className="hidden md:flex items-center space-x-1.5 text-xs text-slate-600 px-2 py-1 bg-slate-100 rounded-lg border border-slate-200"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              connection === 'connected'
                ? 'bg-emerald-500'
                : connection === 'reconnecting'
                ? 'bg-amber-500 animate-ping'
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
          className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-sm shadow-xs transition-all active:scale-95"
        >
          ↻
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 bg-white border border-slate-300 rounded-xl min-h-[44px] transition-all"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
};

export default KitchenHeader;
