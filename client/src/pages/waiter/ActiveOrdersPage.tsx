import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useOrdersStore } from '../../stores/ordersStore';
import { useShiftStore } from '../../stores/shiftStore';
import { useOrderEvents } from '../../hooks/useOrderEvents';
import { OrderStatusBadge } from '../../components/mozo/OrderStatusBadge';
import { CancelOrderModal } from '../../components/mozo/CancelOrderModal';
import { ConnectionBanner } from '../../components/common/ConnectionBanner';
import { ShiftClosedView } from '../../components/common/ShiftClosedView';
import { UserMenuDropdown } from '../../components/common/UserMenuDropdown';
import { NotificationCenter } from '../../components/notifications/NotificationCenter';
import { ToastContainer } from '../../components/notifications/ToastContainer';
import { formatLimaTime } from '../../utils/datetime';
import { formatSoles } from '../../utils/money';
import { OrderDTO } from '@cevicheria/shared';

export const ActiveOrdersPage: React.FC = () => {
  const { user } = useAuthStore();
  const { active, deliverOrder, cancelOrder, refreshAll, loading, error, clearError } = useOrdersStore();
  const { isOpen: isShiftOpen, currentShift, fetchCurrentShift } = useShiftStore();

  useOrderEvents({ pollingIntervalMs: 15000 });

  useEffect(() => {
    fetchCurrentShift();
  }, [fetchCurrentShift]);

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ENVIADO' | 'LISTO'>('ALL');
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<OrderDTO | null>(null);

  const filteredOrders = active.filter((o) => {
    if (activeFilter === 'ALL') return true;
    return o.status === activeFilter;
  });

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-marine-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Banner de estado de conexión */}
      <ConnectionBanner />

      {/* Header */}
      <header className="bg-white dark:bg-marine-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex flex-wrap justify-between items-center gap-2 shadow-sm sticky top-0 z-40">
        <div className="flex items-center space-x-3 min-w-0">
          <Link
            to="/mozo"
            className="text-xs px-3 py-2 min-h-[44px] bg-slate-100 dark:bg-marine-800 hover:bg-slate-200 dark:hover:bg-marine-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl flex items-center border border-slate-200 dark:border-slate-700 shrink-0"
          >
            ← Salón
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-slate-900 dark:text-slate-100 truncate">Comandas Activas</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {user?.displayName} • Todos los pedidos en preparación o listos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => refreshAll()}
            title="Refrescar lista"
            aria-label="Refrescar lista"
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-marine-800 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors shadow-xs cursor-pointer"
          >
            <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
            </svg>
          </button>

          <NotificationCenter variant="light" />
          <UserMenuDropdown />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Error banner */}
        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-medium rounded-2xl flex justify-between items-center" aria-live="polite">
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
            {/* Filtros */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold min-h-[44px] transition-all ${
              activeFilter === 'ALL'
                ? 'bg-brand-500 text-brand-950 shadow-sm'
                : 'bg-white dark:bg-marine-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-marine-800'
            }`}
          >
            Todos ({active.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('LISTO')}
            className={`px-4 py-2 rounded-xl text-xs font-bold min-h-[44px] transition-all flex items-center space-x-1.5 ${
              activeFilter === 'LISTO'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white dark:bg-marine-900 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <span>🔔 Listos para Recoger</span>
            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 px-1.5 py-0.5 rounded-full text-[10px]">
              {active.filter((o) => o.status === 'LISTO').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('ENVIADO')}
            className={`px-4 py-2 rounded-xl text-xs font-bold min-h-[44px] transition-all ${
              activeFilter === 'ENVIADO'
                ? 'bg-brand-500 text-brand-950 shadow-sm'
                : 'bg-white dark:bg-marine-900 text-brand-800 dark:text-brand-300 border border-brand-200 dark:border-slate-700 hover:bg-brand-50 dark:hover:bg-marine-800'
            }`}
          >
            En Cocina ({active.filter((o) => o.status === 'ENVIADO').length})
          </button>
        </div>

        {/* Lista de Comandas */}
        {loading && active.length === 0 ? (
          <div className="text-center py-16 text-slate-400">Cargando comandas activas...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-marine-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
            <span className="text-3xl block">📋</span>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">No hay comandas activas</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeFilter === 'ALL'
                ? 'No hay pedidos en preparación o por entregar en este momento.'
                : 'No hay pedidos con el filtro seleccionado.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const isReady = order.status === 'LISTO';
              const isDelivering = deliveringId === order.id;

              return (
                <div
                  key={order.id}
                  data-testid="active-order-item"
                  data-order-id={order.id}
                  className={`bg-white dark:bg-marine-900 rounded-2xl border p-4 sm:p-5 shadow-sm space-y-4 transition-all ${
                    isReady ? 'border-emerald-300 dark:border-emerald-600/80 bg-emerald-50/20 dark:bg-marine-900 shadow-md' : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xl font-black text-slate-900 dark:text-slate-100">Mesa {order.tableCode}</span>
                        <span className="text-xs font-bold text-slate-400">#{order.orderNumber}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Tomado por: <strong>{order.takenByName}</strong> • Enviado a las {formatLimaTime(order.enviadoEn)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>

                  {/* Lista de platos */}
                  <div className="bg-slate-50 dark:bg-marine-950 rounded-xl p-3 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{item.quantity}×</span>{' '}
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{item.dishName}</span>
                          {item.variations && item.variations.length > 0 && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                              Variaciones: {item.variations.map((v) => v.name).join(', ')}
                            </span>
                          )}
                          {item.notes && (
                            <span className="text-[11px] text-amber-700 dark:text-amber-400 italic block">
                              Nota: "{item.notes}"
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{formatSoles(item.lineTotalCents)}</span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-amber-50/50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-800 italic">
                      Nota comanda: "{order.notes}"
                    </p>
                  )}

                  {/* Barra inferior: Total y Acciones */}
                  <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-xs">
                      <span className="text-slate-400 uppercase tracking-wider block text-[10px]">Total</span>
                      <span className="text-base font-black text-brand-700 dark:text-brand-400">{formatSoles(order.totalCents)}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setCancellingOrder(order)}
                        className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-marine-800 min-h-[44px]"
                      >
                        Cancelar Comanda
                      </button>

                      {isReady && (
                        <button
                          type="button"
                          onClick={() => handleDeliver(order)}
                          disabled={isDelivering}
                          className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black min-h-[44px] shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
                        >
                          <span>{isDelivering ? 'Entregando...' : '✓ Entregar a Mesa'}</span>
                        </button>
                      )}

                      <Link
                        to={`/mozo/pedidos/${order.id}`}
                        className="px-3.5 py-2 bg-slate-100 dark:bg-marine-800 hover:bg-slate-200 dark:hover:bg-marine-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold min-h-[44px] flex items-center"
                      >
                        Detalle →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </>
        )}
      </main>

      {/* Modal de Cancelación */}
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
    </div>
  );
};

export default ActiveOrdersPage;
