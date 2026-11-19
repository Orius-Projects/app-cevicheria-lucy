import mongoose from 'mongoose';
import {
  Order,
  Counter,
  MenuItem,
  Dish,
  MenuDay,
  Table,
  Shift,
  RationAdjustment
} from '../models';
import { assertOpenShift } from './shift.service';
import { ensureOpenTableSession } from './table.service';
import { AuthUserPayload } from '../middlewares/auth';
import { ConflictError, NotFoundError, ValidationError } from '../middlewares/error';
import { ORDER_NOTES_MAX_LENGTH, ITEM_NOTES_MAX_LENGTH, deriveDishStatus } from '@cevicheria/shared';
import {
  emitOrderCreated,
  emitOrderReady,
  emitOrderDelivered,
  emitOrderCancelled,
  emitOrderManualClosed,
  emitMenuAvailabilityChanged
} from '../realtime';

export interface CreateOrderItemInput {
  dishId: string;
  quantity: number;
  variationIds?: string[];
  notes?: string;
}

export interface CreateOrderInput {
  tableId: string;
  items: CreateOrderItemInput[];
  notes?: string;
  clientRequestId?: string;
}

/**
 * T053–T056: Pipeline canónico de creación de pedido según data-model.md §6.
 */
export async function createOrder(
  data: CreateOrderInput,
  user: AuthUserPayload
): Promise<{ order: any; isIdempotent: boolean }> {
  // 1. Idempotencia: Si clientRequestId ya fue procesado, devuelve el pedido existente
  if (data.clientRequestId && data.clientRequestId.trim().length > 0) {
    const existingOrder = await Order.findOne({ clientRequestId: data.clientRequestId.trim() });
    if (existingOrder) {
      return { order: formatOrderResponse(existingOrder), isIdempotent: true };
    }
  }

  // 2. Verificar turno ABIERTO
  const shift = await assertOpenShift();

  // 3. Verificar mesa activa y obtener/abrir sesión
  const table = await Table.findById(data.tableId);
  if (!table || !table.active) {
    throw new ConflictError('Mesa inactiva o inexistente', 'TABLE_INACTIVE');
  }

  const tableSession = await ensureOpenTableSession(table._id, shift._id, user);

  // 4. Verificar menú PUBLICADO para la fecha del turno
  const menuDay = await MenuDay.findOne({
    date: shift.date,
    status: 'PUBLICADO'
  });

  if (!menuDay) {
    throw new ConflictError(
      `No hay menú publicado para la fecha del turno (${shift.date})`,
      'MENU_NOT_PUBLISHED'
    );
  }

  // 5. Validar ítems, cantidades y notas
  if (!data.items || data.items.length === 0) {
    throw new ValidationError('El pedido debe incluir al menos un ítem');
  }

  if (data.notes && data.notes.length > ORDER_NOTES_MAX_LENGTH) {
    throw new ValidationError(
      `Las notas del pedido no pueden exceder ${ORDER_NOTES_MAX_LENGTH} caracteres`
    );
  }

  // Prepara y valida cada ítem con el menú y catálogo de platos
  const validatedItems: any[] = [];
  const itemsToDiscount: Array<{
    menuItemId: mongoose.Types.ObjectId;
    dishId: mongoose.Types.ObjectId;
    quantity: number;
  }> = [];

  let totalCents = 0;

  for (const itemInput of data.items) {
    if (!itemInput.quantity || itemInput.quantity < 1 || !Number.isInteger(itemInput.quantity)) {
      throw new ValidationError('La cantidad de cada ítem debe ser un número entero mayor o igual a 1');
    }

    if (itemInput.notes && itemInput.notes.length > ITEM_NOTES_MAX_LENGTH) {
      throw new ValidationError(
        `Las notas de un ítem no pueden exceder ${ITEM_NOTES_MAX_LENGTH} caracteres`
      );
    }

    // Busca ítem en el menú publicado
    const menuItem = await MenuItem.findOne({
      menuDayId: menuDay._id,
      dishId: itemInput.dishId,
      active: true
    });

    if (!menuItem) {
      throw new ConflictError(
        'Uno o más platos solicitados no están disponibles en el menú del día',
        'DISH_UNAVAILABLE'
      );
    }

    if (menuItem.manuallySoldOut) {
      throw new ConflictError(
        `El plato '${menuItem.dishName}' está marcado como agotado por falta de insumos`,
        'DISH_UNAVAILABLE'
      );
    }

    if (menuItem.hasRationsLimit) {
      const remaining = menuItem.remainingRations ?? 0;
      if (remaining === 0) {
        throw new ConflictError(
          `No quedan raciones disponibles de '${menuItem.dishName}'`,
          'RATION_UNAVAILABLE'
        );
      }
      if (remaining < itemInput.quantity) {
        throw new ConflictError(
          `Raciones insuficientes de '${menuItem.dishName}'. Solicitadas: ${itemInput.quantity}, disponibles: ${remaining}`,
          'RATION_UNAVAILABLE'
        );
      }

      itemsToDiscount.push({
        menuItemId: menuItem._id as mongoose.Types.ObjectId,
        dishId: menuItem.dishId as mongoose.Types.ObjectId,
        quantity: itemInput.quantity
      });
    }

    // Busca plato maestro para resolver variaciones y snapshots
    const dish = await Dish.findById(itemInput.dishId);
    if (!dish) {
      throw new ConflictError('Plato no encontrado en catálogo', 'DISH_UNAVAILABLE');
    }

    const selectedVariations: Array<{ id: string; name: string }> = [];
    if (itemInput.variationIds && itemInput.variationIds.length > 0) {
      const availableMap = new Map(
        (dish.variations || []).filter((v) => v.active).map((v) => [v.id, v.name])
      );
      for (const varId of itemInput.variationIds) {
        const varName = availableMap.get(varId);
        if (!varName) {
          throw new ValidationError(
            `La variación '${varId}' no es válida o no está activa para el plato '${dish.name}'`
          );
        }
        selectedVariations.push({ id: varId, name: varName });
      }
    }

    const lineTotalCents = menuItem.priceCents * itemInput.quantity;
    totalCents += lineTotalCents;

    validatedItems.push({
      menuItemId: menuItem._id,
      menuDayId: menuDay._id,
      dishId: dish._id,
      dishName: menuItem.dishName,
      sectionName: menuItem.sectionKey,
      unitPriceCents: menuItem.priceCents,
      quantity: itemInput.quantity,
      variations: selectedVariations,
      notes: itemInput.notes,
      lineTotalCents
    });
  }

  // 6. Descuento secuencial de raciones con findOneAndUpdate + $gte y compensación única (0 sobreventa)
  const successfullyDiscounted: Array<{ menuItemId: mongoose.Types.ObjectId; quantity: number }> = [];

  try {
    for (const item of itemsToDiscount) {
      const updated = await MenuItem.findOneAndUpdate(
        {
          _id: item.menuItemId,
          active: true,
          manuallySoldOut: false,
          remainingRations: { $gte: item.quantity }
        },
        {
          $inc: { remainingRations: -item.quantity },
          $set: { updatedAt: new Date() }
        },
        { new: true }
      );

      if (!updated) {
        // H1: Lanzar error directamente; la compensación se ejecuta de forma centralizada en el catch
        throw new ConflictError(
          'No quedan raciones suficientes o el plato se ha agotado concurrentemente',
          'RATION_UNAVAILABLE'
        );
      }

      successfullyDiscounted.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity
      });
    }

    // 7. Numeración atómica con Counter
    const counter = await Counter.findOneAndUpdate(
      { _id: 'orders' },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    const orderNumber = counter.seq;

    // 8. Crear pedido persistido
    const now = new Date();
    const order = await Order.create({
      orderNumber,
      shiftId: shift._id,
      tableId: table._id,
      tableCode: table.code,
      tableSessionId: tableSession._id,
      takenByUserId: new mongoose.Types.ObjectId(user.id),
      takenByName: user.displayName,
      status: 'ENVIADO',
      items: validatedItems,
      notes: data.notes,
      totalCents,
      currency: 'PEN',
      statusHistory: [
        {
          status: 'ENVIADO',
          previousStatus: null,
          at: now,
          byUserId: user.id,
          byName: user.displayName,
          byRole: user.role,
          version: 0
        }
      ],
      enviadoEn: now,
      clientRequestId: data.clientRequestId ? data.clientRequestId.trim() : undefined,
      version: 0
    });

    const formattedOrder = formatOrderResponse(order);

    emitOrderCreated(formattedOrder, {
      id: user.id,
      name: user.displayName,
      role: user.role
    });

    for (const item of itemsToDiscount) {
      const mi = await MenuItem.findById(item.menuItemId);
      if (mi) {
        const state = deriveDishStatus({
          active: mi.active,
          manuallySoldOut: mi.manuallySoldOut,
          hasRationsLimit: mi.hasRationsLimit,
          remainingRations: mi.remainingRations,
          lowStockThreshold: mi.lowStockThreshold
        });
        emitMenuAvailabilityChanged({
          menuDayId: mi.menuDayId.toString(),
          menuItemId: mi._id.toString(),
          dishId: mi.dishId.toString(),
          dishName: mi.dishName,
          state,
          remainingRations: mi.remainingRations,
          manuallySoldOut: mi.manuallySoldOut,
          changeType: 'RATION_DECREMENT',
          changedBy: { id: user.id, name: user.displayName, role: user.role },
          version: mi.version
        });
      }
    }

    return { order: formattedOrder, isIdempotent: false };
  } catch (error) {
    // H1: Única ruta de compensación para evitar duplicidad
    if (successfullyDiscounted.length > 0) {
      for (const prev of successfullyDiscounted) {
        await MenuItem.findByIdAndUpdate(prev.menuItemId, {
          $inc: { remainingRations: prev.quantity }
        });
      }
      successfullyDiscounted.length = 0;
    }
    throw error;
  }
}

