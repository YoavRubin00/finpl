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

interface PingBody {
  authId?: string;
}

/**
 * POST /api/users/ping — marks the calling user as active today.
 * Body: { authId: string }
 *
 * Sets `last_active_date = CURRENT_DATE` server-side. Called fire-and-forget
 * by the client when the app foregrounds (see useFunStore.markActiveToday).
 *
 * Used by the daily-email cron to decide who is inactive and should receive
 * a re-engagement email. Without this ping the column stays NULL and the
 * cron excludes the user.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as PingBody;
    const authId = body?.authId;
    if (!authId || typeof authId !== 'string') {
      return res.status(400).json({ error: 'Missing authId' });
    }

    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);

    await db
      .update(userProfiles)
      .set({ lastActiveDate: today })
      .where(eq(userProfiles.authId, authId));

    return res.status(200).json({ ok: true, date: today });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[users/ping] failed', err);
    return res.status(500).json({ error: message });
  }
}
