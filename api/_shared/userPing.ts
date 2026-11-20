// api/_shared/userPing.ts
//
// POST /api/users/ping — "this user is active today" (feeds the daily-email
// inactivity check) + the same IL-calendar streak advance as /api/sync/streak.
// Served by api/users/ping.ts (production) and app/api/users/ping+api.ts (dev).
//
// Requires a session token since 2026-11-20. It used to update whatever row
// the body's `authId` named, with no authentication. Every app build in the
// field (since May 2026) already attaches the Bearer token to this call when
// it has one, so the only tokenless callers are sessions the server already
// treats as signed out everywhere else, and anyone forging pings. Those get
// 401 and a [legacy-tokenless] log line.

import {
  missingToken,
  resolveCaller,
  type ApiResult,
  type CallerDeps,
  type CallerInput,
  type LegacyLogger,
  logLegacyCall,
} from './callerAuth';

export interface StreakRow {
  currentStreak: number | null;
  longestStreak: number | null;
  lastActiveDate: string | null;
}

export interface StreakUpdate {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
}

export interface PingStore {
  read(userId: string): Promise<StreakRow | null>;
  write(userId: string, next: StreakUpdate): Promise<void>;
}

export interface PingDeps extends CallerDeps {
  store: PingStore;
  now(): number;
  logLegacy?: LegacyLogger;
}

// ── Streak math — MUST mirror api/sync/streak.ts exactly ────────────────────
// The 2026-07-14 "frozen streak" bug: this endpoint used to write
// lastActiveDate = UTC-today WITHOUT touching the streak. On every foreground
// it raced the daily streak POST; when ping won, the streak endpoint saw
// last === today, treated the day as already counted, and returned the streak
// UNCHANGED — freezing users at 2/5/7 for days. It also wrote the UTC
// calendar, which between 00:00-03:00 Israel time is *yesterday*. The fix:
// ping performs the SAME IL-zoned, streak-aware update as /api/sync/streak,
// so whichever endpoint runs first counts the day correctly and the other
// becomes a true no-op.

export function todayIsraelDate(nowMs: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(nowMs));
}

function diffDays(later: string, earlier: string): number {
  const a = new Date(later + 'T00:00:00Z').getTime();
  const b = new Date(earlier + 'T00:00:00Z').getTime();
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

// Shabbat bridge (see api/sync/streak.ts): Fri → Sun keeps the streak, +2.
function isFriday(dateIl: string): boolean {
  return new Date(dateIl + 'T12:00:00Z').getUTCDay() === 5;
}

/** The row to write for `today`, or null when today is already counted (or
 *  the stored date is in the future / malformed — never rewind it). */
export function nextStreak(row: StreakRow, today: string): StreakUpdate | null {
  const last = row.lastActiveDate;
  if (last === today) return null;

  let current: number;
  if (!last) {
    current = 1;
  } else {
    const diff = diffDays(today, last);
    if (diff === 1) current = (row.currentStreak ?? 0) + 1;
    else if (diff === 2 && isFriday(last)) current = (row.currentStreak ?? 0) + 2;
    else if (diff > 1) current = 1;
    else return null;
  }
  const longest = Math.max(row.longestStreak ?? 0, current);
  return { currentStreak: current, longestStreak: longest, lastActiveDate: today };
}

export async function handlePing(input: CallerInput, deps: PingDeps): Promise<ApiResult> {
  const who = await resolveCaller(input, deps);
  if (!who.ok) return who.response;
  if (who.caller.kind === 'none') {
    (deps.logLegacy ?? logLegacyCall)('users/ping', 'refused');
    return missingToken();
  }

  const { userId, headers } = who.caller;
  const today = todayIsraelDate(deps.now());
  const row = await deps.store.read(userId);
  const next = row ? nextStreak(row, today) : null;
  if (next) await deps.store.write(userId, next);

  // Same body as before for every outcome (counted, already counted, no row).
  return { status: 200, body: { ok: true, date: today }, headers };
}