/**
 * T059: Transición ENVIADO -> LISTO (solo COCINERO).
 */
export async function markOrderReady(
  orderId: string,
  version: number,
  user: AuthUserPayload
): Promise<any> {
  const now = new Date();

  const updated = await Order.findOneAndUpdate(
    { _id: orderId, status: 'ENVIADO', version },
    {
      $set: {
        status: 'LISTO',
        readyByUserId: new mongoose.Types.ObjectId(user.id),
        readyByName: user.displayName,
        listoEn: now
      },
      $inc: { version: 1 },
      $push: {
        statusHistory: {
          status: 'LISTO',
          previousStatus: 'ENVIADO',
          at: now,
          byUserId: user.id,
          byName: user.displayName,
          byRole: user.role,
          version: version + 1
        }
      }
    },
    { new: true }
  );

  if (!updated) {
    const current = await Order.findById(orderId);
    if (!current) throw new NotFoundError('Pedido no encontrado');
    if (current.status !== 'ENVIADO') {
      throw new ConflictError(
        `Transición no permitida: el pedido se encuentra en estado '${current.status}'`,
        'INVALID_TRANSITION'
      );
    }
    throw new ConflictError(
      'Conflicto de concurrencia: el pedido fue modificado por otro usuario',
      'VERSION_CONFLICT'
    );
  }

  const formatted = formatOrderResponse(updated);
  emitOrderReady(formatted, {
    id: user.id,
    name: user.displayName,
    role: user.role
  });

  return formatted;
}

