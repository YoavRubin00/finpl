import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';

/**
 * R8 T3.2 — Comeback Reward retention loop.
 *
 * On every app open we stamp `lastSeenAt`. If the gap between two
 * consecutive opens crosses {@link LAPSE_THRESHOLD_DAYS}, we mark
 * `pendingClaim = true` so the UI can surface the welcome-back modal
 * on the next interactive paint.
 *
 * Duolingo's comeback nudge ("missed you for 7 days! here's your gift")
 * lifts D30 reactivation +15% — this is the FinPlay-flavored variant.
 *
 * State stays minimal: a single timestamp + a single boolean flag. No
 * counters, no per-lapse meta, no streaks here — the regular streak
 * system handles continuity; this store is a pure re-engagement net.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Lapse window — must match the threshold the modal copy targets. */
export const LAPSE_THRESHOLD_DAYS = 7;

interface ComebackRewardState {
  /** Epoch ms of the last app-open the user reached the boot hook on. */
  lastSeenAt: number;
  /** Set true when the boot hook detects a lapse ≥ threshold; reset
   *  by `claim()` after the user taps the CTA. */
  pendingClaim: boolean;
  /** How many days the user was away on the lapse that produced the
   *  current pendingClaim. Surfaced in the modal copy. 0 when no claim
   *  is pending. */
  lapsedDays: number;

  /** Boot-hook entry point. Pass the current epoch ms; the store
   *  decides whether the gap warrants a pending claim. Returns the
   *  number of lapsed days when a claim was queued, else 0.
   *
   *  IMPORTANT: on a lapse this does NOT advance `lastSeenAt`. The lapse
   *  stays "owed" — re-derivable from the un-advanced timestamp — until
   *  {@link claimAndStamp} settles it. That way a crash mid-claim
   *  re-offers the reward on the next boot instead of silently losing it. */
  registerAppOpen: (nowMs: number) => number;
  /** User tapped "Claim" AND the reward was credited — settles the
   *  lapse: clears the flag and advances `lastSeenAt` so it won't
   *  re-trigger. Call this AFTER addCoins/addStreakFreezes so a crash
   *  before crediting leaves the reward owed rather than lost. */
  claimAndStamp: (nowMs: number) => void;
  /** User deferred ("maybe later") — hides the modal for this session
   *  only. `lastSeenAt` stays un-advanced, so the reward is re-offered
   *  on the next boot. Does NOT grant anything. */
  claim: () => void;
  /** Test / dev helper. */
  reset: () => void;
}

export const useComebackRewardStore = create<ComebackRewardState>()(
  persist(
    (set, get) => ({
      lastSeenAt: 0,
      pendingClaim: false,
      lapsedDays: 0,

      registerAppOpen: (nowMs) => {
        const { lastSeenAt } = get();
        // First-ever open — just stamp, no claim.
        if (lastSeenAt === 0) {
          set({ lastSeenAt: nowMs });
          return 0;
        }
        const diffDays = Math.floor((nowMs - lastSeenAt) / DAY_MS);
        if (diffDays >= LAPSE_THRESHOLD_DAYS) {
          // Queue the claim WITHOUT advancing lastSeenAt — the lapse stays
          // owed until claimAndStamp() credits + settles it. Re-derivable
          // on every boot, so a crash mid-claim can't lose the reward.
          set({
            pendingClaim: true,
            // Cap the displayed number — 60+ day lapses are unhelpful as
            // copy and only feel mocking ("we missed you for 423 days!").
            lapsedDays: Math.min(diffDays, 60),
          });
          return diffDays;
        }
        // Normal continuity — no reward owed, safe to advance.
        set({ lastSeenAt: nowMs });
        return 0;
      },

      claimAndStamp: (nowMs) =>
        set({ pendingClaim: false, lapsedDays: 0, lastSeenAt: nowMs }),

      claim: () => set({ pendingClaim: false, lapsedDays: 0 }),

      reset: () => set({ lastSeenAt: 0, pendingClaim: false, lapsedDays: 0 }),
    }),
    {
      name: 'comeback-reward-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        lastSeenAt: state.lastSeenAt,
        pendingClaim: state.pendingClaim,
        lapsedDays: state.lapsedDays,
      }),
    },
  ),
);

registerLocalStore('comeback-reward-store', useComebackRewardStore, 'comeback-reward-store');
