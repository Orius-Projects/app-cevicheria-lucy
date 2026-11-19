import React, { useState } from 'react';

interface RationInputProps {
  hasRationsLimit: boolean;
  totalRations?: number | null;
  remainingRations?: number | null;
  onChangeLimit: (hasLimit: boolean) => void;
  onChangeTotal: (total: number | null) => void;
  onChangeRemaining: (remaining: number | null) => void;
  error?: string | null;
}

export const RationInput: React.FC<RationInputProps> = ({
  hasRationsLimit,
  totalRations,
  remainingRations,
  onChangeLimit,
  onChangeTotal,
  onChangeRemaining,
  error
}) => {
  const [exceededWarning, setExceededWarning] = useState<string | null>(null);

  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value === '' ? null : parseInt(e.target.value, 10);
    const val = raw === null || isNaN(raw) ? null : Math.max(0, raw);
    onChangeTotal(val);

    if (val !== null && remainingRations !== null && remainingRations !== undefined && remainingRations > val) {
      onChangeRemaining(val);
      setExceededWarning('Las raciones disponibles no pueden superar el total');
    } else {
      setExceededWarning(null);
    }
  };

  const handleRemainingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value === '' ? null : parseInt(e.target.value, 10);
    if (raw === null || isNaN(raw)) {
      onChangeRemaining(null);
      setExceededWarning(null);
      return;
    }

    const nonNeg = Math.max(0, raw);
    const maxTotal = totalRations !== null && totalRations !== undefined ? totalRations : null;

    if (maxTotal !== null && nonNeg > maxTotal) {
      onChangeRemaining(maxTotal);
      setExceededWarning('Las raciones disponibles no pueden superar el total');
    } else {
      onChangeRemaining(nonNeg);
      setExceededWarning(null);
    }
  };

  return (
    <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between">
        <label className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-800 cursor-pointer min-h-[44px]">
          <input
            type="checkbox"
            checked={hasRationsLimit}
            onChange={(e) => {
              const checked = e.target.checked;
              setExceededWarning(null);
              onChangeLimit(checked);
              if (checked) {
                if (totalRations === undefined || totalRations === null) {
                  onChangeTotal(30);
                  onChangeRemaining(30);
                }
              }
            }}
            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
          />
          <span>Controlar límite de raciones para este plato</span>
        </label>
      </div>

      {hasRationsLimit && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label
              htmlFor="total-rations-input"
              className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1"
            >
              Raciones Totales Preparadas
            </label>
            <input
              id="total-rations-input"
              type="number"
              min="0"
              step="1"
              value={totalRations ?? ''}
              onChange={handleTotalChange}
              placeholder="Ej. 30"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm min-h-[44px] bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="text-[11px] text-slate-400 mt-0.5">Producción inicial de cocina.</p>
          </div>

          <div>
            <label
              htmlFor="remaining-rations-input"
              className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1"
            >
              Raciones Iniciales Disponibles
            </label>
            <input
              id="remaining-rations-input"
              type="number"
              min="0"
              max={totalRations ?? undefined}
              step="1"
              value={remainingRations ?? ''}
              onChange={handleRemainingChange}
              placeholder="Ej. 30"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm min-h-[44px] bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="text-[11px] text-slate-400 mt-0.5">Disponibles para venta al abrir.</p>
            {exceededWarning && (
              <p
                data-testid="rations-exceeded-warning"
                className="text-xs text-amber-700 font-semibold mt-1"
              >
                {exceededWarning}
              </p>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
};

export default RationInput;