/**
 * T060: Transición LISTO -> ENTREGADO (cualquier MOZO).
 */
export async function deliverOrder(
  orderId: string,
  version: number,
  user: AuthUserPayload
): Promise<any> {
  const now = new Date();

  const updated = await Order.findOneAndUpdate(
    { _id: orderId, status: 'LISTO', version },
    {
      $set: {
        status: 'ENTREGADO',
        deliveredByUserId: new mongoose.Types.ObjectId(user.id),
        deliveredByName: user.displayName,
        entregadoEn: now
      },
      $inc: { version: 1 },
      $push: {
        statusHistory: {
          status: 'ENTREGADO',
          previousStatus: 'LISTO',
          at: now,
          byUserId: user.id,
          byName: user.displayName,
          byRole: user.role,
          version: version + 1
        }
      }
    },
    { new: true }
  );

  if (!updated) {
    const current = await Order.findById(orderId);
    if (!current) throw new NotFoundError('Pedido no encontrado');
    if (current.status !== 'LISTO') {
      throw new ConflictError(
        `Transición no permitida: no se puede entregar un pedido en estado '${current.status}'`,
        'INVALID_TRANSITION'
      );
    }
    throw new ConflictError(
      'Conflicto de concurrencia: el pedido fue modificado por otro usuario',
      'VERSION_CONFLICT'
    );
  }

  const formatted = formatOrderResponse(updated);
  emitOrderDelivered(formatted, {
    id: user.id,
    name: user.displayName,
    role: user.role
  });

  return formatted;
}

