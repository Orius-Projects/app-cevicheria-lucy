import { apiClient } from './client';
import {
  MenuSectionDTO,
  DishDTO,
  CreateDishInput,
  UpdateDishInput,
  MenuDayDTO,
  MenuItemDTO,
  RationAdjustmentDTO,
  MenuDayStatus,
  DishStatus,
  DishCourse
} from '@cevicheria/shared';

export interface TodayMenuItem extends MenuItemDTO {
  description?: string;
  course?: DishCourse;
  isFixed?: boolean;
  isRotating?: boolean;
  state?: DishStatus;
  status: DishStatus;
  variations?: Array<{ id: string; name: string; active?: boolean }>;
  dish?: DishDTO | null;
}

export interface TodayMenuSection {
  key: string;
  name: string;
  items: TodayMenuItem[];
}

export interface TodayMenuResponse {
  menuDayId: string;
  date: string;
  status: MenuDayStatus;
  sections: TodayMenuSection[];
}

export interface MenuDayDetailResponse {
  id: string;
  date: string;
  status: MenuDayStatus;
  notes?: string;
  publishedAt?: Date | string | null;
  items: MenuItemDTO[];
}

export interface UpdateMenuDayItemInput {
  dishId: string;
  active?: boolean;
  hasRationsLimit?: boolean;
  totalRations?: number | null;
  remainingRations?: number | null;
  priceCents?: number;
}

export interface UpdateMenuDayData {
  notes?: string;
  items?: UpdateMenuDayItemInput[];
}

export const menuApi = {
  // Secciones
  async getSections(): Promise<MenuSectionDTO[]> {
    const res = await apiClient.get<MenuSectionDTO[]>('/menu-sections');
    return res.data;
  },

  // Platos maestros (CRUD)
  async getDishes(): Promise<DishDTO[]> {
    const res = await apiClient.get<DishDTO[]>('/dishes');
    return res.data;
  },

  async createDish(data: CreateDishInput): Promise<DishDTO> {
    const res = await apiClient.post<DishDTO>('/dishes', data);
    return res.data;
  },

  async updateDish(id: string, data: UpdateDishInput): Promise<DishDTO> {
    const res = await apiClient.patch<DishDTO>(`/dishes/${id}`, data);
    return res.data;
  },

  async deleteDish(id: string): Promise<void> {
    await apiClient.delete(`/dishes/${id}`);
  },

  // Menú del día
  async getMenuToday(date?: string): Promise<TodayMenuResponse> {
    const res = await apiClient.get<TodayMenuResponse>('/menu/today', {
      params: date ? { date } : undefined
    });
    return res.data;
  },

  async getMenuDayByDate(date: string): Promise<MenuDayDetailResponse> {
    const res = await apiClient.get<MenuDayDetailResponse>(`/menu/days/${date}`);
    return res.data;
  },

  async createMenuDay(date: string, notes?: string): Promise<MenuDayDTO> {
    const res = await apiClient.post<MenuDayDTO>('/menu/days', { date, notes });
    return res.data;
  },

  async updateMenuDay(id: string, data: UpdateMenuDayData): Promise<MenuDayDTO> {
    const res = await apiClient.put<MenuDayDTO>(`/menu/days/${id}`, data);
    return res.data;
  },

  async publishMenuDay(id: string): Promise<MenuDayDTO> {
    const res = await apiClient.post<MenuDayDTO>(`/menu/days/${id}/publish`);
    return res.data;
  },

  // Gestión de raciones y disponibilidad
  async replenishRations(
    menuItemId: string,
    quantity: number,
    reason: string
  ): Promise<MenuItemDTO> {
    const res = await apiClient.post<MenuItemDTO>(
      `/menu-items/${menuItemId}/rations/replenish`,
      { quantity, reason }
    );
    return res.data;
  },

  async adjustRations(
    menuItemId: string,
    remainingRations: number,
    reason: string
  ): Promise<MenuItemDTO> {
    const res = await apiClient.post<MenuItemDTO>(
      `/menu-items/${menuItemId}/rations/adjust`,
      { remainingRations, reason }
    );
    return res.data;
  },

  async markSoldOut(menuItemId: string, reason: string): Promise<MenuItemDTO> {
    const res = await apiClient.post<MenuItemDTO>(
      `/menu-items/${menuItemId}/sold-out`,
      { reason }
    );
    return res.data;
  },

  async reactivateDish(menuItemId: string, reason?: string): Promise<MenuItemDTO> {
    const res = await apiClient.post<MenuItemDTO>(
      `/menu-items/${menuItemId}/reactivate`,
      { reason: reason || 'Insumo restablecido' }
    );
    return res.data;
  },

  async getRationAdjustments(menuItemId: string): Promise<RationAdjustmentDTO[]> {
    const res = await apiClient.get<RationAdjustmentDTO[]>(
      `/menu-items/${menuItemId}/rations/adjustments`
    );
    return res.data;
  }
};

export default menuApi;
