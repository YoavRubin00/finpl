const IL_TIMEZONE = 'Asia/Jerusalem';

const il_date_formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: IL_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Returns the current date in Israel local time as ISO "YYYY-MM-DD".
 * Used as a deterministic per-day key for daily-rotation features.
 * The day rolls over at 00:00 Asia/Jerusalem regardless of the device's clock.
 */
export function getIsraelDateISO(now: Date = new Date()): string {
  return il_date_formatter.format(now);
}

/**
 * Returns true if the given ISO date string equals today's Israel-local date.
 */
export function isTodayIsraelDate(iso: string): boolean {
  return iso === getIsraelDateISO();
}

const il_wall_formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: IL_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export interface IsraelParts {
  /** 0=Sunday … 6=Saturday, in Israel local time. */
  dayOfWeek: number;
  /** 0–23, Israel wall clock. */
  hour: number;
  /** 0–59, Israel wall clock. */
  minute: number;
  /** hour + minute/60 — convenient for threshold comparisons (e.g. `>= 9`). */
  timeDecimal: number;
}

/**
 * The current Israel wall clock broken into day-of-week + hour + minute.
 *
 * DST-safe: the day-of-week comes from the pure Israel calendar date
 * (interpreted at UTC-noon so no offset can nudge it across a boundary), and
 * the hour/minute come from an Asia/Jerusalem formatter. Use this for any
 * "what day/hour is it in Israel" scheduling decision instead of the raw
 * device clock (`Date.getDay()/getHours()`), which is anchored to wherever the
 * phone thinks it is — wrong for travellers and not Israel-locked.
 */
export function getIsraelParts(now: Date = new Date()): IsraelParts {
  const iso = getIsraelDateISO(now); // "YYYY-MM-DD" in Asia/Jerusalem
  const dayOfWeek = new Date(`${iso}T12:00:00Z`).getUTCDay();
  const [hStr, mStr] = il_wall_formatter.format(now).split(':');
  // `hour12:false` can emit "24" for midnight in some engines → normalise.
  const hour = Number(hStr) % 24;
  const minute = Number(mStr) || 0;
  const safeHour = Number.isFinite(hour) ? hour : 0;
  return { dayOfWeek, hour: safeHour, minute, timeDecimal: safeHour + minute / 60 };
}

/**
 * Adds (or subtracts, with a negative `days`) whole days to an Israel-local
 * ISO date string and returns the resulting "YYYY-MM-DD". Pure calendar
 * arithmetic anchored at UTC-noon, so it never slips a day around DST.
 */
export function israelDatePlusDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Milliseconds until the next 00:00 Asia/Jerusalem boundary, useful for
 * scheduling a reset on the client when the day rolls over.
 */
export function msUntilNextIsraelMidnight(now: Date = new Date()): number {
  const today = getIsraelDateISO(now);
  for (let i = 1; i <= 30; i++) {
    const candidate = new Date(now.getTime() + i * 60_000);
    if (getIsraelDateISO(candidate) !== today) {
      const finer = new Date(candidate.getTime() - 60_000);
      for (let s = 1; s <= 60; s++) {
        const t = new Date(finer.getTime() + s * 1_000);
        if (getIsraelDateISO(t) !== today) {
          return Math.max(1_000, t.getTime() - now.getTime());
        }
      }
    }
  }
  return 24 * 60 * 60 * 1000;
}