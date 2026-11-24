import React, { useState } from 'react';
import { KitchenConnectionState } from '@cevicheria/shared';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { UserMenuDropdown } from '../common/UserMenuDropdown';
import { HelpModal } from '../common/HelpModal';

interface KitchenHeaderProps {
  pendingCount?: number;
  readyCount?: number;
  connection: KitchenConnectionState;
  onRefresh: () => void;
  onLogout?: () => void;
  userDisplayName?: string;
  isShiftOpen?: boolean;
}

export const KitchenHeader: React.FC<KitchenHeaderProps> = ({
  connection,
  onRefresh
}) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <header className="bg-white dark:bg-marine-900 border-b border-brand-100 dark:border-slate-800 px-4 sm:px-6 py-3 flex justify-between items-center gap-2 sticky top-0 z-40 shadow-xs transition-colors">
        <div className="flex items-center min-w-0">
          <h1 className="text-xl font-semibold text-brand-700 dark:text-brand-400 tracking-tight truncate">
            Cocina
          </h1>
        </div>

        {/* Controles alineados a la derecha en una sola fila responsiva */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <div
            title={`Estado de conexión: ${connection}`}
            className="hidden md:flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-300 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[44px]"
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

          <button
            type="button"
            onClick={onRefresh}
            title="Refrescar tablero"
            aria-label="Refrescar tablero"
            className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium min-h-[44px] min-w-[44px] shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <svg
              className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span className="hidden sm:inline">Refrescar</span>
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 hidden sm:block" />

          {/* Notificaciones */}
          <NotificationCenter showSoundToggle={false} variant="light" />

          {/* Ayuda */}
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Ayuda"
            title="Ayuda"
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
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>

          {/* Menú de usuario con avatar circular */}
          <UserMenuDropdown />
        </div>
      </header>

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialRole="COCINERO"
      />
    </>
  );
};

export default KitchenHeader;
