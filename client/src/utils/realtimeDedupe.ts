/**
 * Gestor de deduplicación de eventos y control de versiones por comanda.
 * Satisface los requerimientos de la spec 005:
 * - Deduplicación por eventId mediante un Set acotado a 500 elementos.
 * - Descarte de eventos con versión <= a la última conocida para un mismo orderId.
 */
export class EventDeduplicator {
  private seenEventIds: Set<string>;
  private knownOrderVersions: Map<string, number>;
  private maxSeenSize: number;

  constructor(maxSeenSize = 500) {
    this.seenEventIds = new Set();
    this.knownOrderVersions = new Map();
    this.maxSeenSize = maxSeenSize;
  }

  /**
   * Evalúa si un evento recibido debe procesarse o descartarse.
   * Retorna true si el evento es nuevo y válido.
   * Retorna false si es un duplicado o versión obsoleta.
   */
  shouldProcess(envelope: {
    eventId: string;
    version?: number;
    orderId?: string | null;
  }): boolean {
    if (!envelope || !envelope.eventId) return false;

    // 1. Deduplicación por eventId
    if (this.seenEventIds.has(envelope.eventId)) {
      return false;
    }

    // 2. Control de versión por comanda
    if (envelope.orderId && envelope.version !== undefined && envelope.version !== null) {
      const prevVersion = this.knownOrderVersions.get(envelope.orderId);
      if (prevVersion !== undefined && envelope.version <= prevVersion) {
        return false;
      }
      this.knownOrderVersions.set(envelope.orderId, envelope.version);
    }

    // Registrar eventId visto
    this.seenEventIds.add(envelope.eventId);

    // Mantener el Set acotado (eliminar el más antiguo FIFO)
    if (this.seenEventIds.size > this.maxSeenSize) {
      const oldest = this.seenEventIds.values().next().value;
      if (oldest) {
        this.seenEventIds.delete(oldest);
      }
    }

    return true;
  }

  reset(): void {
    this.seenEventIds.clear();
    this.knownOrderVersions.clear();
  }

  getSeenCount(): number {
    return this.seenEventIds.size;
  }

  getKnownVersion(orderId: string): number | undefined {
    return this.knownOrderVersions.get(orderId);
  }
}

export const defaultDeduplicator = new EventDeduplicator(500);
