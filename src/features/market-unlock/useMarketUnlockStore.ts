import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "../../lib/zustandStorage";
import { registerLocalStore } from "../../lib/stores/registry";

/**
 * useMarketUnlockStore — tracks whether the user has already seen the
 * one-time "שוק ההון נפתח בשבילכם" takeover moment (Yoav 3.8.26: "אני רוצה
 * שלכל משתמש יפתח שוק ההון... שזה יקפוץ להם בחוויית משתמש מדהימה שלוקחים
 * אותם לפרק של צמיחה").
 *
 * This store ONLY tracks the seen-flag. It intentionally does NOT decide
 * *when* the market unlocks (that's an integration concern — e.g. reaching
 * chapter-4 / "צמיחה", finishing a prerequisite module, etc.) and does NOT
 * render anything — MarketUnlockMoment.tsx is fully decoupled (visible /
 * onEnter / onDismiss props only) so the host screen stays in control of
 * navigation. Wiring "when to flip visible=true" + calling markSeen() is
 * the integrator's job.
 *
 * Zustand v5 consumer rule: NEVER select a fresh object/array from this
 * store (infinite-loop boot crash — see zustand_v5_selector_crash). Both
 * fields here are primitives, so plain single-value selectors
 * (`s => s.momentSeen`) are always safe.
 */

interface MarketUnlockState {
  /** True once the user has seen (or dismissed) the unlock moment. */
  momentSeen: boolean;
  /** ISO timestamp of the first time the moment was marked seen. Null until then. */
  seenAt: string | null;

  /** Idempotent: marks the moment as seen. Safe to call multiple times. */
  markSeen: () => void;
  reset: () => void;
}

export const useMarketUnlockStore = create<MarketUnlockState>()(
  persist(
    (set, get) => ({
      momentSeen: false,
      seenAt: null,

      markSeen: () => {
        if (get().momentSeen) return;
        set({ momentSeen: true, seenAt: new Date().toISOString() });
      },

      reset: () => set({ momentSeen: false, seenAt: null }),
    }),
    {
      name: "market-unlock-store",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        momentSeen: s.momentSeen,
        seenAt: s.seenAt,
      }),
    },
  ),
);

registerLocalStore("market-unlock-store", useMarketUnlockStore, "market-unlock-store");
