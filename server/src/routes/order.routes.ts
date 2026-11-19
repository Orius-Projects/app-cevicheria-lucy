import { Router } from 'express';
import { z } from 'zod';
import * as orderCtrl from '../controllers/order.controller';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/roles';
import { validate } from '../middlewares/validate';

const orderRouter = Router();
const kitchenRouter = Router();

const createOrderSchema = z.object({
  tableId: z.string().min(1, 'tableId es obligatorio'),
  items: z
    .array(
      z.object({
        dishId: z.string().min(1, 'dishId es obligatorio'),
        quantity: z.number().int().min(1, 'quantity debe ser entero >= 1'),
        variationIds: z.array(z.string()).optional(),
        notes: z.string().max(140).optional()
      })
    )
    .min(1, 'Debe incluir al menos un ítem'),
  notes: z.string().max(280).optional(),
  clientRequestId: z.string().optional()
});

const transitionSchema = z.object({
  version: z.number().int().min(0)
});

const cancelSchema = z.object({
  reason: z.string().min(1, 'El motivo de cancelación es obligatorio'),
  version: z.number().int().min(0)
});

const manualCloseSchema = z.object({
  reason: z.string().min(1, 'El motivo del cierre manual es obligatorio')
});

// Todas las rutas requieren autenticación
orderRouter.use(authenticate);

// Creación de pedido (solo MOZO o ENCARGADO)
orderRouter.post(
  '/',
  requireRole('MOZO', 'ENCARGADO'),
  validate({ body: createOrderSchema }),
  orderCtrl.create
);

// Consulta de pedidos
orderRouter.get('/', orderCtrl.list);
orderRouter.get('/:id', orderCtrl.getById);

// Transiciones de estado
orderRouter.patch(
  '/:id/ready',
  requireRole('COCINERO'),
  validate({ body: transitionSchema }),
  orderCtrl.ready
);

orderRouter.patch(
  '/:id/deliver',
  requireRole('MOZO', 'ENCARGADO'),
  validate({ body: transitionSchema }),
  orderCtrl.deliver
);

orderRouter.patch(
  '/:id/cancel',
  requireRole('MOZO', 'ENCARGADO'),
  validate({ body: cancelSchema }),
  orderCtrl.cancel
);

// Cierre manual P2
orderRouter.post(
  '/:id/manual-close',
  requireRole('ENCARGADO'),
  validate({ body: manualCloseSchema }),
  orderCtrl.manualClose
);

// Tablero de cocina KDS
kitchenRouter.use(authenticate);
kitchenRouter.get('/board', requireRole('COCINERO', 'ENCARGADO'), orderCtrl.getKitchenBoard);

export { orderRouter, kitchenRouter };
