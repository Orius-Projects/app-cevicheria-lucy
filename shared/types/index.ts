// ==========================================
// Roles y Autenticación
// ==========================================

export type UserRole = 'ENCARGADO' | 'MOZO' | 'COCINERO';

export type ActorRole = 'ENCARGADO' | 'MOZO' | 'COCINERO' | 'SISTEMA';

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
}

// ==========================================
// Estados de Dominio
// ==========================================

export type OrderStatus = 'ENVIADO' | 'LISTO' | 'ENTREGADO' | 'CANCELADO';

export type LocalOrderStatus = 'BORRADOR' | OrderStatus;

export type DishStatus = 'INACTIVO' | 'DISPONIBLE' | 'ULTIMAS_RACIONES' | 'AGOTADO';

export type TableStatus = 'LIBRE' | 'OCUPADA' | 'POR_CERRAR';

export type TableSessionStatus = 'ABIERTA' | 'CERRADA';

export type ShiftStatus = 'ABIERTO' | 'CERRADO';

export type MenuDayStatus = 'BORRADOR' | 'PUBLICADO';

export type MenuSectionKey = 'CRIOLLO' | 'MARINO' | 'A_LA_CARTA' | 'BEBIDAS' | string;

export type DishCourse = 'ENTRADA' | 'FONDO' | 'PLATO' | 'BEBIDA' | 'OTRO';

export type RationAdjustmentType = 'REPLENISH' | 'ADJUSTMENT' | 'CANCELLATION_REVERSAL';

// ==========================================
// Subdocumentos
// ==========================================

export interface DishVariation {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
}

export interface OrderItemVariation {
  id: string;
  name: string;
}

export interface OrderItem {
  dishId: string;
  dishName: string;
  sectionName: string;
  unitPriceCents: number;
  quantity: number;
  variations?: OrderItemVariation[];
  notes?: string;
  lineTotalCents: number;
}

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  previousStatus?: LocalOrderStatus;
  at: Date | string;
  byUserId: string;
  byName: string;
  byRole: ActorRole;
  reason?: string;
  version: number;
}

// ==========================================
// Interfaces de Entidades Principales
// ==========================================

export interface UserDTO {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  lastLoginAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TableDTO {
  id: string;
  code: string;
  zone?: string;
  seats?: number;
  active: boolean;
  status?: TableStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ShiftDTO {
  id: string;
  date: string;
  label: string;
  status: ShiftStatus;
  openedBy: string;
  openedAt: Date | string;
  closedBy?: string | null;
  closedAt?: Date | string | null;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TableSessionDTO {
  id: string;
  tableId: string;
  tableCode: string;
  shiftId: string;
  status: TableSessionStatus;
  openedBy: string;
  openedAt: Date | string;
  closedBy?: string | null;
  closedAt?: Date | string | null;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface MenuSectionDTO {
  id: string;
  key: string;
  name: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DishDTO {
  id: string;
  sectionId: string;
  name: string;
  description?: string;
  priceCents: number;
  course: DishCourse;
  isFixed: boolean;
  isRotating: boolean;
  sortOrder: number;
  variations: DishVariation[];
  active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface MenuDayDTO {
  id: string;
  date: string;
  status: MenuDayStatus;
  publishedBy?: string | null;
  publishedAt?: Date | string | null;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface MenuItemDTO {
  id: string;
  menuDayId: string;
  dishId: string;
  dishName: string;
  sectionKey: string;
  priceCents: number;
  active: boolean;
  hasRationsLimit: boolean;
  totalRations?: number | null;
  remainingRations?: number | null;
  lowStockThreshold: number;
  manuallySoldOut: boolean;
  soldOutReason?: string | null;
  soldOutBy?: string | null;
  soldOutAt?: Date | string | null;
  updatedBy?: string | null;
  updatedAt: Date | string;
  version: number;
  status?: DishStatus;
}

export interface RationAdjustmentDTO {
  id: string;
  menuItemId: string;
  dishId: string;
  menuDayId: string;
  shiftId?: string | null;
  orderId?: string | null;
  type: RationAdjustmentType;
  previousRemaining?: number | null;
  newRemaining?: number | null;
  reason: string;
  actorId: string;
  actorRole: ActorRole;
  at: Date | string;
}

export interface OrderDTO {
  id: string;
  orderNumber: number;
  shiftId: string;
  tableId: string;
  tableCode: string;
  tableSessionId: string;
  takenByUserId: string;
  takenByName: string;
  readyByUserId?: string | null;
  readyByName?: string | null;
  deliveredByUserId?: string | null;
  deliveredByName?: string | null;
  cancelledByUserId?: string | null;
  cancelledByName?: string | null;
  status: OrderStatus;
  items: OrderItem[];
  notes?: string;
  totalCents: number;
  currency: string;
  statusHistory: OrderStatusHistoryEntry[];
  enviadoEn: Date | string;
  listoEn?: Date | string | null;
  entregadoEn?: Date | string | null;
  canceladoEn?: Date | string | null;
  cancelReason?: string | null;
  manualClose: boolean;
  manualCloseReason?: string | null;
  clientRequestId?: string | null;
  version: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CounterDTO {
  _id: string;
  seq: number;
}

export interface SettingsDTO {
  _id: string;
  restaurantName: string;
  currency: string;
  lowStockThreshold: number;
  updatedAt: Date | string;
}

// ==========================================
// Formato Uniforme de Respuestas de Error
// ==========================================

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    requestId?: string;
  };
}
