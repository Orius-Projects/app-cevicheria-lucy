import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError, BadRequestError } from './error';
import { ApiErrorDetail } from '@cevicheria/shared';

export interface ValidationSchemas {
  body?: ZodSchema<any>;
  query?: ZodSchema<any>;
  params?: ZodSchema<any>;
}

/**
 * Middleware factory para validación declarativa con esquemas Zod.
 * Retorna 422 VALIDATION_ERROR con array estructurado de detalles de campos,
 * o 400 BAD_REQUEST si la petición no puede procesarse.
 */
export function validate(schemas: ValidationSchemas) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const details: ApiErrorDetail[] = [];

      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          result.error.errors.forEach((err) => {
            details.push({
              field: `params.${err.path.join('.')}`,
              message: err.message
            });
          });
        } else {
          req.params = result.data;
        }
      }

      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          result.error.errors.forEach((err) => {
            details.push({
              field: `query.${err.path.join('.')}`,
              message: err.message
            });
          });
        } else {
          req.query = result.data;
        }
      }

      if (schemas.body) {
        if (req.body === undefined || req.body === null) {
          throw new BadRequestError('El cuerpo de la petición es obligatorio');
        }
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          result.error.errors.forEach((err) => {
            details.push({
              field: err.path.join('.'),
              message: err.message
            });
          });
        } else {
          req.body = result.data;
        }
      }

      if (details.length > 0) {
        throw new ValidationError('Los datos enviados contienen errores de validación', details);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: ApiErrorDetail[] = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        next(new ValidationError('Error de validación en la petición', details));
      } else {
        next(error);
      }
    }
  };
}
