import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import { useTablesStore, TableItem } from '../../stores/tablesStore';
import { TableStatus } from '@cevicheria/shared';

const statusConfig: Record<TableStatus, { bg: string; text: string; label: string; border: string }> = {
  LIBRE: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700',
    label: 'Libre'
  },
  OCUPADA: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
    label: 'Ocupada'
  },
  POR_CERRAR: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-800 dark:text-rose-300',
    border: 'border-rose-300 dark:border-rose-700',
    label: 'Por Cerrar'
  }
};

const ZONES_PRESETS = [
  'Primer Piso',
  'Segundo Piso',
  'Afuera (Terraza)',
  'Barra'
];

export const TablesManagementPage: React.FC = () => {
  const { tables, isLoading, error, fetchTables, createTable, updateTable } = useTablesStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableItem | null>(null);

  // Form states para agregar mesa
  const [newCode, setNewCode] = useState('');
  const [newZone, setNewZone] = useState('Primer Piso');
  const [customZone, setCustomZone] = useState('');
  const [newSeats, setNewSeats] = useState<number>(4);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const flash = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleOpenAddModal = () => {
    setNewCode('');
    setNewZone('Primer Piso');
    setCustomZone('');
    setNewSeats(4);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const code = newCode.trim().toUpperCase();
    if (!code) {
      setFormError('El código de mesa es obligatorio (ej. M13).');
      return;
    }

    const zone = newZone === 'OTRA' ? customZone.trim() : newZone;
    if (!zone) {
      setFormError('La zona o ambiente es obligatorio.');
      return;
    }

    if (!newSeats || newSeats < 1) {
      setFormError('La capacidad debe ser de al menos 1 persona.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createTable({
        code,
        zone,
        seats: newSeats,
        active: true
      });
      setIsAddModalOpen(false);
      flash(`Mesa ${code} creada exitosamente en ${zone}.`);
    } catch (err: any) {
      setFormError(err.message || 'Error al crear la mesa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;
    setFormError(null);

    setIsSubmitting(true);
    try {
      await updateTable(editingTable.id, {
        zone: editingTable.zone,
        seats: editingTable.seats,
        active: editingTable.active !== false
      });
      setEditingTable(null);
      flash(`Mesa ${editingTable.code} actualizada correctamente.`);
    } catch (err: any) {
      setFormError(err.message || 'Error al actualizar la mesa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const safeTables = Array.isArray(tables) ? tables : [];
  const activeTables = safeTables.filter((t) => t.active !== false);
  const freeTables = activeTables.filter((t) => (t.state || 'LIBRE') === 'LIBRE');
  const occupiedTables = activeTables.filter((t) => (t.state || 'LIBRE') === 'OCUPADA');

  // Agrupar mesas por zona
  const zonesMap = new Map<string, TableItem[]>();
  for (const t of safeTables) {
    const zoneName = t.zone?.trim() || 'General';
    if (!zonesMap.has(zoneName)) {
      zonesMap.set(zoneName, []);
    }
    zonesMap.get(zoneName)!.push(t);
  }

  return (
    <AdminLayout title="Cevichería Lucy — Gestión de Mesas" maxWidth="max-w-7xl">
      <div className="space-y-6">
        {/* Notificaciones */}
        {successMessage && (
          <div role="status" className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex justify-between items-center shadow-xs">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="font-bold text-lg leading-none">×</button>
          </div>
        )}

        {error && (
          <div role="alert" className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-300 rounded-2xl text-xs font-bold">
            {error}
          </div>
        )}

        {/* Encabezado y Acciones */}
        <div className="bg-white dark:bg-marine-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-brand-700 dark:text-brand-400">
              Configuración de Salón
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
              Gestión de Mesas y Salones
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Administra la distribución de mesas, añade nuevas ubicaciones o ajusta la capacidad de clientes.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-5 py-3 bg-brand-500 hover:bg-brand-400 text-brand-950 font-black rounded-2xl text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer min-h-[44px]"
          >
            <span className="text-base font-bold">+</span>
            <span>Nueva Mesa</span>
          </button>
        </div>

        {/* Resumen Operativo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-marine-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase">
              Total Mesas
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {safeTables.length}
            </span>
          </div>
          <div className="bg-white dark:bg-marine-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase">
              Libres Ahora
            </span>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {freeTables.length}
            </span>
          </div>
          <div className="bg-white dark:bg-marine-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block uppercase">
              Ocupadas
            </span>
            <span className="text-2xl font-black text-amber-700 dark:text-amber-400">
              {occupiedTables.length}
            </span>
          </div>
          <div className="bg-white dark:bg-marine-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] font-bold text-brand-700 dark:text-brand-400 block uppercase">
              Ambientes / Pisos
            </span>
            <span className="text-2xl font-black text-brand-700 dark:text-brand-300">
              {zonesMap.size}
            </span>
          </div>
        </div>

        {/* Listado de Mesas agrupadas por Zona */}
        {isLoading && safeTables.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white dark:bg-marine-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            Cargando mesas del restaurante...
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(zonesMap.entries()).map(([zoneName, zoneTables]) => (
              <div
                key={zoneName}
                className="bg-white dark:bg-marine-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4"
              >
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-400 flex items-center justify-center font-bold text-sm">
                      📍
                    </span>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {zoneName}
                    </h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                      {zoneTables.length} mesa{zoneTables.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {zoneTables.map((table) => {
                    const st = statusConfig[(table.state || 'LIBRE').toUpperCase() as TableStatus] || statusConfig.LIBRE;
                    const isActive = table.active !== false;

                    return (
                      <div
                        key={table.id}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between space-y-3 ${
                          isActive
                            ? `${st.bg} ${st.border}`
                            : 'bg-slate-50 dark:bg-marine-950/40 border-slate-200 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                              Mesa {table.code}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                              Capacidad: {table.seats || 4} sillas
                            </span>
                          </div>

                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${st.bg} ${st.text} ${st.border}`}>
                            {isActive ? st.label : 'Inactiva'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {table.openSessionId ? 'Sesión abierta' : 'Sin comanda'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingTable({ ...table })}
                            className="px-2.5 py-1 text-xs font-bold text-brand-700 dark:text-brand-400 hover:underline min-h-[44px] flex items-center cursor-pointer"
                          >
                            Editar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Agregar Mesa */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-md bg-white dark:bg-marine-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Agregar Nueva Mesa
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold min-h-[44px]"
                >
                  ×
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-bold">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Código de Mesa (ej. M13)
                  </label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="M13"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-marine-900 text-slate-900 dark:text-slate-100 min-h-[44px] focus:ring-2 focus:ring-brand-500 font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Ambiente / Zona
                  </label>
                  <select
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-marine-900 text-slate-900 dark:text-slate-100 min-h-[44px] focus:ring-2 focus:ring-brand-500 font-medium"
                  >
                    {ZONES_PRESETS.map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                    <option value="OTRA">+ Otro ambiente personalizado</option>
                  </select>
                </div>

                {newZone === 'OTRA' && (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Nombre del nuevo ambiente
                    </label>
                    <input
                      type="text"
                      required
                      value={customZone}
                      onChange={(e) => setCustomZone(e.target.value)}
                      placeholder="Ej. Salón VIP"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-marine-900 text-slate-900 dark:text-slate-100 min-h-[44px] focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Capacidad (número de sillas)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    required
                    value={newSeats}
                    onChange={(e) => setNewSeats(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-marine-900 text-slate-900 dark:text-slate-100 min-h-[44px] focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 min-h-[44px]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-brand-950 font-black rounded-xl shadow-xs min-h-[44px] disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Guardando...' : 'Crear Mesa'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Editar Mesa */}
        {editingTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-md bg-white dark:bg-marine-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Editar Mesa {editingTable.code}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold min-h-[44px]"
                >
                  ×
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-bold">
                  {formError}
                </div>
              )}

              <form onSubmit={handleUpdateSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Ambiente / Zona
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTable.zone || ''}
                    onChange={(e) => setEditingTable({ ...editingTable, zone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-marine-900 text-slate-900 dark:text-slate-100 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Capacidad (Sillas)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    required
                    value={editingTable.seats || 4}
                    onChange={(e) => setEditingTable({ ...editingTable, seats: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-marine-900 text-slate-900 dark:text-slate-100 min-h-[44px]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="table-active-check"
                    checked={editingTable.active !== false}
                    onChange={(e) => setEditingTable({ ...editingTable, active: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <label htmlFor="table-active-check" className="font-bold text-slate-700 dark:text-slate-200">
                    Mesa activa para atención en el salón
                  </label>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setEditingTable(null)}
                    className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 min-h-[44px]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-brand-950 font-black rounded-xl shadow-xs min-h-[44px] disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Guardando...' : 'Actualizar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default TablesManagementPage;
