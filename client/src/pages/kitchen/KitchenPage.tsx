import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useKitchenStore } from '../../stores/kitchenStore';
import { useShiftStore } from '../../stores/shiftStore';
import { useKitchenEvents } from '../../hooks/useKitchenEvents';
import { ShiftClosedView } from '../../components/common/ShiftClosedView';
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

  const {
    currentShift,
    isOpen: isShiftOpen,
    fetchCurrentShift,
    isLoading: isShiftLoading
  } = useShiftStore();

  useEffect(() => {
    fetchCurrentShift();
  }, [fetchCurrentShift]);

  useKitchenEvents({ pollingIntervalMs: 10000 });

  const [markingOrderId, setMarkingOrderId] = useState<string | null>(null);

  const handleMarkReady = async (order: OrderDTO) => {
    if (!isShiftOpen) return;
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
    <div className="min-h-screen bg-brand-50/30 dark:bg-marine-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
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
        onRefresh={() => {
          fetchCurrentShift();
          loadBoard();
        }}
        onLogout={logout}
        userDisplayName={user?.displayName || 'Cocinero'}
        isShiftOpen={isShiftOpen}
      />

      {/* Banner de error */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="bg-rose-50 border-b border-rose-200 px-4 py-3 text-rose-800 text-xs font-bold flex justify-between items-center"
        >
          <div className="flex items-center space-x-2">
            <svg
              className="w-4 h-4 text-rose-600 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="text-rose-600 hover:text-rose-800 px-2 py-1 font-bold text-sm min-h-[44px]"
          >
            Cerrar ×
          </button>
        </div>
      )}

      {/* Si el turno está cerrado, bloquea toda ejecución y muestra vista de Turno Finalizado */}
      {!isShiftOpen ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex items-center justify-center">
          <ShiftClosedView
            role="COCINERO"
            shiftLabel={currentShift?.label}
            shiftDate={currentShift?.date}
            onRefresh={() => {
              fetchCurrentShift();
              loadBoard();
            }}
            isLoading={isShiftLoading}
          />
        </main>
      ) : (
        /* Contenedor Principal: 2 columnas en Tablet y Desktop (Pendientes a la izq, Listos a la der) */
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
      )}
    </div>
  );
};

export default KitchenPage;
