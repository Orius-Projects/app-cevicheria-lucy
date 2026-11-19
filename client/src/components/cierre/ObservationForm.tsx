import React from 'react';

interface ObservationFormProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export const ObservationForm: React.FC<ObservationFormProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const maxLength = 500;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= maxLength) {
      onChange(e.target.value);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label
          htmlFor="shift-observations"
          className="block text-xs font-bold uppercase tracking-wider text-slate-700"
        >
          Observaciones de Cierre (Opcional)
        </label>
        <span className="text-xs text-slate-400">
          {value.length} / {maxLength}
        </span>
      </div>

      <textarea
        id="shift-observations"
        rows={3}
        maxLength={maxLength}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="Anota incidencias, notas operativas o detalles relevantes del turno..."
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100 disabled:text-slate-600 transition-colors"
      />
    </div>
  );
};

export default ObservationForm;
