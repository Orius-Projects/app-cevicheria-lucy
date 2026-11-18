import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env';
import { UnauthorizedError } from './error';
import { UserRole } from '@cevicheria/shared';

export interface AuthUserPayload {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

/**
 * Middleware para validar el token JWT y adjuntar el usuario autenticado a `req.user`.
 * Si el token falta, es inválido o ha expirado, responde con HTTP 401.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new UnauthorizedError('Cabecera de autorización no proporcionada', 'UNAUTHORIZED');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new UnauthorizedError(
      'Formato de cabecera inválido. Se espera: Bearer <token>',
      'UNAUTHORIZED'
    );
  }

  const token = parts[1];
  const env = getEnv();

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUserPayload;
    req.user = {
      id: decoded.id,
      username: decoded.username,
      displayName: decoded.displayName,
      role: decoded.role
    };
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('El token de autenticación ha expirado', 'TOKEN_EXPIRED');
    }
    throw new UnauthorizedError('Token de autenticación inválido', 'UNAUTHORIZED');
  }
}
