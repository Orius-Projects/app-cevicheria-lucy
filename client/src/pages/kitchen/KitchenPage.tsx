import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useKitchenStore } from '../../stores/kitchenStore';
import { useKitchenEvents } from '../../hooks/useKitchenEvents';
import {
  KitchenHeader,
  KitchenConnectionBanner,
  PendingColumn,
  ReadyColumn
} from '../../components/cocina';
import { OrderDTO } from '@cevicheria/shared';

export const KitchenPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const {
    pending,
    ready,
    error,
    connection,
    announcement,
    recentOrderIds,
    loadBoard,
    markReady,
    clearError
  } = useKitchenStore();

  useKitchenEvents({ pollingIntervalMs: 10000 });

  const [markingOrderId, setMarkingOrderId] = useState<string | null>(null);

  const handleMarkReady = async (order: OrderDTO) => {
    if (markingOrderId === order.id) return;
    setMarkingOrderId(order.id);
    clearError();
    try {
      await markReady(order.id, order.version);
    } catch {
      // Error manejado en store
    } finally {
      setMarkingOrderId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Región accesible aria-live para anuncios de voz y lectores de pantalla */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Banner de estado de conexión */}
      <KitchenConnectionBanner connection={connection} onRetry={loadBoard} />

      {/* Cabecera de cocina con contadores */}
      <KitchenHeader
        pendingCount={pending.length}
        readyCount={ready.length}
        connection={connection}
        onRefresh={loadBoard}
        onLogout={logout}
        userDisplayName={user?.displayName || 'Cocinero'}
      />

      {/* Banner de error */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="bg-rose-950/90 border-b border-rose-700 px-4 py-3 text-rose-200 text-xs font-bold flex justify-between items-center"
        >
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="text-rose-400 hover:text-white px-2 py-1 font-bold text-sm min-h-[44px]"
          >
            Cerrar ×
          </button>
        </div>
      )}

      {/* Contenedor Principal: 2 columnas en Tablet y Desktop (Pendientes a la izq, Listos a la der) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 xl:col-span-8">
          <PendingColumn
            orders={pending}
            markingOrderId={markingOrderId}
            recentOrderIds={recentOrderIds}
            onMarkReady={handleMarkReady}
          />
        </div>

        <div className="lg:col-span-5 xl:col-span-4">
          <ReadyColumn orders={ready} />
        </div>
      </main>
    </div>
  );
};

export default KitchenPage;
