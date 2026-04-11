import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { moduleProgress, userProfiles } from '../../src/db/schema';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sql = neon(url);
  return drizzle(sql);
}

interface ProgressUpsertBody {
  authId: string;
  moduleId: string;
  moduleName?: string;
  status?: string;
  quizScore?: number;
  quizAttempts?: number;
  bestScore?: number;
  xpEarned?: number;
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
  if (req.method === 'GET') {
    try {
      const authId = req.query.authId as string | undefined;
      if (!authId) {
        return res.status(400).json({ error: 'Missing authId query parameter' });
      }

      const db = getDb();
      const userId = await resolveUserId(db, authId);

      if (!userId) {
        return res.status(200).json({ ok: true, progress: [] });
      }

      const rows = await db
        .select()
        .from(moduleProgress)
        .where(eq(moduleProgress.userId, userId));

      return res.status(200).json({ ok: true, progress: rows });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: message });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body as ProgressUpsertBody;
      const { authId, moduleId, ...data } = body;

      if (!authId) {
        return res.status(400).json({ error: 'Missing authId' });
      }

      if (!moduleId) {
        return res.status(400).json({ error: 'Missing moduleId' });
      }

      const db = getDb();
      const userId = await resolveUserId(db, authId);

      if (!userId) {
        return res.status(404).json({ error: 'User not found for authId' });
      }

      const status = data.status ?? 'completed';
      const completedAt = status === 'completed' ? new Date().toISOString() : undefined;

      await db
        .insert(moduleProgress)
        .values({
          userId,
          moduleId,
          moduleName: data.moduleName ?? undefined,
          status,
          quizScore: data.quizScore,
          quizAttempts: data.quizAttempts,
          bestScore: data.bestScore,
          xpEarned: data.xpEarned,
          completedAt,
        })
        .onConflictDoUpdate({
          target: [moduleProgress.userId, moduleProgress.moduleId],
          set: {
            moduleName: data.moduleName ?? undefined,
            status,
            quizScore: data.quizScore,
            quizAttempts: data.quizAttempts,
            bestScore: data.bestScore,
            xpEarned: data.xpEarned,
            completedAt,
            updatedAt: new Date().toISOString(),
          },
        });

      const rows = await db
        .select()
        .from(moduleProgress)
        .where(eq(moduleProgress.userId, userId));

      return res.status(200).json({ ok: true, progress: rows });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
