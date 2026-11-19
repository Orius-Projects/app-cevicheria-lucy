import mongoose from 'mongoose';
import {
  MenuSection,
  Dish,
  MenuDay,
  MenuItem,
  RationAdjustment
} from '../models';
import { deriveDishStatus } from '@cevicheria/shared';
import { AuthUserPayload } from '../middlewares/auth';
import { ConflictError, NotFoundError, ValidationError } from '../middlewares/error';

function getTodayLimaDate(): string {
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
 * T042: Retorna el menú PUBLICADO de la fecha actual con secciones, platos y estado derivado.
 */
export async function getTodayMenu(dateOverride?: string): Promise<any> {
  const date = dateOverride || getTodayLimaDate();
  const menuDay = await MenuDay.findOne({ date, status: 'PUBLICADO' });

  if (!menuDay) {
    throw new ConflictError(
      'No hay menú publicado para la fecha actual',
      'MENU_NOT_PUBLISHED'
    );
  }

  // Obtiene secciones activas ordenadas
  const sections = await MenuSection.find({ active: true }).sort({ sortOrder: 1 });

  // Obtiene items activos del menú del día
  const items = await MenuItem.find({
    menuDayId: menuDay._id,
    active: true
  });

  // Obtiene los platos maestros para enriquecer con variaciones y descripciones
  const dishIds = items.map((i) => i.dishId);
  const dishes = await Dish.find({ _id: { $in: dishIds } });
  const dishMap = new Map(dishes.map((d) => [d._id.toString(), d]));

  // Agrupa los items por sección
  const sectionsResult: any[] = [];

  for (const section of sections) {
    const sectionItems = items.filter((item) => item.sectionKey === section.key);
    if (sectionItems.length === 0) continue;

    const formattedItems = sectionItems.map((item) => {
      const dish = dishMap.get(item.dishId.toString());
      const state = deriveDishStatus({
        active: item.active,
        manuallySoldOut: item.manuallySoldOut,
        hasRationsLimit: item.hasRationsLimit,
        remainingRations: item.remainingRations,
        lowStockThreshold: item.lowStockThreshold
      });

      return {
        id: item._id.toString(),
        dishId: item.dishId.toString(),
        dishName: item.dishName,
        description: dish?.description || '',
        priceCents: item.priceCents,
        course: dish?.course || 'PLATO',
        isFixed: dish?.isFixed || false,
        isRotating: dish?.isRotating || false,
        state,
        status: state,
        active: item.active,
        hasRationsLimit: item.hasRationsLimit,
        totalRations: item.totalRations,
        remainingRations: item.remainingRations,
        lowStockThreshold: item.lowStockThreshold,
        manuallySoldOut: item.manuallySoldOut,
        version: item.version,
        variations: (dish?.variations || [])
          .filter((v) => v.active)
          .map((v) => ({ id: v.id, name: v.name }))
      };
    });

    sectionsResult.push({
      key: section.key,
      name: section.name,
      items: formattedItems
    });
  }

  return {
    menuDayId: menuDay._id.toString(),
    date: menuDay.date,
    status: menuDay.status,
    sections: sectionsResult
  };
}

/**
 * T043: Crea un nuevo menú del día en estado BORRADOR.
 */
export async function createMenuDay(
  data: { date: string; notes?: string },
  _user: AuthUserPayload
): Promise<any> {
  const existing = await MenuDay.findOne({ date: data.date });
  if (existing) {
    throw new ConflictError(
      `Ya existe un menú registrado para la fecha ${data.date}`,
      'CONFLICT'
    );
  }

  return MenuDay.create({
    date: data.date,
    status: 'BORRADOR',
    notes: data.notes
  });
}

/**
 * Consulta el menú del día por fecha (borrador o publicado).
 */
export async function getMenuDayByDate(date: string): Promise<any> {
  const menuDay = await MenuDay.findOne({ date });
  if (!menuDay) {
    throw new NotFoundError(`No existe menú registrado para la fecha ${date}`);
  }

  const items = await MenuItem.find({ menuDayId: menuDay._id });
  return {
    id: menuDay._id.toString(),
    date: menuDay.date,
    status: menuDay.status,
    notes: menuDay.notes,
    publishedAt: menuDay.publishedAt,
    items
  };
}

/**
 * T043: Actualiza un menú del día en BORRADOR con sus platos y raciones.
 */
export async function updateMenuDay(
  menuDayId: string,
  data: {
    notes?: string;
    items?: Array<{
      dishId: string;
      active?: boolean;
      hasRationsLimit?: boolean;
      totalRations?: number;
      remainingRations?: number;
      priceCents?: number;
    }>;
  }
): Promise<any> {
  const menuDay = await MenuDay.findById(menuDayId);
  if (!menuDay) {
    throw new NotFoundError('Menú del día no encontrado');
  }

  if (menuDay.status !== 'BORRADOR') {
    throw new ConflictError('Solo se permite editar el menú en estado BORRADOR');
  }

  if (data.notes !== undefined) {
    menuDay.notes = data.notes;
    await menuDay.save();
  }

  if (data.items && data.items.length > 0) {
    for (const itemInput of data.items) {
      const dish = await Dish.findById(itemInput.dishId).populate('sectionId');
      if (!dish) continue;

      const section = dish.sectionId as any;
      const sectionKey = section?.key || 'CRIOLLO';

      const price = itemInput.priceCents !== undefined ? itemInput.priceCents : dish.priceCents;
      const hasLimit = itemInput.hasRationsLimit ?? false;
      const totalRations = hasLimit ? itemInput.totalRations ?? 30 : null;
      const remainingRations = hasLimit ? itemInput.remainingRations ?? totalRations : null;

      await MenuItem.findOneAndUpdate(
        { menuDayId: menuDay._id, dishId: dish._id },
        {
          $set: {
            dishName: dish.name,
            sectionKey,
            priceCents: price,
            active: itemInput.active ?? true,
            hasRationsLimit: hasLimit,
            totalRations,
            remainingRations,
            lowStockThreshold: 5,
            manuallySoldOut: false,
            updatedAt: new Date()
          },
          $inc: { version: 1 }
        },
        { upsert: true, new: true }
      );
    }
  }

  return getMenuDayByDate(menuDay.date);
}

/**
 * T044: Publica un menú del día si tiene al menos un ítem activo.
 */
export async function publishMenuDay(
  menuDayId: string,
  user: AuthUserPayload
): Promise<any> {
  const menuDay = await MenuDay.findById(menuDayId);
  if (!menuDay) {
    throw new NotFoundError('Menú del día no encontrado');
  }

  const activeCount = await MenuItem.countDocuments({
    menuDayId: menuDay._id,
    active: true
  });

  if (activeCount === 0) {
    throw new ValidationError(
      'El menú debe contener al menos un plato activo para ser publicado'
    );
  }

  menuDay.status = 'PUBLICADO';
  menuDay.publishedBy = new mongoose.Types.ObjectId(user.id);
  menuDay.publishedAt = new Date();
  await menuDay.save();

  return menuDay;
}

/**
 * T045: Lista las secciones de menú activas.
 */
export async function listMenuSections(): Promise<any[]> {
  return MenuSection.find({ active: true }).sort({ sortOrder: 1 });
}

/**
 * T045: Lista todos los platos maestros.
 */
export async function listDishes(): Promise<any[]> {
  return Dish.find().sort({ sortOrder: 1, name: 1 });
}

/**
 * T046: Crea un nuevo plato maestro.
 */
export async function createDish(data: any): Promise<any> {
  // Asegura que cada variación tenga un id estable
  const variations = (data.variations || []).map((v: any, index: number) => ({
    id: v.id || `v${index + 1}`,
    name: v.name,
    sortOrder: v.sortOrder || index,
    active: v.active ?? true
  }));

  return Dish.create({
    sectionId: new mongoose.Types.ObjectId(data.sectionId),
    name: data.name.trim(),
    description: data.description,
    priceCents: data.priceCents,
    course: data.course,
    isFixed: data.isFixed ?? false,
    isRotating: data.isRotating ?? false,
    sortOrder: data.sortOrder ?? 0,
    variations,
    active: data.active ?? true
  });
}

/**
 * T046: Actualiza un plato maestro.
 */
export async function updateDish(dishId: string, data: any): Promise<any> {
  const dish = await Dish.findById(dishId);
  if (!dish) {
    throw new NotFoundError('Plato no encontrado');
  }

  if (data.variations) {
    data.variations = data.variations.map((v: any, index: number) => ({
      id: v.id || `v${index + 1}`,
      name: v.name,
      sortOrder: v.sortOrder || index,
      active: v.active ?? true
    }));
  }

  Object.assign(dish, data);
  await dish.save();
  return dish;
}

/**
 * T046: Baja lógica de plato maestro (active: false).
 */
export async function deleteDish(dishId: string): Promise<void> {
  const dish = await Dish.findById(dishId);
  if (!dish) {
    throw new NotFoundError('Plato no encontrado');
  }
  dish.active = false;
  await dish.save();
}

/**
 * T048: Reposición de raciones (MOZO o ENCARGADO).
 * Incrementa remainingRations atómicamente con $inc y audita. NO limpia manuallySoldOut.
 */
export async function replenishRations(
  menuItemId: string,
  quantity: number,
  reason: string,
  user: AuthUserPayload
): Promise<any> {
  const itemExists = await MenuItem.findById(menuItemId);
  if (!itemExists) {
    throw new NotFoundError('Ítem de menú no encontrado');
  }

  if (!itemExists.hasRationsLimit) {
    throw new ConflictError('El plato no tiene límite de raciones configurado');
  }

  // H4: Actualización atómica con $inc para evitar pérdida de actualizaciones concurrentes
  const updatedItem = await MenuItem.findOneAndUpdate(
    { _id: menuItemId, hasRationsLimit: true },
    {
      $inc: { remainingRations: quantity, version: 1 },
      $set: {
        updatedBy: new mongoose.Types.ObjectId(user.id),
        updatedAt: new Date()
      }
    },
    { new: true }
  );

  if (!updatedItem) {
    throw new NotFoundError('Ítem de menú no encontrado');
  }

  const newRemaining = updatedItem.remainingRations ?? 0;
  const previousRemaining = newRemaining - quantity;

  await RationAdjustment.create({
    menuItemId: updatedItem._id,
    dishId: updatedItem.dishId,
    menuDayId: updatedItem.menuDayId,
    type: 'REPLENISH',
    previousRemaining,
    newRemaining,
    reason,
    actorId: new mongoose.Types.ObjectId(user.id),
    actorRole: user.role,
    at: new Date()
  });

  return updatedItem;
}

/**
 * T049: Ajuste de raciones con motivo (solo ENCARGADO).
 * Fija remainingRations al valor físico contado y audita de forma atómica.
 */
export async function adjustRations(
  menuItemId: string,
  remainingRations: number,
  reason: string,
  user: AuthUserPayload
): Promise<any> {
  // H4: findOneAndUpdate con returnDocument: 'before' para evitar read-modify-write
  const previousItem = await MenuItem.findOneAndUpdate(
    { _id: menuItemId },
    {
      $set: {
        hasRationsLimit: true,
        remainingRations,
        updatedBy: new mongoose.Types.ObjectId(user.id),
        updatedAt: new Date()
      },
      $inc: { version: 1 }
    },
    { returnDocument: 'before' }
  );

  if (!previousItem) {
    throw new NotFoundError('Ítem de menú no encontrado');
  }

  const previousRemaining = previousItem.remainingRations ?? 0;

  await RationAdjustment.create({
    menuItemId: previousItem._id,
    dishId: previousItem.dishId,
    menuDayId: previousItem.menuDayId,
    type: 'ADJUSTMENT',
    previousRemaining,
    newRemaining: remainingRations,
    reason,
    actorId: new mongoose.Types.ObjectId(user.id),
    actorRole: user.role,
    at: new Date()
  });

  const updatedItem = await MenuItem.findById(menuItemId);
  return updatedItem;
}

/**
 * T050: Marca plato como agotado por falta de insumo (manuallySoldOut: true).
 */
export async function markSoldOut(
  menuItemId: string,
  reason: string,
  user: AuthUserPayload
): Promise<any> {
  const now = new Date();
  const updatedItem = await MenuItem.findOneAndUpdate(
    { _id: menuItemId },
    {
      $set: {
        manuallySoldOut: true,
        soldOutReason: reason,
        soldOutBy: new mongoose.Types.ObjectId(user.id),
        soldOutAt: now,
        updatedBy: new mongoose.Types.ObjectId(user.id),
        updatedAt: now
      },
      $inc: { version: 1 }
    },
    { new: true }
  );

  if (!updatedItem) {
    throw new NotFoundError('Ítem de menú no encontrado');
  }

  return updatedItem;
}

/**
 * T050: Reactiva plato tras llegada de insumo (manuallySoldOut: false).
 */
export async function reactivateDish(
  menuItemId: string,
  user: AuthUserPayload
): Promise<any> {
  const updatedItem = await MenuItem.findOneAndUpdate(
    { _id: menuItemId },
    {
      $set: {
        manuallySoldOut: false,
        soldOutReason: null,
        soldOutBy: null,
        soldOutAt: null,
        updatedBy: new mongoose.Types.ObjectId(user.id),
        updatedAt: new Date()
      },
      $inc: { version: 1 }
    },
    { new: true }
  );

  if (!updatedItem) {
    throw new NotFoundError('Ítem de menú no encontrado');
  }

  return updatedItem;
}

/**
 * T051: Consulta el historial de ajustes de raciones de un ítem.
 */
export async function getRationAdjustments(menuItemId: string): Promise<any[]> {
  return RationAdjustment.find({ menuItemId })
    .sort({ at: -1 })
    .populate('actorId', 'username displayName role');
}
