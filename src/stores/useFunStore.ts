import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../lib/zustandStorage';
import { pingActiveToday } from '../db/sync/syncUserActive';
import { useAuthStore } from '../features/auth/useAuthStore';

/** Daily fun mail (joke + fact). */
interface DailyMailContent {
  kind: 'daily';
  joke: string;
  fact: string;
}

/** Re-engagement mail — sent when the user has been away from the game.
 *  Shows a curiosity-bait title + a hero image + a "play now" CTA. */
interface ComebackMailContent {
  kind: 'comeback';
  /** Where the CTA should send the user. */
  ctaTarget: '/(tabs)/learn';
}

export type MailContent = DailyMailContent | ComebackMailContent;

interface FunState {
  hasUnreadMail: boolean;
  mailContent: MailContent | null;
  easterEggNodeId: string | null;
  lastMailDate: string | null;
  /** Last calendar date the user actually opened the app — used to detect comebacks. */
  lastActiveDate: string | null;
  pizzaIndexSeen: boolean;
  _hydrated: boolean;
  refreshMail: (jokes: string[], facts: string[]) => void;
  markActiveToday: () => void;
  openMail: () => void;
  rollEasterEgg: (completedModules: string[]) => void;
  claimEasterEgg: () => void;
}

const getTodayDateString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const pickRandom = (arr: string[]): string =>
  arr[Math.floor(Math.random() * arr.length)];

export const useFunStore = create<FunState>()(
  persist(
    (set, get) => ({
      hasUnreadMail: false,
      mailContent: null,
      easterEggNodeId: null,
      lastMailDate: null,
      lastActiveDate: null,
      pizzaIndexSeen: false,
      _hydrated: false,

      refreshMail: (jokes: string[], facts: string[]) => {
        const today = getTodayDateString();
        if (get().lastMailDate === today) return;

        // Detect a "comeback" — user hasn't been active for 2+ days.
        const lastActive = get().lastActiveDate;
        let daysSinceActive = 0;
        if (lastActive) {
          const lastDate = new Date(lastActive);
          const todayDate = new Date(today);
          daysSinceActive = Math.floor(
            (todayDate.getTime() - lastDate.getTime()) / 86_400_000,
          );
        } else {
          // No history yet — treat as a fresh user (daily mail, not comeback).
          daysSinceActive = 0;
        }

        const content: MailContent = daysSinceActive >= 2
          ? { kind: 'comeback', ctaTarget: '/(tabs)/learn' }
          : { kind: 'daily', joke: pickRandom(jokes), fact: pickRandom(facts) };

        set({
          hasUnreadMail: true,
          mailContent: content,
          lastMailDate: today,
        });
      },

      markActiveToday: () => {
        const today = getTodayDateString();
        if (get().lastActiveDate !== today) {
          set({ lastActiveDate: today });
        }
        // Always sync to server (cheap, idempotent) so the daily-email cron
        // can see who's been active. Fire-and-forget; failures don't matter.
        const authId = useAuthStore.getState().email;
        if (authId) {
          pingActiveToday(authId).catch(() => { /* swallow */ });
        }
      },

      openMail: () => {
        set({ hasUnreadMail: false });
      },

      rollEasterEgg: (completedModules: string[]) => {
        if (completedModules.length === 0) return;
        const roll = Math.random();
        if (roll < 0.2) {
          const nodeId =
            completedModules[
              Math.floor(Math.random() * completedModules.length)
            ];
          set({ easterEggNodeId: nodeId });
        }
      },

      claimEasterEgg: () => {
        set({ easterEggNodeId: null });
      },
    }),
    {
      name: "fun-store",
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => () => {
        useFunStore.setState({ _hydrated: true });
      },
    }
  )
);
