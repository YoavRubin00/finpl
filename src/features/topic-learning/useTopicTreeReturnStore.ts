import { create } from 'zustand';

/**
 * Transient (non-persisted) hand-off between a topic-tree sub-module lesson and
 * the topic-tree map it was opened from.
 *
 * Premium-transition path (Yoav 2026-06-11): when the root is a native Stack,
 * the map stays mounted under the pushed `/lesson/[id]`. On chip completion the
 * lesson `signalReturn(...)` + `router.back()` — popping to the LIVE map with no
 * remount / "flash" — and DuoLearnScreen consumes this signal to mark the chip
 * done. URL params are no longer needed on the warm path (they remain the
 * cold-start fallback when there's no back-history to pop to).
 */
export interface TopicTreeReturnSignal {
  completedPhase: string;
  completedModuleId: string;
  completedKind?: string;
  /** Module whose accordion should be (re)opened — usually the same module. */
  expandedModule?: string;
  /** Monotonic so two identical completions in a row still re-fire the consumer. */
  nonce: number;
}

interface TopicTreeReturnState {
  pending: TopicTreeReturnSignal | null;
  signalReturn: (s: Omit<TopicTreeReturnSignal, 'nonce'>) => void;
  consumeReturn: () => void;
}

export const useTopicTreeReturnStore = create<TopicTreeReturnState>((set, get) => ({
  pending: null,
  signalReturn: (s) =>
    set({ pending: { ...s, nonce: (get().pending?.nonce ?? 0) + 1 } }),
  consumeReturn: () => set({ pending: null }),
}));
