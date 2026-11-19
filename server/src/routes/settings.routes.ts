import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/roles';
import { validate } from '../middlewares/validate';
import * as settingsController from '../controllers/settings.controller';

const settingsRouter = Router();

const updateSettingsSchema = z.object({
  restaurantName: z.string().min(1, 'El nombre del restaurante no puede estar vacío').optional(),
  lowStockThreshold: z.number().int().min(0, 'El umbral debe ser un entero positivo o cero').optional()
});

settingsRouter.get('/', authenticate, settingsController.getSettings);
settingsRouter.patch(
  '/',
  authenticate,
  requireRole('ENCARGADO'),
  validate({ body: updateSettingsSchema }),
  settingsController.updateSettings
);

export { settingsRouter };
export default settingsRouter;
