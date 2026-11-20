// api/migrate/backfill-v1.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { moduleProgress, userProfiles } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { ECONOMY_LIMITS, runGuarded, type EconomyDeps } from '../_shared/economyGuard';
import { createEconomyDeps } from '../_shared/economyStores';
import { withAuth, type AuthContext } from '../_shared/withAuth';
import { mergeProfile, mergeModule, type LocalProfile, type LocalModuleProgress, type ServerProfile, type ServerModuleProgress } from '../_shared/backfillMerge';

interface BackfillBody {
  profile?: LocalProfile;
  modules?: LocalModuleProgress[];
}

// Same IL-zoned streak reconciliation as GET /api/sync/streak — kept in sync so
// the backfill can't hand back a streak the calendar doesn't support.
function diffDays(later: string, earlier: string): number {
  const a = new Date(later + 'T00:00:00Z').getTime();
  const b = new Date(earlier + 'T00:00:00Z').getTime();
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}
function todayIsraelDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** The handler behind withAuth; `economyDeps` is injectable for the local
 *  Postgres harness (a store that races the compare-and-swap). */
export function createBackfillHandler(economyDeps: () => EconomyDeps = createEconomyDeps) {
  return (req: VercelRequest, res: VercelResponse, ctx: AuthContext) => backfillV1(req, res, ctx, economyDeps);
}

export default withAuth(createBackfillHandler());

async function backfillV1(req: VercelRequest, res: VercelResponse, ctx: AuthContext, economyDeps: () => EconomyDeps) {
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

  // Lapse guard: max(server, local) currentStreak can resurrect a streak the
  // calendar no longer supports (e.g. a reinstall where the server still holds
  // an old peak). Reconcile against the server's lastActiveDate, mirroring GET
  // /api/sync/streak. Only fires when a lastActiveDate EXISTS — a fresh
  // guest→registered migration (no server date) keeps its real local streak,
  // exactly as the GET path leaves it. longestStreak (a peak) is untouched.
  if (profileRow.lastActiveDate && mergedProfile.currentStreak > 0) {
    const gap = diffDays(todayIsraelDate(), profileRow.lastActiveDate);
    if (gap > 1) mergedProfile.currentStreak = 0;
  }

  // Economy fields are never SET from the body any more (2026-11-20). This
  // endpoint used to write max(server, client) for coins / gems / xp and OR the
  // client's isPro in, so any signed-in caller could set any balance or make
  // itself Pro, around every check in /api/sync/economy. Now:
  //   - an increase of coins / gems / xp goes through the same guard as a
  //     reward (api/_shared/economyGuard.ts), as a "legacy difference": coins
  //     the guard already holds for the user count as on their way (a retry
  //     never counts them twice), and the gem difference goes through the 24h
  //     earned-gem budget (never dropped wholesale as purchase-shaped, never
  //     unbounded: the endpoint takes any body, as often as asked);
  //   - the guard's compare-and-swap ran out → 503 before anything is
  //     written: the app keeps its legacy data and sends it again next launch;
  //   - isPro is ignored: Pro comes from RevenueCat (webhook or the verified
  //     /api/sync/subscription path);
  //   - streaks and virtual balance keep the max rule, bounded to sane values.
  const increase = (merged: number, server: number): number => {
    const d = Math.round(merged - server);
    return Number.isFinite(d) && d > 0 ? Math.min(d, ECONOMY_LIMITS.maxAbsDelta) : 0;
  };
  const economyDelta = {
    xp: increase(mergedProfile.xp, serverProfile.xp),
    coins: increase(mergedProfile.coins, serverProfile.coins),
    gems: increase(mergedProfile.gems, serverProfile.gems),
  };
  if (economyDelta.xp > 0 || economyDelta.coins > 0 || economyDelta.gems > 0) {
    const guarded = await runGuarded(ctx.userId, economyDelta, economyDeps(), 'migrate/backfill', { legacyDifference: true });
    if (guarded.kind === 'busy') {
      return res.status(503).json({ error: 'Busy, try again', code: 'ECONOMY_BUSY' });
    }
  }

  const MAX_STREAK_DAYS = 3650;
  const vbMerged = parseFloat(mergedProfile.virtualBalance);
  const virtualBalance =
    Number.isFinite(vbMerged) && Math.abs(vbMerged) <= ECONOMY_LIMITS.maxAbsVirtualBalance
      ? mergedProfile.virtualBalance
      : serverProfile.virtualBalance;
  await db
    .update(userProfiles)
    .set({
      currentStreak: Math.min(Math.max(0, Math.floor(mergedProfile.currentStreak) || 0), MAX_STREAK_DAYS),
      longestStreak: Math.min(Math.max(0, Math.floor(mergedProfile.longestStreak) || 0), MAX_STREAK_DAYS),
      virtualBalance,
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
}
