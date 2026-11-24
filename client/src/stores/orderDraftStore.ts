import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OrderDraftItem } from '@cevicheria/shared';

function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export interface TableDraft {
  tableCode: string | null;
  items: OrderDraftItem[];
  notes: string;
  clientRequestId: string;
}

export interface OrderDraftState {
  tableId: string | null;
  tableCode: string | null;
  items: OrderDraftItem[];
  notes: string;
  clientRequestId: string;
  draftsByTable: Record<string, TableDraft>;

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
  clearDraftForTable: (tableId: string) => void;
  getTableDraftItemCount: (tableId: string) => number;
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
      draftsByTable: {},

      setTable: (tableId, tableCode = null) => {
        const {
          tableId: currentTableId,
          tableCode: currentTableCode,
          items: currentItems,
          notes: currentNotes,
          clientRequestId: currentRequestId,
          draftsByTable
        } = get();

        const updatedDrafts = { ...draftsByTable };

        // Si había una mesa activa previa, guardar su borrador si tiene contenido
        if (currentTableId) {
          if (currentItems.length > 0 || currentNotes.trim().length > 0) {
            updatedDrafts[currentTableId] = {
              tableCode: currentTableCode,
              items: [...currentItems],
              notes: currentNotes,
              clientRequestId: currentRequestId
            };
          } else {
            delete updatedDrafts[currentTableId];
          }
        }

        if (!tableId) {
          set({
            tableId: null,
            tableCode: null,
            items: [],
            notes: '',
            clientRequestId: generateRequestId(),
            draftsByTable: updatedDrafts
          });
          return;
        }

        // Si ya existe un borrador para la mesa seleccionada, cargarlo de forma aislada
        if (updatedDrafts[tableId]) {
          const draft = updatedDrafts[tableId];
          set({
            tableId,
            tableCode: tableCode || draft.tableCode,
            items: draft.items,
            notes: draft.notes,
            clientRequestId: draft.clientRequestId,
            draftsByTable: updatedDrafts
          });
        } else {
          // Si es la primera asignación de mesa y no tenía items, conservar el requestId inicial
          const newReqId = currentTableId ? generateRequestId() : currentRequestId;
          set({
            tableId,
            tableCode,
            items: [],
            notes: '',
            clientRequestId: newReqId,
            draftsByTable: updatedDrafts
          });
        }
      },

      addItem: (newItem) => {
        const { items, tableId, tableCode, notes, clientRequestId, draftsByTable } = get();
        const qtyToAdd = newItem.quantity && newItem.quantity > 0 ? newItem.quantity : 1;

        // Comprueba si ya existe un item con mismo dishId, mismas variaciones y mismas notas
        const newVarKey = (newItem.variationIds || []).slice().sort().join(',');
        const existingIdx = items.findIndex((i) => {
          const varKey = (i.variationIds || []).slice().sort().join(',');
          return i.dishId === newItem.dishId && varKey === newVarKey && (i.notes || '') === (newItem.notes || '');
        });

        let updatedItems: OrderDraftItem[];

        if (existingIdx >= 0) {
          const existing = items[existingIdx];
          const newTotalQty = existing.quantity + qtyToAdd;

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

          updatedItems = [...items];
          updatedItems[existingIdx] = { ...existing, quantity: newTotalQty };
        } else {
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

          updatedItems = [...items, draftItem];
        }

        const updatedDrafts = { ...draftsByTable };
        if (tableId) {
          updatedDrafts[tableId] = {
            tableCode,
            items: updatedItems,
            notes,
            clientRequestId
          };
        }

        set({ items: updatedItems, draftsByTable: updatedDrafts });
        return { success: true };
      },

      updateItemQuantity: (index, quantity) => {
        const { items, tableId, tableCode, notes, clientRequestId, draftsByTable } = get();
        if (index < 0 || index >= items.length) return;

        let updatedItems: OrderDraftItem[];
        if (quantity <= 0) {
          updatedItems = items.filter((_, i) => i !== index);
        } else {
          const target = items[index];
          let clampedQty = Math.floor(quantity);
          if (
            target.remainingRations !== null &&
            target.remainingRations !== undefined &&
            clampedQty > target.remainingRations
          ) {
            clampedQty = target.remainingRations;
          }
          updatedItems = [...items];
          updatedItems[index] = { ...target, quantity: clampedQty };
        }

        const updatedDrafts = { ...draftsByTable };
        if (tableId) {
          updatedDrafts[tableId] = {
            tableCode,
            items: updatedItems,
            notes,
            clientRequestId
          };
        }

        set({ items: updatedItems, draftsByTable: updatedDrafts });
      },

