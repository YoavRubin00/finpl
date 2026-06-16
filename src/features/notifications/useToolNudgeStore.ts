/**
 * useToolNudgeStore — once-per-calendar-day gate for the in-lesson
 * SharkToolCTA (the "tool of the day" nudge that fires after a module when
 * no bridge/referral CTA is due). Separate from useToolsDiscoveryStore (the
 * home banner) so the two surfaces have independent daily budgets — a user
 * who dismissed the banner can still meet the tool inside a lesson, but
 * neither surface repeats within the same day.
 *
 * Pattern mirrors useToolsDiscoveryStore: zustand + persist +
 * registerLocalStore so it resets on sign-out.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "../../lib/zustandStorage";
import { registerLocalStore } from "../../lib/stores/registry";

interface ToolNudgeState {
  /** ISO date (YYYY-MM-DD) the in-lesson tool CTA last fired. */
  lastShownDate: string | null;
  markShown: () => void;
  isShownToday: () => boolean;
  reset: () => void;
}

function todayIsoDate(): string {
  return new Date().toLocaleDateString("en-CA");
}

export const useToolNudgeStore = create<ToolNudgeState>()(
  persist(
    (set, get) => ({
      lastShownDate: null,
      markShown: () => set({ lastShownDate: todayIsoDate() }),
      isShownToday: () => get().lastShownDate === todayIsoDate(),
      reset: () => set({ lastShownDate: null }),
    }),
    {
      name: "tool-nudge-store",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ lastShownDate: s.lastShownDate }),
    },
  ),
);

registerLocalStore("tool-nudge-store", useToolNudgeStore, "tool-nudge-store");
