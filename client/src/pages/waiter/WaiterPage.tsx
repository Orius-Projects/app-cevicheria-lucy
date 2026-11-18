import React, { useState } from 'react';
import { TableSelector } from '../../components/waiter/TableSelector';
import { TableItem, useTablesStore } from '../../stores/tablesStore';
import { useAuthStore } from '../../stores/authStore';

export const WaiterPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { closeSession, isLoading } = useTablesStore();
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
  const [closeNotes, setCloseNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const handleCloseSession = async () => {
    if (!selectedTable?.openSessionId) return;
    setActionError(null);
    try {
      await closeSession(selectedTable.openSessionId, closeNotes);
      setSelectedTable(null);
      setCloseNotes('');
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-brand-700">Cevichería Lucy — Salón</h1>
          <p className="text-xs text-slate-500">
            {user?.displayName} ({user?.role})
          </p>
        </div>
        <button
          onClick={() => logout()}
          className="text-xs px-3 py-2 min-h-[44px] text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg"
        >
          Cerrar sesión
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 space-y-6">
        <TableSelector
          selectedTableId={selectedTable?.id}
          onSelectTable={(table) => {
            setSelectedTable(table);
            setActionError(null);
          }}
        />

        {/* Panel de mesa seleccionada */}
        {selectedTable && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Mesa {selectedTable.code}
                </h3>
                <p className="text-sm text-slate-500">
                  Zona: {selectedTable.zone || 'Salón'} | Estado: {selectedTable.state}
                </p>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className="text-sm text-slate-400 hover:text-slate-600 min-h-[44px] px-2"
              >
                Cerrar panel
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
                {actionError}
              </div>
            )}

            {selectedTable.state === 'POR_CERRAR' && selectedTable.openSessionId && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-sm font-medium text-slate-700">
                  Observaciones de cierre de mesa
                </label>
                <input
                  type="text"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Ej. Mesa limpia, clientes conformes"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-[44px]"
                />
                <button
                  onClick={handleCloseSession}
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold min-h-[44px] disabled:opacity-50"
                >
                  {isLoading ? 'Cerrando mesa...' : 'Cerrar Mesa'}
                </button>
              </div>
            )}

            {selectedTable.state === 'OCUPADA' && (
              <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                Esta mesa tiene pedidos en cocina o listos. Entregue o resuelva los pedidos
                antes de cerrarla.
              </p>
            )}

            {selectedTable.state === 'LIBRE' && (
              <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                Mesa disponible. Se abrirá automáticamente al enviar el primer pedido
                (Fase 6).
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default WaiterPage;
