import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatTimestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  info(message: string, meta?: any): void {
    console.log(`[${formatTimestamp()}] [INFO] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  warn(message: string, meta?: any): void {
    console.warn(`[${formatTimestamp()}] [WARN] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error(message: string, meta?: any): void {
    console.error(`[${formatTimestamp()}] [ERROR] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${formatTimestamp()}] [DEBUG] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }
};

declare global {
  namespace Express {
    interface Request {
      id?: string;
      requestId?: string;
    }
  }
}

/**
 * Middleware para asignar requestId único a cada petición y registrar la traza.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existingId = req.headers['x-request-id'];
  const requestId =
    typeof existingId === 'string' && existingId.trim().length > 0
      ? existingId
      : `req_${crypto.randomUUID()}`;

  req.id = requestId;
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      `${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${duration}ms [${requestId}]`
    );
  });

  next();
}