      updateItemNotes: (index, notesText) => {
        const { items, tableId, tableCode, notes, clientRequestId, draftsByTable } = get();
        if (index < 0 || index >= items.length) return;
        const trimmed = notesText.slice(0, 140);
        const updatedItems = [...items];
        updatedItems[index] = { ...updatedItems[index], notes: trimmed };

        const updatedDrafts = { ...draftsByTable };
        if (tableId) {
          updatedDrafts[tableId] = {
            tableCode,
            items: updatedItems,
            notes,
            clientRequestId
          };
        }

        set({ items: updatedItems, draftsByTable: updatedDrafts });
      },

      updateItemVariations: (index, variationIds, variations) => {
        const { items, tableId, tableCode, notes, clientRequestId, draftsByTable } = get();
        if (index < 0 || index >= items.length) return;
        const updatedItems = [...items];
        updatedItems[index] = { ...updatedItems[index], variationIds, variations };

        const updatedDrafts = { ...draftsByTable };
        if (tableId) {
          updatedDrafts[tableId] = {
            tableCode,
            items: updatedItems,
            notes,
            clientRequestId
          };
        }

        set({ items: updatedItems, draftsByTable: updatedDrafts });
      },

      removeItem: (index) => {
        const { items, tableId, tableCode, notes, clientRequestId, draftsByTable } = get();
        const updatedItems = items.filter((_, i) => i !== index);

        const updatedDrafts = { ...draftsByTable };
        if (tableId) {
          updatedDrafts[tableId] = {
            tableCode,
            items: updatedItems,
            notes,
            clientRequestId
          };
        }

        set({ items: updatedItems, draftsByTable: updatedDrafts });
      },

      setGeneralNotes: (notesText) => {
        const { items, tableId, tableCode, clientRequestId, draftsByTable } = get();
        const trimmed = notesText.slice(0, 280);

        const updatedDrafts = { ...draftsByTable };
        if (tableId) {
          updatedDrafts[tableId] = {
            tableCode,
            items,
            notes: trimmed,
            clientRequestId
          };
        }

        set({ notes: trimmed, draftsByTable: updatedDrafts });
      },

      clearDraft: () => {
        const { tableId, draftsByTable } = get();
        const updatedDrafts = { ...draftsByTable };
        if (tableId) {
          delete updatedDrafts[tableId];
        }

        set({
          tableId: null,
          tableCode: null,
          items: [],
          notes: '',
          clientRequestId: generateRequestId(),
          draftsByTable: updatedDrafts
        });
      },

      clearDraftForTable: (targetTableId) => {
        const { tableId, draftsByTable } = get();
        const updatedDrafts = { ...draftsByTable };
        delete updatedDrafts[targetTableId];

        if (tableId === targetTableId) {
          set({
            items: [],
            notes: '',
            clientRequestId: generateRequestId(),
            draftsByTable: updatedDrafts
          });
        } else {
          set({ draftsByTable: updatedDrafts });
        }
      },

      getTableDraftItemCount: (targetTableId) => {
        const { tableId, items, draftsByTable } = get();
        if (tableId === targetTableId) {
          return items.reduce((acc, curr) => acc + curr.quantity, 0);
        }
        const draft = draftsByTable[targetTableId];
        if (!draft) return 0;
        return draft.items.reduce((acc, curr) => acc + curr.quantity, 0);
      },

      reseedRequestId: () => {
        const newReqId = generateRequestId();
        const { tableId, tableCode, items, notes, draftsByTable } = get();
        const updatedDrafts = { ...draftsByTable };
        if (tableId) {
          updatedDrafts[tableId] = {
            tableCode,
            items,
            notes,
            clientRequestId: newReqId
          };
        }
        set({ clientRequestId: newReqId, draftsByTable: updatedDrafts });
      },

      syncWithMenu: (availableDishes) => {
        const { items, tableId, tableCode, notes, clientRequestId, draftsByTable } = get();
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

        const updatedDrafts = { ...draftsByTable };
        if (tableId && adjusted) {
          updatedDrafts[tableId] = {
            tableCode,
            items: nextItems,
            notes,
            clientRequestId
          };
        }

        if (adjusted) {
          set({ items: nextItems, draftsByTable: updatedDrafts });
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
        clientRequestId: state.clientRequestId,
        draftsByTable: state.draftsByTable
      })
    }
  )
);

export default useOrderDraftStore;
