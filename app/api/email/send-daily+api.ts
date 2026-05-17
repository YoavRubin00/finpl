import { runDailyEmailBatch, unsubscribeUser } from '../../../api/_shared/sendDailyEmails';

/** POST /api/email/send-daily — re-engagement email cron (3-day per-user cooldown).
 *  This Expo Router route is currently dead code: vercel.json deploys `api/**` only,
 *  so the live cron actually hits `api/email/send-daily.ts`. Kept here for future
 *  migration to Expo Router. */
export async function POST(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  const secret = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.headers.get('x-cron-secret');

  if (!secret || secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runDailyEmailBatch();
    return Response.json({ ok: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}

/** GET /api/email/send-daily?id=<userId> — kept for backwards compat, opts user out.
 *  The canonical unsubscribe endpoint is `/api/email/unsubscribe` (api/email/unsubscribe.ts). */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const userId = url.searchParams.get('id');
  if (!userId) return new Response('Missing id', { status: 400 });

  await unsubscribeUser(userId);

  return new Response(
    `<!DOCTYPE html><html dir="rtl" lang="he"><body style="font-family:Arial;text-align:center;padding:60px;color:#374151;">
      <h2>הוסרת בהצלחה מרשימת התפוצה</h2>
      <p>לא תקבל יותר אימיילים יומיים מ-FinPlay.</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}
