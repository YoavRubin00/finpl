/** ISO calendar day key, "YYYY-MM-DD". Used for once-per-day gates. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const IL_DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** "YYYY-MM-DD" key anchored to midnight Asia/Jerusalem. Use for any
 *  user-facing daily reset — challenges, quests, streak ceremonies. Auto-
 *  handles IST/IDT transitions. Do NOT use for server-bound payloads that
 *  must agree with a UTC ledger; use `todayISO()` for those. */
export function israelDayKey(): string {
  return IL_DAY_FORMATTER.format(new Date());
}

/** Whole UTC calendar days between sign-up and today (0 on the first day, 1 on
 * day 2, …). Uses UTC-date comparison instead of raw millisecond division so
 * DST transitions (23h / 25h days) don't mis-count the boundary day. */
export function getDaysSinceSignup(createdAtISO: string | null | undefined): number {
  if (!createdAtISO) return 0;
  const created = new Date(createdAtISO);
  if (!Number.isFinite(created.getTime())) return 0;
  const createdDayMs = Date.UTC(
    created.getUTCFullYear(),
    created.getUTCMonth(),
    created.getUTCDate(),
  );
  const now = new Date();
  const todayMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const diff = todayMs - createdDayMs;
  if (diff < 0) return 0;
  return Math.round(diff / 86_400_000);
}