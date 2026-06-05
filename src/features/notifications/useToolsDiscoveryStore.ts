/**
 * Persisted dismiss-state for the ToolsDiscoveryBanner. One dismissal per
 * calendar day (Asia/Jerusalem implicit via local Date). Tomorrow the banner
 * is eligible again — possibly with a rotated tool suggestion.
 *
 * Pattern mirrors useNotificationStore: zustand + persist + registerLocalStore
 * so the store resets on sign-out and its AsyncStorage key is purged.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "../../lib/zustandStorage";
import { registerLocalStore } from "../../lib/stores/registry";

interface ToolsDiscoveryState {
  /** ISO date string (YYYY-MM-DD) of the last dismissal — compared to today. */
  lastDismissedDate: string | null;
  markDismissed: () => void;
  isDismissedToday: () => boolean;
  reset: () => void;
}

function todayIsoDate(): string {
  // Local-time YYYY-MM-DD — banner cooldown is "calendar day", not 24h.
  return new Date().toLocaleDateString("en-CA");
}

export const useToolsDiscoveryStore = create<ToolsDiscoveryState>()(
  persist(
    (set, get) => ({
      lastDismissedDate: null,
      markDismissed: () => set({ lastDismissedDate: todayIsoDate() }),
      isDismissedToday: () => get().lastDismissedDate === todayIsoDate(),
      reset: () => set({ lastDismissedDate: null }),
    }),
    {
      name: "tools-discovery-store",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ lastDismissedDate: s.lastDismissedDate }),
    },
  ),
);

registerLocalStore("tools-discovery-store", useToolsDiscoveryStore, "tools-discovery-store");
