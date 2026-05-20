/**
 * POST /api/support/send — captures a free-text support message from the
 * in-app Shark support chat and persists it to support_messages on Neon.
 *
 * Same logic as the duplicate at app/api/support/send+api.ts but using the
 * @vercel/node handler shape — this is the file that actually ships to
 * Vercel functions in production (vercel.json points to api/**.ts).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { supportMessages, userProfiles } from '../../src/db/schema';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sql = neon(url);
  return drizzle(sql);
}

function sanitize(value: unknown, maxLen: number): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLen);
}

async function resolveUserId(db: ReturnType<typeof getDb>, authId: string): Promise<string | null> {
  const rows = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.authId, authId))
    .limit(1);
  return rows[0]?.id ?? null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const message = sanitize(body.message, 4000);
    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }

    const authId = sanitize(body.authId, 254);
    const email = sanitize(body.email, 254);
    const platform = sanitize(body.platform, 32);
    const appVersion = sanitize(body.appVersion, 32);

    const db = getDb();
    const userId = authId ? await resolveUserId(db, authId) : null;

    await db.insert(supportMessages).values({
      userId,
      userEmail: email,
      message,
      platform,
      appVersion,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[support/send] error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
