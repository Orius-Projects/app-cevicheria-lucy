import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@cevicheria/shared';
import { ForbiddenError, UnauthorizedError } from './error';

/**
 * Middleware para restringir acceso según el rol del usuario autenticado.
 * Si el usuario no tiene uno de los roles permitidos, responde con HTTP 403 FORBIDDEN.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Usuario no autenticado'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Acceso denegado: el rol '${req.user.role}' no tiene permiso para este recurso`
        )
      );
    }

    next();
  };
}
