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
  /** Deep analysis lands here first instead of being appended to `messages`,
   *  so a "הניתוח מוכן" toast can surface and the user can choose when to
   *  reveal it (e.g. after finishing a wait-state minigame). */
  pendingDeepCard: AnalystMessage | null;
  /** The loading-bubble id of the in-flight deep request — kept so the
   *  reveal action can remove it and replace it with the deep card. */
  pendingLoadingId: string | null;

  setMode: (mode: AnalystMode) => void;
  setHorizon: (horizon: StockHorizon) => void;
  setTicker: (ticker: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setConsent: (consent: boolean) => void;

  appendMessage: (m: AnalystMessage) => void;
  removeMessage: (id: string) => void;
  clearSession: () => void;

  /** Stash a freshly-fetched deep card + the loading bubble id to replace
   *  when the user (or auto-reveal timer) reveals. */
  setPendingDeepCard: (msg: AnalystMessage, loadingId: string) => void;
  /** Replace the loading bubble with the pending deep card, then clear
   *  pending. Idempotent — safe to call from both tap-toast and auto-timer. */
  revealPendingDeepCard: () => void;

  /** Wait-state minigame overlay visibility. In the store (not local screen
   *  state) so `LoadingBubble`'s "🎮 שחק בינתיים" button can open it without
   *  prop-drilling through `MessageRow`. */
  waitOverlayVisible: boolean;
  openWaitOverlay: () => void;
  closeWaitOverlay: () => void;
}

const initial = {
  messages: [] as AnalystMessage[],
  mode: 'quick' as AnalystMode,
  horizon: 'medium' as StockHorizon,
  ticker: '',
  loading: false,
  error: null as string | null,
  consentGiven: false,
  pendingDeepCard: null as AnalystMessage | null,
  pendingLoadingId: null as string | null,
  waitOverlayVisible: false,
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
  clearSession: () => set({ messages: [], loading: false, error: null, pendingDeepCard: null, pendingLoadingId: null, waitOverlayVisible: false }),

  setPendingDeepCard: (msg, loadingId) => set({ pendingDeepCard: msg, pendingLoadingId: loadingId }),
  revealPendingDeepCard: () => set((s) => {
    if (!s.pendingDeepCard) return s;
    const nextMessages = s.pendingLoadingId
      ? s.messages.filter((m) => m.id !== s.pendingLoadingId)
      : s.messages;
    return {
      messages: [...nextMessages, s.pendingDeepCard],
      pendingDeepCard: null,
      pendingLoadingId: null,
      loading: false,
      // Closing the overlay on reveal matches the user expectation: "I tapped
      // 'הניתוח מוכן', show me the analysis NOW" — not "minimize my game".
      waitOverlayVisible: false,
    };
  }),

  openWaitOverlay: () => set({ waitOverlayVisible: true }),
  closeWaitOverlay: () => set({ waitOverlayVisible: false }),
}));
