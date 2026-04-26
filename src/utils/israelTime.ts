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