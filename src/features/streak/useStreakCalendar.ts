import { useMemo } from "react";
import { useEconomyStore } from "../economy/useEconomyStore";

export type DayCellStatus =
  | "active"   // user completed a task
  | "frozen"   // streak freeze was consumed
  | "missed"   // user had a streak before but missed this day
  | "today"    // today, not yet completed
  | "future"   // future date
  | "neutral"  // before first activity or no context
  | "empty";   // grid padding (not a real date)

export interface DayCell {
  day: number;       // 1-31, or 0 for empty padding
  date: string;      // ISO "YYYY-MM-DD", "" for empty
  status: DayCellStatus;
}

function toISO(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function getCalendarDays(
  year: number,
  month: number,
  activeDatesSet: Set<string>,
  frozenDatesSet: Set<string>,
  todayISO: string,
  firstActiveDate: string | null,
): DayCell[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: DayCell[] = [];

  // Leading empty cells
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: 0, date: "", status: "empty" });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = toISO(year, month, d);

    let status: DayCellStatus;
    if (activeDatesSet.has(iso)) {
      status = "active";
    } else if (frozenDatesSet.has(iso)) {
      status = "frozen";
    } else if (iso === todayISO) {
      status = "today";
    } else if (iso > todayISO) {
      status = "future";
    } else if (firstActiveDate && iso >= firstActiveDate) {
      status = "missed";
    } else {
      status = "neutral";
    }

    cells.push({ day: d, date: iso, status });
  }

  // Trailing empty cells to fill last row
  const remainder = cells.length % 7;
  if (remainder > 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      cells.push({ day: 0, date: "", status: "empty" });
    }
  }

  return cells;
}

export function useStreakCalendar(year: number, month: number) {
  const activeDates = useEconomyStore((s) => s.activeDates);
  const frozenDates = useEconomyStore((s) => s.frozenDates);
  const streak = useEconomyStore((s) => s.streak);
  const streakFreezes = useEconomyStore((s) => s.streakFreezes);

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const activeDatesSet = useMemo(() => new Set(activeDates), [activeDates]);
  const frozenDatesSet = useMemo(() => new Set(frozenDates), [frozenDates]);

  const firstActiveDate = useMemo(() => {
    if (activeDates.length === 0) return null;
    return [...activeDates].sort()[0];
  }, [activeDates]);

  const days = useMemo(
    () => getCalendarDays(year, month, activeDatesSet, frozenDatesSet, todayISO, firstActiveDate),
    [year, month, activeDatesSet, frozenDatesSet, todayISO, firstActiveDate],
  );

  return { days, streak, streakFreezes, todayISO };
}
