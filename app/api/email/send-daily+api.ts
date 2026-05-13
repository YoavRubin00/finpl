import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, count, eq, gte, isNotNull, sum, sql } from 'drizzle-orm';
import { Resend } from 'resend';
import { userProfiles, moduleProgress } from '../../../src/db/schema';
import {
  buildDailyEmailHtml,
  buildRetentionEmailHtml,
  RETENTION_VARIANT_IDS,
  type RetentionVariantId,
} from '../../../src/features/email/emailTemplates';
import { signEmailClick } from '../../../src/features/email/emailClickSig';
import { selectBestVariant } from '../../../src/features/bandit/sampleBetaBandit';

const EXPERIMENT_ID = 'daily_email_variant';

interface BanditRow {
  variant_id: string;
  alpha: number;
  beta: number;
}

/**
 * Returns alpha/beta for all 5 retention variants, merging DB state with
 * defaults (alpha=beta=1 for variants not yet in the table). This warm-starts
 * Thompson sampling so a brand-new experiment still spreads load across all 5.
 */
async function loadBanditStats(
  db: ReturnType<typeof getDb>,
): Promise<Array<{ variantId: RetentionVariantId; alpha: number; beta: number }>> {
  const result = await db.execute(sql`
    SELECT variant_id, alpha, beta
    FROM bandit_variants
    WHERE experiment_id = ${EXPERIMENT_ID}
  `);
  const rows = (result as unknown as { rows?: BanditRow[] }).rows
    ?? (result as unknown as BanditRow[]);
  const byId = new Map<string, BanditRow>();
  for (const r of rows) byId.set(r.variant_id, r);
  return RETENTION_VARIANT_IDS.map((vid) => {
    const row = byId.get(vid);
    return {
      variantId: vid,
      alpha: row ? Number(row.alpha) : 1,
      beta: row ? Number(row.beta) : 1,
    };
  });
}

function getDb() {
  const sql = neon(process.env.DATABASE_URL ?? '');
  return drizzle(sql);
}

function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

/** POST /api/email/send-daily
 *  Called by cron once per day (e.g. 09:00 Israel time).
 *  Targets users who were NOT active yesterday, re-engagement only.
 *  Header: x-cron-secret: <CRON_SECRET>
 */
