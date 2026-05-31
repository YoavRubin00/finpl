// api/sync/progress.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { moduleProgress } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { withAuth } from '../_shared/withAuth';

interface ProgressUpsertBody {
  moduleId: string;
  moduleName?: string;
  status?: string;
  quizScore?: number;
  quizAttempts?: number;
  bestScore?: number;
  xpEarned?: number;
}

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  const db = getDb();
  const userId = ctx.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  if (req.method === 'GET') {
    const rows = await db
      .select()
      .from(moduleProgress)
      .where(eq(moduleProgress.userId, userId));
    return res.status(200).json({ ok: true, progress: rows });
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as ProgressUpsertBody;
    if (!body.moduleId) {
      return res.status(400).json({ error: 'Missing moduleId' });
    }
    const status = body.status ?? 'completed';
    const completedAt = status === 'completed' ? new Date().toISOString() : undefined;

    await db
      .insert(moduleProgress)
      .values({
        userId,
        moduleId: body.moduleId,
        moduleName: body.moduleName ?? undefined,
        status,
        quizScore: body.quizScore,
        quizAttempts: body.quizAttempts,
        bestScore: body.bestScore,
        xpEarned: body.xpEarned,
        completedAt,
      })
      .onConflictDoUpdate({
        target: [moduleProgress.userId, moduleProgress.moduleId],
        set: {
          moduleName: body.moduleName ?? undefined,
          status,
          quizScore: body.quizScore,
          quizAttempts: body.quizAttempts,
          bestScore: body.bestScore,
          xpEarned: body.xpEarned,
          completedAt,
          updatedAt: new Date().toISOString(),
        },
      });

    const rows = await db
      .select()
      .from(moduleProgress)
      .where(eq(moduleProgress.userId, userId));
    return res.status(200).json({ ok: true, progress: rows });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
