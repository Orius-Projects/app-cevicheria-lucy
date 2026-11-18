import mongoose from 'mongoose';
import { Table, TableSession, Order } from '../models';
import { AuthUserPayload } from '../middlewares/auth';
import { ConflictError, NotFoundError } from '../middlewares/error';
import { TableStatus } from '@cevicheria/shared';

export interface TableItemResponse {
  id: string;
  code: string;
  zone?: string;
  seats?: number;
  state: TableStatus;
  openSessionId: string | null;
}

/**
 * Deriva el estado de una mesa en base a su sesión abierta y pedidos activos.
 */
export async function getDerivedTableState(tableId: mongoose.Types.ObjectId): Promise<{
  state: TableStatus;
  openSession: any | null;
}> {
  const openSession = await TableSession.findOne({
    tableId,
    status: 'ABIERTA'
  });

  if (!openSession) {
    return { state: 'LIBRE', openSession: null };
  }

  const activeOrdersCount = await Order.countDocuments({
    tableSessionId: openSession._id,
    status: { $in: ['ENVIADO', 'LISTO'] }
  });

  if (activeOrdersCount > 0) {
    return { state: 'OCUPADA', openSession };
  }

  return { state: 'POR_CERRAR', openSession };
}

/**
 * Lista todas las mesas activas con su estado derivado según rest-api.md §6.
 */
export async function listTablesWithStatus(): Promise<TableItemResponse[]> {
  const tables = await Table.find({ active: true }).sort({ code: 1 });

  const result: TableItemResponse[] = [];

  for (const table of tables) {
    const { state, openSession } = await getDerivedTableState(
      table._id as mongoose.Types.ObjectId
    );
    result.push({
      id: table._id.toString(),
      code: table.code,
      zone: table.zone,
      seats: table.seats,
      state,
      openSessionId: openSession ? openSession._id.toString() : null
    });
  }

  return result;
}

/**
 * Obtiene el detalle de una mesa, su sesión abierta y pedidos asociados.
 */
export async function getTableDetail(tableId: string): Promise<any> {
  const table = await Table.findById(tableId);
  if (!table || !table.active) {
    throw new NotFoundError('Mesa no encontrada');
  }

  const { state, openSession } = await getDerivedTableState(
    table._id as mongoose.Types.ObjectId
  );

  let orders: any[] = [];
  if (openSession) {
    orders = await Order.find({ tableSessionId: openSession._id }).sort({ enviadoEn: 1 });
  }

  return {
    id: table._id.toString(),
    code: table.code,
    zone: table.zone,
    seats: table.seats,
    state,
    openSession: openSession
      ? {
          id: openSession._id.toString(),
          openedAt: openSession.openedAt,
          openedBy: openSession.openedBy
        }
      : null,
    orders
  };
}

/**
 * T030: Asegura la apertura de una sesión de mesa al enviar el primer pedido.
 * El índice parcial único en TableSession previene dos sesiones ABIERTAS simultáneas.
 */
export async function ensureOpenTableSession(
  tableId: string | mongoose.Types.ObjectId,
  shiftId: string | mongoose.Types.ObjectId,
  user: AuthUserPayload
): Promise<any> {
  const tableObjectId = typeof tableId === 'string' ? new mongoose.Types.ObjectId(tableId) : tableId;
  const shiftObjectId = typeof shiftId === 'string' ? new mongoose.Types.ObjectId(shiftId) : shiftId;

  // Busca sesión abierta existente
  let session = await TableSession.findOne({
    tableId: tableObjectId,
    status: 'ABIERTA'
  });

  if (session) {
    return session;
  }

  const table = await Table.findById(tableObjectId);
  if (!table || !table.active) {
    throw new ConflictError('Mesa inactiva o inexistente', 'TABLE_INACTIVE');
  }

  try {
    session = await TableSession.create({
      tableId: tableObjectId,
      tableCode: table.code,
      shiftId: shiftObjectId,
      status: 'ABIERTA',
      openedBy: new mongoose.Types.ObjectId(user.id),
      openedAt: new Date()
    });
    return session;
  } catch (error: any) {
    // Si hubo concurrencia y ya se abrió la sesión, recupera la abierta
    if (error.code === 11000) {
      session = await TableSession.findOne({
        tableId: tableObjectId,
        status: 'ABIERTA'
      });
      if (session) return session;
    }
    throw error;
  }
}

/**
 * T031: Cierra una sesión de mesa. Falla con 409 TABLE_HAS_ACTIVE_ORDERS si hay pedidos activos.
 */
export async function closeTableSession(
  sessionId: string,
  user: AuthUserPayload,
  notes?: string
): Promise<any> {
  const session = await TableSession.findById(sessionId);
  if (!session) {
    throw new NotFoundError('Sesión de mesa no encontrada');
  }

  if (session.status === 'CERRADA') {
    throw new ConflictError('La sesión de mesa ya se encuentra cerrada');
  }

  // Verifica pedidos activos (ENVIADO o LISTO)
  const activeOrdersCount = await Order.countDocuments({
    tableSessionId: session._id,
    status: { $in: ['ENVIADO', 'LISTO'] }
  });

  if (activeOrdersCount > 0) {
    throw new ConflictError(
      'No se puede cerrar la mesa: existen pedidos activos en cocina o listos para entrega',
      'TABLE_HAS_ACTIVE_ORDERS'
    );
  }

  session.status = 'CERRADA';
  session.closedBy = new mongoose.Types.ObjectId(user.id);
  session.closedAt = new Date();
  if (notes) {
    session.notes = notes;
  }
  await session.save();

  return session;
}
