import apiClient from './client';
import {
  ShiftDTO,
  OrderDTO,
  TableWithSession,
  ShiftSummary,
  ManualRecord,
  CreateManualRecordInput,
  RationAdjustmentDTO,
  OrderListResponse
} from '@cevicheria/shared';

export interface ApiNormalizedError {
  code: string;
  message: string;
  status?: number;
  details?: any;
}

export class ShiftCloseApiError extends Error {
  code: string;
  status?: number;
  details?: any;

  constructor(message: string, code: string, status?: number, details?: any) {
    super(message);
    this.name = 'ShiftCloseApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function extractShiftCloseApiError(err: any): ApiNormalizedError {
  const code =
    err?.response?.data?.error?.code ||
    (err?.response?.status === 404 ? 'NOT_FOUND' : 'UNKNOWN_ERROR');
  const message =
    err?.response?.data?.error?.message || err?.message || 'Error en la operación';
  const status = err?.response?.status;
  const details = err?.response?.data?.error?.details;
  return { code, message, status, details };
}

export function normalizeError(err: any): ShiftCloseApiError {
  if (err instanceof ShiftCloseApiError) return err;
  const norm = extractShiftCloseApiError(err);
  return new ShiftCloseApiError(norm.message, norm.code, norm.status, norm.details);
}

export const shiftCloseApi = {
  getCurrentShift: async (): Promise<ShiftDTO | null> => {
    try {
      const res = await apiClient.get<ShiftDTO>('/shifts/current');
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return null;
      }
      throw normalizeError(err);
    }
  },

  getActiveOrders: async (): Promise<OrderDTO[]> => {
    try {
      const res = await apiClient.get<OrderListResponse>('/orders?scope=active');
      return res.data.data || [];
    } catch (err: any) {
      throw normalizeError(err);
    }
  },

  getTables: async (): Promise<TableWithSession[]> => {
    try {
      const res = await apiClient.get<{ data: TableWithSession[] }>('/tables');
      return res.data.data || [];
    } catch (err: any) {
      throw normalizeError(err);
    }
  },

  getSummary: async (shiftId: string): Promise<ShiftSummary> => {
    try {
      const res = await apiClient.get<ShiftSummary>(`/shifts/${shiftId}/summary`);
      return res.data;
    } catch (err: any) {
      throw normalizeError(err);
    }
  },

  closeShift: async (shiftId: string, observations?: string): Promise<ShiftSummary> => {
    try {
      const res = await apiClient.post<ShiftSummary>(`/shifts/${shiftId}/close`, {
        observations
      });
      return res.data;
    } catch (err: any) {
      throw normalizeError(err);
    }
  },

  closeTableSession: async (sessionId: string, notes?: string): Promise<any> => {
    try {
      const res = await apiClient.post(`/table-sessions/${sessionId}/close`, { notes });
      return res.data;
    } catch (err: any) {
      throw normalizeError(err);
    }
  },

  manualCloseOrder: async (orderId: string, reason: string): Promise<OrderDTO> => {
    try {
      const res = await apiClient.post<OrderDTO>(`/orders/${orderId}/manual-close`, {
        reason
      });
      return res.data;
    } catch (err: any) {
      throw normalizeError(err);
    }
  },

  getManualRecords: async (shiftId: string): Promise<ManualRecord[]> => {
    try {
      const res = await apiClient.get<ManualRecord[]>(`/shifts/${shiftId}/manual-records`);
      return res.data || [];
    } catch (err: any) {
      throw normalizeError(err);
    }
  },

  createManualRecord: async (
    shiftId: string,
    data: CreateManualRecordInput
  ): Promise<ManualRecord> => {
    try {
      const res = await apiClient.post<ManualRecord>(
        `/shifts/${shiftId}/manual-records`,
        data
      );
      return res.data;
    } catch (err: any) {
      throw normalizeError(err);
    }
  },

  adjustRations: async (
    menuItemId: string,
    remainingRations: number,
    reason: string
  ): Promise<any> => {
    try {
      const res = await apiClient.post(`/menu-items/${menuItemId}/rations/adjust`, {
        remainingRations,
        reason
      });
      return res.data;
    } catch (err: any) {
      throw normalizeError(err);
    }
  },

  getRationAdjustments: async (menuItemId: string): Promise<RationAdjustmentDTO[]> => {
    try {
      const res = await apiClient.get<RationAdjustmentDTO[]>(
        `/menu-items/${menuItemId}/rations/adjustments`
      );
      return res.data || [];
    } catch (err: any) {
      throw normalizeError(err);
    }
  },

  getTodayMenu: async (): Promise<any> => {
    try {
      const res = await apiClient.get<any>('/menu/today');
      return res.data;
    } catch (err: any) {
      throw normalizeError(err);
    }
  }
};

export default shiftCloseApi;
