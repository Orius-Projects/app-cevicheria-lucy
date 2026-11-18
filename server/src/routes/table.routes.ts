import { Router } from 'express';
import { z } from 'zod';
import { getTables, getTableById, closeSession } from '../controllers/table.controller';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/roles';
import { validate } from '../middlewares/validate';

const tableRouter = Router();
const tableSessionRouter = Router();

const closeSessionSchema = z.object({
  notes: z.string().optional()
});

// Rutas de mesas
tableRouter.use(authenticate);
tableRouter.get('/', requireRole('ENCARGADO', 'MOZO', 'COCINERO'), getTables);
tableRouter.get('/:id', requireRole('ENCARGADO', 'MOZO', 'COCINERO'), getTableById);

// Rutas de sesiones de mesa
tableSessionRouter.use(authenticate);
tableSessionRouter.post(
  '/:id/close',
  requireRole('MOZO', 'ENCARGADO'),
  validate({ body: closeSessionSchema }),
  closeSession
);

export { tableRouter, tableSessionRouter };
