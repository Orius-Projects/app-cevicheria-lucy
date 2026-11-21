import React, { useState } from 'react';

interface ItemNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialNotes: string;
  maxLength?: number;
  onSave: (notes: string) => void;
}

export const ItemNotesModal: React.FC<ItemNotesModalProps> = ({
  isOpen,
  onClose,
  title,
  initialNotes,
  maxLength = 140,
  onSave
}) => {
  const [notes, setNotes] = useState<string>(initialNotes);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(notes.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90dvh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-slate-400 hover:text-slate-600 text-2xl font-bold min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="item-notes-textarea"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1"
          >
            Instrucciones para cocina
          </label>
          <textarea
            id="item-notes-textarea"
            rows={3}
            maxLength={maxLength}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. Poco picante, sin cebolla, etc."
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
          <div className="flex justify-between text-[11px] text-slate-400 pt-1">
            <span>Máximo {maxLength} caracteres</span>
            <span className={notes.length >= maxLength ? 'text-rose-600 font-bold' : ''}>
              {notes.length} / {maxLength}
            </span>
          </div>
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
            onClick={handleSave}
            className="px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-brand-950 rounded-xl text-sm font-bold min-h-[44px] shadow-sm"
          >
            Guardar Nota
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemNotesModal;
