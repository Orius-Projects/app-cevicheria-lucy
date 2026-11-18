import { OrderStatus, UserRole } from '../types';

export const USER_ROLES: readonly UserRole[] = ['ENCARGADO', 'MOZO', 'COCINERO'] as const;

export const ACTOR_ROLES = ['ENCARGADO', 'MOZO', 'COCINERO', 'SISTEMA'] as const;

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'ENVIADO',
  'LISTO',
  'ENTREGADO',
  'CANCELADO'
] as const;

export const DISH_STATUSES = [
  'INACTIVO',
  'DISPONIBLE',
  'ULTIMAS_RACIONES',
  'AGOTADO'
] as const;

export const TABLE_STATUSES = ['LIBRE', 'OCUPADA', 'POR_CERRAR'] as const;

export const TABLE_SESSION_STATUSES = ['ABIERTA', 'CERRADA'] as const;

export const SHIFT_STATUSES = ['ABIERTO', 'CERRADO'] as const;

export const MENU_DAY_STATUSES = ['BORRADOR', 'PUBLICADO'] as const;

export const DISH_COURSES = ['ENTRADA', 'FONDO', 'PLATO', 'BEBIDA', 'OTRO'] as const;

export const RATION_ADJUSTMENT_TYPES = [
  'REPLENISH',
  'ADJUSTMENT',
  'CANCELLATION_REVERSAL'
] as const;

export const CURRENCY = 'PEN' as const;

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export const ORDER_NOTES_MAX_LENGTH = 280;

export const ITEM_NOTES_MAX_LENGTH = 140;

/**
 * Matriz de transiciones normales de pedidos y roles autorizados.
 * Excepción P2: ENCARGADO puede realizar cierre manual excepcional (manualClose = true).
 */
export const ORDER_TRANSITIONS: Record<
  OrderStatus,
  Partial<Record<OrderStatus, readonly UserRole[]>>
> = {
  ENVIADO: {
    LISTO: ['COCINERO'],
    CANCELADO: ['MOZO']
  },
  LISTO: {
    ENTREGADO: ['MOZO'],
    CANCELADO: ['MOZO']
  },
  ENTREGADO: {},
  CANCELADO: {}
} as const;

/**
 * Códigos de error estándar y de dominio de la API
 */
export const ERROR_CODES = {
  // HTTP Estándar
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // Códigos de Dominio
  SHIFT_NOT_OPEN: 'SHIFT_NOT_OPEN',
  SHIFT_ALREADY_OPEN: 'SHIFT_ALREADY_OPEN',
  MENU_NOT_PUBLISHED: 'MENU_NOT_PUBLISHED',
  DISH_UNAVAILABLE: 'DISH_UNAVAILABLE',
  RATION_UNAVAILABLE: 'RATION_UNAVAILABLE',
  TABLE_INACTIVE: 'TABLE_INACTIVE',
  TABLE_HAS_ACTIVE_ORDERS: 'TABLE_HAS_ACTIVE_ORDERS',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  CANCELLATION_NOT_ALLOWED: 'CANCELLATION_NOT_ALLOWED',
  INVALID_REASON: 'INVALID_REASON',
  OPEN_ORDERS_REMAIN: 'OPEN_ORDERS_REMAIN',
  OPEN_TABLES_REMAIN: 'OPEN_TABLES_REMAIN',
  DUPLICATE_USERNAME: 'DUPLICATE_USERNAME'
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
