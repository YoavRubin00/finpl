import { msUntilNextIsraelMidnight } from "../../../utils/israelTime";
import type { CrowdWisdomQuestion } from "../types";

/**
 * REAL close times for crowd-wisdom questions (Yoav 2026-07-02: no invented
 * "closes in 84h" — derive an honest close moment from the question's real
 * horizon). Pure: every function accepts a `now` param (default new Date()).
 *
 * A question may pin an ABSOLUTE `closesAt` (ISO) for a one-off dated event —
 * that always wins over the horizon buckets below.
 *
 * Horizon buckets, by category + id/prompt keywords:
 *   • yearly ("בסוף השנה" / *_year_end)  → Dec 31 23:59 IL (year-end close)
 *   • ta35 weekly forecast          → next Friday 14:00 IL (post-reform the TASE
 *                                      trades Mon–Fri and the Fri session ends 14:00)
 *   • US weekly (nvda/tesla)        → next Friday 23:00 IL (Wall St. close)
 *   • monthly ("סוף החודש" / dollar-shekel / pension) → last day of month 23:59 IL
 *   • everything else (daily / sentiment / personal)  → next Israel midnight
 *
 * Weekday / last-day math runs on the device-local clock, matching the existing
 * shipping references (Ta35ForecastCard.hoursToFridayClose, fantasyData.ts).
 * The daily bucket uses msUntilNextIsraelMidnight so day-rollover is anchored
 * to Asia/Jerusalem regardless of device timezone.
 */

type Horizon = "yearly" | "ta35" | "us_weekly" | "monthly" | "daily";

/** After a boundary passes, a question stays "closed" (resolving) for this long,
 *  then reopens counting down to the next cycle. Keeps the closed window short
 *  and timezone-robust while still letting closed questions drop out + rotate. */
const SETTLE_MS = 2 * 60 * 60 * 1000;

function classifyHorizon(q: CrowdWisdomQuestion): Horizon {
  const id = q.id.toLowerCase();
  const prompt = q.prompt;
  // Year-end: "בסוף השנה" horizon (e.g. forecast_sp500_year_end). Must be checked
  // BEFORE us_weekly, or the "sp500" id would wrongly bucket it as a weekly close.
  if (id.includes("year_end") || id.includes("year") || prompt.includes("בסוף השנה") || prompt.includes("סוף השנה")) {
    return "yearly";
  }
  // Monthly: explicit "end of month" horizon, dollar/shekel, pension, etc.
  if (
    id.includes("dollar_shekel") ||
    id.includes("month") ||
    id.includes("pension") ||
    prompt.includes("סוף החודש") ||
    prompt.includes("החודש")
  ) {
    return "monthly";
  }
  // TASE weekly close — Friday (post-reform the TASE trades Mon–Fri).
  if (id.includes("ta35") || id.includes("ta_35") || id.includes("tlv")) {
    return "ta35";
  }
  // Wall Street weekly close — Friday.
  if (id.includes("sp500") || id.includes("nvda") || id.includes("tesla") || id.includes("tsla")) {
    return "us_weekly";
  }
  return "daily";
}

/** Next occurrence of `targetDay` (0=Sun … 6=Sat) at hour:minute, device-local. */
function nextWeekdayAt(now: Date, targetDay: number, hour: number, minute: number): Date {
  const d = new Date(now);
  const daysUntil = (targetDay - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + daysUntil);
  d.setHours(hour, minute, 0, 0);
  // If today IS the target day but the close time already passed, roll a week.
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 7);
  return d;
}

/** Most recent past occurrence of `targetDay` at hour:minute, device-local. */
function prevWeekdayAt(now: Date, targetDay: number, hour: number, minute: number): Date {
  const d = new Date(now);
  const daysSince = (d.getDay() - targetDay + 7) % 7;
  d.setDate(d.getDate() - daysSince);
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() > now.getTime()) d.setDate(d.getDate() - 7);
  return d;
}

