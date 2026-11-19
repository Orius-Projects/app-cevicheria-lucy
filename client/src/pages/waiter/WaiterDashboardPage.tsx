import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useTablesStore, TableItem } from '../../stores/tablesStore';
import { useOrdersStore } from '../../stores/ordersStore';
import { useShiftStore } from '../../stores/shiftStore';
import { useOrderDraftStore } from '../../stores/orderDraftStore';
import { useOrderEvents } from '../../hooks/useOrderEvents';
import { TableSelector } from '../../components/mozo/TableSelector';
import { ReadyOrderCard } from '../../components/mozo/ReadyOrderCard';
import { CancelOrderModal } from '../../components/mozo/CancelOrderModal';
import { OrderDTO } from '@cevicheria/shared';

export const WaiterDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { tables, closeSession } = useTablesStore();
  const { active, ready, deliverOrder, cancelOrder, error, clearError } = useOrdersStore();
  const { currentShift, isOpen: isShiftOpen, fetchCurrentShift } = useShiftStore();
  const { setTable: setDraftTable } = useOrderDraftStore();

  useOrderEvents({ pollingIntervalMs: 15000 });

  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
  const [closeNotes, setCloseNotes] = useState('');
  const [isClosingTable, setIsClosingTable] = useState(false);
  const [tableActionError, setTableActionError] = useState<string | null>(null);

  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<OrderDTO | null>(null);

  useEffect(() => {
    fetchCurrentShift();
  }, [fetchCurrentShift]);

  // Si la mesa seleccionada cambia de estado o se refresca la lista
  useEffect(() => {
    if (selectedTable) {
      const updated = tables.find((t) => t.id === selectedTable.id);
      if (updated) setSelectedTable(updated);
    }
  }, [tables]);

  const handleDeliver = async (order: OrderDTO) => {
    setDeliveringId(order.id);
    clearError();
    try {
      await deliverOrder(order.id, order.version);
    } catch {
      // Error manejado en store
    } finally {
      setDeliveringId(null);
    }
  };

  const handleStartOrderForTable = (table: TableItem) => {
    setDraftTable(table.id, table.code);
    navigate('/mozo/pedido/nuevo');
  };

  const handleCloseSession = async () => {
    if (!selectedTable?.openSessionId) return;
    setIsClosingTable(true);
    setTableActionError(null);
    try {
      await closeSession(selectedTable.openSessionId, closeNotes.trim());
      setSelectedTable(null);
      setCloseNotes('');
    } catch (err: any) {
      setTableActionError(err.message || 'Error al cerrar la sesión de mesa');
    } finally {
      setIsClosingTable(false);
    }
  };

  // Pedidos activos para la mesa seleccionada
  const tableActiveOrders = selectedTable
    ? active.filter((o) => o.tableId === selectedTable.id)
    : [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex flex-wrap justify-between items-center gap-3 shadow-sm sticky top-0 z-40">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-brand-700">Cevichería Lucy — Salón</h1>
            {isShiftOpen ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Turno Abierto
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                Turno Cerrado
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {user?.displayName} ({user?.role}) {currentShift && `• ${currentShift.label}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/mozo/pedido/nuevo"
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold min-h-[44px] flex items-center shadow-sm active:scale-95 transition-all"
          >
            + Nueva Comanda
          </Link>

          <Link
            to="/mozo/pedidos"
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold min-h-[44px] flex items-center border border-slate-200"
          >
            📋 Pedidos Activos ({active.length})
          </Link>

          <Link
            to="/mozo/menu"
            className="px-3 py-2.5 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-semibold min-h-[44px] flex items-center border border-slate-200"
          >
            Ver Menú
          </Link>

          <button
            type="button"
            onClick={() => logout()}
            className="px-3 py-2.5 text-slate-500 hover:text-slate-800 text-xs min-h-[44px]"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Aviso de error general */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-2xl flex justify-between items-center" aria-live="polite">
            <span>{error}</span>
            <button onClick={clearError} className="font-bold text-rose-600 ml-2">×</button>
          </div>
        )}

        {/* Alerta si el turno no está abierto */}
        {!isShiftOpen && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs space-y-1">
            <span className="font-bold text-sm block">⚠️ Atención: Turno no abierto</span>
            <p>
              El encargado aún no ha abierto el turno de servicio. No se pueden enviar pedidos a cocina hasta que el turno esté activo.
            </p>
          </div>
        )}

        {/* Panel prioritario: LISTOS PARA RECOGER */}
        {ready.length > 0 && (
          <section className="space-y-3" aria-labelledby="ready-orders-heading">
            <div className="flex items-center space-x-2">
              <span className="text-2xl animate-bounce">🔔</span>
              <h2 id="ready-orders-heading" className="text-lg font-black text-slate-900">
                Listos para Servir en Mesa ({ready.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ready.map((order) => (
                <ReadyOrderCard
                  key={order.id}
                  order={order}
                  onDeliver={handleDeliver}
                  onCancel={(ord) => setCancellingOrder(ord)}
                  isDelivering={deliveringId === order.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* Grid de Mesas */}
        <section className="space-y-4" aria-labelledby="tables-heading">
          <div className="flex justify-between items-center">
            <h2 id="tables-heading" className="text-lg font-bold text-slate-900">
              Estado de Mesas del Salón
            </h2>
            <span className="text-xs text-slate-400">Toca una mesa para gestionarla</span>
          </div>

          <TableSelector
            selectedTableId={selectedTable?.id}
            onSelectTable={(table) => {
              setSelectedTable(table);
              setTableActionError(null);
            }}
          />
        </section>

        {/* Drawer / Panel de Detalle de Mesa Seleccionada */}
        {selectedTable && (
          <div className="bg-white rounded-2xl border-2 border-slate-300 p-5 shadow-lg space-y-4 animate-fade-in">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-black text-slate-900">Mesa {selectedTable.code}</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                    {selectedTable.state}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Zona: {selectedTable.zone || 'Salón Principal'} • {selectedTable.seats || 4} sillas
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTable(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold min-h-[44px] min-w-[44px]"
              >
                ×
              </button>
            </div>

            {tableActionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl" aria-live="polite">
                {tableActionError}
              </div>
            )}

            {/* Acciones según estado de mesa */}
            <div className="space-y-3">
              {/* Accion 1: Tomar pedido */}
              <button
                type="button"
                onClick={() => handleStartOrderForTable(selectedTable)}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold min-h-[48px] shadow-sm flex items-center justify-center space-x-2"
              >
                <span>+ Tomar Pedido para Mesa {selectedTable.code}</span>
              </button>

              {/* Pedidos activos de esta mesa */}
              {tableActiveOrders.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Comandas activas en esta mesa ({tableActiveOrders.length}):
                  </span>
                  <div className="space-y-1.5">
                    {tableActiveOrders.map((ord) => (
                      <div key={ord.id} className="flex justify-between items-center text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                        <div>
                          <span className="font-bold text-slate-900">#{ord.orderNumber}</span>
                          <span className="text-slate-500 ml-2">({ord.items.length} platos)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            ord.status === 'LISTO' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {ord.status}
                          </span>
                          <Link
                            to={`/mozo/pedidos/${ord.id}`}
                            className="text-brand-600 hover:text-brand-800 font-bold underline px-1 py-1 min-h-[36px] flex items-center"
                          >
                            Ver →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Accion de Cierre de Mesa */}
              {selectedTable.state === 'POR_CERRAR' && selectedTable.openSessionId && (
                <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">Cierre de Sesión de Mesa</h4>
                    <p className="text-xs text-rose-700">Todos los pedidos han sido entregados. Puedes liberar la mesa.</p>
                  </div>

                  <input
                    type="text"
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder="Observaciones de cierre (ej. Limpia y desinfectada)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs min-h-[44px] bg-white"
                  />

                  <button
                    type="button"
                    onClick={handleCloseSession}
                    disabled={isClosingTable}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold min-h-[44px] disabled:opacity-50"
                  >
                    {isClosingTable ? 'Cerrando mesa...' : 'Liberar Mesa'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal de cancelación si aplica */}
      {cancellingOrder && (
        <CancelOrderModal
          isOpen={true}
          order={cancellingOrder}
          onClose={() => setCancellingOrder(null)}
          onConfirm={async (reason) => {
            await cancelOrder(cancellingOrder.id, reason, cancellingOrder.version);
            setCancellingOrder(null);
          }}
        />
      )}
    </div>
  );
};

export default WaiterDashboardPage;
