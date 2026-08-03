import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, count, eq, gte, isNotNull, sum, sql } from 'drizzle-orm';
import { Resend } from 'resend';
import { userProfiles, moduleProgress } from '../../src/db/schema';
import {
  buildDailyEmailHtml,
  buildRetentionEmailHtml,
  buildD1EmailHtml,
  D1_EMAIL_VARIANT_ID,
  RETENTION_VARIANT_IDS,
  retentionVariantForSeq,
  type RetentionVariantId,
} from '../../src/features/email/emailTemplates';
import { signEmailClick } from '../../src/features/email/emailClickSig';
import { capturePostHog } from './posthogCapture';

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
  // Re-engagement threshold: last active TWO+ days ago — the user missed at
  // least one FULL day. The old `<= yesterday` filter flagged everyone who
  // played yesterday but hadn't opened the app by the 09:00-IL cron as
  // "inactive" (Yoav 15.7: got "לא הצטרפת ללמידה" the morning after an
  // evening session).
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const inactiveCutoffDate = twoDaysAgo.toISOString().slice(0, 10);
  // Still needed for the D1 path: users who SIGNED UP yesterday get the
  // day-2 appointment email this morning even though they were active
  // yesterday — that's an invitation, not a churn nudge.
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
  //   3. Missed at least one full day (last active two+ days ago)
  //   4. Have played at least once (lastActiveDate is set)
  //   5. Haven't received an email in the last EMAIL_COOLDOWN_DAYS days
  const users = await db
    .select({
      id: userProfiles.id,
      email: userProfiles.email,
      displayName: userProfiles.displayName,
      currentStreak: userProfiles.currentStreak,
      longestStreak: userProfiles.longestStreak,
      createdAt: userProfiles.createdAt,
      dailyEmailSeq: userProfiles.dailyEmailSeq,
    })
    .from(userProfiles)
    .where(
      and(
        isNotNull(userProfiles.email),
        eq(userProfiles.dailyEmailEnabled, true),
        isNotNull(userProfiles.lastActiveDate),
        // ::date, NOT left(...,10): createdAt is timestamptz and Postgres has
        // no left(timestamptz,int) — the 15.7 commit's left() threw on every
        // run and killed the ENTIRE daily batch for 18 days straight
        // (retention_email_sent flat zero 16.7→3.8, found in the acquisition
        // post-mortem). Casting compares the same UTC calendar day the old
        // string-slice intended.
        sql`(${userProfiles.lastActiveDate} <= ${inactiveCutoffDate} OR ((${userProfiles.createdAt})::date = ${yesterdayDate}::date AND ${userProfiles.lastActiveDate} <= ${yesterdayDate}))`,
        sql`(${userProfiles.dailyEmailSentAt} IS NULL OR ${userProfiles.dailyEmailSentAt} < ${cooldownCutoffIso})`,
      ),
    );

  // (Selection is now SEQUENCED per user — no Thompson sampling. loadBanditStats
  //  is kept only for the per-variant impression rows the dashboards read.)

  const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'https://finpl.vercel.app';
  const fromAddress = process.env.EMAIL_FROM ?? 'FinPlay <onboarding@resend.dev>';
  const weekAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Click-tracking secret, read ONCE per batch. When it's missing, every CTA
  // silently falls back to the UNTRACKED /api/go link and click-through reads a
  // false 0% — the failure that stayed invisible for weeks (2026-06). Fail LOUD
  // so a future misconfiguration surfaces in Vercel logs (and a PostHog alert)
  // immediately, instead of a month of blank dashboards.
  const trackingSecret = process.env.EMAIL_TRACKING_SECRET ?? '';
  if (!trackingSecret) {
    console.error(
      '[send-daily] EMAIL_TRACKING_SECRET is MISSING — every CTA link will be ' +
        'UNTRACKED and click-through will read 0%. Set it in Vercel env.',
    );
    await capturePostHog('email_tracking_secret_missing', 'system', { batch: todayDate });
  }

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

      // D1 cohort (RETENTION-PLAN 2026-07-02 §2.3 / QW6): signed up YESTERDAY
      // and didn't return today — the day-1 moment itself. These users get the
      // curiosity-gap template and stay OUT of the daily_email_variant bandit
      // (a day-1 new user and a lapsed regular are different audiences; mixing
      // them corrupts the posterior).
      const isD1NewUser = (user.createdAt ?? '').slice(0, 10) === yesterdayDate;

      // SEQUENCED drip (Yoav 2026-07-09): pick by this user's send count, NOT
      // the bandit — so "תזכורת מספר שלוש" arrives as their real 3rd email. The
      // D1 curiosity template still owns the day-1 cohort (a brand-new lapsed
      // user), and does not consume a sequence slot.
      const seq = user.dailyEmailSeq ?? 0;
      const variantId: RetentionVariantId | typeof D1_EMAIL_VARIANT_ID = isD1NewUser
        ? D1_EMAIL_VARIANT_ID
        : retentionVariantForSeq(seq, user.currentStreak ?? 0);

      const sig = trackingSecret ? signEmailClick(user.id, variantId, trackingSecret) : '';
      const clickUrl = trackingSecret
        ? `${baseUrl}/api/email/track-click?u=${encodeURIComponent(user.id)}&v=${encodeURIComponent(variantId)}&s=${sig}`
        // No tracking secret → skip conversion logging but STILL route through the
        // /api/go interstitial so the CTA reliably opens the app (a bare finpl://
        // link is ignored by Android/Gmail from an email tap). Target today's
        // daily challenge (P4 retention 2026-06-29), matching track-click.
        : `${baseUrl}/api/go?to=daily_dilemma`;

      // Open-tracking pixel — fires retention_email_opened to PostHog. No
      // signature needed: an open is low-stakes (worst case a forged open),
      // unlike a click which mutates the bandit posterior.
      const openPixelUrl = `${baseUrl}/api/email/track-open?u=${encodeURIComponent(user.id)}&v=${encodeURIComponent(variantId)}`;

      let subject: string;
      let html: string;
      try {
        const built = isD1NewUser
          ? buildD1EmailHtml({
              name: user.displayName ?? 'חבר',
              streak: user.currentStreak ?? 0,
              date: now,
              ctaUrl: clickUrl,
              unsubscribeUrl,
              openPixelUrl,
            })
          : buildRetentionEmailHtml({
              variantId: variantId as RetentionVariantId,
              name: user.displayName ?? 'חבר',
              streak: user.currentStreak ?? 0,
              longestStreak: user.longestStreak ?? 0,
              ctaUrl: clickUrl,
              unsubscribeUrl,
              openPixelUrl,
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
        // Flip to the Resend-inbound address (e.g. unsubscribe@reply.finplay.me)
        // ONLY once that inbound domain is verified — then replies hit
        // api/email/inbound.ts (auto opt-out on "הסר", others forwarded to
        // support). Defaults to support@ so nothing breaks before then.
        replyTo: process.env.EMAIL_REPLY_TO ?? 'support@finplay.me',
        to: user.email,
        subject,
        html,
      });

      // Stamp the send time AND advance the drip counter (Yoav 2026-07-09), so
      // the NEXT retention email this user gets is the next sequence position.
      // The D1 curiosity email doesn't consume a slot — a day-1 user's first
      // ordinary retention email should still be sequence position 0.
      await db
        .update(userProfiles)
        .set({
          dailyEmailSentAt: now.toISOString(),
          ...(isD1NewUser ? {} : { dailyEmailSeq: seq + 1 }),
        })
        .where(eq(userProfiles.id, user.id));

      // Still record a per-variant impression (dashboards slice by variant_id)
      // — even though selection is now sequenced, not Thompson-sampled.
      if (!isD1NewUser) {
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
      }

      // PostHog SENT event — the top of the funnel. variant_id + seq let every
      // downstream metric (opened/clicked/returned) be sliced per drip step;
      // cohort splits day-1 new users from lapsed regulars.
      await capturePostHog('retention_email_sent', user.id, {
        variant_id: variantId,
        cohort: isD1NewUser ? 'd1_new_user' : 'daily_cron',
        seq: isD1NewUser ? -1 : seq,
        streak: user.currentStreak ?? 0,
      });

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
    targeting: `inactive since ${inactiveCutoffDate} (D1 signups: ${yesterdayDate}), cooldown=${EMAIL_COOLDOWN_DAYS}d`,
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

/** Marks a user opted-out by EMAIL (case-insensitive). Returns the number of
 *  rows updated. Used by the inbound-reply automation (api/email/inbound.ts)
 *  when someone REPLIES "הסר" to a retention email — which has no monitored
 *  inbox otherwise. */
export async function unsubscribeByEmail(email: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .update(userProfiles)
    .set({ dailyEmailEnabled: false })
    .where(sql`lower(${userProfiles.email}) = lower(${email})`)
    .returning({ id: userProfiles.id });
  return rows.length;
}
