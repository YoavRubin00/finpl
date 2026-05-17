import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, count, eq, gte, isNotNull, sum, sql } from 'drizzle-orm';
import { Resend } from 'resend';
import { userProfiles, moduleProgress } from '../../src/db/schema';
import {
  buildDailyEmailHtml,
  buildRetentionEmailHtml,
  RETENTION_VARIANT_IDS,
  type RetentionVariantId,
} from '../../src/features/email/emailTemplates';
import { signEmailClick } from '../../src/features/email/emailClickSig';
import { selectBestVariant } from '../../src/features/bandit/sampleBetaBandit';

const EXPERIMENT_ID = 'daily_email_variant';

/** Each user receives at most one re-engagement email every N days. */
const EMAIL_COOLDOWN_DAYS = 3;

export interface DailyEmailResult {
  sent: number;
  failed: number;
  total: number;
  date: string;
  targeting: string;
}

interface BanditRow {
  variant_id: string;
  alpha: number;
  beta: number;
}

function getDb() {
  const sqlClient = neon(process.env.DATABASE_URL ?? '');
  return drizzle(sqlClient);
}

function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

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

/**
 * Runs one batch of the daily-email cron.
 *
 * Targets users who: are inactive today, played at least once before, and
 * haven't received a re-engagement email in the last {@link EMAIL_COOLDOWN_DAYS} days.
 * Result: each eligible user gets at most one email every ~3 days.
 */
export async function runDailyEmailBatch(): Promise<DailyEmailResult> {
  const resend = new Resend(process.env.RESEND_API_KEY ?? '');
  const db = getDb();

  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekNumber = getWeekNumber(now);

  const todayDate = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toISOString().slice(0, 10);

  // Cooldown floor: the email-sent timestamp must be earlier than this to qualify.
  const cooldownCutoff = new Date(now);
  cooldownCutoff.setDate(cooldownCutoff.getDate() - EMAIL_COOLDOWN_DAYS);
  const cooldownCutoffIso = cooldownCutoff.toISOString();

  // Fetch users who:
  //   1. Have an email address
  //   2. Haven't opted out
  //   3. Were last active on or before yesterday (i.e. NOT active today)
  //   4. Have played at least once (lastActiveDate is set)
  //   5. Haven't received an email in the last EMAIL_COOLDOWN_DAYS days
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
        isNotNull(userProfiles.lastActiveDate),
        sql`${userProfiles.lastActiveDate} <= ${yesterdayDate}`,
        sql`(${userProfiles.dailyEmailSentAt} IS NULL OR ${userProfiles.dailyEmailSentAt} < ${cooldownCutoffIso})`,
      ),
    );

  // Load bandit state once for this batch — every user gets a freshly sampled
  // variant (independent per-user, but all from the same posterior snapshot).
  const banditStats = await loadBanditStats(db);

  const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'https://finpl.vercel.app';
  const fromAddress = process.env.EMAIL_FROM ?? 'FinPlay <onboarding@resend.dev>';
  const weekAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    if (!user.email) continue;

    try {
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

      const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?id=${user.id}`;

      const picked = selectBestVariant(banditStats);
      const variantId = (picked?.variantId ?? RETENTION_VARIANT_IDS[0]) as RetentionVariantId;

      const trackingSecret = process.env.EMAIL_TRACKING_SECRET ?? '';
      const sig = trackingSecret ? signEmailClick(user.id, variantId, trackingSecret) : '';
      const clickUrl = trackingSecret
        ? `${baseUrl}/api/email/track-click?u=${encodeURIComponent(user.id)}&v=${encodeURIComponent(variantId)}&s=${sig}`
        : 'finpl://learn';

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
    } catch (err) {
      console.error('[send-daily] per-user send failed', err);
      failed++;
    }
  }

  return {
    sent,
    failed,
    total: users.length,
    date: todayDate,
    targeting: `inactive since ${yesterdayDate}, cooldown=${EMAIL_COOLDOWN_DAYS}d`,
  };
}

/** Marks a user as opted-out of daily emails. Called from the unsubscribe link. */
export async function unsubscribeUser(userId: string): Promise<void> {
  const db = getDb();
  await db
    .update(userProfiles)
    .set({ dailyEmailEnabled: false })
    .where(eq(userProfiles.id, userId));
}
