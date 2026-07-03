/**
 * The REAL friend graph (Yoav 2026-07-03: "הוסף חבר" was a silent no-op — the
 * zero-fabrication rule forbids fake friends, so this is the genuine edge
 * store).
 *
 * GET  /api/friends/graph?authId=<email>
 *   → { ok, friends: FriendView[], incoming: RequestView[], outgoing: RequestView[] }
 *
 * POST /api/friends/graph  { authId, action: 'request', targetUserId }
 *   → creates a pending request. If the TARGET already has a pending request
 *     toward the caller, that's mutual intent — the existing row flips to
 *     'accepted' instead. Idempotent for repeats.
 * POST /api/friends/graph  { authId, action: 'respond', requestId, accept }
 *   → addressee accepts (status='accepted') or declines (row deleted).
 *
 * Auth mirrors users/search: registered caller (authId → user_profiles) +
 * validateSyncAuth. Projections are privacy-safe: id/displayName/level/avatar
 * only — never email/coins/PII.
 */

import { and, eq, or } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userProfiles, friendships } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, validateSyncAuth } from '../_shared/validate';
import { json } from '../_shared/json';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sqlClient = neon(url);
  return drizzle(sqlClient);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface FriendView {
  id: string;
  displayName: string;
  level: number;
  avatarUrl: string | null;
}

export interface RequestView extends FriendView {
  requestId: string;
}

type Db = ReturnType<typeof getDb>;

async function authCaller(db: Db, request: Request, authId: string | null | undefined) {
  if (!authId) return null;
  const rows = await db
    .select({ id: userProfiles.id, syncToken: userProfiles.syncToken })
    .from(userProfiles)
    .where(eq(userProfiles.authId, authId))
    .limit(1);
  const caller = rows[0];
  if (!caller) return null;
  if (!validateSyncAuth(request, caller.syncToken)) return null;
  return caller;
}

/** Privacy-safe profile views for a set of user ids (empty-safe). */
async function profileViews(db: Db, ids: string[]): Promise<Map<string, FriendView>> {
  const out = new Map<string, FriendView>();
  for (const id of ids) {
    if (out.has(id)) continue;
    const rows = await db
      .select({
        id: userProfiles.id,
        displayName: userProfiles.displayName,
        level: userProfiles.level,
        avatarUrl: userProfiles.avatarUrl,
      })
      .from(userProfiles)
      .where(eq(userProfiles.id, id))
      .limit(1);
    const r = rows[0];
    if (r) {
      out.set(id, {
        id: r.id,
        displayName: r.displayName ?? 'משתמש FinPlay',
        level: r.level ?? 1,
        avatarUrl: r.avatarUrl,
      });
    }
  }
  return out;
}

