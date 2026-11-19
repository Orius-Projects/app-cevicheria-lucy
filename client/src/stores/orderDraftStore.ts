import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OrderDraftItem } from '@cevicheria/shared';

function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export interface OrderDraftState {
  tableId: string | null;
  tableCode: string | null;
  items: OrderDraftItem[];
  notes: string;
  clientRequestId: string;

  // Acciones
  setTable: (tableId: string | null, tableCode?: string | null) => void;
  addItem: (
    item: Omit<OrderDraftItem, 'quantity'> & { quantity?: number }
  ) => { success: boolean; reason?: string };
  updateItemQuantity: (index: number, quantity: number) => void;
  updateItemNotes: (index: number, notes: string) => void;
  updateItemVariations: (
    index: number,
    variationIds: string[],
    variations: Array<{ id: string; name: string }>
  ) => void;
  removeItem: (index: number) => void;
  setGeneralNotes: (notes: string) => void;
  clearDraft: () => void;
  reseedRequestId: () => void;
  syncWithMenu: (
    availableDishes:
      | Map<string, { remainingRations?: number | null; status?: string }>
      | Array<{ dishId: string; remainingRations?: number | null; status?: string }>
  ) => {
    adjusted: boolean;
    removedCount: number;
  };

  // Computados
  totalCents: () => number;
  itemCount: () => number;
  canSubmit: () => boolean;
}

export const useOrderDraftStore = create<OrderDraftState>()(
  persist(
    (set, get) => ({
      tableId: null,
      tableCode: null,
      items: [],
      notes: '',
      clientRequestId: generateRequestId(),

      setTable: (tableId, tableCode = null) => {
        set({ tableId, tableCode });
      },

      addItem: (newItem) => {
        const { items } = get();
        const qtyToAdd = newItem.quantity && newItem.quantity > 0 ? newItem.quantity : 1;

        // Comprueba si ya existe un item con mismo dishId, mismas variaciones y mismas notas
        const newVarKey = (newItem.variationIds || []).slice().sort().join(',');
        const existingIdx = items.findIndex((i) => {
          const varKey = (i.variationIds || []).slice().sort().join(',');
          return i.dishId === newItem.dishId && varKey === newVarKey && (i.notes || '') === (newItem.notes || '');
        });

        if (existingIdx >= 0) {
          const existing = items[existingIdx];
          const newTotalQty = existing.quantity + qtyToAdd;

          // Si tiene límite de raciones, verificar que no supere
          if (
            existing.remainingRations !== null &&
            existing.remainingRations !== undefined &&
            newTotalQty > existing.remainingRations
          ) {
            return {
              success: false,
              reason: `No hay suficientes raciones disponibles (quedan ${existing.remainingRations})`
            };
          }

          const updated = [...items];
          updated[existingIdx] = { ...existing, quantity: newTotalQty };
          set({ items: updated });
          return { success: true };
        }

        // Nuevo ítem: verificar raciones disponibles si aplica
        if (
          newItem.remainingRations !== null &&
          newItem.remainingRations !== undefined &&
          qtyToAdd > newItem.remainingRations
        ) {
          return {
            success: false,
            reason: `No hay suficientes raciones disponibles (quedan ${newItem.remainingRations})`
          };
        }

        const draftItem: OrderDraftItem = {
          dishId: newItem.dishId,
          dishName: newItem.dishName,
          priceCents: newItem.priceCents,
          quantity: qtyToAdd,
          variationIds: newItem.variationIds || [],
          variations: newItem.variations || [],
          notes: newItem.notes || '',
          remainingRations: newItem.remainingRations
        };

        set({ items: [...items, draftItem] });
        return { success: true };
      },

      updateItemQuantity: (index, quantity) => {
        const { items } = get();
        if (index < 0 || index >= items.length) return;

        if (quantity <= 0) {
          set({ items: items.filter((_, i) => i !== index) });
          return;
        }

        const target = items[index];
        let clampedQty = Math.floor(quantity);
        if (
          target.remainingRations !== null &&
          target.remainingRations !== undefined &&
          clampedQty > target.remainingRations
        ) {
          clampedQty = target.remainingRations;
        }

        const updated = [...items];
        updated[index] = { ...target, quantity: clampedQty };
        set({ items: updated });
      },

      updateItemNotes: (index, notes) => {
        const { items } = get();
        if (index < 0 || index >= items.length) return;
        const trimmed = notes.slice(0, 140);
        const updated = [...items];
        updated[index] = { ...updated[index], notes: trimmed };
        set({ items: updated });
      },

      updateItemVariations: (index, variationIds, variations) => {
        const { items } = get();
        if (index < 0 || index >= items.length) return;
        const updated = [...items];
        updated[index] = { ...updated[index], variationIds, variations };
        set({ items: updated });
      },

      removeItem: (index) => {
        const { items } = get();
        set({ items: items.filter((_, i) => i !== index) });
      },

      setGeneralNotes: (notes) => {
        const trimmed = notes.slice(0, 280);
        set({ notes: trimmed });
      },

      clearDraft: () => {
        set({
          tableId: null,
          tableCode: null,
          items: [],
          notes: '',
          clientRequestId: generateRequestId()
        });
      },

      reseedRequestId: () => {
        set({ clientRequestId: generateRequestId() });
      },

      syncWithMenu: (availableDishes) => {
        const { items } = get();
        let adjusted = false;
        let removedCount = 0;
        const nextItems: OrderDraftItem[] = [];

        let dishMap: Map<string, { remainingRations?: number | null; status?: string }>;
        if (Array.isArray(availableDishes)) {
          dishMap = new Map();
          for (const d of availableDishes) {
            dishMap.set(d.dishId, { remainingRations: d.remainingRations, status: d.status });
          }
        } else {
          dishMap = availableDishes;
        }

        for (const item of items) {
          const dishInfo = dishMap.get(item.dishId);
          if (!dishInfo || dishInfo.status === 'AGOTADO' || dishInfo.status === 'INACTIVO') {
            adjusted = true;
            removedCount++;
            continue;
          }

          const rem = dishInfo.remainingRations;
          let qty = item.quantity;
          if (rem !== null && rem !== undefined) {
            if (rem <= 0) {
              adjusted = true;
              removedCount++;
              continue;
            } else if (qty > rem) {
              qty = rem;
              adjusted = true;
            }
          }

          nextItems.push({
            ...item,
            quantity: qty,
            remainingRations: rem
          });
        }

        if (adjusted) {
          set({ items: nextItems });
        }
        return { adjusted, removedCount };
      },

      totalCents: () => {
        return get().items.reduce((acc, curr) => acc + curr.priceCents * curr.quantity, 0);
      },

      itemCount: () => {
        return get().items.reduce((acc, curr) => acc + curr.quantity, 0);
      },

      canSubmit: () => {
        const { tableId, items } = get();
        return Boolean(tableId && items.length > 0);
      }
    }),
    {
      name: 'order-draft-storage',
      partialize: (state) => ({
        tableId: state.tableId,
        tableCode: state.tableCode,
        items: state.items,
        notes: state.notes,
        clientRequestId: state.clientRequestId
      })
    }
  )
);

export default useOrderDraftStore;
