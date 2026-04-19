import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, count, eq, gte, isNotNull, isNull, lt, or, sum } from 'drizzle-orm';
import { Resend } from 'resend';
import { userProfiles, moduleProgress } from '../../../src/db/schema';
import { buildDailyEmailHtml } from '../../../src/features/email/emailTemplates';

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
  //   3. Did NOT play yesterday (lastActiveDate < yesterday OR null)
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
        // Did NOT play yesterday
        or(
          isNull(userProfiles.lastActiveDate),
          lt(userProfiles.lastActiveDate, yesterdayDate),
        ),
        // Haven't received email today yet
        or(
          isNull(userProfiles.dailyEmailSentAt),
          lt(userProfiles.dailyEmailSentAt, todayStart.toISOString()),
        ),
      ),
    );

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

      const { subject, html } = buildDailyEmailHtml({
        name: user.displayName ?? 'חבר',
        streak: user.currentStreak ?? 0,
        weeklyModules,
        weeklyXp,
        dayOfWeek,
        weekNumber,
        unsubscribeUrl,
      });

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

      sent++;
    } catch {
      failed++;
    }
  }

  return Response.json({ ok: true, sent, failed, total: users.length, date: todayDate, targeting: `inactive before ${yesterdayDate}` });
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
