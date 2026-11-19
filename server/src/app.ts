import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { getEnv } from './config/env';
import { logger, requestIdMiddleware } from './config/logger';
import { errorHandler, NotFoundError } from './middlewares/error';
import { isDBConnected } from './config/db';
import { apiRouter } from './routes';

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

// Rutas de la API REST
app.use('/api', apiRouter);

// Servicio de build estático y fallback SPA (servicio único)
const shouldServeStatic = env.NODE_ENV === 'production' || env.SERVE_STATIC;
if (shouldServeStatic) {
  const possiblePaths = [
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(process.cwd(), '../client/dist')
  ];
  const clientDistPath = possiblePaths.find((p) => fs.existsSync(p)) || possiblePaths[0];

  if (fs.existsSync(clientDistPath)) {
    logger.info(`Servicio único activo: sirviendo archivos estáticos desde ${clientDistPath}`);
    app.use(express.static(clientDistPath));

    app.get('*', (req: Request, res: Response, next) => {
      // Excluir rutas /api y /socket.io del fallback SPA
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  } else {
    logger.warn(
      `Servicio estático solicitado pero el directorio no existe: ${clientDistPath}. Continuando en modo API.`
    );
  }
}

// Manejo de rutas inexistentes (404)
app.use((_req: Request, _res: Response) => {
  throw new NotFoundError('Endpoint no encontrado');
});

// Manejador centralizado de errores
app.use(errorHandler);

export { app };
export default app;
