import { Router } from 'express';
import { z } from 'zod';
import { login, getMe, logout } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const authRouter = Router();

export const loginSchema = z.object({
  username: z.string().min(1, 'El nombre de usuario es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria')
});

authRouter.post('/login', validate({ body: loginSchema }), login);
authRouter.get('/me', authenticate, getMe);
authRouter.post('/logout', logout);

export { authRouter };
export default authRouter;
