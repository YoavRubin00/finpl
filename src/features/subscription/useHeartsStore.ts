import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';
import { track } from '../../lib/analytics/events';

// Energy units (formerly "hearts"). The store file keeps the `hearts`/`useHeart`
// names in v1 to avoid churning ~6 call-sites; the full rename to
// useEnergyStore happens in phase 2 (see plan E). Semantically these ARE the
// purple energy units shown in the תחנת הכוח / power-station component.
export const MAX_HEARTS = 20; // MAX energy units (was 5)
/** Alias for new energy-aware code. Same value as MAX_HEARTS. */
export const MAX_ENERGY = MAX_HEARTS;
/** Passive regen interval: one energy unit every 15 minutes (full 0→20 in 5h). */
export const ENERGY_REGEN_MS = 15 * 60 * 1000;
const HEART_REFILL_MS = 15 * 60 * 1000; // 15 minutes per energy unit (was 5h) → full 0→20 in 5h

const MAX_PRACTICE_REFILLS_PER_DAY = 2; // ×PRACTICE_ENERGY_GRANT = +10/day
const PRACTICE_ENERGY_GRANT = 5; // energy granted per practice/replay completion (was +1)

/** One-time daily "welcome back" gift granted on RETURN to the app (on top of
 *  passive regen), capped to once per calendar day via `returnGiftDate`. Yoav
 *  2026-06-28: "מתנה של 3 אנרגיה מוגבל לפעם אחת ביום". */
export const RETURN_GIFT_ENERGY = 3;

/** Energy is fully OFF for the very first module (mod-0-1) so a brand-new user
 *  meets the lesson with zero lives/energy friction; it switches ON from
 *  mod-0-1b onward (Yoav 2026-06-25). Gates both the spend (`useHeart` call
 *  sites) and the תחנת הכוח UI on the learn map. */
const ENERGY_DISABLED_MODULE_IDS = new Set<string>(['mod-0-1']);
export function isEnergyEnabledForModule(moduleId: string | null | undefined): boolean {
  // Default ENABLED for unknown/undefined ids — only the listed modules are off.
  return !ENERGY_DISABLED_MODULE_IDS.has(moduleId ?? '');
}

// Monotonic counter so two identical back-to-back deltas (same type/amount/
// source) still re-fire the EnergyAnimationProvider (object-identity selector
// would otherwise miss the second). One store instance → module scope is fine.
let energyDeltaNonce = 0;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function calcHeartRefills(lastLostAt: string | null, currentHearts: number): number {
  if (!lastLostAt || currentHearts >= MAX_HEARTS) return 0;
  const elapsed = Math.max(0, Date.now() - new Date(lastLostAt).getTime());
  const refills = Math.floor(elapsed / HEART_REFILL_MS);
  // FULL time-based regen (Yoav 2026-06-28): NO welcome-back cap. Energy refills
  // 1 unit / 15min up to MAX, so a long absence (≥5h) returns a FULL bar. The old
  // +5-per-settlement cap confused users ("8h away, still not full") and risked
  // losing players, so it was removed.
  return Math.min(refills, MAX_HEARTS - currentHearts);
}

interface HeartsState {
  hearts: number;
  lastHeartLostAt: string | null;
  // Non-persisted: resets on cold-start, used by upgrade_trigger_timing bandit experiment
  sessionHeartsLost: number;

  // Non-persisted PUSH signal for the global EnergyAnimationProvider. Set on
  // every real spend/grant; the provider subscribes via selector and fires the
  // gain/loss animation. `nonce` forces a re-fire on identical back-to-back
  // deltas. Kept OUT of partialize (transient, like sessionHeartsLost).
  lastEnergyDelta:
    | { type: 'gain' | 'loss'; amount: number; source: string; nonce: number }
    | null;

  // Non-persisted combo streak across ALL correct answers in a lesson
  // (quizzes + interactive recall + simulators). Every 4-in-a-row grants energy.
  comboStreak: number;

  // Non-persisted: drives a GLOBAL out-of-energy modal for depletion OUTSIDE a
  // lesson (financial tools, AI chat). In-lesson keeps using its local modal.
  depletedPromptVisible: boolean;

  // Practice-to-Refill (US-006): complete old lesson → +PRACTICE_ENERGY_GRANT, max 2/day
  practiceRefillsToday: number;
  practiceRefillDate: string | null;
  pendingPracticeForHeart: boolean;

