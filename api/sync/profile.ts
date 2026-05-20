import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userProfiles } from '../../src/db/schema';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sql = neon(url);
  return drizzle(sql);
}

interface ProfileUpsertBody {
  authId: string;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  level?: number;
  xp?: number;
  coins?: number;
  gems?: number;
  currentStreak?: number;
  longestStreak?: number;
  isPro?: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const authId = req.query.authId as string | undefined;
      if (!authId) {
        return res.status(400).json({ error: 'Missing authId query parameter' });
      }

      const db = getDb();
      const rows = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.authId, authId))
        .limit(1);

      const profile = rows[0] ?? null;
      return res.status(200).json({ ok: true, profile });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: message });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body as ProfileUpsertBody;
      const { authId, ...data } = body;

      if (!authId) {
        return res.status(400).json({ error: 'Missing authId' });
      }

      const db = getDb();

      // Build the UPDATE set with only the fields that were actually provided.
      // CRITICAL: passing `undefined` into drizzle's `.set()` can translate to
      // NULL on some versions, which would wipe accumulated XP/coins/streak
      // when the client only sends profile metadata (display name / email).
      // See past incident: Aviv (avivsarusi100@gmail.com) lost progress because
      // every login posted `{displayName, email}` and the legacy handler
      // overwrote his real xp/coins with NULL → DEFAULT 0.
      const setFields: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      if (data.displayName !== undefined && data.displayName !== null) setFields.displayName = data.displayName;
      if (data.email !== undefined && data.email !== null) setFields.email = data.email;
      if (data.avatarUrl !== undefined && data.avatarUrl !== null) setFields.avatarUrl = data.avatarUrl;
      if (typeof data.level === 'number') setFields.level = data.level;
      if (typeof data.xp === 'number') setFields.xp = data.xp;
      if (typeof data.coins === 'number') setFields.coins = data.coins;
      if (typeof data.gems === 'number') setFields.gems = data.gems;
      if (typeof data.currentStreak === 'number') setFields.currentStreak = data.currentStreak;
      if (typeof data.longestStreak === 'number') setFields.longestStreak = data.longestStreak;
      if (typeof data.isPro === 'boolean') setFields.isPro = data.isPro;

      await db
        .insert(userProfiles)
        .values({
          authId,
          displayName: data.displayName ?? undefined,
          email: data.email ?? undefined,
          avatarUrl: data.avatarUrl ?? undefined,
          level: data.level ?? undefined,
          xp: data.xp ?? undefined,
          coins: data.coins ?? undefined,
          gems: data.gems ?? undefined,
          currentStreak: data.currentStreak ?? undefined,
          longestStreak: data.longestStreak ?? undefined,
          isPro: data.isPro ?? undefined,
        })
        .onConflictDoUpdate({
          target: userProfiles.authId,
          set: setFields,
        });

      const rows = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.authId, authId))
        .limit(1);

      const profile = rows[0] ?? null;
      return res.status(200).json({ ok: true, profile });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
