import { useEffect, useRef } from "react";
import { useEconomyStore } from "../economy/useEconomyStore";

/**
 * Listens for the user's lifetime coin count crossing key milestones (10K,
 * 50K, 100K) and fires a one-time celebratory toast. The toast text frames it
 * as "someone in your clan" — anonymized aspirational framing per the plan.
 *
 * In v1 this only triggers from local economy changes; a future iteration
 * could subscribe to a server-side clan stream so each clan member sees the
 * toast when ANY member crosses a milestone.
 */
const MILESTONES = [10_000, 50_000, 100_000] as const;

interface ClanMilestoneToastHandler {
  showToast: (message: string) => void;
}

export function useClanMilestoneToast({ showToast }: ClanMilestoneToastHandler) {
  const coins = useEconomyStore((s) => s.coins);
  // Track which milestones we already announced — avoid re-firing on rerender.
  const announced = useRef<Set<number>>(new Set());

  useEffect(() => {
    for (const m of MILESTONES) {
      if (coins >= m && !announced.current.has(m)) {
        announced.current.add(m);
        showToast(`🎉 מישהו בקלאן עבר ${formatMilestone(m)} ₪! מי הבא?`);
      }
    }
  }, [coins, showToast]);
}

function formatMilestone(value: number): string {
  if (value >= 1_000) return `${value / 1_000}K`;
  return value.toLocaleString("he-IL");
}