/**
 * T057–T058: Cancelación de pedido.
 * ENVIADO: repone raciones y registra CANCELLATION_REVERSAL.
 * LISTO: NO repone raciones; advierte coordinar con cocina.
 * H2: Primero transición atómica en Order, luego reposición de raciones.
 * H3: Reposición al menuItem específico del snapshot (menuItemId/menuDayId).
 */
export async function cancelOrder(
  orderId: string,
  reason: string,
  version: number,
  user: AuthUserPayload
): Promise<{ order: any; warning?: string }> {
  if (!reason || reason.trim().length === 0) {
    throw new ValidationError('El motivo de cancelación es obligatorio');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Pedido no encontrado');
  }

  if (order.status === 'ENTREGADO' || order.status === 'CANCELADO') {
    throw new ConflictError(
      `No se puede cancelar un pedido en estado final '${order.status}'`,
      'CANCELLATION_NOT_ALLOWED'
    );
  }

  const previousStatus = order.status;
  const now = new Date();
  let warningMessage: string | undefined;

  // H2: 1. Transición atómica con filtro {_id, status: previousStatus, version}
  const updated = await Order.findOneAndUpdate(
    { _id: orderId, status: previousStatus, version },
    {
      $set: {
        status: 'CANCELADO',
        cancelledByUserId: new mongoose.Types.ObjectId(user.id),
        cancelledByName: user.displayName,
        cancelReason: reason.trim(),
        canceladoEn: now
      },
      $inc: { version: 1 },
      $push: {
        statusHistory: {
          status: 'CANCELADO',
          previousStatus,
          at: now,
          byUserId: user.id,
          byName: user.displayName,
          byRole: user.role,
          reason: reason.trim(),
          version: version + 1
        }
      }
    },
    { new: true }
  );

  if (!updated) {
    const currentOrder = await Order.findById(orderId);
    if (currentOrder && (currentOrder.status === 'ENTREGADO' || currentOrder.status === 'CANCELADO')) {
      throw new ConflictError(
        `No se puede cancelar un pedido en estado final '${currentOrder.status}'`,
        'CANCELLATION_NOT_ALLOWED'
      );
    }
    throw new ConflictError(
      'Conflicto de concurrencia: el pedido fue modificado simultáneamente',
      'VERSION_CONFLICT'
    );
  }

  // H2 + H3: 2. Solo tras confirmar la transición atómica, reponer raciones y auditar
  if (previousStatus === 'ENVIADO') {
    try {
      for (const item of updated.items) {
        let menuItem: any = null;
        if (item.menuItemId) {
          menuItem = await MenuItem.findById(item.menuItemId);
        } else if (item.menuDayId) {
          menuItem = await MenuItem.findOne({ menuDayId: item.menuDayId, dishId: item.dishId });
        } else {
          // Fallback resolviendo turno
          const shift = await Shift.findById(updated.shiftId);
          if (shift) {
            const menuDay = await MenuDay.findOne({ date: shift.date });
            if (menuDay) {
              menuItem = await MenuItem.findOne({ menuDayId: menuDay._id, dishId: item.dishId });
            }
          }
          if (!menuItem) {
            menuItem = await MenuItem.findOne({ dishId: item.dishId, active: true });
          }
        }

        if (menuItem && menuItem.hasRationsLimit) {
          // H4: Reposición atómica con $inc
          const updatedMenuItem = await MenuItem.findOneAndUpdate(
            { _id: menuItem._id, hasRationsLimit: true },
            {
              $inc: { remainingRations: item.quantity, version: 1 },
              $set: { updatedAt: now }
            },
            { returnDocument: 'before' }
          );

          if (updatedMenuItem) {
            const prev = updatedMenuItem.remainingRations ?? 0;
            const next = prev + item.quantity;
            await RationAdjustment.create({
              menuItemId: menuItem._id,
              dishId: item.dishId,
              menuDayId: menuItem.menuDayId,
              orderId: updated._id,
              type: 'CANCELLATION_REVERSAL',
              previousRemaining: prev,
              newRemaining: next,
              reason: `Cancelación de pedido #${updated.orderNumber}: ${reason.trim()}`,
              actorId: new mongoose.Types.ObjectId(user.id),
              actorRole: user.role,
              at: now
            });

            const state = deriveDishStatus({
              active: menuItem.active,
              manuallySoldOut: menuItem.manuallySoldOut,
              hasRationsLimit: true,
              remainingRations: next,
              lowStockThreshold: menuItem.lowStockThreshold ?? 5
            });
            emitMenuAvailabilityChanged({
              menuDayId: menuItem.menuDayId.toString(),
              menuItemId: menuItem._id.toString(),
              dishId: item.dishId.toString(),
              dishName: menuItem.dishName,
              state,
              remainingRations: next,
              manuallySoldOut: menuItem.manuallySoldOut,
              changeType: 'CANCELLATION_REVERSAL',
              changedBy: { id: user.id, name: user.displayName, role: user.role },
              version: (updatedMenuItem.version ?? 0) + 1
            });
          }
        }
      }
    } catch (err) {
      console.error('Error al reponer raciones tras cancelación de pedido:', err);
      // Pedido ya cancelado atómicamente; no revertir cancelación (limitación No-ACID)
    }
  } else if (previousStatus === 'LISTO') {
    // Si estaba LISTO, NO repone raciones
    warningMessage = 'El pedido estaba listo en cocina; las raciones no han sido repuestas.';
  }

  const formatted = formatOrderResponse(updated);
  emitOrderCancelled(formatted, previousStatus, {
    id: user.id,
    name: user.displayName,
    role: user.role
  });

  return {
    order: formatted,
    ...(warningMessage ? { warning: warningMessage } : {})
  };
}

