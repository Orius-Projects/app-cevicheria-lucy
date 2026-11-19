import apiClient from './client';
import { TableWithSession } from '@cevicheria/shared';

export const tablesApi = {
  list: async (): Promise<{ data: TableWithSession[] }> => {
    const res = await apiClient.get<{ data: TableWithSession[] }>('/tables');
    return res.data;
  },

  closeSession: async (sessionId: string, notes?: string): Promise<any> => {
    const res = await apiClient.post(`/table-sessions/${sessionId}/close`, { notes });
    return res.data;
  }
};

export default tablesApi;