/** Last calendar day of the current month at hour:minute, device-local. */
function lastDayOfMonthAt(now: Date, hour: number, minute: number): Date {
  // Day 0 of next month == last day of this month.
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 0, hour, minute, 0, 0);
  if (d.getTime() <= now.getTime()) {
    // Already past this month's close — roll to next month's last day.
    return new Date(now.getFullYear(), now.getMonth() + 2, 0, hour, minute, 0, 0);
  }
  return d;
}

/** Dec 31 of the current year at hour:minute, device-local (rolls to next year
 *  once this year's close has passed). Drives the "בסוף השנה" horizon. */
function lastDayOfYearAt(now: Date, hour: number, minute: number): Date {
  const d = new Date(now.getFullYear(), 11, 31, hour, minute, 0, 0);
  if (d.getTime() <= now.getTime()) {
    return new Date(now.getFullYear() + 1, 11, 31, hour, minute, 0, 0);
  }
  return d;
}

/** REAL close time for a question — the upcoming boundary (drives the countdown). */
export function getQuestionCloseTime(q: CrowdWisdomQuestion, now: Date = new Date()): Date {
  // An explicit one-off deadline (a scheduled real-world event) always wins.
  if (q.closesAt) {
    const explicit = new Date(q.closesAt);
    if (!Number.isNaN(explicit.getTime())) return explicit;
  }
  switch (classifyHorizon(q)) {
    case "yearly":
      return lastDayOfYearAt(now, 23, 59);
    case "ta35":
      return nextWeekdayAt(now, 5 /* Fri */, 14, 0);
    case "us_weekly":
      return nextWeekdayAt(now, 5 /* Fri */, 23, 0);
    case "monthly":
      return lastDayOfMonthAt(now, 23, 59);
    case "daily":
    default:
      return new Date(now.getTime() + msUntilNextIsraelMidnight(now));
  }
}

/**
 * Short countdown label: hours ("Xש׳") when under 48h, days ("Xי׳") beyond.
 * Always ≥1 so the timer never reads "0".
 */
export function getTimeLeftLabel(close: Date, now: Date = new Date()): string {
  const diffMs = Math.max(0, close.getTime() - now.getTime());
  const totalHours = diffMs / 3_600_000;
  if (totalHours < 48) {
    return `${Math.max(1, Math.round(totalHours))}ש׳`;
  }
  return `${Math.max(1, Math.round(totalHours / 24))}י׳`;
}

/**
 * True during the brief "resolving" window right after a question's real-world
 * boundary passes — the weekly/monthly question has resolved for this cycle and
 * should drop out of the live list (the screen then rotates the remaining pool
 * so it stays full). Daily/sentiment questions reset cleanly at Israel midnight
 * and are never considered closed mid-day.
 */
export function isClosed(q: CrowdWisdomQuestion, now: Date = new Date()): boolean {
  // A one-off dated question is closed for good once its deadline passes (it never
  // reopens — the real-world outcome is now public).
  if (q.closesAt) {
    const explicit = new Date(q.closesAt);
    if (!Number.isNaN(explicit.getTime())) return now.getTime() >= explicit.getTime();
  }
  let lastBoundary: Date | null = null;
  switch (classifyHorizon(q)) {
    case "yearly": {
      // Last year's Dec 31 23:59 — only within the settle window at year-end.
      lastBoundary = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 0, 0);
      break;
    }
    case "ta35":
      lastBoundary = prevWeekdayAt(now, 5, 14, 0);
      break;
    case "us_weekly":
      lastBoundary = prevWeekdayAt(now, 5, 23, 0);
      break;
    case "monthly": {
      // Last month's final day 23:59 — only within the settle window at month-end.
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 0, 0);
      lastBoundary = prevMonthEnd;
      break;
    }
    case "daily":
    default:
      return false;
  }
  const since = now.getTime() - lastBoundary.getTime();
  return since >= 0 && since < SETTLE_MS;
}
