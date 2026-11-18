import { Router } from 'express';
import { z } from 'zod';
import {
  createShift,
  getCurrent,
  close,
  getSummary
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

export { shiftRouter };
export default shiftRouter;
