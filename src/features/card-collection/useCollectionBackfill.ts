import { useEffect } from "react";
import { useCompletedModulesStore } from "../economy/useCompletedModulesStore";
import { useCardCollectionStore } from "./useCardCollectionStore";

/**
 * Grants decks for modules the user completed BEFORE the collection feature
 * shipped (Yoav 2026-08-01). useCompletedModulesStore is the durable local
 * superset of completions (server-backfilled by useProgress), so anyone who
 * ever opened a module chest sees their decks unlocked instead of a lying
 * "locked" state. Runs on the surfaces that display collection state
 * (ProfileScreen, CollectionScreen); idempotent and cheap.
 */
export function useCollectionBackfill(): void {
  // Selecting the array reference itself is v5-safe: the store only replaces
  // it when completions actually change.
  const completedIds = useCompletedModulesStore((s) => s.completedIds);
  useEffect(() => {
    if (completedIds.length === 0) return;
    try {
      useCardCollectionStore.getState().backfillCollected(completedIds);
    } catch { /* non-fatal — locked decks simply wait for the next visit */ }
  }, [completedIds]);
}