export async function POST(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  const secret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY ?? '');
  const db = getDb();

  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekNumber = getWeekNumber(now);

  // Date strings for comparison
  const todayDate = now.toISOString().slice(0, 10);           // YYYY-MM-DD
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toISOString().slice(0, 10); // YYYY-MM-DD

  // Start of today in UTC, used to prevent duplicate sends
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  // Fetch users who:
  //   1. Have an email address
  //   2. Haven't opted out
  //   3. Played EXACTLY yesterday (1 day after last play)
  //   4. Haven't already received today's email
  const users = await db
    .select({
      id: userProfiles.id,
      email: userProfiles.email,
      displayName: userProfiles.displayName,
      currentStreak: userProfiles.currentStreak,
    })
    .from(userProfiles)
    .where(
      and(
        isNotNull(userProfiles.email),
        eq(userProfiles.dailyEmailEnabled, true),
        // Played exactly yesterday — so today is 1 day after their last play
        eq(userProfiles.lastActiveDate, yesterdayDate),
        // Haven't received email today yet
        sql`(${userProfiles.dailyEmailSentAt} IS NULL OR ${userProfiles.dailyEmailSentAt} < ${todayStart.toISOString()})`,
      ),
    );

  // Load bandit state once for this batch — every user gets a freshly sampled
  // variant (independent per-user, but all from the same posterior snapshot).
  const banditStats = await loadBanditStats(db);

  const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'https://finplay.app/api';
  const fromAddress = process.env.EMAIL_FROM ?? 'FinPlay <onboarding@resend.dev>';
  const weekAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    if (!user.email) continue;

    try {
      // Weekly stats from module_progress
      const [weeklyStats] = await db
        .select({
          weeklyModules: count(moduleProgress.id),
          weeklyXp: sum(moduleProgress.xpEarned),
        })
        .from(moduleProgress)
        .where(
          and(
            eq(moduleProgress.userId, user.id),
            eq(moduleProgress.status, 'completed'),
            gte(moduleProgress.completedAt, weekAgoIso),
          ),
        );

      const weeklyModules = weeklyStats?.weeklyModules ?? 0;
      const weeklyXp = Number(weeklyStats?.weeklyXp ?? 0);

      const unsubscribeUrl = `${baseUrl}/email/unsubscribe?id=${user.id}`;

      // Pick a variant via Thompson sampling.
      const picked = selectBestVariant(banditStats);
      const variantId = (picked?.variantId ?? RETENTION_VARIANT_IDS[0]) as RetentionVariantId;

      // Build signed click URL for conversion tracking.
      const trackingSecret = process.env.EMAIL_TRACKING_SECRET ?? '';
      const sig = trackingSecret ? signEmailClick(user.id, variantId, trackingSecret) : '';
      const clickUrl = trackingSecret
        ? `${baseUrl}/api/email/track-click?u=${encodeURIComponent(user.id)}&v=${encodeURIComponent(variantId)}&s=${sig}`
        : 'finpl://learn';

      // Build the retention email. Fall back to the legacy daily email on any
      // failure (e.g. unknown variant id, missing template file) so we never
      // drop the send.
      let subject: string;
      let html: string;
      try {
        const built = buildRetentionEmailHtml({
          variantId,
          name: user.displayName ?? 'חבר',
          streak: user.currentStreak ?? 0,
          ctaUrl: clickUrl,
          unsubscribeUrl,
        });
        subject = built.subject;
        html = built.html;
      } catch (err) {
        console.error('[send-daily] retention build failed, falling back to legacy', err);
        const legacy = buildDailyEmailHtml({
          name: user.displayName ?? 'חבר',
          streak: user.currentStreak ?? 0,
          weeklyModules,
          weeklyXp,
          dayOfWeek,
          weekNumber,
          unsubscribeUrl,
        });
        subject = legacy.subject;
        html = legacy.html;
      }

      await resend.emails.send({
        from: fromAddress,
        replyTo: 'yoav.finplay@gmail.com',
        to: user.email,
        subject,
        html,
      });

      await db
        .update(userProfiles)
        .set({ dailyEmailSentAt: now.toISOString() })
        .where(eq(userProfiles.id, user.id));

      // Record the bandit impression (non-critical — best effort).
      try {
        await db.execute(sql`
          INSERT INTO bandit_variants
            (experiment_id, variant_id, alpha, beta, impressions, conversions)
          VALUES (${EXPERIMENT_ID}, ${variantId}, 1, 1, 1, 0)
          ON CONFLICT (experiment_id, variant_id) DO UPDATE SET
            impressions = bandit_variants.impressions + 1,
            updated_at  = NOW();
        `);
      } catch (err) {
        console.error('[send-daily] bandit impression record failed', err);
      }

      sent++;
    } catch {
      failed++;
    }
  }

  return Response.json({ ok: true, sent, failed, total: users.length, date: todayDate, targeting: `played exactly on ${yesterdayDate}` });
}

/** GET /api/email/unsubscribe?id=<userId> */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const userId = url.searchParams.get('id');
  if (!userId) return new Response('Missing id', { status: 400 });

  const db = getDb();
  await db
    .update(userProfiles)
    .set({ dailyEmailEnabled: false })
    .where(eq(userProfiles.id, userId));

  return new Response(
    `<!DOCTYPE html><html dir="rtl" lang="he"><body style="font-family:Arial;text-align:center;padding:60px;color:#374151;">
      <h2>✅ הוסרת בהצלחה מרשימת התפוצה</h2>
      <p>לא תקבל יותר אימיילים יומיים מ-FinPlay.</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}
