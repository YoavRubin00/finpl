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
import { registerLocalStore } from '../lib/stores/registry';
import { getIsraelDateISO } from '../utils/israelTime';

export type NudgeType = 'bridge' | 'referral' | 'tools';

/** 'auto' = uninvited popup (marketing / reminder / discovery) — budgeted.
 *  'earned' = a moment the user created (reward, chest, grant) — never budgeted. */
export type PopupKind = 'auto' | 'earned';

interface NudgeState {
  /** last 2 dismissal timestamps per CTA type (most recent first). Empty array if never dismissed. */
  dismissHistory: Record<NudgeType, number[]>;
  /** lastShownTs prevents re-show in same session if user scrolled past without acting */
  lastShownTs: Record<NudgeType, number>;
  /** When the user tapped CTA (success). Resets dismiss history — they engaged. */
  lastActedTs: Record<NudgeType, number>;
  /** Session tokens — cleared on app cold start */
  sessionShown: Record<NudgeType, boolean>;
  /** Wall-clock ms the current session started (reset each cold start) */
  sessionStartedAt: number;
  /** True while the user is inside a LessonFlowScreen — nudges must not fire */
  inLesson: boolean;
  /** True once the daily streak popup has fired this session */
  streakShownThisSession: boolean;

  // ── Global popup sequencer (Yoav 2026-07-08) ──────────────────────────────
  /** Wall-clock ms until which NO new launch-time popup may show. Every
   *  full-screen popup reserves a slot when it appears, so the next one waits
   *  POPUP_GAP_MS — stops the "one on top of another" flood on return-to-game.
   *  Session-only (not persisted); streak surfaces (priority 1) show
   *  immediately AND reserve, pushing the promo popups behind them. */
  popupBusyUntil: number;
  /** How many UNINVITED ('auto') popups already took the stage this session.
   *  Session-only. The 6s gap alone only SPACED the flood — the user still met
   *  popup after popup on every app open (Yoav 18.9: "יותר מדי התראות, זה
   *  יוצר אוברוולמינג"). This is the budget that actually thins it out. */
  autoPopupsThisSession: number;
  /** Israel date-key of the last 'auto' popup + that day's count — caps
   *  uninvited popups per day too, so opening the app 5× a day is not 5
   *  interrupts. Persisted (survives cold starts, unlike the session count). */
  lastAutoPopupDateKey: string | null;
  autoPopupsToday: number;
  /** True if a popup may take the stage right now.
   *  kind 'auto' (default) = uninvited marketing/reminder/discovery popup →
   *  subject to the gap AND the session/day budget (it simply stays quiet and
   *  comes back another day).
   *  kind 'earned' = the user created this moment (chest, streak, rewards that
   *  landed, a grant) → only the gap applies, it is never skipped. */
  canTakePopupSlot: (kind?: PopupKind) => boolean;
  /** Reserve the stage for POPUP_GAP_MS and spend one popup of the session/day
   *  budget. Call the moment a popup becomes visible — earned moments spend it
   *  too, so nothing stacks on top of them. */
  takePopupSlot: (kind?: PopupKind) => void;

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
  /** Toggle when entering/leaving a lesson to suppress nudges mid-lesson */
  setInLesson: (v: boolean) => void;
  /** Flip when the streak popup renders, so Bridge nudge can respect "streak-first" ordering */
  markStreakShown: () => void;
  /** ISO date (YYYY-MM-DD) when the daily bridge nudge was last shown — prevents repeat same day */
  lastBridgeNudgeDateISO: string | null;
  setLastBridgeNudgeDateISO: (d: string) => void;
  /** ISO date when the invite-friends nudge was last shown — gates 3-day cadence */
  lastInviteNudgeDateISO: string | null;
  setLastInviteNudgeDateISO: (d: string) => void;
  /** ISO date when the crowd-question (VS) popup last showed — once per day */
  lastCrowdPopupDateISO: string | null;
  setLastCrowdPopupDateISO: (d: string) => void;
  reset: () => void;
}

const COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48h per Duolingo A/B
const DISMISS_THRESHOLD = 2; // 2 consecutive dismisses triggers cooldown
/** Minimum gap between any two launch-time popups (Yoav 2026-07-08). */
const POPUP_GAP_MS = 6000;
/** Uninvited popups allowed per app-open session (Yoav 18.9 — "תדלל"). */
const MAX_AUTO_POPUPS_PER_SESSION = 1;
/** …and per Israeli calendar day, across sessions. */
const MAX_AUTO_POPUPS_PER_DAY = 2;

function emptyMap<T>(defaultVal: T): Record<NudgeType, T> {
  return { bridge: defaultVal, referral: defaultVal, tools: defaultVal };
}

