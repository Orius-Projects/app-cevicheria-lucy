import { create } from 'zustand';
import {
  isSoundEnabled,
  setSoundEnabled as persistSoundEnabled,
  playReadySound
} from '../utils/notificationSound';

export interface NotificationToast {
  id: string; // eventId
  eventId: string;
  type: string;
  message: string;
  orderId?: string | null;
  tableCode?: string;
  orderNumber?: number;
  createdAt: Date | string;
  read: boolean;
  floatingVisible?: boolean;
}

export interface PushNotificationInput {
  eventId: string;
  type: string;
  message: string;
  orderId?: string | null;
  tableCode?: string;
  orderNumber?: number;
  createdAt?: Date | string;
  playSound?: boolean;
  autoHideMs?: number;
}

interface NotificationsState {
  toasts: NotificationToast[];
  unreadCount: number;
  soundEnabled: boolean;

  push: (input: PushNotificationInput) => void;
  hideFloating: (id: string) => void;
  dismiss: (id: string) => void;
  markAllRead: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
  clearAll: () => void;
}

const DEFAULT_FLOATING_DURATION_MS = 5000;
const floatingTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearFloatingTimer(id: string) {
  const timer = floatingTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    floatingTimers.delete(id);
  }
}

function clearAllFloatingTimers() {
  floatingTimers.forEach((timer) => clearTimeout(timer));
  floatingTimers.clear();
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  toasts: [],
  unreadCount: 0,
  soundEnabled: isSoundEnabled(),

  push: (input) => {
    const { toasts, soundEnabled } = get();

    // Dedupe por eventId
    if (toasts.some((t) => t.eventId === input.eventId)) {
      return;
    }

    const newToast: NotificationToast = {
      id: input.eventId,
      eventId: input.eventId,
      type: input.type,
      message: input.message,
      orderId: input.orderId ?? null,
      tableCode: input.tableCode,
      orderNumber: input.orderNumber,
      createdAt: input.createdAt || new Date().toISOString(),
      read: false,
      floatingVisible: true
    };

    // Reproducir sonido para pedidos listos si está habilitado
    if (input.playSound !== false && input.type === 'order:ready' && soundEnabled) {
      playReadySound();
    }

    const nextToasts = [newToast, ...toasts].slice(0, 20);
    const unread = nextToasts.filter((t) => !t.read).length;

    set({
      toasts: nextToasts,
      unreadCount: unread
    });

    // Temporizador global en el store para ocultar el toast flotante tras 5 segundos
    // sin importar si el mesero cambia de vista/ruta.
    const duration = input.autoHideMs ?? DEFAULT_FLOATING_DURATION_MS;
    if (duration > 0) {
      clearFloatingTimer(newToast.id);
      const timer = setTimeout(() => {
        floatingTimers.delete(newToast.id);
        get().hideFloating(newToast.id);
      }, duration);
      floatingTimers.set(newToast.id, timer);
    }
  },

  hideFloating: (id) => {
    clearFloatingTimer(id);
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id || t.eventId === id ? { ...t, floatingVisible: false } : t
      )
    }));
  },

  dismiss: (id) => {
    clearFloatingTimer(id);
    set((state) => {
      const nextToasts = state.toasts.filter((t) => t.id !== id && t.eventId !== id);
      return {
        toasts: nextToasts,
        unreadCount: nextToasts.filter((t) => !t.read).length
      };
    });
  },

  markAllRead: () => {
    set((state) => ({
      toasts: state.toasts.map((t) => ({ ...t, read: true })),
      unreadCount: 0
    }));
  },

  setSoundEnabled: (enabled: boolean) => {
    persistSoundEnabled(enabled);
    set({ soundEnabled: enabled });
  },

  toggleSound: () => {
    const nextVal = !get().soundEnabled;
    persistSoundEnabled(nextVal);
    set({ soundEnabled: nextVal });
  },

  clearAll: () => {
    clearAllFloatingTimers();
    set({ toasts: [], unreadCount: 0 });
  }
}));

export default useNotificationsStore;
