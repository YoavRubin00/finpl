import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "../../lib/zustandStorage";
import { registerLocalStore } from "../../lib/stores/registry";
import { captureEvent } from "../../lib/posthog";
import { getDeckSize } from "./deckCatalog";

/**
 * אוסף חפיסות הכרטיסיות (Yoav 1.8.26) — the module infographics leave the
 * lesson flow (living-lesson replaces them) and become a COLLECTIBLE reward:
 * finishing a module grants its deck of infographic cards to the profile
 * collection, browsable as a summary in /card-collection.
 *
 * Analytics contract:
 *  - Fires `deck_collected` (module_id, deck_size) exactly ONCE per module —
 *    collectDeck is idempotent.
 *  - NEVER fires `chest_opened` — that event is the sacred module-completion
 *    NSM (docs: chest_completion_metric); this store must not touch it.
 *
 * Zustand v5 consumer rule: NEVER select a fresh object/array from this store
 * (infinite-loop boot crash — see zustand_v5_selector_crash). Use single-value
 * selectors (`s => s.collected` returns the persisted reference, which is
 * stable between updates; `s => Object.keys(s.collected).length` returns a
 * primitive) or wrap composite selections in useShallow.
 */

interface CollectedDeck {
  /** ISO timestamp of the first (and only) collect. */
  collectedAt: string;
}

interface CardCollectionState {
  /** moduleId → collect record. Presence of a key == deck is collected. */
  collected: Record<string, CollectedDeck>;
  /**
   * The module whose "cards fly to the profile" moment is pending — set by
   * collectDeck, consumed (cleared) by whoever runs DeckCollectMoment.
   */
  lastCollectedModuleId: string | null;

  /**
   * Collect the module's deck. Idempotent: returns true only on the FIRST
   * collect (which also arms lastCollectedModuleId + fires `deck_collected`).
   * Modules without any infographic cards have no deck — no-op, returns false.
   */
  collectDeck: (moduleId: string) => boolean;
  /** Consume the pending flight moment (call after DeckCollectMoment ran). */
  clearLastCollected: () => void;
  /**
   * Retroactive grant for modules completed before this feature existed.
   * Silent: no analytics, no lastCollectedModuleId (no ceremony).
   */
  backfillCollected: (moduleIds: string[]) => void;
  reset: () => void;
}

export const useCardCollectionStore = create<CardCollectionState>()(
  persist(
    (set, get) => ({
      collected: {},
      lastCollectedModuleId: null,

      collectDeck: (moduleId: string): boolean => {
        const deckSize = getDeckSize(moduleId);
        // No infographic cards → no deck to award. Stay honest: never grant
        // an empty "collectible" that would render as a blank deck.
        if (deckSize === 0) return false;
        if (get().collected[moduleId] !== undefined) return false;
        set((s) => ({
          collected: { ...s.collected, [moduleId]: { collectedAt: new Date().toISOString() } },
          lastCollectedModuleId: moduleId,
        }));
        try {
          captureEvent("deck_collected", { module_id: moduleId, deck_size: deckSize });
        } catch { /* non-fatal */ }
        return true;
      },

      clearLastCollected: () => {
        if (get().lastCollectedModuleId !== null) set({ lastCollectedModuleId: null });
      },

      backfillCollected: (moduleIds: string[]) => {
        // Users who completed modules BEFORE the collection feature shipped
        // get their decks granted retroactively — silently: no flight moment,
        // no deck_collected events (these aren't fresh completions, and a
        // burst of N events on first open would pollute the funnel).
        const current = get().collected;
        const missing = moduleIds.filter(
          (id) => current[id] === undefined && getDeckSize(id) > 0,
        );
        if (missing.length === 0) return;
        const now = new Date().toISOString();
        set((s) => ({
          collected: {
            ...s.collected,
            ...Object.fromEntries(missing.map((id) => [id, { collectedAt: now }])),
          },
        }));
      },

      reset: () => set({ collected: {}, lastCollectedModuleId: null }),
    }),
    {
      name: "card-collection-store",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        collected: s.collected,
        // lastCollectedModuleId deliberately NOT persisted — it's a transient
        // "run the flight animation" signal; surviving a restart would replay
        // the ceremony out of context.
      }),
    },
  ),
);

registerLocalStore("card-collection-store", useCardCollectionStore, "card-collection-store");
