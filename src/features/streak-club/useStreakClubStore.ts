import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "../../lib/zustandStorage";
import { registerLocalStore } from "../../lib/stores/registry";
import { todayIsraelDate } from "../economy/useStreak";
import type { TableId } from "./loungeConfig";

/**
 * מועדון הרצף — state מקומי: אילו שולחנות נצפו + מונה-ביקורים.
 *
 * seenByDate ממופתח לפי dateKey (יום-ישראלי, כמו הרצף) — כך "נצפה"
 * מתאפס אוטומטית בחצות-ישראל בלי טיימרים: מחר הוא פשוט מפתח אחר.
 * שומרים חלון של 7 ימים (prune בכתיבה) — ההיסטוריה מזינה את שורת
 * חותמות-הביקור השבועית בטרקלין ("אל תשבור את השרשרת" בתוך המועדון).
 */
interface StreakClubState {
  seenByDate: Record<string, Partial<Record<TableId, true>>>;
  /** ביקורים בטרקלין לאורך חיי-המשתמש — לשורת "ביקור מס' X" */
  totalVisits: number;
  lastVisitDate: string | null;

  recordVisit: () => void;
  markTableSeen: (table: TableId) => void;
  /** איפוס מלא ב-sign-out (חוזה registerLocalStore) */
  reset: () => void;

  seenToday: (table: TableId) => boolean;
  allSeenToday: () => boolean;
  hasUnseenToday: () => boolean;
  seenCountToday: () => number;
}

const ALL_TABLES: TableId[] = ["stocks", "realestate", "savings"];
const HISTORY_DAYS = 7;

/** dateKey של לפני N ימים (עוגן חצות-UTC של התאריך הקלנדרי — בטוח לחישוב ימים) */
export function dateKeyDaysAgo(todayKey: string, daysAgo: number): string {
  const t = Date.parse(`${todayKey}T00:00:00Z`) - daysAgo * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/** חלון 7 הימים האחרונים בלבד — שומר את ה-storage זעיר */
function pruneHistory(
  seenByDate: Record<string, Partial<Record<TableId, true>>>,
  todayKey: string,
): Record<string, Partial<Record<TableId, true>>> {
  const keep: Record<string, Partial<Record<TableId, true>>> = {};
  for (let i = 0; i < HISTORY_DAYS; i++) {
    const k = dateKeyDaysAgo(todayKey, i);
    if (seenByDate[k]) keep[k] = seenByDate[k];
  }
  return keep;
}

export const useStreakClubStore = create<StreakClubState>()(
  persist(
    (set, get) => ({
      seenByDate: {},
      totalVisits: 0,
      lastVisitDate: null,

      recordVisit: () => {
        const today = todayIsraelDate();
        set((s) => ({
          totalVisits: s.totalVisits + 1,
          lastVisitDate: today,
          seenByDate: pruneHistory(s.seenByDate, today),
        }));
      },

      markTableSeen: (table) => {
        const today = todayIsraelDate();
        set((s) => ({
          seenByDate: {
            ...pruneHistory(s.seenByDate, today),
            [today]: { ...(s.seenByDate[today] ?? {}), [table]: true },
          },
        }));
      },

      reset: () => set({ seenByDate: {}, totalVisits: 0, lastVisitDate: null }),

      seenToday: (table) => Boolean(get().seenByDate[todayIsraelDate()]?.[table]),
      allSeenToday: () => {
        const today = get().seenByDate[todayIsraelDate()];
        return ALL_TABLES.every((t) => Boolean(today?.[t]));
      },
      hasUnseenToday: () => {
        const today = get().seenByDate[todayIsraelDate()];
        return ALL_TABLES.some((t) => !today?.[t]);
      },
      seenCountToday: () => {
        const today = get().seenByDate[todayIsraelDate()];
        return ALL_TABLES.reduce((n, t) => n + (today?.[t] ? 1 : 0), 0);
      },
    }),
    {
      name: "streak-club-store",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        seenByDate: s.seenByDate,
        totalVisits: s.totalVisits,
        lastVisitDate: s.lastVisitDate,
      }),
    },
  ),
);

registerLocalStore("streak-club-store", useStreakClubStore, "streak-club-store");
