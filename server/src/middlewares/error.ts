import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiErrorDetail, ApiErrorResponse } from '@cevicheria/shared';
import { logger } from '../config/logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ApiErrorDetail[];

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: ApiErrorDetail[]
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Petición inválida', details?: ApiErrorDetail[]) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'No autorizado', code: string = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acceso denegado: permisos insuficientes') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso no encontrado') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code: string = 'CONFLICT', details?: ApiErrorDetail[]) {
    super(message, 409, code, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Error de validación en la petición', details?: ApiErrorDetail[]) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Servicio no disponible') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * Middleware de manejo de errores uniforme según contracts/rest-api.md §3
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.id || req.requestId;

  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Error interno del servidor';
  let details: ApiErrorDetail[] | undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Error de validación en los datos enviados';
    details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));
  } else if (err.name === 'ValidationError') {
    // Error de validación de Mongoose
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Error de validación de esquema';
    if (err.errors) {
      details = Object.keys(err.errors).map((key) => ({
        field: key,
        message: err.errors[key].message
      }));
    }
  } else if (err.name === 'CastError') {
    // Error de conversión de tipo en Mongoose (p. ej. ObjectId inválido)
    statusCode = 400;
    code = 'BAD_REQUEST';
    message = `Formato inválido para el campo: ${err.path}`;
    details = [{ field: err.path, message: `Valor no válido: ${err.value}` }];
  } else if (err.code === 11000) {
    // Error de clave duplicada en MongoDB
    statusCode = 409;
    const isUser = err.keyPattern && err.keyPattern.username;
    code = isUser ? 'DUPLICATE_USERNAME' : 'CONFLICT';
    const field = Object.keys(err.keyPattern || {})[0] || 'recurso';
    message = `Ya existe un registro con el valor especificado para ${field}`;
    details = [{ field, message: 'Valor duplicado' }];
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Token de autenticación inválido';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'El token de autenticación ha expirado';
  } else if (err.type === 'entity.parse.failed') {
    // JSON malformado en body
    statusCode = 400;
    code = 'BAD_REQUEST';
    message = 'JSON malformado en el cuerpo de la petición';
  } else {
    // Fallo inesperado
    logger.error(`Error no controlado: ${err.message}`, { stack: err.stack, requestId });
  }

  const responsePayload: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
      ...(requestId ? { requestId } : {})
    }
  };

  res.status(statusCode).json(responsePayload);
}
