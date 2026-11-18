import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { getEnv } from './config/env';
import { requestIdMiddleware } from './config/logger';
import { errorHandler, NotFoundError } from './middlewares/error';
import { isDBConnected } from './config/db';

const app: Express = express();
const env = getEnv();

// Seguridad y utilidades básicas
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestIdMiddleware);

// Endpoint público de salud (contracts/rest-api.md §4)
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    db: isDBConnected() ? 'connected' : 'disconnected',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Manejo de rutas inexistentes (404)
app.use((_req: Request, _res: Response) => {
  throw new NotFoundError('Endpoint no encontrado');
});

// Manejador centralizado de errores
app.use(errorHandler);

export { app };
export default app;
