import apiClient from './client';
import { TableWithSession } from '@cevicheria/shared';

export interface CreateTablePayload {
  code: string;
  zone?: string;
  seats?: number;
  active?: boolean;
}

export interface UpdateTablePayload {
  code?: string;
  zone?: string;
  seats?: number;
  active?: boolean;
}

export const tablesApi = {
  list: async (): Promise<{ data: TableWithSession[] }> => {
    const res = await apiClient.get<{ data: TableWithSession[] }>('/tables');
    return res.data;
  },

  create: async (payload: CreateTablePayload): Promise<TableWithSession> => {
    const res = await apiClient.post<TableWithSession>('/tables', payload);
    return res.data;
  },

  update: async (id: string, payload: UpdateTablePayload): Promise<TableWithSession> => {
    const res = await apiClient.patch<TableWithSession>(`/tables/${id}`, payload);
    return res.data;
  },

  closeSession: async (sessionId: string, notes?: string): Promise<any> => {
    const res = await apiClient.post(`/table-sessions/${sessionId}/close`, { notes });
    return res.data;
  }
};

export default tablesApi;
