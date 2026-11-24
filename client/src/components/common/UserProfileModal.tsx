import React, { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useShiftStore } from '../../stores/shiftStore';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { currentShift, isOpen: isShiftOpen } = useShiftStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayName = user?.displayName || user?.username || 'Usuario Demo';
  const role = user?.role || 'MOZO';
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="w-full max-w-md bg-white dark:bg-marine-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
        {/* Cabecera */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between bg-slate-50/80 dark:bg-marine-900/50">
          <h2 id="profile-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Perfil de Usuario & Preferencias
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition cursor-pointer text-xl font-bold"
            aria-label="Cerrar modal de perfil"
          >
            ×
          </button>
        </div>

        {/* Info del usuario */}
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-brand-500 text-brand-950 font-black text-2xl flex items-center justify-center shadow-md">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {displayName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                @{user?.username}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-800 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                  {role}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {isShiftOpen ? `Turno activo: ${currentShift?.label || 'Abierto'}` : 'Sin turno activo'}
                </span>
              </div>
            </div>
          </div>

          {/* Selector de Tema Marítimo (Claro / Oscuro) */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-700">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Estilo Visual de Pantalla
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Tema Claro */}
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer min-h-[56px] ${
                  theme === 'light'
                    ? 'border-brand-500 bg-brand-50/70 text-brand-900 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-marine-900/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">☀️</span>
                  <span className="text-xs font-bold">Brisa Marina</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Fondo claro con acentos turquesas oceánicos.
                </p>
              </button>

              {/* Tema Oscuro */}
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer min-h-[56px] ${
                  theme === 'dark'
                    ? 'border-brand-400 bg-marine-800 text-white font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-marine-900/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">🌙</span>
                  <span className="text-xs font-bold">Mar Profundo</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Fondo oscuro para tablets y baja fatiga visual.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-marine-900/50 flex justify-between items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            className="px-4 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition min-h-[44px]"
          >
            Cerrar sesión
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-400 text-brand-950 rounded-xl font-bold text-xs shadow-xs min-h-[44px]"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
