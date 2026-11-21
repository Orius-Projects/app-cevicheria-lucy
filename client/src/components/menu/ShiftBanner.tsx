import React from 'react';
import { Link } from 'react-router-dom';

interface ShiftBannerProps {
  isOpen: boolean;
  isLoading?: boolean;
  shiftLabel?: string | null;
}

/**
 * Aviso operativo cuando no hay turno abierto. Los mozos no pueden enviar
 * pedidos hasta que el encargado abra el turno desde /encargado/turnos.
 */
export const ShiftBanner: React.FC<ShiftBannerProps> = ({ isOpen, isLoading = false, shiftLabel }) => {
  if (isLoading || isOpen) return null;

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-bold">No hay turno abierto</p>
        <p className="text-xs text-amber-800">
          Los mozos no podrán enviar pedidos hasta que apertures el turno
          {shiftLabel ? ` (${shiftLabel})` : ''}.
        </p>
      </div>
      <Link
        to="/encargado/turnos"
        className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-800 transition-colors hover:bg-amber-100"
      >
        Abrir turno →
      </Link>
    </div>
  );
};

export default ShiftBanner;
