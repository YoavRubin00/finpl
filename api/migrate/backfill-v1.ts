// api/migrate/backfill-v1.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { moduleProgress, userProfiles } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { withAuth } from '../_shared/withAuth';
import { mergeProfile, mergeModule, type LocalProfile, type LocalModuleProgress, type ServerProfile, type ServerModuleProgress } from '../_shared/backfillMerge';

interface BackfillBody {
  profile?: LocalProfile;
  modules?: LocalModuleProgress[];
}

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (process.env.BACKFILL_V1_ENABLED === 'false') {
    return res.status(503).json({ error: 'Backfill temporarily disabled' });
  }

  const body = (req.body ?? {}) as BackfillBody;
  const db = getDb();

  const profileRows = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, ctx.userId))
    .limit(1);
  const profileRow = profileRows[0];
  if (!profileRow) {
    return res.status(404).json({ error: 'User profile not found' });
  }

  const serverProfile: ServerProfile = {
    xp: profileRow.xp ?? 0,
    coins: profileRow.coins ?? 0,
    gems: profileRow.gems ?? 0,
    currentStreak: profileRow.currentStreak ?? 0,
    longestStreak: profileRow.longestStreak ?? 0,
    virtualBalance: profileRow.virtualBalance ?? '0',
    isPro: profileRow.isPro ?? false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    preferences: (profileRow as any).preferences ?? null,
  };

  const mergedProfile = mergeProfile(serverProfile, body.profile ?? {});

  await db
    .update(userProfiles)
    .set({
      xp: mergedProfile.xp,
      coins: mergedProfile.coins,
      gems: mergedProfile.gems,
      currentStreak: mergedProfile.currentStreak,
      longestStreak: mergedProfile.longestStreak,
      virtualBalance: mergedProfile.virtualBalance,
      isPro: mergedProfile.isPro,
      preferences: mergedProfile.preferences ?? undefined,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(userProfiles.id, ctx.userId));

  if (Array.isArray(body.modules) && body.modules.length > 0) {
    const userId = profileRow.id;
    const existing = await db
      .select()
      .from(moduleProgress)
      .where(eq(moduleProgress.userId, userId));

    const byId = new Map<string, ServerModuleProgress>();
    for (const m of existing) {
      byId.set(m.moduleId, {
        moduleId: m.moduleId,
        status: (m.status as ServerModuleProgress['status']) ?? 'not_started',
        bestScore: m.bestScore ?? 0,
        xpEarned: m.xpEarned ?? 0,
      });
    }

    for (const local of body.modules) {
      if (!local.moduleId) continue;
      const merged = mergeModule(byId.get(local.moduleId), local);
      const completedAt = merged.status === 'completed' ? new Date().toISOString() : null;

      await db
        .insert(moduleProgress)
        .values({
          userId,
          moduleId: merged.moduleId,
          moduleName: local.moduleName ?? undefined,
          status: merged.status,
          bestScore: merged.bestScore,
          xpEarned: merged.xpEarned,
          completedAt: completedAt ?? undefined,
        })
        .onConflictDoUpdate({
          target: [moduleProgress.userId, moduleProgress.moduleId],
          set: {
            status: merged.status,
            bestScore: merged.bestScore,
            xpEarned: merged.xpEarned,
            completedAt: completedAt ?? undefined,
            updatedAt: new Date().toISOString(),
          },
        });
    }
  }

  const finalProfile = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, ctx.userId))
    .limit(1);
  const finalProgress = await db
    .select()
    .from(moduleProgress)
    .where(eq(moduleProgress.userId, profileRow.id));

  return res.status(200).json({
    ok: true,
    profile: finalProfile[0] ?? null,
    progress: finalProgress,
  });
});
