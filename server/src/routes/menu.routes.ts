import { Router } from 'express';
import { z } from 'zod';
import * as menuCtrl from '../controllers/menu.controller';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/roles';
import { validate } from '../middlewares/validate';

const menuRouter = Router();

// Zod schemas
const createMenuDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  notes: z.string().optional()
});

const updateMenuDaySchema = z.object({
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        dishId: z.string().min(1, 'dishId es obligatorio'),
        active: z.boolean().optional(),
        hasRationsLimit: z.boolean().optional(),
        totalRations: z.number().int().min(0).optional(),
        remainingRations: z.number().int().min(0).optional(),
        priceCents: z.number().int().min(0).optional()
      })
    )
    .optional()
});

const createDishSchema = z.object({
  sectionId: z.string().min(1, 'sectionId es obligatorio'),
  name: z.string().min(1, 'El nombre del plato es obligatorio'),
  description: z.string().optional(),
  priceCents: z.number().int().min(0, 'priceCents debe ser entero >= 0'),
  course: z.enum(['ENTRADA', 'FONDO', 'PLATO', 'BEBIDA', 'OTRO']),
  isFixed: z.boolean().optional(),
  isRotating: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  variations: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1, 'El nombre de la variación es obligatorio'),
        sortOrder: z.number().optional(),
        active: z.boolean().optional()
      })
    )
    .optional()
});

const patchDishSchema = createDishSchema.partial();

const replenishSchema = z.object({
  quantity: z.number().int().min(1, 'La cantidad debe ser un entero >= 1'),
  reason: z.string().min(1, 'El motivo de la reposición es obligatorio')
});

const adjustSchema = z.object({
  remainingRations: z.number().int().min(0, 'Las raciones restantes deben ser un entero >= 0'),
  reason: z.string().min(1, 'El motivo del ajuste es obligatorio')
});

const soldOutSchema = z.object({
  reason: z.string().min(1, 'El motivo de agotado es obligatorio')
});

// Todas las rutas de menú requieren autenticación
menuRouter.use(authenticate);

// Menú del día (hoy) para todos los roles
menuRouter.get('/menu/today', menuCtrl.getToday);

// Secciones de menú para todos los roles
menuRouter.get('/menu-sections', menuCtrl.getSections);

// Platos maestros (CRUD)
menuRouter.get('/dishes', menuCtrl.getDishes);
menuRouter.post(
  '/dishes',
  requireRole('ENCARGADO'),
  validate({ body: createDishSchema }),
  menuCtrl.postDish
);
menuRouter.patch(
  '/dishes/:id',
  requireRole('ENCARGADO'),
  validate({ body: patchDishSchema }),
  menuCtrl.patchDish
);
menuRouter.delete('/dishes/:id', requireRole('ENCARGADO'), menuCtrl.deleteDish);

// Menú del día por fecha
menuRouter.get('/menu/days/:date', requireRole('ENCARGADO'), menuCtrl.getDayByDate);
menuRouter.post(
  '/menu/days',
  requireRole('ENCARGADO'),
  validate({ body: createMenuDaySchema }),
  menuCtrl.createDay
);
menuRouter.put(
  '/menu/days/:id',
  requireRole('ENCARGADO'),
  validate({ body: updateMenuDaySchema }),
  menuCtrl.updateDay
);
menuRouter.post('/menu/days/:id/publish', requireRole('ENCARGADO'), menuCtrl.publishDay);

// Gestión y auditoría de raciones
menuRouter.post(
  '/menu-items/:id/rations/replenish',
  requireRole('MOZO', 'ENCARGADO'),
  validate({ body: replenishSchema }),
  menuCtrl.replenish
);
menuRouter.post(
  '/menu-items/:id/rations/adjust',
  requireRole('ENCARGADO'),
  validate({ body: adjustSchema }),
  menuCtrl.adjust
);
menuRouter.post(
  '/menu-items/:id/sold-out',
  requireRole('ENCARGADO'),
  validate({ body: soldOutSchema }),
  menuCtrl.soldOut
);
menuRouter.post('/menu-items/:id/reactivate', requireRole('ENCARGADO'), menuCtrl.reactivate);
menuRouter.get(
  '/menu-items/:id/rations/adjustments',
  requireRole('ENCARGADO'),
  menuCtrl.getAdjustments
);

export { menuRouter };
export default menuRouter;
