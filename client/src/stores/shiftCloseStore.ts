import { create } from 'zustand';
import {
  ShiftDTO,
  OrderDTO,
  TableWithSession,
  ShiftSummary,
  ManualRecord,
  CreateManualRecordInput,
  MenuItemDTO
} from '@cevicheria/shared';
import { shiftCloseApi, extractShiftCloseApiError } from '../api/shiftClose.api';

export interface ShiftCloseState {
  shift: ShiftDTO | null;
  openOrders: OrderDTO[];
  openTables: TableWithSession[];
  summary: ShiftSummary | null;
  manualRecords: ManualRecord[];
  todayMenuItems: MenuItemDTO[];
  loading: boolean;
  error: string | null;
  highlightedTableCode: string | null;

  // Actions
  loadAll: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  closeTable: (sessionId: string, notes?: string) => Promise<any>;
  closeShift: (observations?: string) => Promise<ShiftSummary>;
  manualCloseOrder: (orderId: string, reason: string) => Promise<OrderDTO>;
  addManualRecord: (input: CreateManualRecordInput) => Promise<ManualRecord>;
  adjustRations: (
    menuItemId: string,
    remainingRations: number,
    reason: string
  ) => Promise<any>;
  setHighlightedTableCode: (tableCode: string | null) => void;
  clearError: () => void;
}

export const useShiftCloseStore = create<ShiftCloseState>((set, get) => ({
  shift: null,
  openOrders: [],
  openTables: [],
  summary: null,
  manualRecords: [],
  todayMenuItems: [],
  loading: false,
  error: null,
  highlightedTableCode: null,

  clearError: () => set({ error: null }),
  setHighlightedTableCode: (tableCode: string | null) =>
    set({ highlightedTableCode: tableCode }),

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const shift = await shiftCloseApi.getCurrentShift();
      if (!shift) {
        set({
          shift: null,
          openOrders: [],
          openTables: [],
          summary: null,
          manualRecords: [],
          todayMenuItems: [],
          loading: false
        });
        return;
      }

      const [ordersRes, tablesRes, summaryRes, manualRes, todayMenuRes] =
        await Promise.allSettled([
          shiftCloseApi.getActiveOrders(),
          shiftCloseApi.getTables(),
          shiftCloseApi.getSummary(shift.id),
          shiftCloseApi.getManualRecords(shift.id),
          shiftCloseApi.getTodayMenu()
        ]);

      const openOrders =
        ordersRes.status === 'fulfilled'
          ? ordersRes.value.filter(
              (o) => o.status === 'ENVIADO' || o.status === 'LISTO'
            )
          : [];

      const openTables =
        tablesRes.status === 'fulfilled'
          ? tablesRes.value.filter((t) => Boolean(t.openSessionId))
          : [];

      const summary = summaryRes.status === 'fulfilled' ? summaryRes.value : null;

      const manualRecords =
        manualRes.status === 'fulfilled'
          ? manualRes.value
          : summary?.manualRecords || [];

      const todayMenuItems: MenuItemDTO[] = [];
      if (todayMenuRes.status === 'fulfilled' && todayMenuRes.value) {
        const val = todayMenuRes.value as any;
        if (Array.isArray(val.sections)) {
          for (const sec of val.sections) {
            if (Array.isArray(sec.items)) {
              todayMenuItems.push(...sec.items);
            }
          }
        } else if (Array.isArray(val.items)) {
          todayMenuItems.push(...val.items);
        }
      }

      set({
        shift,
        openOrders,
        openTables,
        summary,
        manualRecords,
        todayMenuItems,
        loading: false
      });
    } catch (err: any) {
      const apiErr = extractShiftCloseApiError(err);
      set({ loading: false, error: apiErr.message });
    }
  },

  refreshSummary: async () => {
    const { shift } = get();
    if (!shift) return;
    try {
      const [summary, allOrders, allTables] = await Promise.all([
        shiftCloseApi.getSummary(shift.id),
        shiftCloseApi.getActiveOrders(),
        shiftCloseApi.getTables()
      ]);

      const openOrders = allOrders.filter(
        (o) => o.status === 'ENVIADO' || o.status === 'LISTO'
      );
      const openTables = allTables.filter((t) => Boolean(t.openSessionId));

      set({
        summary,
        manualRecords: summary.manualRecords || [],
        openOrders,
        openTables
      });
    } catch (err: any) {
      const apiErr = extractShiftCloseApiError(err);
      set({ error: apiErr.message });
    }
  },

  closeTable: async (sessionId: string, notes?: string) => {
    set({ error: null });
    try {
      const result = await shiftCloseApi.closeTableSession(sessionId, notes);
      // Remove from openTables
      set((state) => ({
        openTables: state.openTables.filter((t) => t.openSessionId !== sessionId)
      }));
      await get().refreshSummary();
      return result;
    } catch (err: any) {
      const apiErr = extractShiftCloseApiError(err);
      set({ error: apiErr.message });
      throw err;
    }
  },

  closeShift: async (observations?: string) => {
    const { shift } = get();
    if (!shift) {
      const err = new Error('No hay turno abierto para cerrar');
      set({ error: err.message });
      throw err;
    }

    set({ error: null });
    try {
      const summary = await shiftCloseApi.closeShift(shift.id, observations);
      set({
        shift: {
          ...shift,
          status: 'CERRADO',
          closedAt: summary.closedAt
        },
        summary,
        openOrders: [],
        openTables: []
      });
      return summary;
    } catch (err: any) {
      const apiErr = extractShiftCloseApiError(err);
      set({ error: apiErr.message });

      // Refresh remaining items on 409
      try {
        const [allOrders, allTables] = await Promise.all([
          shiftCloseApi.getActiveOrders(),
          shiftCloseApi.getTables()
        ]);
        set({
          openOrders: allOrders.filter(
            (o) => o.status === 'ENVIADO' || o.status === 'LISTO'
          ),
          openTables: allTables.filter((t) => Boolean(t.openSessionId))
        });
      } catch {
        // ignore secondary error
      }

      throw err;
    }
  },

  manualCloseOrder: async (orderId: string, reason: string) => {
    set({ error: null });
    try {
      const updated = await shiftCloseApi.manualCloseOrder(orderId, reason);
      set((state) => ({
        openOrders: state.openOrders.filter((o) => o.id !== orderId)
      }));
      await get().refreshSummary();
      return updated;
    } catch (err: any) {
      const apiErr = extractShiftCloseApiError(err);
      set({ error: apiErr.message });
      throw err;
    }
  },

  addManualRecord: async (input: CreateManualRecordInput) => {
    const { shift } = get();
    if (!shift) {
      const err = new Error('No hay turno para registrar pedidos');
      set({ error: err.message });
      throw err;
    }

    set({ error: null });
    try {
      const record = await shiftCloseApi.createManualRecord(shift.id, input);
      set((state) => ({
        manualRecords: [...state.manualRecords, record]
      }));
      await get().refreshSummary();
      return record;
    } catch (err: any) {
      const apiErr = extractShiftCloseApiError(err);
      set({ error: apiErr.message });
      throw err;
    }
  },

  adjustRations: async (
    menuItemId: string,
    remainingRations: number,
    reason: string
  ) => {
    set({ error: null });
    try {
      const result = await shiftCloseApi.adjustRations(
        menuItemId,
        remainingRations,
        reason
      );
      await get().refreshSummary();
      return result;
    } catch (err: any) {
      const apiErr = extractShiftCloseApiError(err);
      set({ error: apiErr.message });
      throw err;
    }
  }
}));

export default useShiftCloseStore;
