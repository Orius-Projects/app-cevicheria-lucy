// ==========================================
// Tipos para Cierre de Turno (Spec 006)
// ==========================================

export interface SoldDishRow {
  dishId: string;
  dishName: string;
  quantity: number;
  amountCents: number;
}

export interface RemainingRationRow {
  dishId: string;
  dishName: string;
  remainingRations: number;
}

export interface SoldOutRow {
  dishId: string;
  dishName: string;
  reason: string;
}

export interface CancellationRow {
  orderNumber: number;
  reason: string;
  cancelledBy: string;
}

export interface ManualRecordItem {
  name: string;
  quantity: number;
  amountCents: number;
}

export interface ManualRecord {
  id: string;
  tableCode: string;
  items: ManualRecordItem[];
  totalCents: number;
  notes?: string;
  source: 'PAPER' | string;
  createdBy?: any;
  createdAt?: Date | string;
}

export interface CreateManualRecordItemInput {
  name: string;
  quantity: number;
  amountCents: number;
}

export interface CreateManualRecordInput {
  tableCode: string;
  items: CreateManualRecordItemInput[];
  totalCents?: number;
  notes?: string;
}

export interface ShiftSummary {
  shiftId: string;
  date: string;
  label: string;
  soldDishes: SoldDishRow[];
  remainingRations: RemainingRationRow[];
  soldOutDishes: SoldOutRow[];
  cancellations: CancellationRow[];
  manualRecords: ManualRecord[];
  manualTotalCents: number;
  totalAmountCents: number;
  observations: string;
  closedAt: string | null;
}