export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'friends-graph', { limit: 60, windowSec: 60 });
  if (blocked) return blocked;
  try {
    const url = new URL(request.url);
    const authId = sanitizeString(url.searchParams.get('authId'), 254);
    const db = getDb();
    const caller = await authCaller(db, request, authId);
    if (!caller) return json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await db
      .select({
        id: friendships.id,
        requesterId: friendships.requesterId,
        addresseeId: friendships.addresseeId,
        status: friendships.status,
      })
      .from(friendships)
      .where(or(eq(friendships.requesterId, caller.id), eq(friendships.addresseeId, caller.id)));

    const friendIds: string[] = [];
    const incoming: Array<{ requestId: string; userId: string }> = [];
    const outgoing: Array<{ requestId: string; userId: string }> = [];
    for (const row of rows) {
      const other = row.requesterId === caller.id ? row.addresseeId : row.requesterId;
      if (row.status === 'accepted') friendIds.push(other);
      else if (row.addresseeId === caller.id) incoming.push({ requestId: row.id, userId: other });
      else outgoing.push({ requestId: row.id, userId: other });
    }

    const views = await profileViews(db, [
      ...friendIds,
      ...incoming.map((r) => r.userId),
      ...outgoing.map((r) => r.userId),
    ]);
    const toView = (userId: string): FriendView | null => views.get(userId) ?? null;

    return json({
      ok: true,
      friends: friendIds.map(toView).filter(Boolean),
      incoming: incoming
        .map((r) => (toView(r.userId) ? { ...toView(r.userId), requestId: r.requestId } : null))
        .filter(Boolean),
      outgoing: outgoing
        .map((r) => (toView(r.userId) ? { ...toView(r.userId), requestId: r.requestId } : null))
        .filter(Boolean),
    });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'friends/graph GET');
  }
}

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'friends-graph-write', { limit: 30, windowSec: 60 });
  if (blocked) return blocked;
  try {
    const body = (await request.json().catch(() => null)) as {
      authId?: string;
      action?: string;
      targetUserId?: string;
      requestId?: string;
      accept?: boolean;
    } | null;
    if (!body) return json({ error: 'Bad request' }, { status: 400 });

    const authId = sanitizeString(body.authId ?? null, 254);
    const db = getDb();
    const caller = await authCaller(db, request, authId);
    if (!caller) return json({ error: 'Unauthorized' }, { status: 401 });

    if (body.action === 'request') {
      const targetUserId = sanitizeString(body.targetUserId ?? null, 64);
      if (!targetUserId || !UUID_RE.test(targetUserId) || targetUserId === caller.id) {
        return json({ error: 'Bad target' }, { status: 400 });
      }
      // Reverse pending request = mutual intent → accept it.
      const reverse = await db
        .select({ id: friendships.id, status: friendships.status })
        .from(friendships)
        .where(and(eq(friendships.requesterId, targetUserId), eq(friendships.addresseeId, caller.id)))
        .limit(1);
      if (reverse[0]) {
        if (reverse[0].status === 'pending') {
          await db
            .update(friendships)
            .set({ status: 'accepted', acceptedAt: new Date().toISOString() })
            .where(eq(friendships.id, reverse[0].id));
        }
        return json({ ok: true, state: 'friends' });
      }
      // Existing forward row (pending or accepted) → idempotent echo.
      const forward = await db
        .select({ id: friendships.id, status: friendships.status })
        .from(friendships)
        .where(and(eq(friendships.requesterId, caller.id), eq(friendships.addresseeId, targetUserId)))
        .limit(1);
      if (forward[0]) {
        return json({ ok: true, state: forward[0].status === 'accepted' ? 'friends' : 'pending' });
      }
      // Target must exist (and be a real registered profile).
      const target = await db
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(eq(userProfiles.id, targetUserId))
        .limit(1);
      if (!target[0]) return json({ error: 'Unknown target' }, { status: 404 });

      await db.insert(friendships).values({ requesterId: caller.id, addresseeId: targetUserId });
      return json({ ok: true, state: 'pending' });
    }

    if (body.action === 'respond') {
      const requestId = sanitizeString(body.requestId ?? null, 64);
      if (!requestId || !UUID_RE.test(requestId)) return json({ error: 'Bad request id' }, { status: 400 });
      const rows = await db
        .select({ id: friendships.id, addresseeId: friendships.addresseeId, status: friendships.status })
        .from(friendships)
        .where(eq(friendships.id, requestId))
        .limit(1);
      const row = rows[0];
      // Only the ADDRESSEE of a pending request may respond to it.
      if (!row || row.addresseeId !== caller.id || row.status !== 'pending') {
        return json({ error: 'Not found' }, { status: 404 });
      }
      if (body.accept === true) {
        await db
          .update(friendships)
          .set({ status: 'accepted', acceptedAt: new Date().toISOString() })
          .where(eq(friendships.id, row.id));
        return json({ ok: true, state: 'friends' });
      }
      await db.delete(friendships).where(eq(friendships.id, row.id));
      return json({ ok: true, state: 'declined' });
    }

    if (body.action === 'remove') {
      const targetUserId = sanitizeString(body.targetUserId ?? null, 64);
      if (!targetUserId || !UUID_RE.test(targetUserId)) return json({ error: 'Bad target' }, { status: 400 });
      // Either direction: unfriend (accepted) or cancel my outgoing pending.
      await db
        .delete(friendships)
        .where(or(
          and(eq(friendships.requesterId, caller.id), eq(friendships.addresseeId, targetUserId)),
          and(eq(friendships.requesterId, targetUserId), eq(friendships.addresseeId, caller.id), eq(friendships.status, 'accepted')),
        ));
      return json({ ok: true, state: 'removed' });
    }

    return json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'friends/graph POST');
  }
}
