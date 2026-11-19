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

export const MenuSectionTabs: React.FC<MenuSectionTabsProps> = ({
  sections,
  activeSectionKey,
  onSelectSection,
  showAllOption = true
}) => {
  return (
    <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
      {showAllOption && (
        <button
          type="button"
          onClick={() => onSelectSection('ALL')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap min-h-[44px] transition-colors border ${
            activeSectionKey === 'ALL'
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todos los platos
        </button>
      )}

      {sections.map((sec) => {
        const isActive = activeSectionKey === sec.key;
        return (
          <button
            key={sec.id}
            type="button"
            onClick={() => onSelectSection(sec.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap min-h-[44px] transition-colors border ${
              isActive
                ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {sec.name}
          </button>
        );
      })}
    </div>
  );
};

export default MenuSectionTabs;
