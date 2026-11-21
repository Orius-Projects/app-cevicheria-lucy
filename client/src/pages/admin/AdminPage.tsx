import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useShiftStore } from '../../stores/shiftStore';
import { AdminLayout } from '../../layouts/AdminLayout';

export const AdminPage: React.FC = () => {
  const { currentShift, isOpen, isLoading, error, fetchCurrentShift, openShift, closeShift } =
    useShiftStore();

  const [label, setLabel] = useState('Almuerzo');
  const [observations, setObservations] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentShift();
  }, [fetchCurrentShift]);

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await openShift(label);
      setFeedback('Turno abierto exitosamente.');
    } catch {
      // Error manejado en shiftStore
    }
  };

  const handleClose = async () => {
    if (!currentShift) return;
    setFeedback(null);
    try {
      const summary = await closeShift(currentShift.id, observations);
      setFeedback(`Turno cerrado. Total vendido: S/ ${(summary.totalAmountCents / 100).toFixed(2)}`);
      setObservations('');
    } catch {
      // Error manejado en shiftStore
    }
  };

  return (
    <AdminLayout title="Cevichería Lucy — Turno" maxWidth="max-w-4xl">
      <div className="space-y-6">
        {feedback && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm">
            {feedback}
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Estado del turno actual */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Control de Turnos</h2>
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                isOpen
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-300'
              }`}
            >
              {isOpen ? 'Turno Abierto' : 'Turno Cerrado'}
            </span>
          </div>

          {isOpen && currentShift ? (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl">
                <div>
                  <span className="text-slate-500">Etiqueta:</span>
                  <p className="font-semibold text-slate-800">{currentShift.label}</p>
                </div>
                <div>
                  <span className="text-slate-500">Fecha:</span>
                  <p className="font-semibold text-slate-800">{currentShift.date}</p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/encargado/cierre"
                  className="flex-1 py-3 px-4 bg-brand-500 hover:bg-brand-400 text-brand-950 text-center rounded-xl font-bold text-sm min-h-[44px] flex items-center justify-center transition-colors shadow-sm"
                >
                  Ir a Cierre de Turno
                </Link>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-sm font-medium text-slate-700">
                  Observaciones de cierre de turno
                </label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Ej. Sin incidencias mayores, inventario de raciones verificado."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold min-h-[44px] disabled:opacity-50"
                >
                  {isLoading ? 'Cerrando turno...' : 'Cerrar Turno Actual'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleOpen} className="space-y-4 pt-2">
              <p className="text-sm text-slate-600">
                No hay ningún turno abierto. Inicia uno para permitir que los mozos envíen pedidos.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Etiqueta del turno
                </label>
                <select
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="mt-1 block w-full px-3 py-3 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                >
                  <option value="Almuerzo">Almuerzo</option>
                  <option value="Cena">Cena</option>
                  <option value="Especial">Especial</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-brand-500 hover:bg-brand-400 text-brand-950 rounded-xl font-bold min-h-[44px] disabled:opacity-50"
              >
                {isLoading ? 'Abriendo turno...' : 'Abrir Turno'}
              </button>
            </form>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPage;
