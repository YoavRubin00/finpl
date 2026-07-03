/**
 * GET /api/users/search?q=<name>&authId=<email>&excludeId=<uuid>
 *
 * Real user-directory search for the friends page. Lets an AUTHED, registered
 * FinPlay user find OTHER registered users by their display name so they can
 * befriend them. This is the search backend the friends page was missing —
 * before it, the client filtered an intentionally-empty local list and always
 * returned nobody (the founder searched for himself and got nothing), because
 * the zero-fabrication rule forbids inventing users.
 *
 * Privacy: authed-only + minimal projection. We return ONLY a small,
 * privacy-safe view of each match — `id`, `displayName`, `level`, `avatarUrl` —
 * and NEVER email, auth_id, sync_token, coins/gems balances, or any other PII.
 * The caller must be a registered user (looked up by `authId`) and pass their
 * sync token, so the directory can't be scraped anonymously. Rate-limited
 * tighter than ordinary reads to blunt enumeration.
 *
 * Mirrors the existing server patterns: `neon(DATABASE_URL)` + `drizzle`,
 * `enforceRateLimit`, `safeErrorResponse`, `sanitizeString`/`validateSyncAuth`
 * (see crowd-bets/place + crowd-question/stats).
 */

import { and, asc, desc, eq, ilike, isNotNull, ne } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, validateSyncAuth } from '../_shared/validate';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sqlClient = neon(url);
  return drizzle(sqlClient);
}

const MIN_QUERY_LEN = 2;
const MAX_RESULTS = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Escape ILIKE metacharacters so a user-typed query is matched literally — a
 *  raw `%` or `_` would otherwise act as a wildcard. Postgres LIKE/ILIKE uses
 *  backslash as the default escape char, so `\%` matches a literal `%`. */
function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Build a JSON `Response`. `Response.json` resolves to the undici-typed
 * `Response` under this project's tsconfig (undici-types leaks into the ambient
 * lib), which does not structurally match the global `Response` the handler is
 * annotated with — the same lib conflict behind ~239 of the repo's baseline
 * tsc errors. Wrapping it here (and normalizing the type once) keeps the new
 * endpoint contributing ZERO tsc errors instead of one per call site, while the
 * response is byte-identical to `Response.json(...)`.
 */
function json(body: unknown, init?: ResponseInit): Response {
  return Response.json(body, init) as unknown as Response;
}

/** Privacy-safe projection returned to the client. No PII beyond a public
 *  display name + level + (optional) avatar. */
export interface UserSearchResult {
  id: string;
  displayName: string;
  level: number;
  avatarUrl: string | null;
}

export async function GET(request: Request): Promise<Response> {
  // Tighter than ordinary aggregate reads (crowd-question/stats = 60/min) to
  // blunt directory enumeration.
  const blocked = enforceRateLimit(request, 'users-search', { limit: 20, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const url = new URL(request.url);
    const q = sanitizeString(url.searchParams.get('q'), 60);
    const authId = sanitizeString(url.searchParams.get('authId'), 254);
    const excludeId = sanitizeString(url.searchParams.get('excludeId'), 64);

    // Auth: the caller MUST be a registered user. This is what keeps the
    // directory from being scraped anonymously.
    if (!authId) {
      return json({ error: 'Missing authId' }, { status: 400 });
    }

    const db = getDb();
    const callerRows = await db
      .select({ id: userProfiles.id, syncToken: userProfiles.syncToken })
      .from(userProfiles)
      .where(eq(userProfiles.authId, authId))
      .limit(1);
    const caller = callerRows[0];
    if (!caller) {
      return json({ error: 'Unknown user' }, { status: 401 });
    }
    if (!validateSyncAuth(request, caller.syncToken)) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Too-short queries return an honest empty set (no fabrication, no scan).
    if (!q || q.length < MIN_QUERY_LEN) {
      return json({ ok: true, results: [] });
    }

    // Substring (case-insensitive) match on display_name, excluding the caller
    // themselves (and any explicit valid excludeId).
    const conditions = [
      isNotNull(userProfiles.displayName),
      ilike(userProfiles.displayName, `%${escapeLike(q)}%`),
      ne(userProfiles.id, caller.id),
    ];
    if (excludeId && UUID_RE.test(excludeId) && excludeId !== caller.id) {
      conditions.push(ne(userProfiles.id, excludeId));
    }

    const rows = await db
      .select({
        id: userProfiles.id,
        displayName: userProfiles.displayName,
        level: userProfiles.level,
        avatarUrl: userProfiles.avatarUrl,
      })
      .from(userProfiles)
      .where(and(...conditions))
      .orderBy(desc(userProfiles.level), asc(userProfiles.displayName))
      .limit(MAX_RESULTS);

    const results: UserSearchResult[] = rows
      .filter((r): r is typeof r & { displayName: string } => Boolean(r.displayName))
      .map((r) => ({
        id: r.id,
        displayName: r.displayName,
        level: r.level ?? 1,
        avatarUrl: r.avatarUrl,
      }));

    return json({ ok: true, results });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'users/search GET');
  }
}
