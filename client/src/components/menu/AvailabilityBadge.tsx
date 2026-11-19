import React from 'react';
import { DishStatus } from '@cevicheria/shared';

interface AvailabilityBadgeProps {
  status: DishStatus;
  className?: string;
}

export const AvailabilityBadge: React.FC<AvailabilityBadgeProps> = ({ status, className = '' }) => {
  const configs: Record<DishStatus, { label: string; bg: string; text: string; border: string }> = {
    DISPONIBLE: {
      label: 'Disponible',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-300'
    },
    ULTIMAS_RACIONES: {
      label: 'Últimas raciones',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300'
    },
    AGOTADO: {
      label: 'Agotado',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-300'
    },
    INACTIVO: {
      label: 'Inactivo',
      bg: 'bg-slate-50',
      text: 'text-slate-500',
      border: 'border-slate-300'
    }
  };

  const config = configs[status] || configs.INACTIVO;

  return (
    <span
      data-testid="availability-badge"
      data-status={status}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {config.label}
    </span>
  );
};

export default AvailabilityBadge;