  // Power-station: per-source daily energy grants, each with its own daily cap.
  // Keyed by source ('quest' | 'daily-task' | 'station-game' | 'ad' | 'combo' …).
  // Value = energy granted from that source TODAY (reset on date change).
  energyGrantsBySource: Record<string, { date: string; energy: number }>;

  // Date (YYYY-MM-DD) the daily +RETURN_GIFT_ENERGY welcome-back gift was last
  // claimed, so it grants at most ONCE per calendar day. Persisted.
  returnGiftDate: string | null;

  // PRO users have unlimited energy → energy must be fully INERT for them:
  // never decreases, never increases, no gain/loss animations. Mirrored from
  // the server-driven subscription via setIsPro() in a root effect so EVERY
  // mutation path (not just useHeart's param) can short-circuit. Non-persisted
  // (re-synced each launch from useSubscription).
  isPro: boolean;
}

interface HeartsActions {
  // Selectors
  getHearts: () => number;
  hasHearts: () => boolean;

  // Actions
  // `source` tiers the loss animation: 'penalty' (wrong answer) = dramatic
  // overlay; 'chat'/'analyst-tool' (usage cost) = subtle toast.
  useHeart: (isPro: boolean, source?: string) => boolean;
  refillHearts: () => number;
  restoreAllHearts: () => void;
  grantPracticeHeart: () => boolean;
  startPracticeForHeart: () => boolean;
  clearPracticeFlag: () => void;

  /**
   * Add energy from a power-station source, respecting an optional per-source
   * daily cap. Settles passive regen first, clamps to MAX_ENERGY. Returns the
   * amount actually granted (0 if at max or daily cap reached). Pass no cap for
   * uncapped sources (e.g. a one-off purchase).
   */
  grantEnergy: (amount: number, source: string, dailyCap?: number) => number;

  /**
   * Register one correct answer toward the cross-lesson combo (quizzes +
   * interactive recall + simulators all call this). Every 4-in-a-row grants
   * +1 energy (capped 6/day). Returns the energy granted on this call (0 if no
   * milestone hit or on replay). Pass isReplay to skip counting practice runs.
   */
  registerComboCorrect: (isReplay?: boolean) => number;
  /** Reset the combo streak (call on any wrong answer / sim failure). */
  resetCombo: () => void;

  /** Called when the user RETURNS to the app (on the learn screen): settles the
   *  passive regen (with the gain animation) and grants the once-per-day
   *  +RETURN_GIFT_ENERGY welcome-back gift. Safe to call repeatedly — regen is
   *  idempotent and the gift is gated to once/day. */
  claimReturnEnergy: () => void;

  /** Show / hide the GLOBAL out-of-energy modal (non-lesson depletion). */
  flagDepleted: () => void;
  /** Open the refill modal ON DEMAND (user tapped the energy pill) WITHOUT
   *  firing `energy_depleted` — that metric is reserved for real depletions. */
  openRefillModal: () => void;
  clearDepleted: () => void;

  /** Mirror PRO status into the store so every energy mutation is inert for
   *  Pro users (set from a root effect via useIsPro). */
  setIsPro: (value: boolean) => void;

  reset: () => void;
}

const initialState: HeartsState = {
  hearts: MAX_HEARTS,
  lastHeartLostAt: null,
  sessionHeartsLost: 0,
  lastEnergyDelta: null,
  comboStreak: 0,
  depletedPromptVisible: false,
  practiceRefillsToday: 0,
  practiceRefillDate: null,
  pendingPracticeForHeart: false,
  energyGrantsBySource: {},
  returnGiftDate: null,
  isPro: false,
};

