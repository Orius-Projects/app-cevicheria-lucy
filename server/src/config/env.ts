import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Intenta cargar .env desde la raíz del proyecto o desde la carpeta actual
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  MONGODB_URI: z
    .string({
      required_error: 'MONGODB_URI is required to connect to MongoDB',
      invalid_type_error: 'MONGODB_URI must be a string'
    })
    .min(1, 'MONGODB_URI is required to connect to MongoDB'),
  JWT_SECRET: z
    .string({
      required_error: 'JWT_SECRET is required for authentication',
      invalid_type_error: 'JWT_SECRET must be a string'
    })
    .min(1, 'JWT_SECRET is required for authentication'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGIN: z
    .union([z.string(), z.array(z.string())])
    .default('http://localhost:5173')
    .transform((val) => {
      if (Array.isArray(val)) return val;
      const parts = val.split(',').map((s) => s.trim()).filter(Boolean);
      return parts.length > 1 ? parts : parts[0] || '*';
    }),
  SERVE_STATIC: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => val === true || val === 'true' || val === '1')
    .default(false)
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env | null = null;

export function validateEnv(): Env {
  if (parsedEnv && process.env.NODE_ENV !== 'test') {
    return parsedEnv;
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formattedErrors = result.error.errors
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    const errorMessage = `[ENV_ERROR] Configuración de entorno inválida:\n${formattedErrors}`;
    throw new Error(errorMessage);
  }

  parsedEnv = result.data;
  return parsedEnv;
}

export function getEnv(): Env {
  return validateEnv();
}
