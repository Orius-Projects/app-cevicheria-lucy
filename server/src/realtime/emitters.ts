import { getIO } from './socket';
import { buildEnvelope } from './envelope';
import {
  ROOM_ROLE_MOZO,
  ROOM_ROLE_COCINERO,
  ROOM_ROLE_ENCARGADO,
  ALL_ROLES_ROOMS
} from './rooms';
import { logger } from '../config/logger';

export interface ChangedByPayload {
  id: string;
  name: string;
  role: string;
}

/**
 * Limpia campos de auditoría interna y credenciales del snapshot de orden según spec 005.
 */
export function cleanOrderSnapshot(order: any): any {
  if (!order) return order;
  const raw = typeof order.toObject === 'function' ? order.toObject() : { ...order };
  const {
    statusHistory: _statusHistory,
    clientRequestId: _clientRequestId,
    passwordHash: _passwordHash,
    __v,
    ...rest
  } = raw;
  return rest;
}

/**
 * 5.1 order:created
 * Salas: role:COCINERO, role:MOZO, role:ENCARGADO
 */
export function emitOrderCreated(
  order: any,
  changedBy: ChangedByPayload
): void {
  const io = getIO();
  if (!io) return;

  try {
    const envelope = buildEnvelope({
      type: 'order:created',
      version: order.version ?? 0,
      orderId: order.id || order._id?.toString(),
      payload: {
        order: cleanOrderSnapshot(order),
        previousStatus: null,
        changedBy
      }
    });

    io.to([ROOM_ROLE_COCINERO, ROOM_ROLE_MOZO, ROOM_ROLE_ENCARGADO]).emit(
      'order:created',
      envelope
    );
  } catch (error: any) {
    logger.error(`EMIT_FAILED: Error al emitir order:created - ${error.message}`);
  }
}

/**
 * 5.2 order:ready
 * Salas: role:MOZO, role:COCINERO, role:ENCARGADO
 */
export function emitOrderReady(
  order: any,
  changedBy: ChangedByPayload
): void {
  const io = getIO();
  if (!io) return;

  try {
    const envelope = buildEnvelope({
      type: 'order:ready',
      version: order.version,
      orderId: order.id || order._id?.toString(),
      payload: {
        order: cleanOrderSnapshot(order),
        previousStatus: 'ENVIADO',
        changedBy
      }
    });

    io.to([ROOM_ROLE_MOZO, ROOM_ROLE_COCINERO, ROOM_ROLE_ENCARGADO]).emit(
      'order:ready',
      envelope
    );
  } catch (error: any) {
    logger.error(`EMIT_FAILED: Error al emitir order:ready - ${error.message}`);
  }
}

/**
 * 5.3 order:delivered
 * Salas: role:COCINERO, role:MOZO, role:ENCARGADO
 */
export function emitOrderDelivered(
  order: any,
  changedBy: ChangedByPayload
): void {
  const io = getIO();
  if (!io) return;

  try {
    const envelope = buildEnvelope({
      type: 'order:delivered',
      version: order.version,
      orderId: order.id || order._id?.toString(),
      payload: {
        order: cleanOrderSnapshot(order),
        previousStatus: 'LISTO',
        changedBy
      }
    });

    io.to([ROOM_ROLE_COCINERO, ROOM_ROLE_MOZO, ROOM_ROLE_ENCARGADO]).emit(
      'order:delivered',
      envelope
    );
  } catch (error: any) {
    logger.error(`EMIT_FAILED: Error al emitir order:delivered - ${error.message}`);
  }
}

/**
 * 5.4 order:cancelled
 * Salas: role:COCINERO, role:MOZO, role:ENCARGADO
 */
