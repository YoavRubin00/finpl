/**
 * useNudgeQueueStore — Retention-loop state for Shark CTA notifications.
 *
 * Duolingo A/B learnings applied:
 *   • 2 consecutive dismisses → 48h cooldown (prevents uninstalls, -40% churn)
 *   • Session lock: same CTA type cannot fire twice in a single session
 *   • `acted` resets dismiss count (rewarding engagement)
 *
 * Persisted via AsyncStorage so cooldowns survive app kills.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../lib/zustandStorage';

export type NudgeType = 'bridge' | 'referral';

interface NudgeState {
  /** last 2 dismissal timestamps per CTA type (most recent first). Empty array if never dismissed. */
  dismissHistory: Record<NudgeType, number[]>;
  /** lastShownTs prevents re-show in same session if user scrolled past without acting */
  lastShownTs: Record<NudgeType, number>;
  /** When the user tapped CTA (success). Resets dismiss history — they engaged. */
  lastActedTs: Record<NudgeType, number>;
  /** Session tokens — cleared on app cold start */
  sessionShown: Record<NudgeType, boolean>;

  /** Record dismissal and return whether this user is now "cooled-down" */
  recordDismiss: (type: NudgeType) => void;
  /** Record successful CTA tap — clears dismiss history */
  recordAct: (type: NudgeType) => void;
  /** Record that we showed the CTA (for session-lock + lastShownTs) */
  recordShown: (type: NudgeType) => void;
  /** Returns true if this CTA is allowed to show right now. Applies: session lock + 48h cooldown */
  canShow: (type: NudgeType) => boolean;
  /** Called on app cold-start to clear session tokens */
  resetSession: () => void;
  /** ISO date (YYYY-MM-DD) when the daily bridge nudge was last shown — prevents repeat same day */
  lastBridgeNudgeDateISO: string | null;
  setLastBridgeNudgeDateISO: (d: string) => void;
}

const COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48h per Duolingo A/B
const DISMISS_THRESHOLD = 2; // 2 consecutive dismisses triggers cooldown

function emptyMap<T>(defaultVal: T): Record<NudgeType, T> {
  return { bridge: defaultVal, referral: defaultVal };
}

export const useNudgeQueueStore = create<NudgeState>()(
  persist(
    (set, get) => ({
      dismissHistory: emptyMap<number[]>([]),
      lastShownTs: emptyMap<number>(0),
      lastActedTs: emptyMap<number>(0),
      sessionShown: emptyMap<boolean>(false),

      recordDismiss: (type) => {
        set((state) => {
          const prev = state.dismissHistory[type] ?? [];
          const next = [Date.now(), ...prev].slice(0, DISMISS_THRESHOLD);
          return {
            dismissHistory: { ...state.dismissHistory, [type]: next },
          };
        });
      },

      recordAct: (type) => {
        set((state) => ({
          dismissHistory: { ...state.dismissHistory, [type]: [] },
          lastActedTs: { ...state.lastActedTs, [type]: Date.now() },
        }));
      },

      recordShown: (type) => {
        set((state) => ({
          lastShownTs: { ...state.lastShownTs, [type]: Date.now() },
          sessionShown: { ...state.sessionShown, [type]: true },
        }));
      },

      canShow: (type) => {
        const state = get();
        // Session lock — same CTA-type cannot fire twice in a single session
        if (state.sessionShown[type]) return false;

        // 48h cooldown — only when user dismissed DISMISS_THRESHOLD times consecutively
        const history = state.dismissHistory[type] ?? [];
        if (history.length >= DISMISS_THRESHOLD) {
          const mostRecent = history[0];
          if (Date.now() - mostRecent < COOLDOWN_MS) return false;
        }

        return true;
      },

      resetSession: () => {
        set({ sessionShown: emptyMap<boolean>(false) });
      },

      lastBridgeNudgeDateISO: null,
      setLastBridgeNudgeDateISO: (d) => set({ lastBridgeNudgeDateISO: d }),
    }),
    {
      name: 'nudge-queue-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        dismissHistory: state.dismissHistory,
        lastShownTs: state.lastShownTs,
        lastActedTs: state.lastActedTs,
        lastBridgeNudgeDateISO: state.lastBridgeNudgeDateISO,
        // sessionShown deliberately NOT persisted — resets each cold start
      }),
    },
  ),
);
