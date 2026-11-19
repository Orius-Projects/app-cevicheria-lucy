import mongoose from 'mongoose';
import { Shift, ShiftSummary, Order, TableSession, MenuItem, MenuDay, ManualRecord } from '../models';
import { AuthUserPayload } from '../middlewares/auth';
import { ConflictError, NotFoundError, ValidationError } from '../middlewares/error';
import { emitShiftClosed } from '../realtime';

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
 * Helper para recolectar las métricas y agregados del turno (en vivo o para snapshot).
 */
export async function buildShiftSummaryData(shift: any): Promise<{
  soldDishes: any[];
  remainingRations: any[];
  soldOutDishes: any[];
  cancellations: any[];
  manualRecords: any[];
  manualTotalCents: number;
  totalAmountCents: number;
}> {
  // 1. Platos vendidos en pedidos entregados de este turno
  const deliveredOrders = await Order.find({
    shiftId: shift._id,
    status: 'ENTREGADO'
  });

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

  // 2. Cancelaciones de este turno
  const cancelledOrders = await Order.find({
    shiftId: shift._id,
    status: 'CANCELADO'
  });

  const cancellations = cancelledOrders.map((order) => ({
    orderNumber: order.orderNumber,
    reason: order.cancelReason || 'Sin motivo especificado',
    cancelledBy: order.cancelledByName || 'Mozo'
  }));

  // 3. Raciones restantes y platos agotados
  const menuDay = await MenuDay.findOne({ date: shift.date });
  const menuItems = menuDay
    ? await MenuItem.find({ menuDayId: menuDay._id, active: true })
    : await MenuItem.find({ active: true });

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

  // 4. Registros manuales PAPER asociados a este turno
  const rawManualRecords = await ManualRecord.find({ shiftId: shift._id }).sort({ createdAt: 1 });
  const manualRecords = rawManualRecords.map((rec) => ({
    id: rec._id.toString(),
    tableCode: rec.tableCode,
    items: rec.items.map((it) => ({
      name: it.name,
      quantity: it.quantity,
      amountCents: it.amountCents
    })),
    totalCents: rec.totalCents,
    notes: rec.notes || '',
    source: rec.source || 'PAPER',
    createdBy: rec.createdBy,
    createdAt: rec.createdAt
  }));

  const manualTotalCents = manualRecords.reduce((acc, r) => acc + (r.totalCents || 0), 0);

  return {
    soldDishes: Array.from(dishSalesMap.values()),
    remainingRations,
    soldOutDishes,
    cancellations,
    manualRecords,
    manualTotalCents,
    totalAmountCents
  };
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

  // 3. Genera datos para el resumen de turno
  const data = await buildShiftSummaryData(shift);
  const now = new Date();
  const obsText = observations !== undefined ? observations : (shift.notes || '');

  // Crea el snapshot inmutable en shiftSummaries
  const summary = await ShiftSummary.create({
    shiftId: shift._id,
    generatedAt: now,
    generatedBy: new mongoose.Types.ObjectId(user.id),
    soldDishes: data.soldDishes,
    remainingRations: data.remainingRations,
    soldOutDishes: data.soldOutDishes,
    cancellations: data.cancellations,
    manualRecords: data.manualRecords,
    manualTotalCents: data.manualTotalCents,
    totalAmountCents: data.totalAmountCents,
    observations: obsText,
    closedAt: now
  });

  // Actualiza el turno a CERRADO
  shift.status = 'CERRADO';
  shift.closedBy = new mongoose.Types.ObjectId(user.id);
  shift.closedAt = now;
  if (observations !== undefined) {
    shift.notes = observations;
  }
  await shift.save();

  // Emite evento realtime shift:closed (spec 005 / 006)
  emitShiftClosed({
    shiftId: shift._id.toString(),
    date: shift.date,
    label: shift.label,
    closedBy: {
      id: user.id,
      name: user.displayName,
      role: user.role
    }
  });

  return {
    shiftId: shift._id.toString(),
    date: shift.date,
    label: shift.label,
    soldDishes: summary.soldDishes,
    remainingRations: summary.remainingRations,
    soldOutDishes: summary.soldOutDishes,
    cancellations: summary.cancellations,
    manualRecords: summary.manualRecords || [],
    manualTotalCents: summary.manualTotalCents || 0,
    totalAmountCents: summary.totalAmountCents,
    observations: summary.observations,
    closedAt: summary.closedAt
  };
}

