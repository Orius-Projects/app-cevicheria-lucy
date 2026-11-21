import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { AdminNavigation } from '../components/menu/AdminNavigation';
import { UserMenuDropdown } from '../components/common/UserMenuDropdown';

export interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  headerExtra?: React.ReactNode;
  maxWidth?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title = 'Cevichería Lucy — Administración',
  headerExtra,
  maxWidth = 'max-w-6xl'
}) => {
  const { user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // La marca se muestra completa en móvil; el sufijo de sección pasa a subtítulo.
  const [brandTitle, ...titleRest] = title.split('—');
  const brandName = brandTitle.trim() || 'Cevichería Lucy';
  const sectionTitle = titleRest.join('—').trim();
  const userLabel = `${user?.displayName || 'Encargado Demo'} (${user?.role || 'ENCARGADO'})`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Desktop sticky + Mobile sliding drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:min-h-screen md:h-screen md:sticky md:top-0 shadow-sm shrink-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-700 shadow-xs">
              {/* Fish / Restaurant Icon */}
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.46-3.44 6-7 6s-7.56-2.54-8.5-6z" />
                <path d="M18 12l4-4v8l-4-4z" />
                <circle cx="10" cy="11" r="1" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base leading-tight">Cevichería Lucy</h2>
              <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-brand-100">
                Administración
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar menú lateral"
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 px-4 py-5 overflow-y-auto space-y-6">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2.5">
              Módulos de Gestión
            </p>
            <AdminNavigation onItemClick={() => setMobileMenuOpen(false)} />
          </div>
        </div>

        {/* Bottom section of sidebar removed as requested */}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex justify-between items-center shadow-xs sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger button on mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
              aria-label="Abrir opciones de navegación"
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-brand-700 leading-tight whitespace-nowrap">
                  {brandName}
                  {sectionTitle && <span className="hidden sm:inline"> — {sectionTitle}</span>}
                </h1>
                {headerExtra}
              </div>
              <p className="text-xs text-slate-500 truncate">
                {sectionTitle ? (
                  <>
                    <span className="sm:hidden">{sectionTitle}</span>
                    <span className="hidden sm:inline">{userLabel}</span>
                  </>
                ) : (
                  <span className="hidden sm:inline">{userLabel}</span>
                )}
              </p>
            </div>
          </div>

          {/* Top Right Action Icons + User Avatar Dropdown */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* 1. Notifications Bell */}
            <button
              type="button"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Notificaciones"
              title="Notificaciones"
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
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>

            {/* 2. Help / Question Mark */}
            <button
              type="button"
              className="hidden sm:flex p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors min-h-[44px] min-w-[44px] items-center justify-center"
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

            {/* 3. User Avatar Button & Dropdown */}
            <UserMenuDropdown className="ml-1" />
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className={`flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 ${maxWidth}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
