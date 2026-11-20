// api/_shared/withAuth.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from 'drizzle-orm';
import { verifySession, signSession, shouldRefresh, type SessionPayloadDecoded } from './jwt';
import { getDb } from './db';

export interface AuthContext {
  authId: string;
  userId: string;
  decoded: SessionPayloadDecoded;
}

export type AuthedHandler = (
  req: VercelRequest,
  res: VercelResponse,
  ctx: AuthContext,
) => Promise<void | VercelResponse> | void | VercelResponse;

/** Does the account a session names (user_profiles.id = token `sub`) still exist? */
export type SessionUserExists = (userId: string) => Promise<boolean>;

export type BearerOutcome =
  | { ok: true; decoded: SessionPayloadDecoded }
  | { ok: false; status: 401 | 500; body: { error: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One indexed primary-key lookup. A `sub` that isn't a uuid names no row. */
export const sessionUserExistsInDb: SessionUserExists = async (userId) => {
  if (!UUID_RE.test(userId)) return false;
  const result = await getDb().execute(sql`SELECT 1 AS hit FROM user_profiles WHERE id = ${userId}::uuid LIMIT 1`);
  const withRows = result as unknown as { rows?: unknown[] };
  const rows = Array.isArray(withRows?.rows) ? withRows.rows : Array.isArray(result) ? (result as unknown[]) : [];
  return rows.length > 0;
};

/**
 * The token check behind withAuth, without the Vercel request/response (so
 * scripts/test-account-delete.ts runs it with a fake account lookup).
 *
 * Session tokens are stateless JWTs (30 days, renewed through
 * X-Auth-Refreshed-Token), so deleting an account (POST /api/account/delete,
 * 2026-11-20) cannot revoke them. What a token names is the user_profiles row,
 * and deletion removes that row: a token whose row is gone is answered like an
 * expired one (401 "Invalid or expired token"), which the app treats as a
 * sign-out. Before this check such a token kept working: /api/auth/refresh
 * renewed it forever, /api/sync/profile answered `profile: null` (the boot
 * then went on "signed in" with saved state), and writes that insert rows for
 * the user failed on the foreign key with a 500. Ids are random uuids, never
 * reused, so an old token can't reach an account created later with the same
 * email. A failed lookup is a 500 (never a 401: that would sign the user out).
 */
export async function authenticateBearer(
  authHeader: string,
  userExists: SessionUserExists,
): Promise<BearerOutcome> {
  const match = /^Bearer (.+)$/.exec(authHeader);
  if (!match) {
    return { ok: false, status: 401, body: { error: 'Missing Authorization header' } };
  }

  let decoded: SessionPayloadDecoded;
  try {
    decoded = verifySession(match[1]);
  } catch {
    return { ok: false, status: 401, body: { error: 'Invalid or expired token' } };
  }

  let exists: boolean;
  try {
    exists = await userExists(decoded.sub);
  } catch (err) {
    console.error(`[withAuth] account lookup failed: ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, status: 500, body: { error: 'An unexpected error occurred. Please try again later.' } };
  }
  if (!exists) {
    return { ok: false, status: 401, body: { error: 'Invalid or expired token' } };
  }
  return { ok: true, decoded };
}

export function withAuth(handler: AuthedHandler) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // CORS — auth is via Bearer header (not cookies), so `*` is safe and
    // enables browser-based dev/testing from a different origin. In prod the
    // web app is same-origin, so these headers are simply redundant.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Expose-Headers', 'X-Auth-Refreshed-Token');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    const outcome = await authenticateBearer(req.headers.authorization ?? '', sessionUserExistsInDb);
    if (!outcome.ok) {
      return res.status(outcome.status).json(outcome.body);
    }
    const { decoded } = outcome;

    if (shouldRefresh(decoded)) {
      const refreshed = signSession({ sub: decoded.sub, authId: decoded.authId });
      res.setHeader('X-Auth-Refreshed-Token', refreshed);
    }

    return handler(req, res, {
      authId: decoded.authId,
      userId: decoded.sub,
      decoded,
    });
  };
}
