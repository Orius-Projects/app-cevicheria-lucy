import { useEffect, useRef, useMemo } from 'react';
import { useKitchenStore } from '../stores/kitchenStore';
import { useRealtimeStore } from '../stores/realtimeStore';
import { useRealtimeConnection, useRealtimeEvents } from './useRealtimeConnection';
import { getSocket } from '../api/socket';
import { EventEnvelope } from '@cevicheria/shared';

export interface UseKitchenEventsOptions {
  pollingIntervalMs?: number;
  enabled?: boolean;
}

export function useKitchenEvents(options: UseKitchenEventsOptions = {}) {
  const { pollingIntervalMs = 10000, enabled = true } = options;

  const loadBoard = useKitchenStore((state) => state.loadBoard);
  const applyEvent = useKitchenStore((state) => state.applyEvent);
  const setConnection = useKitchenStore((state) => state.setConnection);
  const realtimeStatus = useRealtimeStore((state) => state.status);

  // Mantiene la conexión del socket en directo
  useRealtimeConnection();

  // Sincroniza el estado de conexión del realtimeStore al kitchenStore
  useEffect(() => {
    if (realtimeStatus === 'connected') {
      setConnection('connected');
    } else if (realtimeStatus === 'connecting') {
      setConnection('reconnecting');
    } else {
      setConnection('disconnected');
    }
  }, [realtimeStatus, setConnection]);

  // Suscripción a eventos de cocina
  const handlers = useMemo(
    () => ({
      'order:created': (envelope: EventEnvelope<any>) => {
        const order = envelope.payload?.order;
        if (order) {
          applyEvent({ event: 'order:created', order });
        }
      },
      'order:ready': (envelope: EventEnvelope<any>) => {
        const order = envelope.payload?.order;
        if (order) {
          applyEvent({ event: 'order:ready', order });
        }
      },
      'order:delivered': (envelope: EventEnvelope<any>) => {
        const order = envelope.payload?.order;
        if (order) {
          applyEvent({ event: 'order:delivered', order });
        }
      },
      'order:cancelled': (envelope: EventEnvelope<any>) => {
        const order = envelope.payload?.order;
        if (order) {
          applyEvent({ event: 'order:cancelled', order });
        }
      },
      'order:manual-closed': (envelope: EventEnvelope<any>) => {
        const order = envelope.payload?.order;
        if (order) {
          applyEvent({ event: 'order:cancelled', order });
        }
      }
    }),
    [applyEvent]
  );

  useRealtimeEvents(handlers);

  // Sincronización REST del tablero y resync al reconectar o volver del background
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    // Carga inicial
    loadBoard();

    const socket = getSocket();
    const handleSocketConnect = () => {
      loadBoard();
    };
    socket.on('connect', handleSocketConnect);

    const handleFocusOrOnline = () => {
      loadBoard();
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
  }, [enabled, loadBoard]);

  // Polling dinámico: 60 s conectado; fallback (10 s) desconectado
  useEffect(() => {
    if (!enabled) return;

    const currentInterval = realtimeStatus === 'connected' ? 60000 : pollingIntervalMs;

    timerRef.current = setInterval(() => {
      loadBoard();
    }, currentInterval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [enabled, realtimeStatus, pollingIntervalMs, loadBoard]);
}

export default useKitchenEvents;
