import { Router } from 'express';
import { z } from 'zod';
import {
  getTables,
  getTableById,
  postTable,
  patchTable,
  closeSession
} from '../controllers/table.controller';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/roles';
import { validate } from '../middlewares/validate';

const tableRouter = Router();
const tableSessionRouter = Router();

const createTableSchema = z.object({
  code: z.string().min(1, 'Código requerido').max(10),
  zone: z.string().optional(),
  seats: z.number().int().positive().optional(),
  active: z.boolean().optional()
});

const updateTableSchema = z.object({
  code: z.string().min(1).max(10).optional(),
  zone: z.string().optional(),
  seats: z.number().int().positive().optional(),
  active: z.boolean().optional()
});

const closeSessionSchema = z.object({
  notes: z.string().optional()
});

// Rutas de mesas
tableRouter.use(authenticate);
tableRouter.get('/', requireRole('ENCARGADO', 'MOZO', 'COCINERO'), getTables);
tableRouter.get('/:id', requireRole('ENCARGADO', 'MOZO', 'COCINERO'), getTableById);
tableRouter.post('/', requireRole('ENCARGADO'), validate({ body: createTableSchema }), postTable);
tableRouter.patch('/:id', requireRole('ENCARGADO'), validate({ body: updateTableSchema }), patchTable);

// Rutas de sesiones de mesa
tableSessionRouter.use(authenticate);
tableSessionRouter.post(
  '/:id/close',
  requireRole('MOZO', 'ENCARGADO'),
  validate({ body: closeSessionSchema }),
  closeSession
);

export { tableRouter, tableSessionRouter };
