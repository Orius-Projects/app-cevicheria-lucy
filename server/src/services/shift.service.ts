import mongoose from 'mongoose';
import { Shift, ShiftSummary, Order, TableSession, MenuItem } from '../models';
import { AuthUserPayload } from '../middlewares/auth';
import { ConflictError, NotFoundError } from '../middlewares/error';

function getTodayLimaDate(): string {
  // Retorna fecha actual en zona America/Lima en formato YYYY-MM-DD
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now);
}

/**
 * T036: Abre un nuevo turno. Solo puede haber un turno ABIERTO a la vez.
 */
export async function openShift(
  data: { date?: string; label: string },
  user: AuthUserPayload
): Promise<any> {
  const openShift = await Shift.findOne({ status: 'ABIERTO' });
  if (openShift) {
    throw new ConflictError('Ya existe un turno abierto', 'SHIFT_ALREADY_OPEN');
  }

  const shiftDate = data.date && data.date.trim().length > 0 ? data.date.trim() : getTodayLimaDate();
  const label = data.label.trim();

  // Verifica que no exista otro turno con la misma fecha y etiqueta
  const existingWithLabel = await Shift.findOne({ date: shiftDate, label });
  if (existingWithLabel) {
    throw new ConflictError(
      `Ya existe un turno registrado para la fecha ${shiftDate} con la etiqueta '${label}'`,
      'CONFLICT'
    );
  }

  const newShift = await Shift.create({
    date: shiftDate,
    label,
    status: 'ABIERTO',
    openedBy: new mongoose.Types.ObjectId(user.id),
    openedAt: new Date()
  });

  return newShift;
}

/**
 * T037: Retorna el turno abierto actual o lanza 404 si no hay ninguno.
 */
export async function getCurrentShift(): Promise<any> {
  const shift = await Shift.findOne({ status: 'ABIERTO' });
  if (!shift) {
    throw new NotFoundError('No hay ningún turno abierto actualmente');
  }

  return {
    id: shift._id.toString(),
    date: shift.date,
    label: shift.label,
    status: shift.status,
    openedAt: shift.openedAt
  };
}

/**
 * Helper para validar la existencia de un turno abierto al crear pedidos.
 * Lanza 409 SHIFT_NOT_OPEN si no hay turno abierto.
 */
export async function assertOpenShift(): Promise<any> {
  const shift = await Shift.findOne({ status: 'ABIERTO' });
  if (!shift) {
    throw new ConflictError('No hay turno abierto para registrar pedidos', 'SHIFT_NOT_OPEN');
  }
  return shift;
}

/**
 * T038: Cierra un turno, valida pedidos y mesas abiertas, y genera el resumen.
 */
