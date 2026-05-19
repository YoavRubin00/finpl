import { create, type StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import type { AnonymizedStats } from './lib/anonymizedStats';

interface PayslipMetaState {
  everUsed: boolean;
  dailyCount: number;
  lastDate: string;
  legalAcceptedAt: number | null;
  /** Opt-in anonymized snapshot shared with clan. null = not sharing. */
  lastAnonymizedStats: AnonymizedStats | null;

  setEverUsed: () => void;
  incrementDailyCount: (date: string) => void;
  resetDailyCount: (date: string) => void;
  acceptLegal: () => void;
  setAnonymizedStats: (stats: AnonymizedStats) => void;
  clearAnonymizedStats: () => void;
}

type PersistedFields = Pick<
  PayslipMetaState,
  'everUsed' | 'dailyCount' | 'lastDate' | 'legalAcceptedAt' | 'lastAnonymizedStats'
>;

const createPayslipMeta: StateCreator<PayslipMetaState> = (set, get) => ({
  everUsed: false,
  dailyCount: 0,
  lastDate: '',
  legalAcceptedAt: null,
  lastAnonymizedStats: null,

  setEverUsed: () => {
    if (!get().everUsed) {
      set({ everUsed: true });
    }
  },

  incrementDailyCount: (date: string) => {
    const state = get();
    if (state.lastDate === date) {
      set({ dailyCount: state.dailyCount + 1 });
    } else {
      set({ dailyCount: 1, lastDate: date });
    }
  },

  resetDailyCount: (date: string) => set({ dailyCount: 0, lastDate: date }),

  acceptLegal: () => set({ legalAcceptedAt: Date.now() }),

  setAnonymizedStats: (stats) => set({ lastAnonymizedStats: stats }),
  clearAnonymizedStats: () => set({ lastAnonymizedStats: null }),
});

export const usePayslipMetaStore = create<PayslipMetaState>()(
  persist(createPayslipMeta, {
    name: 'payslip-meta-store',
    storage: createJSONStorage(() => zustandStorage),
    partialize: (state: PayslipMetaState): PersistedFields => ({
      everUsed: state.everUsed,
      dailyCount: state.dailyCount,
      lastDate: state.lastDate,
      legalAcceptedAt: state.legalAcceptedAt,
      lastAnonymizedStats: state.lastAnonymizedStats,
    }),
  }),
);
