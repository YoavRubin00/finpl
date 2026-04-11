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

      await db
        .insert(userProfiles)
        .values({
          authId,
          displayName: data.displayName ?? undefined,
          email: data.email ?? undefined,
          avatarUrl: data.avatarUrl ?? undefined,
          level: data.level,
          xp: data.xp,
          coins: data.coins,
          gems: data.gems,
          currentStreak: data.currentStreak,
          longestStreak: data.longestStreak,
          isPro: data.isPro,
        })
        .onConflictDoUpdate({
          target: userProfiles.authId,
          set: {
            displayName: data.displayName ?? undefined,
            email: data.email ?? undefined,
            avatarUrl: data.avatarUrl ?? undefined,
            level: data.level,
            xp: data.xp,
            coins: data.coins,
            gems: data.gems,
            currentStreak: data.currentStreak,
            longestStreak: data.longestStreak,
            isPro: data.isPro,
            updatedAt: new Date().toISOString(),
          },
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
