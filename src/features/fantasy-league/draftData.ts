import type { DraftCategory } from "./draftTypes";

export const DRAFT_CATEGORIES: DraftCategory[] = [
  {
    id: "value",
    label: "ערך",
    color: "#3b82f6",
    assetIds: ["AAPL", "MSFT", "GOOGL"],
  },
  {
    id: "growth",
    label: "צמיחה",
    color: "#22c55e",
    assetIds: ["NVDA", "META", "AMZN"],
  },
  {
    id: "tech",
    label: "טכנולוגיה",
    color: "#8b5cf6",
    assetIds: ["TSLA", "NVDA", "MSFT"],
  },
  {
    id: "macro",
    label: "מאקרו",
    color: "#f59e0b",
    assetIds: ["XAU", "XAG", "SPY"],
  },
  {
    id: "crypto",
    label: "קריפטו",
    color: "#f97316",
    assetIds: ["BTC", "ETH"],
  },
];

export const DRAFT_CATEGORY_BY_ID = new Map(
  DRAFT_CATEGORIES.map((c) => [c.id, c]),
);

export const TOTAL_ROUNDS = DRAFT_CATEGORIES.length;

/**
 * Returns the ISO week string for the current week, e.g. "2026-W11".
 * Used as the weekId to detect when a new draft should start.
 */
export function getCurrentWeekId(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7,
  );
  return `${now.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}
