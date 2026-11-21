import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useOrdersStore } from '../../stores/ordersStore';
import { OrderStatusBadge } from '../../components/mozo/OrderStatusBadge';
import { CancelOrderModal } from '../../components/mozo/CancelOrderModal';
import { ConnectionBanner } from '../../components/common/ConnectionBanner';
import { NotificationCenter } from '../../components/notifications/NotificationCenter';
import { ToastContainer } from '../../components/notifications/ToastContainer';
import { useOrderEvents } from '../../hooks/useOrderEvents';
import { formatLima } from '../../utils/datetime';
import { formatSoles } from '../../utils/money';
import { OrderDTO } from '@cevicheria/shared';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { detail, fetchById, deliverOrder, cancelOrder, loading, error, clearError } = useOrdersStore();

  useOrderEvents({ pollingIntervalMs: 15000 });

  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [isDelivering, setIsDelivering] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchById(id).then((ord) => setOrder(ord)).catch(() => {});
    }
  }, [id, fetchById]);

  // Sincronizar si cambia en store
  useEffect(() => {
    if (id && detail[id]) {
      setOrder(detail[id]);
    }
  }, [id, detail]);

  const handleDeliver = async () => {
    if (!order) return;
    setIsDelivering(true);
    clearError();
    try {
      const updated = await deliverOrder(order.id, order.version);
      setOrder(updated);
    } catch {
      // Error manejado en store
    } finally {
      setIsDelivering(false);
    }
  };

  if (loading && !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-400">
        Cargando detalle del pedido...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 space-y-4">
        <p className="text-slate-600 font-bold">No se encontró el pedido solicitado.</p>
        <Link to="/mozo/pedidos" className="text-brand-700 underline text-sm font-semibold">
          ← Volver a Comandas Activas
        </Link>
      </div>
    );
  }

  const isReady = order.status === 'LISTO';
  const isActive = order.status === 'ENVIADO' || order.status === 'LISTO';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Banner de estado de conexión */}
      <ConnectionBanner />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex flex-wrap justify-between items-center gap-2 shadow-sm">
        <div className="flex items-center space-x-3 min-w-0">
          <Link
            to="/mozo/pedidos"
            className="text-xs px-3 py-2 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center border border-slate-200 shrink-0"
          >
            ← Comandas
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-slate-900 truncate">
              Pedido #{order.orderNumber} • Mesa {order.tableCode}
            </h1>
            <p className="text-xs text-slate-500 truncate">{user?.displayName} ({user?.role})</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <NotificationCenter />
          <OrderStatusBadge status={order.status} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-2xl flex justify-between items-center" aria-live="polite">
            <span>{error}</span>
            <button onClick={clearError} className="font-bold text-rose-600 ml-2">×</button>
          </div>
        )}

        {/* Resumen de Comanda */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
            Platos de la Comanda
          </h2>

          <div className="divide-y divide-slate-100">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-3 flex justify-between items-start text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-sm text-slate-900">
                    <span className="text-brand-700 font-black">{item.quantity}×</span> {item.dishName}
                  </div>
                  <div className="text-slate-500">
                    Sección: {item.sectionName} • {formatSoles(item.unitPriceCents)} c/u
                  </div>

                  {item.variations && item.variations.length > 0 && (
                    <p className="text-[11px] text-slate-600">
                      <strong>Variaciones:</strong> {item.variations.map((v) => v.name).join(', ')}
                    </p>
                  )}

                  {item.notes && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200 italic inline-block">
                      Nota: "{item.notes}"
                    </p>
                  )}
                </div>

                <span className="font-bold text-sm text-slate-900">
                  {formatSoles(item.lineTotalCents)}
                </span>
              </div>
            ))}
          </div>

          {order.notes && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Nota General de Comanda:</span>
              <p className="text-slate-800 italic">"{order.notes}"</p>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-700">Total Comanda</span>
            <span className="text-2xl font-black text-brand-700">{formatSoles(order.totalCents)}</span>
          </div>
        </div>

        {/* Historial de Auditoría de Estados */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
            Trazabilidad y Ciclo de Vida
          </h2>

          <div className="space-y-3">
            {/* Enviado */}
            <div className="flex items-start space-x-3 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500 mt-1" />
              <div>
                <p className="font-bold text-slate-900">Enviado a cocina</p>
                <p className="text-slate-500">
                  Por {order.takenByName} a las {formatLima(order.enviadoEn)}
                </p>
              </div>
            </div>

            {/* Listo */}
            {order.listoEn && (
              <div className="flex items-start space-x-3 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1" />
                <div>
                  <p className="font-bold text-slate-900">Listo para entrega</p>
                  <p className="text-slate-500">
                    Marcado por {order.readyByName || 'Cocina'} a las {formatLima(order.listoEn)}
                  </p>
                </div>
              </div>
            )}

            {/* Entregado */}
            {order.entregadoEn && (
              <div className="flex items-start space-x-3 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 mt-1" />
                <div>
                  <p className="font-bold text-slate-900">Servido y Entregado en Mesa</p>
                  <p className="text-slate-500">
                    Entregado por {order.deliveredByName || 'Mozo'} a las {formatLima(order.entregadoEn)}
                  </p>
                </div>
              </div>
            )}

            {/* Cancelado */}
            {order.canceladoEn && (
              <div className="flex items-start space-x-3 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1" />
                <div>
                  <p className="font-bold text-rose-700">Cancelado</p>
                  <p className="text-slate-500">
                    Por {order.cancelledByName || 'Personal'} a las {formatLima(order.canceladoEn)}
                  </p>
                  {order.cancelReason && (
                    <p className="text-rose-900 bg-rose-50 p-2 rounded-lg border border-rose-200 mt-1 italic">
                      Motivo: "{order.cancelReason}"
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        {isActive && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap justify-end gap-3 shadow-sm">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(true)}
              className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 min-h-[44px]"
            >
              Cancelar Comanda
            </button>

            {isReady && (
              <button
                type="button"
                onClick={handleDeliver}
                disabled={isDelivering}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-black min-h-[44px] shadow-sm disabled:opacity-50"
              >
                {isDelivering ? 'Entregando...' : '✓ Entregar a Mesa'}
              </button>
            )}
          </div>
        )}
      </main>

      {/* Modal de Cancelación */}
      {isCancelModalOpen && (
        <CancelOrderModal
          isOpen={true}
          order={order}
          onClose={() => setIsCancelModalOpen(false)}
          onConfirm={async (reason) => {
            const updated = await cancelOrder(order.id, reason, order.version);
            setOrder(updated);
            setIsCancelModalOpen(false);
          }}
        />
      )}

      {/* Contenedor de Toasts con aria-live */}
      <ToastContainer />
    </div>
  );
};

export default OrderDetailPage;
