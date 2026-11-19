import React from 'react';
import { NavLink } from 'react-router-dom';

export const AdminNavigation: React.FC = () => {
  const tabs = [
    { to: '/encargado', label: 'Turnos', exact: true },
    { to: '/encargado/menu', label: 'Menú del Día' },
    { to: '/encargado/platos', label: 'Platos Maestros' },
    { to: '/encargado/raciones', label: 'Raciones y Agotados' },
    { to: '/encargado/cierre', label: 'Cierre de Turno' }
  ];

  return (
    <nav className="flex space-x-1 sm:space-x-2 border-b border-slate-200 mb-6 overflow-x-auto pb-1">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.exact}
          className={({ isActive }) =>
            `px-4 py-3 text-sm font-semibold rounded-t-lg transition-colors whitespace-nowrap min-h-[44px] flex items-center ${
              isActive
                ? 'bg-white text-brand-700 border-b-2 border-brand-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
};

export default AdminNavigation;
