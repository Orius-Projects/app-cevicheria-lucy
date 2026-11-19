import apiClient from './client';
import { KitchenBoard, OrderDTO } from '@cevicheria/shared';
import { extractApiError } from './orders.api';

export const kitchenApi = {
  getBoard: async (): Promise<KitchenBoard> => {
    const res = await apiClient.get<KitchenBoard>('/kitchen/board');
    return res.data;
  },

  markReady: async (orderId: string, version: number): Promise<OrderDTO> => {
    const res = await apiClient.patch<OrderDTO>(`/orders/${orderId}/ready`, { version });
    return res.data;
  }
};

export { extractApiError };
export default kitchenApi;
