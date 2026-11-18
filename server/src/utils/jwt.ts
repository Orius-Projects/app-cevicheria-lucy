import jwt, { SignOptions } from 'jsonwebtoken';
import { getEnv } from '../config/env';
import { AuthUserPayload } from '../middlewares/auth';
import { UnauthorizedError } from '../middlewares/error';

/**
 * Firma un token JWT con la expiración y secreto del entorno.
 */
export function signToken(payload: AuthUserPayload): string {
  const env = getEnv();
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as any
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * Verifica un token JWT y retorna la carga útil de usuario.
 */
export function verifyToken(token: string): AuthUserPayload {
  const env = getEnv();
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUserPayload;
    return {
      id: decoded.id,
      username: decoded.username,
      displayName: decoded.displayName,
      role: decoded.role
    };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('El token de autenticación ha expirado', 'TOKEN_EXPIRED');
    }
    throw new UnauthorizedError('Token de autenticación inválido', 'UNAUTHORIZED');
  }
}
