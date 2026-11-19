import React from 'react';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number | null;
  onChange: (val: number) => void;
  disabled?: boolean;
  className?: string;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  min = 1,
  max = null,
  onChange,
  disabled = false,
  className = ''
}) => {
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && (max === null || max === undefined || value < max);

  const handleDecrease = () => {
    if (canDecrease) {
      onChange(value - 1);
    }
  };

  const handleIncrease = () => {
    if (canIncrease) {
      onChange(value + 1);
    }
  };

  return (
    <div className={`inline-flex items-center space-x-1 bg-slate-100 rounded-xl p-1 ${className}`}>
      <button
        type="button"
        onClick={handleDecrease}
        disabled={!canDecrease}
        aria-label="Disminuir cantidad"
        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        −
      </button>

      <span
        className="w-10 text-center font-bold text-slate-800 text-base select-none"
        aria-live="polite"
      >
        {value}
      </span>

      <button
        type="button"
        onClick={handleIncrease}
        disabled={!canIncrease}
        aria-label="Aumentar cantidad"
        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        +
      </button>
    </div>
  );
};

export default QuantityStepper;