/**
 * T064: Cierre manual P2 (solo ENCARGADO).
 */
export async function manualCloseOrder(
  orderId: string,
  reason: string,
  user: AuthUserPayload
): Promise<any> {
  if (!reason || reason.trim().length === 0) {
    throw new ValidationError('El motivo del cierre manual es obligatorio');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Pedido no encontrado');
  }

  if (order.status === 'ENTREGADO') {
    throw new ConflictError('El pedido ya se encuentra entregado');
  }

  const previousStatus = order.status;
  const now = new Date();
  order.status = 'ENTREGADO';
  order.manualClose = true;
  order.manualCloseReason = reason.trim();
  order.deliveredByUserId = new mongoose.Types.ObjectId(user.id);
  order.deliveredByName = user.displayName;
  order.entregadoEn = now;
  order.version += 1;
  order.statusHistory.push({
    status: 'ENTREGADO',
    previousStatus,
    at: now,
    byUserId: user.id,
    byName: user.displayName,
    byRole: user.role,
    reason: `Cierre manual: ${reason.trim()}`,
    version: order.version
  });

  await order.save();
  const formatted = formatOrderResponse(order);
  emitOrderManualClosed(formatted, previousStatus, {
    id: user.id,
    name: user.displayName,
    role: user.role
  });
  return formatted;
}

