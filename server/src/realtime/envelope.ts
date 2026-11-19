import crypto from 'crypto';

export interface EnvelopeOptions<T = any> {
  type: string;
  version: number;
  orderId?: string | null;
  payload: T;
  occurredAt?: string;
  eventId?: string;
}

export interface EventEnvelope<T = any> {
  eventId: string;
  type: string;
  occurredAt: string;
  version: number;
  schemaVersion: 2;
  orderId: string | null;
  payload: T;
}

/**
 * Construye el sobre de evento canónico según contracts/events.md §3.
 */
export function buildEnvelope<T = any>(options: EnvelopeOptions<T>): EventEnvelope<T> {
  return {
    eventId: options.eventId || crypto.randomUUID(),
    type: options.type,
    occurredAt: options.occurredAt || new Date().toISOString(),
    version: options.version,
    schemaVersion: 2,
    orderId: options.orderId ?? null,
    payload: options.payload
  };
}
