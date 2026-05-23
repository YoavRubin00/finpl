import { create } from 'zustand';
import type {
  AnalystMessage,
  AnalystMode,
  StockHorizon,
} from './types';

interface StockAnalystState {
  messages: AnalystMessage[];
  mode: AnalystMode;
  horizon: StockHorizon;
  ticker: string;
  loading: boolean;
  error: string | null;
  consentGiven: boolean;

  setMode: (mode: AnalystMode) => void;
  setHorizon: (horizon: StockHorizon) => void;
  setTicker: (ticker: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setConsent: (consent: boolean) => void;

  appendMessage: (m: AnalystMessage) => void;
  removeMessage: (id: string) => void;
  clearSession: () => void;
}

const initial = {
  messages: [] as AnalystMessage[],
  mode: 'quick' as AnalystMode,
  horizon: 'medium' as StockHorizon,
  ticker: '',
  loading: false,
  error: null as string | null,
  consentGiven: false,
};

export const useStockAnalystStore = create<StockAnalystState>((set) => ({
  ...initial,

  setMode: (mode) => set({ mode }),
  setHorizon: (horizon) => set({ horizon }),
  setTicker: (ticker) => set({ ticker: ticker.toUpperCase().slice(0, 10) }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setConsent: (consent) => set({ consentGiven: consent }),

  appendMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  removeMessage: (id) => set((s) => ({ messages: s.messages.filter((msg) => msg.id !== id) })),
  clearSession: () => set({ messages: [], loading: false, error: null }),
}));
