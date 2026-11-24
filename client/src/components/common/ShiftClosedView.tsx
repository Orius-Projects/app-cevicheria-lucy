import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export interface ShiftClosedViewProps {
  role?: 'MOZO' | 'COCINERO' | 'ENCARGADO';
  shiftLabel?: string;
  shiftDate?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const ShiftClosedView: React.FC<ShiftClosedViewProps> = ({
  role = 'MOZO',
  shiftLabel,
  shiftDate,
  onRefresh,
  isLoading = false
}) => {
  const { logout } = useAuthStore();
  const isCocinero = role === 'COCINERO';

  return (
    <div className="w-full flex items-center justify-center py-8 px-4 sm:px-6">
      <div className="bg-white dark:bg-marine-900 rounded-3xl border border-brand-100 dark:border-marine-800 p-6 sm:p-10 max-w-lg w-full text-center space-y-6 shadow-sm transition-colors">
        {/* Ícono Ilustrativo Celeste */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-brand-50 dark:bg-marine-950 border-2 border-brand-200 dark:border-marine-700 flex items-center justify-center text-brand-700 dark:text-brand-300 shadow-xs">
          <svg
            className="w-10 h-10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-black shadow-xs">
            ✕
          </span>
        </div>

        {/* Badge y Títulos */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800/60 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            Turno Finalizado
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Turno Finalizado
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
            {isCocinero
              ? 'El administrador ha cerrado el turno de atención. La cocina se encuentra en pausa y no recibirá nuevas comandas hasta que se abra un nuevo turno.'
              : 'El administrador ha cerrado el turno de atención. La toma de comandas, gestión de pedidos y asignación de mesas están temporalmente deshabilitadas hasta la apertura de un nuevo turno.'}
          </p>
        </div>

        {/* Ficha de Detalles del Turno Cerrado */}
        <div className="bg-brand-50/60 dark:bg-marine-950/70 border border-brand-100 dark:border-marine-800 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-300 space-y-2 text-left">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Módulo:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {isCocinero ? 'Pantalla de Cocina (KDS)' : 'Salón / Meseros'}
            </span>
          </div>
          {shiftLabel && (
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Último turno:</span>
              <span className="font-bold text-brand-700 dark:text-brand-300">{shiftLabel}</span>
            </div>
          )}
          {shiftDate && (
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Fecha:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{shiftDate}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-1 border-t border-brand-100 dark:border-marine-800">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Estado operativo:</span>
            <span className="font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
              Operaciones bloqueadas
            </span>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="space-y-3 pt-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-brand-400 hover:bg-brand-300 dark:bg-brand-500 dark:hover:bg-brand-400 text-brand-950 rounded-xl font-bold text-sm min-h-[44px] flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <svg
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
              </svg>
              <span>{isLoading ? 'Verificando turno...' : 'Verificar si se abrió un nuevo turno'}</span>
            </button>
          )}

          {!isCocinero && (
            <Link
              to="/mozo/menu"
              className="w-full py-2.5 px-4 bg-brand-50 dark:bg-marine-950 hover:bg-brand-100 dark:hover:bg-marine-850 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-marine-700 rounded-xl font-semibold text-xs min-h-[44px] flex items-center justify-center gap-2 transition-colors"
            >
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span>Ver Carta y Menú del Día (Solo Consulta)</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => logout()}
            className="w-full py-2.5 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-marine-700 hover:border-rose-200 rounded-xl transition-colors min-h-[44px] cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShiftClosedView;
