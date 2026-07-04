/**
 * /api/trade-rooms/messages — real server-backed trade-room chat.
 *
 * Before migration 0011 the rooms were device-local: nobody ever saw anyone
 * else's messages. This endpoint makes them real (Yoav 2026-07-04).
 *
 * GET  ?authId=X&roomId=Y[&since=ISO] → last messages for the room (visible only).
 * POST { authId, roomId, body, sentiment?, displayName, avatarId? } → send.
 *
 * Auth: registered caller only (authId → user_profiles) + X-Sync-Token via
 * validateSyncAuth — same contract as portfolio-share/feed. Guests stay
 * local-only on the client (the guest gate nudges signup).
 *
 * Honesty: the feed returns ONLY genuine user rows — no synthetic chatter.
 */
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, validateSyncAuth } from '../_shared/validate';
import { json } from '../_shared/json';
import { sql } from 'drizzle-orm';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sqlClient = neon(url);
  return drizzle(sqlClient);
}

type Db = ReturnType<typeof getDb>;

const MAX_BODY = 240;
const MAX_ROOM_ID = 64;
const MAX_NAME = 24;
const PAGE = 100;

interface RoomMessageView {
  id: string;
  roomId: string;
  displayName: string;
  avatarId: string | null;
  body: string;
  sentiment: 'bull' | 'bear' | null;
  isSelf: boolean;
  sentAt: string;
}

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

export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'trade-rooms-messages', { limit: 60, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const url = new URL(request.url);
    const authId = sanitizeString(url.searchParams.get('authId'), 128);
    const roomId = sanitizeString(url.searchParams.get('roomId'), MAX_ROOM_ID);
    const since = sanitizeString(url.searchParams.get('since'), 40);
    if (!roomId) return json({ error: 'Missing roomId' }, { status: 400 });

    const db = getDb();
    const caller = await authCaller(db, request, authId);
    if (!caller) return json({ error: 'Unauthorized' }, { status: 401 });

    const sinceClause = since ? sql` AND created_at > ${since}` : sql``;
    const result = await db.execute(sql`
      SELECT id, room_id, user_id, display_name, avatar_id, body, sentiment, created_at
        FROM trade_room_messages
       WHERE room_id = ${roomId}
         AND hidden = false${sinceClause}
       ORDER BY created_at DESC
       LIMIT ${PAGE}
    `);
    const raw = ((result as unknown as { rows?: unknown[] }).rows
      ?? (result as unknown as unknown[]));
    const rows = Array.isArray(raw) ? raw : [];

    const messages: RoomMessageView[] = rows
      .map((r): RoomMessageView => {
        const row = r as {
          id: string;
          room_id: string;
          user_id: string;
          display_name: string;
          avatar_id: string | null;
          body: string;
          sentiment: string | null;
          created_at: string | Date;
        };
        return {
          id: row.id,
          roomId: row.room_id,
          displayName: row.display_name,
          avatarId: row.avatar_id ?? null,
          body: row.body,
          sentiment: row.sentiment === 'bull' || row.sentiment === 'bear' ? row.sentiment : null,
          isSelf: row.user_id === caller.id,
          sentAt: typeof row.created_at === 'string' ? row.created_at : row.created_at.toISOString(),
        };
      })
      .reverse(); // oldest-first for the chat list

    return json({ ok: true, messages });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'trade-rooms/messages GET');
  }
}

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'trade-rooms-send', { limit: 20, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const bodyJson = (await request.json()) as {
      authId?: string;
      roomId?: string;
      body?: string;
      sentiment?: string;
      displayName?: string;
      avatarId?: string | null;
    };
    const authId = sanitizeString(bodyJson.authId, 128);
    const roomId = sanitizeString(bodyJson.roomId, MAX_ROOM_ID);
    const text = sanitizeString(bodyJson.body, MAX_BODY);
    const displayName = sanitizeString(bodyJson.displayName, MAX_NAME) ?? 'משקיע/ה';
    const avatarId = sanitizeString(bodyJson.avatarId ?? null, 64);
    const sentiment =
      bodyJson.sentiment === 'bull' || bodyJson.sentiment === 'bear' ? bodyJson.sentiment : null;

    if (!roomId || !text) return json({ error: 'Missing roomId or body' }, { status: 400 });

    const db = getDb();
    const caller = await authCaller(db, request, authId);
    if (!caller) return json({ error: 'Unauthorized' }, { status: 401 });

    const inserted = await db.execute(sql`
      INSERT INTO trade_room_messages (room_id, user_id, display_name, avatar_id, body, sentiment)
      VALUES (${roomId}, ${caller.id}, ${displayName}, ${avatarId}, ${text}, ${sentiment})
      RETURNING id, created_at
    `);
    const rawIns = ((inserted as unknown as { rows?: unknown[] }).rows
      ?? (inserted as unknown as unknown[]));
    const row = (Array.isArray(rawIns) ? rawIns[0] : undefined) as
      | { id: string; created_at: string | Date }
      | undefined;

    return json({
      ok: true,
      id: row?.id ?? null,
      sentAt: row
        ? typeof row.created_at === 'string' ? row.created_at : row.created_at.toISOString()
        : new Date().toISOString(),
    });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'trade-rooms/messages POST');
  }
}