export const useHeartsStore = create<HeartsState & HeartsActions>()(
  persist(
    (set, get) => {
      // Push an energy-change signal the global EnergyAnimationProvider watches.
      const emit = (type: 'gain' | 'loss', amount: number, source: string): void => {
        if (amount <= 0) return;
        set({ lastEnergyDelta: { type, amount, source, nonce: ++energyDeltaNonce } });
      };
      return {
      ...initialState,

      getHearts: (): number => {
        const state = get();
        const refills = calcHeartRefills(state.lastHeartLostAt, state.hearts);
        if (refills > 0) {
          return Math.min(state.hearts + refills, MAX_HEARTS);
        }
        return state.hearts;
      },

      hasHearts: (): boolean => {
        return get().getHearts() > 0;
      },

      useHeart: (isPro: boolean, source: string = 'penalty'): boolean => {
        // Pro = inert: never spend (param OR mirrored store flag).
        if (isPro || get().isPro) return true;
        const state = get();
        state.refillHearts();
        const current = get().hearts;
        if (current <= 0) return false;
        set((s) => ({
          hearts: current - 1,
          lastHeartLostAt: new Date().toISOString(),
          sessionHeartsLost: s.sessionHeartsLost + 1,
        }));
        emit('loss', 1, source);
        return true;
      },

      refillHearts: (): number => {
        const state = get();
        const refills = calcHeartRefills(state.lastHeartLostAt, state.hearts);
        if (refills > 0) {
          const next = Math.min(state.hearts + refills, MAX_HEARTS);
          // Reset the regen clock to NOW so the capped gift can't re-dump the
          // rest of the backlog on the next read (enforces the +5 cap).
          set({ hearts: next, lastHeartLostAt: next >= MAX_HEARTS ? null : new Date().toISOString() });
        }
        return refills;
      },

      restoreAllHearts: () => {
        if (get().isPro) return; // Pro = inert
        const before = get().hearts;
        set({ hearts: MAX_HEARTS, lastHeartLostAt: null });
        emit('gain', MAX_HEARTS - before, 'restore');
      },

      startPracticeForHeart: (): boolean => {
        const today = todayISO();
        const { practiceRefillDate, practiceRefillsToday } = get();
        const count = practiceRefillDate === today ? practiceRefillsToday : 0;
        if (count >= MAX_PRACTICE_REFILLS_PER_DAY) return false;
        set({ pendingPracticeForHeart: true });
        return true;
      },

      grantPracticeHeart: (): boolean => {
        if (get().isPro) return false; // Pro = inert
        const today = todayISO();
        const state = get();
        if (!state.pendingPracticeForHeart) return false;
        const count = state.practiceRefillDate === today ? state.practiceRefillsToday : 0;
        if (count >= MAX_PRACTICE_REFILLS_PER_DAY) {
          set({ pendingPracticeForHeart: false });
          return false;
        }
        const currentHearts = state.hearts;
        if (currentHearts >= MAX_HEARTS) {
          set({ pendingPracticeForHeart: false });
          return false;
        }
        const nextHearts = Math.min(currentHearts + PRACTICE_ENERGY_GRANT, MAX_HEARTS);
        set({
          hearts: nextHearts,
          lastHeartLostAt: nextHearts >= MAX_HEARTS ? null : state.lastHeartLostAt,
          practiceRefillsToday: count + 1,
          practiceRefillDate: today,
          pendingPracticeForHeart: false,
        });
        emit('gain', nextHearts - currentHearts, 'practice');
        return true;
      },

      grantEnergy: (amount: number, source: string, dailyCap?: number): number => {
        if (get().isPro || amount <= 0) return 0; // Pro = inert

        const today = todayISO();
        // Settle passive regen first so we grant on top of the true current value.
        get().refillHearts();
        const current = get().hearts;
        if (current >= MAX_HEARTS) return 0;

        let granted = Math.min(amount, MAX_HEARTS - current);

        if (dailyCap != null) {
          const rec = get().energyGrantsBySource[source];
          const usedToday = rec && rec.date === today ? rec.energy : 0;
          granted = Math.min(granted, Math.max(0, dailyCap - usedToday));
          if (granted <= 0) return 0;
          const next = Math.min(current + granted, MAX_HEARTS);
          set((s) => ({
            hearts: next,
            lastHeartLostAt: next >= MAX_HEARTS ? null : s.lastHeartLostAt,
            energyGrantsBySource: {
              ...s.energyGrantsBySource,
              [source]: { date: today, energy: usedToday + granted },
            },
          }));
        } else {
          if (granted <= 0) return 0;
          const next = Math.min(current + granted, MAX_HEARTS);
          set((s) => ({
            hearts: next,
            lastHeartLostAt: next >= MAX_HEARTS ? null : s.lastHeartLostAt,
          }));
        }
        emit('gain', granted, source);
        return granted;
      },

      registerComboCorrect: (isReplay?: boolean): number => {
        if (isReplay || get().isPro) return 0; // Pro = inert (no combo energy/anim)
        const next = get().comboStreak + 1;
        set({ comboStreak: next });
        // Every 4 correct-in-a-row across the whole lesson → +1 energy (capped 6/day).
        if (next % 4 === 0) {
          return get().grantEnergy(1, 'combo', 6);
        }
        return 0;
      },

      resetCombo: () => set({ comboStreak: 0 }),

      claimReturnEnergy: (): void => {
        if (get().isPro) return; // Pro = inert
        // Settle passive regen and SHOW it. refillHearts stays silent on the
        // internal pre-spend/pre-grant settles (so a spend never animates a gain
        // then a loss); the regen gain animation fires ONLY here, on return.
        const regen = get().refillHearts();
        if (regen > 0) emit('gain', regen, 'regen');
        // Daily welcome-back gift — once per calendar day, ON TOP of the regen.
        if (get().returnGiftDate !== todayISO()) {
          const granted = get().grantEnergy(RETURN_GIFT_ENERGY, 'return-gift'); // emits its own gain
          if (granted > 0) set({ returnGiftDate: todayISO() });
        }
      },

      flagDepleted: () => set((state) => {
        // Fire `energy_depleted` once per false→true transition (NOT on every
        // blocked action while already at 0) so the YOAVS weekly "ran out of
        // energy" user count is clean. The out-of-energy modal's own bandit
        // impression goes to the bandit server, not PostHog, so this is the
        // single PostHog source for the metric. Yoav 2026-06-21.
        if (!state.depletedPromptVisible) {
          try { track({ name: 'energy_depleted' }); } catch { /* non-fatal */ }
        }
        return { depletedPromptVisible: true };
      }),
      // On-demand open (tap the energy pill) — no energy_depleted, that metric
      // tracks real run-outs only. Yoav 2026-06-22.
      openRefillModal: () => set({ depletedPromptVisible: true }),
      clearDepleted: () => set({ depletedPromptVisible: false }),

      clearPracticeFlag: () => {
        set({ pendingPracticeForHeart: false });
      },

      setIsPro: (value: boolean): void => {
        if (get().isPro !== value) set({ isPro: value });
      },

      reset: () => set(initialState),
      };
    },
    {
      name: 'hearts-storage-v1',
      // Bump 0→1 to run the one-time full-energy reset migration below.
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
      // ONE-TIME full-energy reset for every EXISTING player (Yoav 2026-06-28:
      // "שלכולם יהיה אנרגיה מלאה, תאפס את זה" — don't lose players to the old
      // +5-cap regen bug). Runs exactly once per device when the persisted
      // version (0 = no version) upgrades to 1; new installs start at MAX anyway.
      migrate: (persisted: unknown, version: number) => {
        const s = (persisted ?? {}) as Partial<HeartsState>;
        if (version < 1) {
          return { ...s, hearts: MAX_HEARTS, lastHeartLostAt: null } as unknown as HeartsState & HeartsActions;
        }
        return s as unknown as HeartsState & HeartsActions;
      },
      partialize: (state) => ({
        hearts: state.hearts,
        lastHeartLostAt: state.lastHeartLostAt,
        practiceRefillsToday: state.practiceRefillsToday,
        practiceRefillDate: state.practiceRefillDate,
        energyGrantsBySource: state.energyGrantsBySource,
        returnGiftDate: state.returnGiftDate,
        // sessionHeartsLost intentionally NOT persisted (cold-start reset)
        // pendingPracticeForHeart intentionally NOT persisted (transient flag)
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Legacy builds stored hearts on a 0–5 scale. The energy rescale moved
        // MAX to 20; a persisted 0–5 value is still valid (just "low"), but a
        // value above the new MAX (shouldn't happen) is clamped. We deliberately
        // do NOT upscale old 0–5 values — passive regen (15min/unit) refills
        // them to 20 within hours, so users heal automatically.
        if (typeof state.hearts === 'number' && state.hearts > MAX_HEARTS) {
          state.hearts = MAX_HEARTS;
        }
        if (!state.energyGrantsBySource || typeof state.energyGrantsBySource !== 'object') {
          state.energyGrantsBySource = {};
        }
      },
    },
  ),
);

registerLocalStore('hearts-storage-v1', useHeartsStore, 'hearts-storage-v1');
