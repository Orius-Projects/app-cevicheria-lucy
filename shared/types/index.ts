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
  menuItemId?: string;
  menuDayId?: string;
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

export type Dish = DishDTO;
export type DishState = DishStatus;

export interface CreateDishInput {
  sectionId: string;
  name: string;
  description?: string;
  priceCents: number;
  course: DishCourse;
  isFixed?: boolean;
  isRotating?: boolean;
  sortOrder?: number;
  variations?: Array<{
    id?: string;
    name: string;
    sortOrder?: number;
    active?: boolean;
  }>;
}

export type UpdateDishInput = Partial<CreateDishInput> & { active?: boolean };

export interface MenuDayDTO {
  id: string;
  date: string;
  status: MenuDayStatus;
  publishedBy?: string | null;
  publishedAt?: Date | string | null;
  notes?: string;
  items?: MenuItemDTO[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type MenuDay = MenuDayDTO;

export interface CreateMenuDayInput {
  date: string;
  notes?: string;
}

export interface UpdateMenuDayItemInput {
  dishId: string;
  active?: boolean;
  hasRationsLimit?: boolean;
  totalRations?: number | null;
  remainingRations?: number | null;
}

export interface UpdateMenuDayInput {
  notes?: string;
  items?: UpdateMenuDayItemInput[];
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

export type MenuItem = MenuItemDTO;
export type MenuSection = MenuSectionDTO;
export type RationAdjustment = RationAdjustmentDTO;

export interface ActorSummary {
  _id?: string;
  id?: string;
  username: string;
  displayName?: string;
  role?: string;
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
  actorId: string | ActorSummary;
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
// Tipos para Toma de Pedidos (Spec 003)
// ==========================================

export interface TableWithSession {
  id: string;
  code: string;
  zone?: string;
  seats?: number;
  state: TableStatus;
  openSessionId?: string | null;
  active?: boolean;
}

export interface CreateOrderItemInput {
  dishId: string;
  quantity: number;
  variationIds?: string[];
  notes?: string;
}

export interface CreateOrderInput {
  tableId: string;
  items: CreateOrderItemInput[];
  notes?: string;
  clientRequestId?: string;
}

export interface OrderDraftItem {
  dishId: string;
  dishName: string;
  priceCents: number;
  quantity: number;
  variationIds?: string[];
  variations?: Array<{ id: string; name: string }>;
  notes?: string;
  remainingRations?: number | null;
}

export interface OrderDraft {
  tableId: string | null;
  tableCode?: string | null;
  items: OrderDraftItem[];
  notes?: string;
  clientRequestId: string;
}

export interface OrderListResponse {
  data: OrderDTO[];
  meta?: {
    total?: number;
    scope?: string;
    [key: string]: any;
  };
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
