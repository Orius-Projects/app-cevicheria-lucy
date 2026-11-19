import React from 'react';

interface RationBadgeProps {
  hasRationsLimit: boolean;
  remainingRations?: number | null;
  totalRations?: number | null;
  lowStockThreshold?: number;
  className?: string;
  showTotal?: boolean;
}

export const RationBadge: React.FC<RationBadgeProps> = ({
  hasRationsLimit,
  remainingRations,
  totalRations,
  lowStockThreshold = 5,
  className = '',
  showTotal = false
}) => {
  if (!hasRationsLimit) {
    return null;
  }

  const remaining = remainingRations ?? 0;
  const isZero = remaining === 0;
  const isLowStock = !isZero && remaining <= lowStockThreshold;

  let colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
  if (isZero) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-300 font-semibold';
  } else if (isLowStock) {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
  }

  return (
    <span
      data-testid="ration-badge"
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${colorClasses} ${className}`}
    >
      {isZero ? (
        'Sin raciones'
      ) : showTotal && totalRations !== undefined && totalRations !== null ? (
        `${remaining} / ${totalRations} raciones`
      ) : (
        `Quedan ${remaining}`
      )}
    </span>
  );
};

export default RationBadge;
