import { Router } from 'express';
import { z } from 'zod';
import {
  createShift,
  getCurrent,
  close,
  getSummary,
  createManualRecordHandler,
  getManualRecordsHandler
} from '../controllers/shift.controller';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/roles';
import { validate } from '../middlewares/validate';

const shiftRouter = Router();

const openShiftSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
    .optional(),
  label: z.string().min(1, 'La etiqueta del turno es requerida')
});

const closeShiftSchema = z.object({
  observations: z.string().optional()
});

const createManualRecordSchema = z.object({
  tableCode: z.string().trim().min(1, 'El código de mesa es obligatorio'),
  items: z
    .array(
      z
        .object({
          name: z.string().trim().min(1, 'El nombre del ítem es obligatorio').optional(),
          dishName: z.string().trim().min(1).optional(),
          quantity: z.number().int().min(1, 'La cantidad debe ser mayor o igual a 1'),
          amountCents: z.number().int().min(0, 'El monto debe ser mayor o igual a 0')
        })
        .refine((data) => (data.name && data.name.length > 0) || (data.dishName && data.dishName.length > 0), {
          message: 'El nombre del ítem es obligatorio'
        })
    )
    .min(1, 'Debe incluir al menos un ítem'),
  totalCents: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  note: z.string().optional()
});

shiftRouter.use(authenticate);

// Consulta de turno actual (abierto para todos los roles)
shiftRouter.get(
  '/current',
  requireRole('ENCARGADO', 'MOZO', 'COCINERO'),
  getCurrent
);

// Apertura de turno (solo ENCARGADO)
shiftRouter.post(
  '/',
  requireRole('ENCARGADO'),
  validate({ body: openShiftSchema }),
  createShift
);

// Cierre de turno (solo ENCARGADO)
shiftRouter.post(
  '/:id/close',
  requireRole('ENCARGADO'),
  validate({ body: closeShiftSchema }),
  close
);

// Consulta de resumen de turno (solo ENCARGADO)
shiftRouter.get(
  '/:id/summary',
  requireRole('ENCARGADO'),
  getSummary
);

// Registros manuales PAPER (solo ENCARGADO)
shiftRouter.post(
  '/:id/manual-records',
  requireRole('ENCARGADO'),
  validate({ body: createManualRecordSchema }),
  createManualRecordHandler
);

shiftRouter.get(
  '/:id/manual-records',
  requireRole('ENCARGADO'),
  getManualRecordsHandler
);

export { shiftRouter };
export default shiftRouter;