export function emitOrderCancelled(
  order: any,
  previousStatus: string,
  changedBy: ChangedByPayload
): void {
  const io = getIO();
  if (!io) return;

  try {
    const envelope = buildEnvelope({
      type: 'order:cancelled',
      version: order.version,
      orderId: order.id || order._id?.toString(),
      payload: {
        order: cleanOrderSnapshot(order),
        previousStatus,
        changedBy
      }
    });

    io.to([ROOM_ROLE_COCINERO, ROOM_ROLE_MOZO, ROOM_ROLE_ENCARGADO]).emit(
      'order:cancelled',
      envelope
    );
  } catch (error: any) {
    logger.error(`EMIT_FAILED: Error al emitir order:cancelled - ${error.message}`);
  }
}

/**
 * 5.5 order:manual-closed (P2)
 * Salas: role:COCINERO, role:MOZO, role:ENCARGADO
 */
export function emitOrderManualClosed(
  order: any,
  previousStatus: string,
  changedBy: ChangedByPayload
): void {
  const io = getIO();
  if (!io) return;

  try {
    const envelope = buildEnvelope({
      type: 'order:manual-closed',
      version: order.version,
      orderId: order.id || order._id?.toString(),
      payload: {
        order: cleanOrderSnapshot(order),
        previousStatus,
        changedBy
      }
    });

    io.to([ROOM_ROLE_COCINERO, ROOM_ROLE_MOZO, ROOM_ROLE_ENCARGADO]).emit(
      'order:manual-closed',
      envelope
    );
  } catch (error: any) {
    logger.error(`EMIT_FAILED: Error al emitir order:manual-closed - ${error.message}`);
  }
}

/**
 * 5.6 menu:availability-changed
 * Salas: role:MOZO, role:ENCARGADO, role:COCINERO
 */
export interface MenuAvailabilityChangedPayload {
  menuDayId: string;
  menuItemId: string;
  dishId: string;
  dishName: string;
  state: string;
  remainingRations?: number | null;
  manuallySoldOut: boolean;
  changeType:
    | 'RATION_DECREMENT'
    | 'REPLENISH'
    | 'ADJUSTMENT'
    | 'SOLD_OUT'
    | 'REACTIVATE'
    | 'CANCELLATION_REVERSAL';
  changedBy: ChangedByPayload;
  version?: number;
}

export function emitMenuAvailabilityChanged(
  data: MenuAvailabilityChangedPayload
): void {
  const io = getIO();
  if (!io) return;

  try {
    const envelope = buildEnvelope({
      type: 'menu:availability-changed',
      version: data.version ?? 0,
      orderId: null,
      payload: {
        menuDayId: data.menuDayId,
        menuItemId: data.menuItemId,
        dishId: data.dishId,
        dishName: data.dishName,
        state: data.state,
        remainingRations: data.remainingRations ?? null,
        manuallySoldOut: data.manuallySoldOut,
        changeType: data.changeType,
        changedBy: data.changedBy
      }
    });

    io.to([ROOM_ROLE_MOZO, ROOM_ROLE_ENCARGADO, ROOM_ROLE_COCINERO]).emit(
      'menu:availability-changed',
      envelope
    );
  } catch (error: any) {
    logger.error(`EMIT_FAILED: Error al emitir menu:availability-changed - ${error.message}`);
  }
}

/**
 * 5.7 shift:closed
 * Salas: todas
 */
export interface ShiftClosedPayload {
  shiftId: string;
  date: string;
  label: string;
  closedBy: ChangedByPayload;
  version?: number;
}

export function emitShiftClosed(data: ShiftClosedPayload): void {
  const io = getIO();
  if (!io) return;

  try {
    const envelope = buildEnvelope({
      type: 'shift:closed',
      version: data.version ?? 1,
      orderId: null,
      payload: {
        shiftId: data.shiftId,
        date: data.date,
        label: data.label,
        closedBy: data.closedBy
      }
    });

    io.to(ALL_ROLES_ROOMS).emit('shift:closed', envelope);
  } catch (error: any) {
    logger.error(`EMIT_FAILED: Error al emitir shift:closed - ${error.message}`);
  }
}
