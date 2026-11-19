import React, { useState } from 'react';

interface VariationOption {
  id: string;
  name: string;
}

interface VariationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  dishName: string;
  availableVariations: VariationOption[];
  selectedVariationIds: string[];
  onSave: (selectedIds: string[], selectedObjects: VariationOption[]) => void;
}

export const VariationSheet: React.FC<VariationSheetProps> = ({
  isOpen,
  onClose,
  dishName,
  availableVariations,
  selectedVariationIds,
  onSave
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedVariationIds);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleConfirm = () => {
    const selectedObjects = availableVariations.filter((v) => selectedIds.includes(v.id));
    onSave(selectedIds, selectedObjects);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Personalizar Plato</h2>
            <p className="text-xs text-slate-500">{dishName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-slate-400 hover:text-slate-600 text-2xl font-bold min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Variaciones sin costo adicional
          </p>

          {availableVariations.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4">Este plato no tiene variaciones configuradas.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pt-1">
              {availableVariations.map((v) => {
                const isSelected = selectedIds.includes(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleToggle(v.id)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-semibold min-h-[48px] transition-all text-left ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50 text-brand-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{v.name}</span>
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                        isSelected ? 'bg-brand-600 text-white' : 'border border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold min-h-[44px] shadow-sm"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default VariationSheet;
