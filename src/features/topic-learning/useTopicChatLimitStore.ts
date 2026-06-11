import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';

/**
 * Free-tier daily cap for the topic-chat (2 messages/day). Pro users
 * bypass the gate entirely — the consumer checks `useIsPro` before
 * reading from this store. Resets daily on first access of a new
 * Israel-local date.
 */
export const DAILY_LIMIT = 2;

interface State {
  /** `YYYY-MM-DD` of the last counted send (Israel local). */
  date: string;
  /** Sends counted against today's quota. */
  count: number;
  /** Add 1 to today's count (rolls over to a fresh day if needed). */
  recordSend: () => void;
  /** How many sends remain for today (DAILY_LIMIT - today's count). */
  remainingToday: () => number;
  reset: () => void;
}

function todayKey(): string {
  // Use the device locale for the date string. Israel-only audience so
  // this is fine; if the app ever ships abroad swap to an explicit TZ.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const useTopicChatLimitStore = create<State>()(
  persist(
    (set, get) => ({
      date: todayKey(),
      count: 0,
      recordSend: () => {
        const t = todayKey();
        const s = get();
        if (s.date !== t) {
          set({ date: t, count: 1 });
        } else {
          set({ count: s.count + 1 });
        }
      },
      remainingToday: () => {
        const t = todayKey();
        const s = get();
        if (s.date !== t) return DAILY_LIMIT;
        return Math.max(0, DAILY_LIMIT - s.count);
      },
      reset: () => set({ date: todayKey(), count: 0 }),
    }),
    {
      name: 'topic-chat-limit',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ date: s.date, count: s.count }),
    },
  ),
);

registerLocalStore('topic-chat-limit', useTopicChatLimitStore, 'topic-chat-limit');
