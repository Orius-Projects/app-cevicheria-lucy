import { useEffect, useRef } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '../api/socket';
import { useAuthStore } from '../stores/authStore';
import { useRealtimeStore } from '../stores/realtimeStore';
import { defaultDeduplicator, EventDeduplicator } from '../utils/realtimeDedupe';
import { EventEnvelope } from '@cevicheria/shared';

/**
 * Hook para gestionar el ciclo de vida de la conexión del socket en directo.
 * Conecta al autenticarse, desconecta al cerrar sesión y expone el estado de conexión.
 */
export function useRealtimeConnection() {
  const { token, isAuthenticated, logout } = useAuthStore();
  const { status, lastEventAt, lastError, setStatus, setLastError } = useRealtimeStore();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnectSocket();
      setStatus('disconnected');
      return;
    }

    const socket = connectSocket();

    const onConnect = () => {
      setStatus('connected');
      setLastError(null);
    };

    const onConnecting = () => {
      setStatus('connecting');
    };

    const onDisconnect = () => {
      setStatus('disconnected');
    };

    const onConnectError = (err: any) => {
      const code = err?.data?.code || err?.message || 'UNKNOWN';
      setStatus('error');
      setLastError(err?.message || 'Error de conexión');

      if (code === 'UNAUTHORIZED' || code === 'TOKEN_EXPIRED') {
        logout();
      }
    };

    const onReconnectAttempt = () => {
      setStatus('connecting');
    };

    // Si ya está conectado al montar
    if (socket.connected) {
      setStatus('connected');
    } else {
      setStatus('connecting');
    }

    socket.on('connect', onConnect);
    socket.on('connecting', onConnecting);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('reconnect_attempt', onReconnectAttempt);

    return () => {
      socket.off('connect', onConnect);
      socket.off('connecting', onConnecting);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('reconnect_attempt', onReconnectAttempt);
    };
  }, [token, isAuthenticated, logout, setStatus, setLastError]);

  return {
    status,
    lastEventAt,
    lastError
  };
}

export type EventHandlersMap = Record<
  string,
  (envelope: EventEnvelope<any>) => void
>;

/**
 * Hook para suscribirse a eventos del socket con deduplicación y control de versión automáticos.
 */
export function useRealtimeEvents(
  handlers: EventHandlersMap,
  deduplicator: EventDeduplicator = defaultDeduplicator
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket = getSocket();

    const eventNames = Object.keys(handlersRef.current);
    const wrappedListeners: Array<{ event: string; fn: (envelope: any) => void }> = [];

    eventNames.forEach((eventName) => {
      const listener = (envelope: EventEnvelope<any>) => {
        // Verificar si es un sobre de evento válido
        if (!envelope || !envelope.eventId) {
          // Si no tiene envelope, pasarlo directamente si el handler lo espera
          const handler = handlersRef.current[eventName];
          if (handler) handler(envelope);
          return;
        }

        // Deduplicación por eventId y versión
        if (!deduplicator.shouldProcess(envelope)) {
          return;
        }

        useRealtimeStore.getState().setLastEventAt(new Date(envelope.occurredAt || Date.now()));

        const handler = handlersRef.current[eventName];
        if (handler) {
          handler(envelope);
        }
      };

      socket.on(eventName, listener);
      wrappedListeners.push({ event: eventName, fn: listener });
    });

    return () => {
      wrappedListeners.forEach(({ event, fn }) => {
        socket.off(event, fn);
      });
    };
  }, [deduplicator]);
}
