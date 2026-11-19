import { useEffect, useRef } from 'react';
import { useOrdersStore } from '../stores/ordersStore';
import { useTablesStore } from '../stores/tablesStore';

export interface UseOrderEventsOptions {
  pollingIntervalMs?: number;
  enabled?: boolean;
}

export function useOrderEvents(options: UseOrderEventsOptions = {}) {
  const { pollingIntervalMs = 15000, enabled = true } = options;
  const refreshAllOrders = useOrdersStore((state) => state.refreshAll);
  const fetchTables = useTablesStore((state) => state.fetchTables);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    // Sincronización inicial
    refreshAllOrders();
    fetchTables();

    // Polling periódico fallback (15s por defecto)
    timerRef.current = setInterval(() => {
      refreshAllOrders();
      fetchTables();
    }, pollingIntervalMs);

    const handleFocusOrOnline = () => {
      refreshAllOrders();
      fetchTables();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocusOrOnline);
      window.addEventListener('online', handleFocusOrOnline);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocusOrOnline);
        window.removeEventListener('online', handleFocusOrOnline);
      }
    };
  }, [enabled, pollingIntervalMs, refreshAllOrders, fetchTables]);
}

export default useOrderEvents;
