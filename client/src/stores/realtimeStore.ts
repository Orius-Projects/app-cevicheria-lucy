import { create } from 'zustand';
import { RealtimeConnectionStatus } from '@cevicheria/shared';

export interface RealtimeState {
  status: RealtimeConnectionStatus;
  lastEventAt: Date | null;
  lastError: string | null;

  setStatus: (status: RealtimeConnectionStatus) => void;
  setLastError: (err: string | null) => void;
  setLastEventAt: (date: Date) => void;
  reset: () => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  status: 'disconnected',
  lastEventAt: null,
  lastError: null,

  setStatus: (status) => set({ status }),
  setLastError: (lastError) => set({ lastError }),
  setLastEventAt: (lastEventAt) => set({ lastEventAt }),
  reset: () => set({ status: 'disconnected', lastEventAt: null, lastError: null })
}));

export default useRealtimeStore;
