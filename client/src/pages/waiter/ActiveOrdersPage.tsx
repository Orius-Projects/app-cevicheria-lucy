import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useOrdersStore } from '../../stores/ordersStore';
import { useOrderEvents } from '../../hooks/useOrderEvents';
import { OrderStatusBadge } from '../../components/mozo/OrderStatusBadge';
import { CancelOrderModal } from '../../components/mozo/CancelOrderModal';
import { ConnectionBanner } from '../../components/common/ConnectionBanner';
import { NotificationCenter } from '../../components/notifications/NotificationCenter';
import { ToastContainer } from '../../components/notifications/ToastContainer';
import { formatLimaTime } from '../../utils/datetime';
import { formatSoles } from '../../utils/money';
import { OrderDTO } from '@cevicheria/shared';

export const ActiveOrdersPage: React.FC = () => {
  const { user } = useAuthStore();
  const { active, deliverOrder, cancelOrder, refreshAll, loading, error, clearError } = useOrdersStore();

  useOrderEvents({ pollingIntervalMs: 15000 });

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Banner de estado de conexión */}
      <ConnectionBanner />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex justify-between items-center shadow-sm sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <Link
            to="/mozo"
            className="text-xs px-3 py-2 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center border border-slate-200"
          >
            ← Salón
          </Link>
          <div>
            <h1 className="text-lg font-black text-slate-900">Comandas Activas</h1>
            <p className="text-xs text-slate-500">
              {user?.displayName} • Todos los pedidos en preparación o listos
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <NotificationCenter />

          <Link
            to="/mozo/pedido/nuevo"
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold min-h-[44px] flex items-center shadow-sm"
          >
            + Nueva Comanda
          </Link>

          <button
            type="button"
            onClick={() => refreshAll()}
            title="Refrescar lista"
            className="p-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 font-bold"
          >
            ↻
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Error banner */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-2xl flex justify-between items-center" aria-live="polite">
            <span>{error}</span>
            <button onClick={clearError} className="font-bold text-rose-600 ml-2">×</button>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold min-h-[44px] transition-all ${
              activeFilter === 'ALL'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Todos ({active.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('LISTO')}
            className={`px-4 py-2 rounded-xl text-xs font-bold min-h-[44px] transition-all flex items-center space-x-1.5 ${
              activeFilter === 'LISTO'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50'
            }`}
          >
            <span>🔔 Listos para Recoger</span>
            <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded-full text-[10px]">
              {active.filter((o) => o.status === 'LISTO').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('ENVIADO')}
            className={`px-4 py-2 rounded-xl text-xs font-bold min-h-[44px] transition-all ${
              activeFilter === 'ENVIADO'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-blue-800 border border-blue-200 hover:bg-blue-50'
            }`}
          >
            En Cocina ({active.filter((o) => o.status === 'ENVIADO').length})
          </button>
        </div>

        {/* Lista de Comandas */}
        {loading && active.length === 0 ? (
          <div className="text-center py-16 text-slate-400">Cargando comandas activas...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
            <span className="text-3xl block">📋</span>
            <h3 className="font-bold text-slate-800 text-base">No hay comandas activas</h3>
            <p className="text-xs text-slate-500">
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
                  className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm space-y-4 transition-all ${
                    isReady ? 'border-emerald-300 bg-emerald-50/20 shadow-md' : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xl font-black text-slate-900">Mesa {order.tableCode}</span>
                        <span className="text-xs font-bold text-slate-400">#{order.orderNumber}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Tomado por: <strong>{order.takenByName}</strong> • Enviado a las {formatLimaTime(order.enviadoEn)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>

                  {/* Lista de platos */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-slate-900">{item.quantity}×</span>{' '}
                          <span className="font-semibold text-slate-800">{item.dishName}</span>
                          {item.variations && item.variations.length > 0 && (
                            <span className="text-[11px] text-slate-500 block">
                              Variaciones: {item.variations.map((v) => v.name).join(', ')}
                            </span>
                          )}
                          {item.notes && (
                            <span className="text-[11px] text-amber-700 italic block">
                              Nota: "{item.notes}"
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-slate-700">{formatSoles(item.lineTotalCents)}</span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <p className="text-xs text-slate-600 bg-amber-50/50 p-2 rounded-lg border border-amber-200 italic">
                      Nota comanda: "{order.notes}"
                    </p>
                  )}

                  {/* Barra inferior: Total y Acciones */}
                  <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t border-slate-100">
                    <div className="text-xs">
                      <span className="text-slate-400 uppercase tracking-wider block text-[10px]">Total</span>
                      <span className="text-base font-black text-brand-700">{formatSoles(order.totalCents)}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setCancellingOrder(order)}
                        className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 min-h-[44px]"
                      >
                        Cancelar Comanda
                      </button>

                      {isReady && (
                        <button
                          type="button"
                          onClick={() => handleDeliver(order)}
                          disabled={isDelivering}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black min-h-[44px] shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
                        >
                          <span>{isDelivering ? 'Entregando...' : '✓ Entregar a Mesa'}</span>
                        </button>
                      )}

                      <Link
                        to={`/mozo/pedidos/${order.id}`}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold min-h-[44px] flex items-center"
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
