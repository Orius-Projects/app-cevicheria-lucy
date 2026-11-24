import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { UserProfileModal } from './UserProfileModal';

export interface UserMenuDropdownProps {
  className?: string;
  avatarBg?: string;
}

export const UserMenuDropdown: React.FC<UserMenuDropdownProps> = ({
  className = '',
  avatarBg = 'bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600'
}) => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const displayName = user?.displayName || user?.username || 'Usuario';
  const email = user?.username?.includes('@')
    ? user.username
    : `${user?.username || 'sebastian.chicata'}@gmail.com`;
  const userInitial = displayName.charAt(0).toUpperCase() || 'U';

  return (
    <>
      <div className={`relative ${className}`} ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-11 h-11 rounded-full ${avatarBg} text-white font-bold text-sm flex items-center justify-center transition-all cursor-pointer shadow-xs ${
            isOpen ? 'ring-2 ring-brand-500 ring-offset-2' : ''
          }`}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label="Menú de usuario"
          title="Menú de usuario"
        >
          {userInitial}
        </button>

        {isOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-marine-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-2 transition-all animate-in fade-in"
            role="menu"
            aria-orientation="vertical"
          >
            {/* User Info */}
            <div className="p-4 flex items-center gap-3.5 border-b border-slate-100 dark:border-slate-700/80">
              <div
                className={`w-12 h-12 rounded-full ${avatarBg} text-white font-bold text-xl flex items-center justify-center shrink-0 shadow-xs`}
              >
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {email}
                </p>
                {user?.role && (
                  <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                    {user.role}
                  </span>
                )}
              </div>
            </div>

            {/* Section 1: Perfil, Configuración, Theme */}
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsProfileOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors min-h-[44px] cursor-pointer"
                role="menuitem"
              >
                <svg
                  className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Perfil</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsProfileOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors min-h-[44px] cursor-pointer"
                role="menuitem"
              >
                <svg
                  className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>Configuración de la cuenta</span>
              </button>

              <button
                type="button"
                onClick={() => toggleTheme()}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors min-h-[44px] cursor-pointer"
                role="menuitem"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">{theme === 'dark' ? '🌙' : '☀️'}</span>
                  <span>Theme / Tema</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {theme === 'dark' ? 'Mar Profundo' : 'Brisa Marina'}
                </span>
              </button>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700 my-1" />

            {/* Section 2: Cerrar sesión */}
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors min-h-[44px] cursor-pointer"
                role="menuitem"
              >
                <svg
                  className="w-5 h-5 text-rose-500 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
};

export default UserMenuDropdown;
