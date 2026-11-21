import React, { useState } from 'react';
import { DishDTO, MenuSectionDTO } from '@cevicheria/shared';

interface DishPickerProps {
  isOpen: boolean;
  onClose: () => void;
  dishes: DishDTO[];
  sections: MenuSectionDTO[];
  alreadyAddedDishIds: string[];
  initialSectionId?: string;
  onSelectDish: (dish: DishDTO) => void;
}

export const DishPicker: React.FC<DishPickerProps> = ({
  isOpen,
  onClose,
  dishes,
  sections,
  alreadyAddedDishIds,
  initialSectionId,
  onSelectDish
}) => {
  const [filterSectionId, setFilterSectionId] = useState<string>(initialSectionId || 'ALL');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const availableDishes = dishes.filter((d) => d.active);

  const filtered = availableDishes.filter((d) => {
    const matchSection = filterSectionId === 'ALL' || d.sectionId === filterSectionId;
    const matchSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchSection && matchSearch;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 my-8 max-h-[90dvh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Agregar platos al menú del día</h2>
            <p className="text-xs text-slate-500">
              Solo se muestran platos activos del catálogo que aún no están en el menú.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold min-h-[44px] px-2"
          >
            ×
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={filterSectionId}
            onChange={(e) => setFilterSectionId(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-h-[44px] bg-white"
          >
            <option value="ALL">Todas las secciones</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-h-[44px] flex-1"
          />
        </div>

        {/* Lista de platos */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">
              No hay platos disponibles con los filtros aplicados.
            </p>
          ) : (
            filtered.map((dish) => {
              const isAdded = alreadyAddedDishIds.includes(dish.id);
              const sec = sections.find((s) => s.id === dish.sectionId);

              return (
                <div
                  key={dish.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    isAdded ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-brand-300'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900">{dish.name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        {sec?.name || 'Sección'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold">
                      S/ {(dish.priceCents / 100).toFixed(2)}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isAdded}
                    onClick={() => {
                      onSelectDish(dish);
                      onClose();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[44px] transition-colors ${
                      isAdded
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-brand-500 hover:bg-brand-400 text-brand-950 shadow-sm'
                    }`}
                  >
                    {isAdded ? 'Ya agregado' : 'Seleccionar'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 min-h-[44px]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DishPicker;