/**
 * T039: Obtiene el resumen de un turno (preview en vivo si ABIERTO o snapshot si CERRADO).
 */
export async function getShiftSummary(shiftId: string): Promise<any> {
  const shift = await Shift.findById(shiftId);
  if (!shift) {
    throw new NotFoundError('Turno no encontrado');
  }

  if (shift.status === 'CERRADO') {
    const summary = await ShiftSummary.findOne({ shiftId: shift._id });
    if (!summary) {
      throw new NotFoundError('El resumen de turno no ha sido generado');
    }

    return {
      shiftId: shift._id.toString(),
      date: shift.date,
      label: shift.label,
      soldDishes: summary.soldDishes,
      remainingRations: summary.remainingRations,
      soldOutDishes: summary.soldOutDishes,
      cancellations: summary.cancellations,
      manualRecords: summary.manualRecords || [],
      manualTotalCents:
        summary.manualTotalCents ??
        (summary.manualRecords || []).reduce((acc: number, r: any) => acc + (r.totalCents || 0), 0),
      totalAmountCents: summary.totalAmountCents,
      observations: summary.observations || '',
      closedAt: summary.closedAt
    };
  }

  // Si el turno está ABIERTO, calcula el preview en vivo
  const data = await buildShiftSummaryData(shift);

  return {
    shiftId: shift._id.toString(),
    date: shift.date,
    label: shift.label,
    soldDishes: data.soldDishes,
    remainingRations: data.remainingRations,
    soldOutDishes: data.soldOutDishes,
    cancellations: data.cancellations,
    manualRecords: data.manualRecords,
    manualTotalCents: data.manualTotalCents,
    totalAmountCents: data.totalAmountCents,
    observations: shift.notes || '',
    closedAt: null
  };
}

export interface CreateManualRecordItemInput {
  name?: string;
  dishName?: string;
  quantity: number;
  amountCents: number;
}

export interface CreateManualRecordInput {
  tableCode: string;
  items: CreateManualRecordItemInput[];
  totalCents?: number;
  notes?: string;
  note?: string;
}

/**
 * Registra pedidos atendidos manualmente en papel (PAPER) durante falla del sistema.
 */
export async function createManualRecord(
  shiftId: string,
  data: CreateManualRecordInput,
  user: AuthUserPayload
): Promise<any> {
  const shift = await Shift.findById(shiftId);
  if (!shift) {
    throw new NotFoundError('Turno no encontrado');
  }

  if (shift.status === 'CERRADO') {
    throw new ConflictError('No se pueden agregar registros manuales a un turno cerrado');
  }

  if (!data.tableCode || data.tableCode.trim().length === 0) {
    throw new ValidationError('El código de mesa es obligatorio');
  }

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    throw new ValidationError('Debe incluir al menos un ítem en el registro manual');
  }

  const items = data.items.map((it) => {
    const name = (it.name || it.dishName || '').trim();
    if (!name) {
      throw new ValidationError('El nombre del plato/ítem es obligatorio');
    }
    if (!Number.isInteger(it.quantity) || it.quantity < 1) {
      throw new ValidationError('La cantidad debe ser un número entero mayor o igual a 1');
    }
    if (!Number.isInteger(it.amountCents) || it.amountCents < 0) {
      throw new ValidationError('El monto en centavos debe ser un entero mayor o igual a 0');
    }
    return {
      name,
      quantity: it.quantity,
      amountCents: it.amountCents
    };
  });

  const totalCents =
    typeof data.totalCents === 'number'
      ? data.totalCents
      : items.reduce((sum, it) => sum + it.amountCents, 0);

  const notes = (data.notes || data.note || '').trim();

  const record = await ManualRecord.create({
    shiftId: shift._id,
    tableCode: data.tableCode.trim(),
    items,
    totalCents,
    notes,
    source: 'PAPER',
    createdBy: new mongoose.Types.ObjectId(user.id)
  });

  return record;
}

/**
 * Lista los registros manuales de un turno.
 */
export async function getManualRecords(shiftId: string): Promise<any[]> {
  const shift = await Shift.findById(shiftId);
  if (!shift) {
    throw new NotFoundError('Turno no encontrado');
  }

  const records = await ManualRecord.find({ shiftId: shift._id }).sort({ createdAt: 1 });
  return records;
}

