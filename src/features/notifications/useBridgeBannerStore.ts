/**
 * Persisted dismiss-state for the BridgeCTABanner (the home-screen "→ לגשר"
 * nudge). One dismissal per calendar day — tomorrow the banner is eligible
 * again, with the rotated copy variant (dayOfYear-based, see BridgeCTABanner).
 *
 * Pattern mirrors useToolsDiscoveryStore: zustand + persist + registerLocalStore
 * so the store resets on sign-out and its AsyncStorage key is purged.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "../../lib/zustandStorage";
import { registerLocalStore } from "../../lib/stores/registry";

interface BridgeBannerState {
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

export const useBridgeBannerStore = create<BridgeBannerState>()(
  persist(
    (set, get) => ({
      lastDismissedDate: null,
      markDismissed: () => set({ lastDismissedDate: todayIsoDate() }),
      isDismissedToday: () => get().lastDismissedDate === todayIsoDate(),
      reset: () => set({ lastDismissedDate: null }),
    }),
    {
      name: "bridge-banner-store",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ lastDismissedDate: s.lastDismissedDate }),
    },
  ),
);

registerLocalStore("bridge-banner-store", useBridgeBannerStore, "bridge-banner-store");
