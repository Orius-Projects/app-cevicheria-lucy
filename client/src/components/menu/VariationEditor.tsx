import React, { useState } from 'react';
import { DishVariation } from '@cevicheria/shared';

interface VariationEditorProps {
  variations: DishVariation[];
  onChange: (variations: DishVariation[]) => void;
  error?: string | null;
}

export const VariationEditor: React.FC<VariationEditorProps> = ({
  variations,
  onChange,
  error
}) => {
  const [newVarName, setNewVarName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const trimmed = newVarName.trim();
    if (!trimmed) {
      setLocalError('El nombre de la variación no puede estar vacío');
      return;
    }

    const exists = variations.some(
      (v) => v.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setLocalError('Ya existe una variación con este nombre');
      return;
    }

    const nextVariation: DishVariation = {
      id: `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      sortOrder: variations.length,
      active: true
    };

    onChange([...variations, nextVariation]);
    setNewVarName('');
  };

  const handleRemove = (index: number) => {
    const updated = variations.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleToggleActive = (index: number) => {
    const updated = variations.map((v, i) =>
      i === index ? { ...v, active: !v.active } : v
    );
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-slate-700">
          Variaciones permitidas (sin costo adicional)
        </label>
        <span className="text-xs text-slate-400">
          {variations.length} configuradas
        </span>
      </div>

      <p className="text-xs text-slate-500">
        Las variaciones no alteran el precio del plato ni implican costos adicionales.
      </p>

      {/* Lista de variaciones existentes */}
      {variations.length > 0 ? (
        <ul className="space-y-2 border border-slate-200 rounded-lg p-2 bg-slate-50 max-h-48 overflow-y-auto">
          {variations.map((v, idx) => (
            <li
              key={v.id || idx}
              className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200 text-sm"
            >
              <div className="flex items-center space-x-2">
                <span className="font-medium text-slate-800">{v.name}</span>
                {!v.active && (
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded">
                    Inactiva
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(idx)}
                  className="text-xs px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-slate-600 min-h-[36px]"
                >
                  {v.active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="text-xs px-2.5 py-1.5 rounded text-rose-600 hover:bg-rose-50 border border-rose-200 min-h-[36px]"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded border border-dashed border-slate-200 text-center">
          Sin variaciones configuradas (se servirá en presentación estándar).
        </p>
      )}

      {/* Agregar variación */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={newVarName}
          onChange={(e) => {
            setNewVarName(e.target.value);
            setLocalError(null);
          }}
          placeholder="Ej. Sin arroz, Papa extra, Poco picante"
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm min-h-[44px] focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 min-h-[44px]"
        >
          Agregar
        </button>
      </div>

      {(localError || error) && (
        <p className="text-xs text-rose-600 mt-1">{localError || error}</p>
      )}
    </div>
  );
};

export default VariationEditor;