/**
 * T061: Tablero de cocina KDS con cola FIFO y órdenes listas.
 */
export async function getKitchenBoard(): Promise<any> {
  const pendingOrders = await Order.find({ status: 'ENVIADO' }).sort({ enviadoEn: 1 });
  const readyOrders = await Order.find({ status: 'LISTO' }).sort({ listoEn: 1 });

  return {
    pending: pendingOrders.map(formatOrderResponse),
    ready: readyOrders.map(formatOrderResponse),
    serverTime: new Date().toISOString()
  };
}

/**
 * T063: Lista pedidos con filtros y paginación.
 */
export async function listOrders(query: any): Promise<any> {
  const filter: any = {};

  if (query.scope === 'active') {
    filter.status = { $in: ['ENVIADO', 'LISTO'] };
  } else if (query.scope === 'ready') {
    filter.status = 'LISTO';
  } else if (query.status) {
    filter.status = query.status;
  }

  if (query.tableId) {
    filter.tableId = query.tableId;
  }

  if (query.shiftId) {
    filter.shiftId = query.shiftId;
  }

  if (query.takenByUserId) {
    filter.takenByUserId = query.takenByUserId;
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ enviadoEn: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter)
  ]);

  return {
    data: orders.map(formatOrderResponse),
    meta: {
      page,
      limit,
      total,
      hasNext: skip + orders.length < total
    }
  };
}

/**
 * T063: Detalle de pedido por ID.
 */
export async function getOrderById(orderId: string): Promise<any> {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Pedido no encontrado');
  }
  return formatOrderResponse(order);
}

/**
 * Formatea un documento Order según el contrato REST canónico (§9).
 */
function formatOrderResponse(order: any): any {
  return {
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    tableId: order.tableId ? order.tableId.toString() : '',
    tableCode: order.tableCode,
    table: {
      id: order.tableId ? order.tableId.toString() : '',
      code: order.tableCode,
      zone: 'Salón'
    },
    tableSessionId: order.tableSessionId ? order.tableSessionId.toString() : '',
    takenByUserId: order.takenByUserId ? order.takenByUserId.toString() : '',
    takenByName: order.takenByName,
    takenBy: {
      id: order.takenByUserId ? order.takenByUserId.toString() : '',
      name: order.takenByName
    },
    readyBy: order.readyByUserId
      ? { id: order.readyByUserId.toString(), name: order.readyByName }
      : undefined,
    deliveredBy: order.deliveredByUserId
      ? { id: order.deliveredByUserId.toString(), name: order.deliveredByName }
      : undefined,
    cancelledBy: order.cancelledByUserId
      ? { id: order.cancelledByUserId.toString(), name: order.cancelledByName }
      : undefined,
    status: order.status,
    items: order.items.map((i: any) => ({
      menuItemId: i.menuItemId ? i.menuItemId.toString() : undefined,
      menuDayId: i.menuDayId ? i.menuDayId.toString() : undefined,
      dishId: i.dishId.toString(),
      dishName: i.dishName,
      sectionName: i.sectionName,
      unitPriceCents: i.unitPriceCents,
      quantity: i.quantity,
      variations: i.variations || [],
      notes: i.notes,
      lineTotalCents: i.lineTotalCents
    })),
    notes: order.notes,
    totalCents: order.totalCents,
    currency: order.currency || 'PEN',
    statusHistory: order.statusHistory,
    enviadoEn: order.enviadoEn,
    listoEn: order.listoEn,
    entregadoEn: order.entregadoEn,
    canceladoEn: order.canceladoEn,
    cancelReason: order.cancelReason,
    manualClose: order.manualClose,
    manualCloseReason: order.manualCloseReason,
    clientRequestId: order.clientRequestId,
    version: order.version
  };
}
