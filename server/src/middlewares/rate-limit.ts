import { Request, Response, NextFunction } from 'express';
import { AppError } from './error';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, message = 'Demasiadas solicitudes, intente más tarde' } = options;
  const requests = new Map<string, number[]>();

  return (req: Request, _res: Response, next: NextFunction): void => {
    // En entorno de prueba, omitir a menos que el test lo requiera explícitamente
    if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    const timestamps = requests.get(ip) || [];
    const validTimestamps = timestamps.filter((t) => t > windowStart);

    if (validTimestamps.length >= max) {
      throw new AppError(message, 429, 'RATE_LIMIT_EXCEEDED');
    }

    validTimestamps.push(now);
    requests.set(ip, validTimestamps);
    next();
  };
}

export const loginRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 intentos por minuto
  message: 'Demasiados intentos de inicio de sesión. Por favor, espere un minuto.'
});
