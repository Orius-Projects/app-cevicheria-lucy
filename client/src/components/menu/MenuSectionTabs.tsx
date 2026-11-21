import React from 'react';
export interface SectionTabItem {
  id?: string;
  key: string;
  name: string;
}

interface MenuSectionTabsProps {
  sections: SectionTabItem[];
  activeSectionKey: string;
  onSelectSection: (sectionKey: string) => void;
  showAllOption?: boolean;
}

const baseTabClass =
  'shrink-0 whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-xl min-h-[44px] transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2';

export const MenuSectionTabs: React.FC<MenuSectionTabsProps> = ({
  sections,
  activeSectionKey,
  onSelectSection,
  showAllOption = true
}) => {
  const activeClass = 'bg-brand-500 text-brand-950 border-brand-500 shadow-sm';
  const idleClass = 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50';

  return (
    <div className="w-full min-w-0 max-w-full sm:w-auto sm:flex-1">
      <div
        role="group"
        aria-label="Filtrar platos por sección"
        className="flex w-full min-w-0 max-w-full flex-wrap items-center gap-2"
      >
        {showAllOption && (
          <button
            type="button"
            onClick={() => onSelectSection('ALL')}
            aria-pressed={activeSectionKey === 'ALL'}
            className={`${baseTabClass} ${activeSectionKey === 'ALL' ? activeClass : idleClass}`}
          >
            Todos los platos
          </button>
        )}

        {sections.map((sec) => {
          const isActive = activeSectionKey === sec.key;
          return (
            <button
              key={sec.id ?? sec.key}
              type="button"
              onClick={() => onSelectSection(sec.key)}
              aria-pressed={isActive}
              className={`${baseTabClass} ${isActive ? activeClass : idleClass}`}
            >
              {sec.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MenuSectionTabs;
