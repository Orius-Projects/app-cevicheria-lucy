import React from 'react';

export interface CategoryTabItem {
  key: string;
  label: string;
  count: number;
}

interface CategoryTabsProps {
  categories: CategoryTabItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  className?: string;
}

/**
 * Chips de categorías del menú del día.
 *
 * Con 5 opciones fijas se usa wrap (nunca scroll horizontal): a 360 px pueden
 * ocupar dos filas y todas las categorías quedan visibles.
 */
export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeKey,
  onSelect,
  className = ''
}) => {
  const baseClass =
    'inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 sm:px-4 sm:text-sm';

  return (
    <div
      role="group"
      aria-label="Filtrar platos por categoría"
      className={`flex w-full min-w-0 max-w-full flex-wrap items-center gap-2 ${className}`}
    >
      {categories.map((category) => {
        const isActive = category.key === activeKey;
        return (
          <button
            key={category.key}
            type="button"
            onClick={() => onSelect(category.key)}
            aria-pressed={isActive}
            className={`${baseClass} ${
              isActive
                ? 'border-brand-500 bg-brand-500 text-brand-950 shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="whitespace-nowrap">{category.label}</span>
            <span
              className={`inline-flex min-w-[1.35rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                isActive ? 'bg-brand-950/10 text-brand-950' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {category.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default CategoryTabs;
