import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import type {
  AnalystMode,
  StockAnalysisDeep,
  StockAnalysisQuick,
  StockHorizon,
  StockVerdict,
} from './types';

const HISTORY_CAP = 50;

interface BaseEntry {
  id: string;
  ticker: string;
  companyName: string;
  horizon: StockHorizon;
  verdict: StockVerdict;
  ts: number;
}

export type HistoryEntry =
  | (BaseEntry & { mode: 'quick'; data: StockAnalysisQuick })
  | (BaseEntry & { mode: 'deep'; data: StockAnalysisDeep });

interface AnalystHistoryState {
  entries: HistoryEntry[];
  addQuick: (data: StockAnalysisQuick) => void;
  addDeep: (data: StockAnalysisDeep) => void;
  removeEntry: (id: string) => void;
  clearAll: () => void;
  byMode: (mode: AnalystMode) => HistoryEntry[];
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useAnalystHistoryStore = create<AnalystHistoryState>()(
  persist(
    (set, get) => ({
      entries: [],

      addQuick: (data) =>
        set((s) => {
          const entry: HistoryEntry = {
            id: nextId('q'),
            ticker: data.ticker,
            companyName: data.companyName,
            horizon: data.horizon,
            verdict: data.verdict,
            mode: 'quick',
            data,
            ts: Date.now(),
          };
          return { entries: [entry, ...s.entries].slice(0, HISTORY_CAP) };
        }),

      addDeep: (data) =>
        set((s) => {
          const entry: HistoryEntry = {
            id: nextId('d'),
            ticker: data.ticker,
            companyName: data.companyName,
            horizon: data.horizon,
            verdict: data.summary.verdict,
            mode: 'deep',
            data,
            ts: Date.now(),
          };
          return { entries: [entry, ...s.entries].slice(0, HISTORY_CAP) };
        }),

      removeEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      clearAll: () => set({ entries: [] }),
      byMode: (mode) => get().entries.filter((e) => e.mode === mode),
    }),
    {
      name: 'stock-analyst-history',
      storage: createJSONStorage(() => zustandStorage),
      version: 1,
    },
  ),
);
