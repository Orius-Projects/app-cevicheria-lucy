import { describe, it, expect, beforeEach } from 'vitest';
import { EventDeduplicator } from '../utils/realtimeDedupe';
import { useNotificationsStore } from '../stores/notificationsStore';

describe('Realtime Deduplication & Version Control (Spec 005)', () => {
  let deduplicator: EventDeduplicator;

  beforeEach(() => {
    deduplicator = new EventDeduplicator(500);
    useNotificationsStore.getState().clearAll();
  });

  it('same eventId processed twice -> second is discarded (dedupe)', () => {
    const envelope = {
      eventId: 'evt-1001',
      version: 1,
      orderId: 'ord-1'
    };

    const firstResult = deduplicator.shouldProcess(envelope);
    expect(firstResult).toBe(true);

    const secondResult = deduplicator.shouldProcess(envelope);
    expect(secondResult).toBe(false);
  });

  it('older or equal version for same orderId is ignored', () => {
    // Evento v2 recibido
    const v2 = {
      eventId: 'evt-v2',
      version: 2,
      orderId: 'ord-1'
    };
    expect(deduplicator.shouldProcess(v2)).toBe(true);

    // Evento v1 desfasado para el mismo orderId
    const v1Delayed = {
      eventId: 'evt-v1-delayed',
      version: 1,
      orderId: 'ord-1'
    };
    expect(deduplicator.shouldProcess(v1Delayed)).toBe(false);

    // Evento v2 duplicado con diferente eventId
    const v2Duplicate = {
      eventId: 'evt-v2-dup',
      version: 2,
      orderId: 'ord-1'
    };
    expect(deduplicator.shouldProcess(v2Duplicate)).toBe(false);

    // Evento v3 más reciente
    const v3 = {
      eventId: 'evt-v3',
      version: 3,
      orderId: 'ord-1'
    };
    expect(deduplicator.shouldProcess(v3)).toBe(true);
  });

  it('processes 1 000 distinct events without duplicate count, keeping bounded memory Set (<= 500)', () => {
    let processedCount = 0;

    for (let i = 1; i <= 1000; i++) {
      const envelope = {
        eventId: `evt-unique-${i}`,
        version: i,
        orderId: `ord-${i}`
      };
      if (deduplicator.shouldProcess(envelope)) {
        processedCount++;
      }
    }

    // Todos los 1 000 eventos únicos fueron procesados
    expect(processedCount).toBe(1000);

    // La memoria del Set está acotada a un máximo de 500 elementos
    expect(deduplicator.getSeenCount()).toBeLessThanOrEqual(500);
    expect(deduplicator.getSeenCount()).toBe(500);

    // Los últimos eventos siguen estando registrados
    expect(deduplicator.shouldProcess({ eventId: 'evt-unique-1000' })).toBe(false);
  });

  it('notificationsStore deduplicates toasts by eventId (same eventId -> single toast)', () => {
    const store = useNotificationsStore.getState();

    store.push({
      eventId: 'evt-toast-1',
      type: 'order:ready',
      message: 'Pedido #101 para Mesa M-01 está LISTO',
      playSound: false
    });

    // Enviar el mismo evento nuevamente
    store.push({
      eventId: 'evt-toast-1',
      type: 'order:ready',
      message: 'Pedido #101 para Mesa M-01 está LISTO',
      playSound: false
    });

    const currentToasts = useNotificationsStore.getState().toasts;
    expect(currentToasts).toHaveLength(1);
    expect(useNotificationsStore.getState().unreadCount).toBe(1);
  });
});