export async function closeShift(
  shiftId: string,
  user: AuthUserPayload,
  observations?: string
): Promise<any> {
  const shift = await Shift.findById(shiftId);
  if (!shift) {
    throw new NotFoundError('Turno no encontrado');
  }

  if (shift.status === 'CERRADO') {
    throw new ConflictError('El turno ya se encuentra cerrado');
  }

  // 1. Verifica pedidos pendientes o listos sin entregar
  const activeOrdersCount = await Order.countDocuments({
    shiftId: shift._id,
    status: { $in: ['ENVIADO', 'LISTO'] }
  });

  if (activeOrdersCount > 0) {
    throw new ConflictError(
      'Existen pedidos pendientes o listos sin entregar',
      'OPEN_ORDERS_REMAIN'
    );
  }

  // 2. Verifica mesas con sesión abierta en este turno
  const openSessionsCount = await TableSession.countDocuments({
    shiftId: shift._id,
    status: 'ABIERTA'
  });

  if (openSessionsCount > 0) {
    throw new ConflictError(
      'Existen mesas con sesión abierta en este turno',
      'OPEN_TABLES_REMAIN'
    );
  }

  // 3. Genera datos para el resumen de turno (T039)
  const deliveredOrders = await Order.find({
    shiftId: shift._id,
    status: 'ENTREGADO'
  });

  // Agrupa platos vendidos
  const dishSalesMap = new Map<
    string,
    { dishId: mongoose.Types.ObjectId; dishName: string; quantity: number; amountCents: number }
  >();

  let totalAmountCents = 0;

  for (const order of deliveredOrders) {
    for (const item of order.items) {
      const key = item.dishId.toString();
      const current = dishSalesMap.get(key) || {
        dishId: new mongoose.Types.ObjectId(item.dishId),
        dishName: item.dishName,
        quantity: 0,
        amountCents: 0
      };
      current.quantity += item.quantity;
      current.amountCents += item.lineTotalCents;
      dishSalesMap.set(key, current);
      totalAmountCents += item.lineTotalCents;
    }
  }

  // Agrupa cancelaciones
  const cancelledOrders = await Order.find({
    shiftId: shift._id,
    status: 'CANCELADO'
  });

  const cancellations = cancelledOrders.map((order) => ({
    orderNumber: order.orderNumber,
    reason: order.cancelReason || 'Sin motivo especificado',
    cancelledBy: order.cancelledByName || 'Mozo'
  }));

  // Raciones restantes y platos agotados (de los items del menú del día si existen)
  const menuItems = await MenuItem.find({ active: true });
  const remainingRations: any[] = [];
  const soldOutDishes: any[] = [];

  for (const mItem of menuItems) {
    if (mItem.hasRationsLimit && mItem.remainingRations !== null && mItem.remainingRations !== undefined) {
      remainingRations.push({
        dishId: mItem.dishId,
        dishName: mItem.dishName,
        remainingRations: mItem.remainingRations
      });
    }
    if (mItem.manuallySoldOut || (mItem.hasRationsLimit && mItem.remainingRations === 0)) {
      soldOutDishes.push({
        dishId: mItem.dishId,
        dishName: mItem.dishName,
        reason: mItem.soldOutReason || 'Raciones agotadas'
      });
    }
  }

  const now = new Date();

  // Crea el snapshot en shiftSummaries
  const summary = await ShiftSummary.create({
    shiftId: shift._id,
    generatedAt: now,
    generatedBy: new mongoose.Types.ObjectId(user.id),
    soldDishes: Array.from(dishSalesMap.values()),
    remainingRations,
    soldOutDishes,
    cancellations,
    totalAmountCents,
    observations: observations || '',
    closedAt: now
  });

  // Actualiza el turno a CERRADO
  shift.status = 'CERRADO';
  shift.closedBy = new mongoose.Types.ObjectId(user.id);
  shift.closedAt = now;
  if (observations) {
    shift.notes = observations;
  }
  await shift.save();

  return {
    shiftId: shift._id.toString(),
    date: shift.date,
    label: shift.label,
    soldDishes: summary.soldDishes,
    remainingRations: summary.remainingRations,
    soldOutDishes: summary.soldOutDishes,
    cancellations: summary.cancellations,
    totalAmountCents: summary.totalAmountCents,
    observations: summary.observations,
    closedAt: summary.closedAt
  };
}

/**
 * T039: Obtiene el resumen de un turno cerrado.
 */
export async function getShiftSummary(shiftId: string): Promise<any> {
  const shift = await Shift.findById(shiftId);
  if (!shift) {
    throw new NotFoundError('Turno no encontrado');
  }

  const summary = await ShiftSummary.findOne({ shiftId: shift._id });
  if (!summary) {
    throw new NotFoundError('El resumen de turno no ha sido generado o el turno sigue abierto');
  }

  return {
    shiftId: shift._id.toString(),
    date: shift.date,
    label: shift.label,
    soldDishes: summary.soldDishes,
    remainingRations: summary.remainingRations,
    soldOutDishes: summary.soldOutDishes,
    cancellations: summary.cancellations,
    totalAmountCents: summary.totalAmountCents,
    observations: summary.observations,
    closedAt: summary.closedAt
  };
}
