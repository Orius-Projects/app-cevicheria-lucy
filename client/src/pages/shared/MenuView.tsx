import React, { useEffect, useState } from 'react';
import { useMenuPublicStore } from '../../stores/menuPublicStore';
import { useAuthStore } from '../../stores/authStore';
import { DishCard } from '../../components/menu/DishCard';
import { MenuSectionTabs } from '../../components/menu/MenuSectionTabs';
import { ReplenishRationsModal } from '../../components/menu/ReplenishRationsModal';
import { MenuItemDTO } from '@cevicheria/shared';
import { Link } from 'react-router-dom';

interface MenuViewProps {
  onSelectItem?: (item: MenuItemDTO) => void;
  showAddButton?: boolean;
}

export const MenuView: React.FC<MenuViewProps> = ({
  onSelectItem,
  showAddButton = false
}) => {
  const { user, logout } = useAuthStore();
  const {
    todayMenu,
    loading,
    error,
    lastUpdatedAt,
    soldOutToast,
    loadToday,
    clearSoldOutToast
  } = useMenuPublicStore();

  const [activeSectionKey, setActiveSectionKey] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [replenishItem, setReplenishItem] = useState<MenuItemDTO | null>(null);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  const canReplenish = user?.role === 'MOZO' || user?.role === 'ENCARGADO';

  // Obtener secciones presentes en el menú
  const sections = (todayMenu?.sections || []).map((sec, idx) => ({
    id: `sec_${sec.key}_${idx}`,
    key: sec.key,
    name: sec.name
  }));

  // Filtrar platos
  const allItems = (todayMenu?.sections || []).flatMap((sec) => sec.items);

  const filteredItems = allItems.filter((item) => {
    const matchesSection = activeSectionKey === 'ALL' || item.sectionKey === activeSectionKey;
    const itemDescription = item.description ?? item.dish?.description ?? '';
    const matchesSearch =
      item.dishName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      itemDescription.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSection && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-marine-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-marine-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-brand-700 dark:text-brand-400 whitespace-nowrap">
              Cevichería Lucy
              <span className="hidden sm:inline"> — Menú del Día</span>
            </h1>
            <span className="shrink-0 text-xs px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold rounded-full">
              En Vivo
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            <span className="sm:hidden">Menú del Día · </span>
            {user?.displayName} ({user?.role}) {todayMenu?.date && `• ${todayMenu.date}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {user?.role === 'MOZO' && (
            <Link
              to="/mozo"
              className="text-xs px-3 py-2 min-h-[44px] bg-brand-50 dark:bg-marine-800 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-marine-700 rounded-lg font-semibold flex items-center border border-brand-200 dark:border-slate-700"
            >
              ← Volver al Salón
            </Link>
          )}

          {user?.role === 'ENCARGADO' && (
            <Link
              to="/encargado"
              className="text-xs px-3 py-2 min-h-[44px] bg-brand-50 dark:bg-marine-800 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-marine-700 rounded-lg font-semibold flex items-center border border-brand-200 dark:border-slate-700"
            >
              ← Administración
            </Link>
          )}

          <button
            onClick={() => logout()}
            className="text-xs px-3 py-2 min-h-[44px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 rounded-lg"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Main container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Toast de Alerta cuando un plato pasa a Agotado */}
        {soldOutToast && (
          <div
            data-testid="sold-out-toast"
            className="p-4 bg-rose-50 dark:bg-rose-950/50 border-l-4 border-rose-500 rounded-r-xl text-rose-900 dark:text-rose-200 shadow-md flex justify-between items-center animate-fade-in"
          >
            <div className="flex items-center space-x-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-sm font-bold">{soldOutToast}</p>
                <p className="text-xs text-rose-700 dark:text-rose-400">Comunica de inmediato al comensal para que elija otra opción de la carta.</p>
              </div>
            </div>
            <button
              onClick={clearSoldOutToast}
              className="text-rose-600 dark:text-rose-400 hover:text-rose-900 dark:hover:text-white font-bold px-3 py-1 text-sm min-h-[44px]"
            >
              Entendido ×
            </button>
          </div>
        )}

        {/* Mensaje de error general */}
        {error && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-xl text-sm flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={() => loadToday()}
              className="text-xs underline font-bold px-2 py-1 min-h-[44px]"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Barra de Filtros y Búsqueda */}
        <div className="bg-white dark:bg-marine-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 min-w-0">
          <MenuSectionTabs
            sections={sections}
            activeSectionKey={activeSectionKey}
            onSelectSection={setActiveSectionKey}
            showAllOption={true}
          />

          <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0">
            <input
              type="text"
              placeholder="Buscar plato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-marine-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg text-sm min-h-[44px] w-full sm:w-60 focus:outline-none focus:ring-1 focus:ring-brand-600"
            />

            <button
              type="button"
              onClick={() => loadToday()}
              title="Refrescar menú"
              className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-marine-800 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 dark:text-slate-300"
            >
              ↻
            </button>
          </div>
        </div>

        {/* Contenido del Menú */}
        {loading && !todayMenu ? (
          <div className="text-center py-16 text-slate-400">Cargando menú del día...</div>
        ) : !todayMenu ? (
          <div className="bg-white dark:bg-marine-900 p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
            <div className="text-4xl">🍽️</div>
            <h3 className="text-base font-bold text-slate-800">Menú no publicado</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              El encargado aún no ha publicado el menú para el día de hoy. Solicita en administración su apertura.
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
            No se encontraron platos activos para los criterios seleccionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="relative flex flex-col">
                <DishCard
                  item={item}
                  showAddButton={showAddButton}
                  onAdd={onSelectItem}
                />

                {/* Acción rápida de reposición para Mozo/Encargado si tiene límite */}
                {canReplenish && item.hasRationsLimit && (
                  <div className="mt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setReplenishItem(item)}
                      className="text-xs text-brand-700 hover:text-brand-800 font-semibold px-2 py-1 min-h-[44px]"
                    >
                      + Reponer raciones
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {lastUpdatedAt && (
          <div className="text-center text-[11px] text-slate-400 pt-2">
            Última sincronización: {lastUpdatedAt.toLocaleTimeString()}
          </div>
        )}
      </main>

      {/* Modal de Reposición Rápida */}
      {replenishItem && (
        <ReplenishRationsModal
          isOpen={true}
          onClose={() => setReplenishItem(null)}
          menuItem={replenishItem}
          onSuccess={() => {
            setReplenishItem(null);
            loadToday();
          }}
        />
      )}
    </div>
  );
};

export default MenuView;
