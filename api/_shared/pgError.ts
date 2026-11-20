// api/_shared/pgError.ts
//
// SQLSTATE of a database error. drizzle-orm 0.45 wraps every driver error in a
// DrizzleQueryError whose own message is "Failed query: <sql> params: ..." and
// which has no `code`: the Postgres error is its `cause`. A check that reads
// `err.code` or the message directly never matches. Until 2026-11-20 that made
// the "invite code already taken" case of /api/referral/register-code answer
// 500 instead of 409, so the app never picked another code (found by the local
// Postgres run, 20.11).

/** SQLSTATE of a driver error, also when drizzle wrapped it (DrizzleQueryError.cause). */
export function pgErrorCode(err: unknown): string | null {
  let e: unknown = err;
  for (let i = 0; i < 4 && e && typeof e === 'object'; i++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
    e = (e as { cause?: unknown }).cause;
  }
  return null;
}

export const PG_UNIQUE_VIOLATION = '23505';
export const PG_UNDEFINED_TABLE = '42P01';
export const PG_UNDEFINED_COLUMN = '42703';