export const useNudgeQueueStore = create<NudgeState>()(
  persist(
    (set, get) => ({
      dismissHistory: emptyMap<number[]>([]),
      lastShownTs: emptyMap<number>(0),
      lastActedTs: emptyMap<number>(0),
      sessionShown: emptyMap<boolean>(false),
      sessionStartedAt: Date.now(),
      inLesson: false,
      streakShownThisSession: false,
      popupBusyUntil: 0,
      autoPopupsThisSession: 0,
      lastAutoPopupDateKey: null,
      autoPopupsToday: 0,

      setInLesson: (v) => set({ inLesson: v }),
      // The streak popup is PRIORITY 1 (Yoav 2026-07-08): it always shows, and
      // reserves the popup stage the moment it does — so every promo popup
      // (buy-asset splash, bridge/tools banners) waits behind it instead of
      // stacking on top. All 3 streak show-sites call this right after setVisible.
      markStreakShown: () => {
        set({ streakShownThisSession: true });
        // The streak celebration IS this session's popup moment (Yoav 18.9) —
        // it reserves the gap and spends the budget, so no promo follows it.
        get().takePopupSlot('earned');
      },
      canTakePopupSlot: (kind: PopupKind = 'auto') => {
        const s = get();
        if (Date.now() < s.popupBusyUntil) return false;
        // Earned moments are never blocked — the user created them.
        if (kind === 'earned') return true;
        if ((s.autoPopupsThisSession ?? 0) >= MAX_AUTO_POPUPS_PER_SESSION) return false;
        const today = getIsraelDateISO();
        const usedToday = s.lastAutoPopupDateKey === today ? (s.autoPopupsToday ?? 0) : 0;
        return usedToday < MAX_AUTO_POPUPS_PER_DAY;
      },

      // EVERY full-screen interrupt spends the session's stage — an earned
      // ceremony included. That is the whole point of the budget: after the
      // one moment the session gets, nothing else may pile on top of it.
      takePopupSlot: (_kind: PopupKind = 'auto') => {
        set((s) => {
          const today = getIsraelDateISO();
          const usedToday = s.lastAutoPopupDateKey === today ? (s.autoPopupsToday ?? 0) : 0;
          return {
            popupBusyUntil: Date.now() + POPUP_GAP_MS,
            autoPopupsThisSession: (s.autoPopupsThisSession ?? 0) + 1,
            lastAutoPopupDateKey: today,
            autoPopupsToday: usedToday + 1,
          };
        });
      },

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
        set({
          sessionShown: emptyMap<boolean>(false),
          sessionStartedAt: Date.now(),
          inLesson: false,
          streakShownThisSession: false,
          popupBusyUntil: 0,
          autoPopupsThisSession: 0,
        });
      },

      lastBridgeNudgeDateISO: null,
      setLastBridgeNudgeDateISO: (d) => set({ lastBridgeNudgeDateISO: d }),

      lastInviteNudgeDateISO: null,
      setLastInviteNudgeDateISO: (d) => set({ lastInviteNudgeDateISO: d }),

      lastCrowdPopupDateISO: null,
      setLastCrowdPopupDateISO: (d) => set({ lastCrowdPopupDateISO: d }),

      reset: () => set({
        dismissHistory: emptyMap<number[]>([]),
        lastShownTs: emptyMap<number>(0),
        lastActedTs: emptyMap<number>(0),
        sessionShown: emptyMap<boolean>(false),
        sessionStartedAt: Date.now(),
        inLesson: false,
        streakShownThisSession: false,
        popupBusyUntil: 0,
        autoPopupsThisSession: 0,
        lastAutoPopupDateKey: null,
        autoPopupsToday: 0,
        lastBridgeNudgeDateISO: null,
        lastInviteNudgeDateISO: null,
        lastCrowdPopupDateISO: null,
      }),
    }),
    {
      name: 'nudge-queue-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        dismissHistory: state.dismissHistory,
        lastShownTs: state.lastShownTs,
        lastActedTs: state.lastActedTs,
        lastBridgeNudgeDateISO: state.lastBridgeNudgeDateISO,
        lastInviteNudgeDateISO: state.lastInviteNudgeDateISO,
        lastCrowdPopupDateISO: state.lastCrowdPopupDateISO,
        lastAutoPopupDateKey: state.lastAutoPopupDateKey,
        autoPopupsToday: state.autoPopupsToday,
        // sessionShown + autoPopupsThisSession deliberately NOT persisted —
        // they reset on every cold start (a new session gets a fresh budget)
      }),
    },
  ),
);

registerLocalStore('nudge-queue-store', useNudgeQueueStore, 'nudge-queue-store');
