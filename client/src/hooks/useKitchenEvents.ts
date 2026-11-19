import { useEffect, useRef } from 'react';
import { useKitchenStore } from '../stores/kitchenStore';

export interface UseKitchenEventsOptions {
  pollingIntervalMs?: number;
  enabled?: boolean;
}

export function useKitchenEvents(options: UseKitchenEventsOptions = {}) {
  const { pollingIntervalMs = 10000, enabled = true } = options;
  const loadBoard = useKitchenStore((state) => state.loadBoard);
  const setConnection = useKitchenStore((state) => state.setConnection);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    // Carga inicial
    loadBoard();

    // Polling recurrente (10s por defecto)
    timerRef.current = setInterval(() => {
      loadBoard();
    }, pollingIntervalMs);

    const handleFocusOrOnline = () => {
      setConnection('connected');
      loadBoard();
    };

    const handleOffline = () => {
      setConnection('disconnected');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocusOrOnline);
      window.addEventListener('online', handleFocusOrOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocusOrOnline);
        window.removeEventListener('online', handleFocusOrOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [enabled, pollingIntervalMs, loadBoard, setConnection]);
}

export default useKitchenEvents;
