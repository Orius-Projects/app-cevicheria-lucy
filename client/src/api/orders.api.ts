import apiClient from './client';
import { OrderDTO, CreateOrderInput, OrderListResponse } from '@cevicheria/shared';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export function extractApiError(err: any): ApiError {
  if (err?.response?.data?.error) {
    return {
      code: err.response.data.error.code || 'UNKNOWN_ERROR',
      message: err.response.data.error.message || err.message,
      details: err.response.data.error.details
    };
  }
  return {
    code: 'NETWORK_ERROR',
    message: err?.message || 'Error de comunicación con el servidor'
  };
}

export const ordersApi = {
  create: async (data: CreateOrderInput): Promise<OrderDTO> => {
    const res = await apiClient.post<OrderDTO>('/orders', data);
    return res.data;
  },

  listActive: async (): Promise<OrderListResponse> => {
    const res = await apiClient.get<OrderListResponse>('/orders?scope=active');
    return res.data;
  },

  listReady: async (): Promise<OrderListResponse> => {
    const res = await apiClient.get<OrderListResponse>('/orders?scope=ready');
    return res.data;
  },

  getById: async (id: string): Promise<OrderDTO> => {
    const res = await apiClient.get<OrderDTO>(`/orders/${id}`);
    return res.data;
  },

  deliver: async (id: string, version: number): Promise<OrderDTO> => {
    const res = await apiClient.patch<OrderDTO>(`/orders/${id}/deliver`, { version });
    return res.data;
  },

  cancel: async (id: string, reason: string, version: number): Promise<OrderDTO> => {
    const res = await apiClient.patch<OrderDTO>(`/orders/${id}/cancel`, { reason, version });
    return res.data;
  }
};

export default ordersApi;
