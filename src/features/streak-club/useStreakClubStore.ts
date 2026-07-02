import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "../../lib/zustandStorage";
import { registerLocalStore } from "../../lib/stores/registry";
import { todayIsraelDate } from "../economy/useStreak";
import type { TableId } from "./loungeConfig";

/**
 * מועדון הרצף — state מקומי: אילו שולחנות נצפו היום + מונה-ביקורים.
 *
 * seenByDate ממופתח לפי dateKey (יום-ישראלי, כמו הרצף) — כך "נצפה"
 * מתאפס אוטומטית בחצות-ישראל בלי טיימרים: מחר הוא פשוט מפתח אחר.
 * שומרים רק את היום הנוכחי (prune בכתיבה) כדי שה-storage יישאר זעיר.
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
}

const ALL_TABLES: TableId[] = ["stocks", "realestate", "savings"];

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
          // prune: משאירים רק את היום — העבר לא נחוץ לאף מסך
          seenByDate: { [today]: s.seenByDate[today] ?? {} },
        }));
      },

      markTableSeen: (table) => {
        const today = todayIsraelDate();
        set((s) => ({
          seenByDate: { [today]: { ...(s.seenByDate[today] ?? {}), [table]: true } },
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
