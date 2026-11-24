import React from 'react';
import { ShiftSummary } from '@cevicheria/shared';
import { formatSoles } from '../../utils/money';

interface SummaryCardsProps {
  summary: ShiftSummary | null;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  if (!summary) return null;

  const totalDishesSold = summary.soldDishes.reduce(
    (acc, d) => acc + d.quantity,
    0
  );
  const totalRemainingRations = summary.remainingRations.reduce(
    (acc, r) => acc + r.remainingRations,
    0
  );
  const totalSoldOut = summary.soldOutDishes.length;
  const totalCancellations = summary.cancellations.length;
  const totalManualRecords = summary.manualRecords?.length || 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Total informativo */}
      <div className="p-4 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 rounded-2xl flex flex-col justify-between">
        <span className="text-[11px] font-bold text-brand-800 dark:text-brand-300 uppercase tracking-wider">
          Total informativo
        </span>
        <p className="text-xl font-extrabold text-brand-900 dark:text-brand-200 mt-2">
          {formatSoles(summary.totalAmountCents)}
        </p>
        <span className="text-[10px] text-brand-700 dark:text-brand-400 mt-1">
          Referencial del turno
        </span>
      </div>

      {/* Platos vendidos */}
      <div className="p-4 bg-white dark:bg-marine-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between shadow-sm">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Platos vendidos
        </span>
        <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">
          {totalDishesSold}
        </p>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
          {summary.soldDishes.length} variedad(es)
        </span>
      </div>

      {/* Raciones restantes */}
      <div className="p-4 bg-white dark:bg-marine-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between shadow-sm">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Raciones restantes
        </span>
        <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">
          {totalRemainingRations}
        </p>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
          {summary.remainingRations.length} plato(s) con límite
        </span>
      </div>

      {/* Platos agotados */}
      <div className="p-4 bg-white dark:bg-marine-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between shadow-sm">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Agotados
        </span>
        <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">
          {totalSoldOut}
        </p>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
          Platos sin stock
        </span>
      </div>

      {/* Cancelaciones */}
      <div className="p-4 bg-white dark:bg-marine-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between shadow-sm">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Cancelaciones
        </span>
        <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">
          {totalCancellations}
        </p>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
          Pedidos cancelados
        </span>
      </div>

      {/* Registros manuales */}
      <div className="p-4 bg-white dark:bg-marine-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between shadow-sm">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Registros manuales
        </span>
        <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">
          {totalManualRecords}
        </p>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
          {formatSoles(summary.manualTotalCents)}
        </span>
      </div>
    </div>
  );
};

export default SummaryCards;
