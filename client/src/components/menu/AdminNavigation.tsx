import React from 'react';
import { NavLink } from 'react-router-dom';

export interface AdminNavItem {
  to: string;
  label: string;
  exact?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export const ShiftClockIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
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
);

export const DailyMenuIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="2" />
    <path d="M9 12h6" />
    <path d="M9 16h4" />
  </svg>
);

export const MasterDishesIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="3.5" r="1.5" />
    <path d="M4 16a8 8 0 0116 0H4z" />
    <line x1="2" y1="16" x2="22" y2="16" />
    <line x1="4" y1="19" x2="20" y2="19" />
  </svg>
);

export const RationsStockIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

export const ShiftCloseIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 2v19l3-1.5 3 1.5 3-1.5 3 1.5 4-2V2a1 1 0 00-1-1H5a1 1 0 00-1 1z" />
    <path d="M8 10l2.5 2.5 4.5-4.5" />
    <line x1="8" y1="15" x2="15" y2="15" />
  </svg>
);

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    to: '/encargado',
    label: 'Platos y raciones',
    exact: true,
    icon: DailyMenuIcon,
    description: 'Menú del día, disponibilidad y raciones'
  },
  {
    to: '/encargado/turnos',
    label: 'Turno',
    icon: ShiftClockIcon,
    description: 'Apertura y estado del turno'
  },
  {
    to: '/encargado/cierre',
    label: 'Cierre de turno',
    icon: ShiftCloseIcon,
    description: 'Cuadre final y consolidación'
  }
];

export interface AdminNavigationProps {
  onItemClick?: () => void;
  className?: string;
}

export const AdminNavigation: React.FC<AdminNavigationProps> = ({ onItemClick, className = '' }) => {
  return (
    <nav className={`flex flex-col space-y-1.5 ${className}`} aria-label="Navegación del panel de administración">
      {ADMIN_NAV_ITEMS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.exact}
          onClick={onItemClick}
          className={({ isActive }) =>
            `group flex items-center gap-3 px-3.5 py-3 text-sm rounded-xl font-medium transition-all min-h-[44px] ${
              isActive
                ? 'bg-brand-50 text-brand-700 font-semibold shadow-xs border border-brand-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <tab.icon
                className={`w-5 h-5 flex-shrink-0 transition-colors ${
                  isActive ? 'text-brand-700' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />
              <span className="truncate flex-1 text-left">{tab.label}</span>
              {isActive && (
                <span className="w-1.5 h-5 bg-brand-500 rounded-full flex-shrink-0" aria-hidden="true" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};

export default AdminNavigation;
