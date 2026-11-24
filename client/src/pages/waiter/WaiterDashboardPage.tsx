import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useTablesStore, TableItem } from '../../stores/tablesStore';
import { useOrdersStore } from '../../stores/ordersStore';
import { useShiftStore } from '../../stores/shiftStore';
import { useOrderDraftStore } from '../../stores/orderDraftStore';
import { useOrderEvents } from '../../hooks/useOrderEvents';
import { TableSelector, TableIcon } from '../../components/waiter/TableSelector';
import { ReadyOrderCard } from '../../components/mozo/ReadyOrderCard';
import { CancelOrderModal } from '../../components/mozo/CancelOrderModal';
import { ConnectionBanner } from '../../components/common/ConnectionBanner';
import { ShiftClosedView } from '../../components/common/ShiftClosedView';
import { UserMenuDropdown } from '../../components/common/UserMenuDropdown';
import { NotificationCenter } from '../../components/notifications/NotificationCenter';
import { ToastContainer } from '../../components/notifications/ToastContainer';
import { HelpModal } from '../../components/common/HelpModal';
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
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<OrderDTO | null>(null);

  useEffect(() => {
    fetchCurrentShift();
  }, [fetchCurrentShift]);

  // Si la mesa seleccionada cambia de estado o se refresca la lista
  useEffect(() => {
    if (selectedTable && Array.isArray(tables)) {
      const updated = tables.find((t) => t.id === selectedTable.id);
      if (updated) setSelectedTable(updated);
    }
  }, [tables, selectedTable]);

  // Bloquear el scroll de fondo mientras el popup de mesa esté abierto para evitar saltos y glitches
  useEffect(() => {
    if (selectedTable) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [selectedTable]);

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

  const safeActive = Array.isArray(active) ? active : [];
  const safeReady = Array.isArray(ready) ? ready : [];

  // Pedidos activos para la mesa seleccionada
  const tableActiveOrders = selectedTable
    ? safeActive.filter((o) => o?.tableId === selectedTable.id)
    : [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Banner de estado de conexión */}
      <ConnectionBanner />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap justify-between items-center gap-3 shadow-sm sticky top-0 z-40">
        <div className="flex items-center min-w-0">
          <h1 className="text-xl font-semibold text-brand-700 tracking-tight truncate">
            Salón
          </h1>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5 min-w-0">
          {isShiftOpen && (
            <Link
              to="/mozo/pedidos"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold min-h-[44px] shadow-xs transition-all active:scale-95"
            >
              <svg
                className="w-4 h-4 text-slate-500 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Pedidos Activos</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black border border-slate-200">
                {safeActive.length}
              </span>
            </Link>
          )}

          <Link
            to="/mozo/menu"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold min-h-[44px] shadow-xs transition-all active:scale-95"
          >
            <svg
              className="w-4 h-4 text-slate-500 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="8" y1="7" x2="16" y2="7" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            <span>Ver Menú</span>
          </Link>

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Notificaciones */}
          <NotificationCenter variant="light" />

          {/* Ayuda */}
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Ayuda"
            title="Ayuda"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>

          {/* Menú de usuario con avatar circular */}
          <UserMenuDropdown />
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

        {!isShiftOpen ? (
          <ShiftClosedView
            role="MOZO"
            shiftLabel={currentShift?.label}
            shiftDate={currentShift?.date}
            onRefresh={fetchCurrentShift}
          />
        ) : (
          <>
            {/* Panel prioritario: LISTOS PARA RECOGER */}
            {safeReady.length > 0 && (
              <section className="space-y-3" aria-labelledby="ready-orders-heading">
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-5 h-5 text-emerald-600 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <h2 id="ready-orders-heading" className="text-lg font-semibold text-slate-900">
                    Listos para Servir en Mesa ({safeReady.length})
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {safeReady.map((order) => (
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
            <section className="space-y-4" aria-label="Mesas del Restaurante">
              <TableSelector
                selectedTableId={selectedTable?.id}
                onSelectTable={(table) => {
                  setSelectedTable(table);
                  setTableActionError(null);
                }}
              />
            </section>
          </>
        )}
      </main>

      {/* Modal Popup de Mesa Seleccionada */}
      {selectedTable && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTable(null)}
          role="presentation"
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="table-modal-title"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700 shadow-xs">
                  <TableIcon className="w-6 h-6 text-brand-700" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 id="table-modal-title" className="text-xl font-medium text-slate-800">
                    Mesa {selectedTable.code}
                  </h3>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-normal ${
                      selectedTable.state === 'LIBRE'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : selectedTable.state === 'OCUPADA'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {selectedTable.state}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTable(null)}
                className="bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-700 rounded-full p-1.5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center font-normal text-base cursor-pointer"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            {tableActionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl" aria-live="polite">
                {tableActionError}
              </div>
            )}

            {/* Acciones según estado de mesa */}
            <div className="space-y-3">
              {/* Botón Principal: Tomar Pedido */}
              <button
                type="button"
                onClick={() => handleStartOrderForTable(selectedTable)}
                className="w-full py-3.5 px-4 bg-brand-500 hover:bg-brand-400 active:bg-brand-300 text-brand-950 rounded-2xl text-sm font-medium min-h-[48px] shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Tomar Pedido para Mesa {selectedTable.code}</span>
              </button>

              {/* Pedidos activos de esta mesa */}
              {tableActiveOrders.length > 0 && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-xs font-medium text-slate-700 uppercase tracking-wider block">
                    Comandas activas en esta mesa ({tableActiveOrders.length}):
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {tableActiveOrders.map((ord) => (
                      <div key={ord.id} className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-slate-200">
                        <div>
                          <span className="font-medium text-slate-900">#{ord.orderNumber}</span>
                          <span className="text-slate-500 ml-2">({ord.items.length} platos)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-normal px-2 py-0.5 rounded ${
                            ord.status === 'LISTO' ? 'bg-emerald-100 text-emerald-800' : 'bg-brand-100 text-brand-800'
                          }`}>
                            {ord.status}
                          </span>
                          <Link
                            to={`/mozo/pedidos/${ord.id}`}
                            className="text-brand-700 hover:text-brand-800 font-medium underline px-1 py-1 min-h-[44px] flex items-center"
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
                <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200 space-y-3">
                  <div>
                    <h4 className="text-xs font-medium text-rose-900 uppercase tracking-wider">Cierre de Sesión de Mesa</h4>
                    <p className="text-xs text-rose-700">Todos los pedidos han sido entregados. Puedes liberar la mesa.</p>
                  </div>

                  <input
                    type="text"
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder="Observaciones de cierre (ej. Limpia y desinfectada)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs min-h-[44px] bg-white"
                  />

                  <button
                    type="button"
                    onClick={handleCloseSession}
                    disabled={isClosingTable}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-medium min-h-[44px] disabled:opacity-50 cursor-pointer"
                  >
                    {isClosingTable ? 'Cerrando mesa...' : 'Liberar Mesa'}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedTable(null)}
                className="w-full py-2.5 text-xs font-normal text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors min-h-[44px] cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Contenedor de Toasts con aria-live */}
      <ToastContainer />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialRole="MOZO"
      />
    </div>
  );
};

export default WaiterDashboardPage;
