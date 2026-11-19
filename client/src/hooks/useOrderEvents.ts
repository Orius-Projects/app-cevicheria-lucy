import { useEffect, useRef, useMemo } from 'react';
import { useOrdersStore } from '../stores/ordersStore';
import { useTablesStore } from '../stores/tablesStore';
import { useMenuPublicStore } from '../stores/menuPublicStore';
import { useShiftStore } from '../stores/shiftStore';
import { useNotificationsStore } from '../stores/notificationsStore';
import { useRealtimeStore } from '../stores/realtimeStore';
import { useRealtimeConnection, useRealtimeEvents } from './useRealtimeConnection';
import { getSocket } from '../api/socket';
import { EventEnvelope } from '@cevicheria/shared';

export interface UseOrderEventsOptions {
  pollingIntervalMs?: number;
  enabled?: boolean;
}

export function useOrderEvents(options: UseOrderEventsOptions = {}) {
  const { pollingIntervalMs = 15000, enabled = true } = options;

  const refreshAllOrders = useOrdersStore((state) => state.refreshAll);
  const applyOrderEvent = useOrdersStore((state) => state.applyOrderEvent);
  const fetchTables = useTablesStore((state) => state.fetchTables);
  const applyAvailabilityEvent = useMenuPublicStore((state) => state.applyAvailabilityEvent);
  const markClosed = useShiftStore((state) => state.markClosed);
  const pushNotification = useNotificationsStore((state) => state.push);
  const realtimeStatus = useRealtimeStore((state) => state.status);

  // Mantiene el ciclo de vida del socket
  useRealtimeConnection();

  // Handlers de eventos en vivo
  const handlers = useMemo(
    () => ({
      'order:created': (envelope: EventEnvelope<any>) => {
        const order = envelope.payload?.order;
        if (order) {
          applyOrderEvent(order);
          fetchTables();
        }
      },
      'order:ready': (envelope: EventEnvelope<any>) => {
        const order = envelope.payload?.order;
        if (order) {
          applyOrderEvent(order);
          fetchTables();
          pushNotification({
            eventId: envelope.eventId,
            type: 'order:ready',
            message: `¡Pedido #${order.orderNumber} para Mesa ${order.tableCode} está LISTO para recoger!`,
            orderId: order.id,
            tableCode: order.tableCode,
            orderNumber: order.orderNumber,
            createdAt: envelope.occurredAt
          });
        }
      },
      'order:delivered': (envelope: EventEnvelope<any>) => {
        const order = envelope.payload?.order;
        if (order) {
          applyOrderEvent(order);
          fetchTables();
        }
      },
      'order:cancelled': (envelope: EventEnvelope<any>) => {
        const order = envelope.payload?.order;
        if (order) {
          applyOrderEvent(order);
          fetchTables();
          pushNotification({
            eventId: envelope.eventId,
            type: 'order:cancelled',
            message: `Pedido #${order.orderNumber} (Mesa ${order.tableCode}) ha sido cancelado.`,
            orderId: order.id,
            tableCode: order.tableCode,
            orderNumber: order.orderNumber,
            createdAt: envelope.occurredAt
          });
        }
      },
      'order:manual-closed': (envelope: EventEnvelope<any>) => {
        const order = envelope.payload?.order;
        if (order) {
          applyOrderEvent(order);
          fetchTables();
        }
      },
      'menu:availability-changed': (envelope: EventEnvelope<any>) => {
        const p = envelope.payload;
        if (p && p.menuItemId) {
          applyAvailabilityEvent({
            menuItemId: p.menuItemId,
            dishId: p.dishId,
            dishName: p.dishName,
            remainingRations: p.remainingRations,
            manuallySoldOut: p.manuallySoldOut,
            status: p.state
          });
        }
      },
      'shift:closed': (envelope: EventEnvelope<any>) => {
        markClosed();
        pushNotification({
          eventId: envelope.eventId,
          type: 'shift:closed',
          message: 'El turno actual ha sido cerrado por el encargado. No se pueden enviar nuevos pedidos.',
          createdAt: envelope.occurredAt
        });
      }
    }),
    [applyOrderEvent, fetchTables, applyAvailabilityEvent, markClosed, pushNotification]
  );

  useRealtimeEvents(handlers);

  // Sincronización REST y gestión de Polling fallback
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    const resyncAll = () => {
      refreshAllOrders();
      fetchTables();
    };

    // Sincronización inicial
    resyncAll();

    // Al reconectar el socket ('connect'), resincronizar inmediatamente
    const socket = getSocket();
    const handleSocketConnect = () => {
      resyncAll();
    };
    socket.on('connect', handleSocketConnect);

    // Al volver del background o recuperar conexión del navegador
    const handleFocusOrOnline = () => {
      resyncAll();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocusOrOnline);
      window.addEventListener('online', handleFocusOrOnline);
    }

    return () => {
      socket.off('connect', handleSocketConnect);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocusOrOnline);
        window.removeEventListener('online', handleFocusOrOnline);
      }
    };
  }, [enabled, refreshAllOrders, fetchTables]);

  // Polling dinámico: 60 s cuando el socket está conectado; fallback (15 s) si está desconectado
  useEffect(() => {
    if (!enabled) return;

    const currentInterval = realtimeStatus === 'connected' ? 60000 : pollingIntervalMs;

    timerRef.current = setInterval(() => {
      refreshAllOrders();
      fetchTables();
    }, currentInterval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [enabled, realtimeStatus, pollingIntervalMs, refreshAllOrders, fetchTables]);
}

export default useOrderEvents;
