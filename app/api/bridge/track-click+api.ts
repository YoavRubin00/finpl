import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';

const VALID_ACTIONS = new Set(['redeem', 'link_open']);

/** Owner inbox — gets an email on every real redemption. */
const OWNER_EMAIL = process.env.OWNER_NOTIFICATION_EMAIL ?? '';

const BENEFIT_LABELS: Record<string, string> = {
  'bridge-invest-altshuler': 'אלטשולר שחם טרייד',
};

function buildAlertHtml(params: {
  action: string;
  benefitId: string;
  userEmail: string | null;
  platform: string | null;
  timestamp: string;
}): string {
  const label = BENEFIT_LABELS[params.benefitId] ?? params.benefitId;
  const actionLabel = params.action === 'redeem' ? '💰 המרה (הוצאת מטבעות)' : '🔗 פתיחת קישור';
  return `
    <div style="font-family:sans-serif;direction:rtl;text-align:right;max-width:480px;margin:0 auto">
      <h2 style="color:#0369a1">📊 FinPlay — פעולת שותף חדשה</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px;font-weight:700;color:#475569">פעולה</td><td style="padding:8px">${actionLabel}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:8px;font-weight:700;color:#475569">שותף</td><td style="padding:8px">${label}</td></tr>
        <tr><td style="padding:8px;font-weight:700;color:#475569">משתמש</td><td style="padding:8px">${params.userEmail ?? 'לא ידוע'}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:8px;font-weight:700;color:#475569">פלטפורמה</td><td style="padding:8px">${params.platform ?? '—'}</td></tr>
        <tr><td style="padding:8px;font-weight:700;color:#475569">זמן</td><td style="padding:8px">${params.timestamp}</td></tr>
      </table>
    </div>
  `;
}

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'bridge-track', { limit: 20, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = await request.json() as Record<string, unknown>;

    const benefitId = sanitizeString(body.benefitId, 100);
    const userEmail = sanitizeString(body.userEmail, 254) ?? null;
    const action    = sanitizeString(body.action, 20);
    const platform  = sanitizeString(body.platform, 10) ?? null;

    if (!benefitId) {
      return Response.json({ error: 'Missing benefitId' }, { status: 400 });
    }
    if (!action || !VALID_ACTIONS.has(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL ?? '');
    await sql`
      INSERT INTO bridge_clicks (benefit_id, user_email, action, platform)
      VALUES (${benefitId}, ${userEmail}, ${action}, ${platform})
    `;

    // Send owner alert on every redeem (link_open is higher frequency, skip email for those).
    if (action === 'redeem') {
      const resend = new Resend(process.env.RESEND_API_KEY ?? '');
      const timestamp = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
      resend.emails.send({
        from: 'FinPlay Alerts <alerts@finplay.co.il>',
        to: OWNER_EMAIL,
        subject: `💰 המרה חדשה — ${BENEFIT_LABELS[benefitId] ?? benefitId}`,
        html: buildAlertHtml({ action, benefitId, userEmail, platform, timestamp }),
      }).catch(() => { /* non-critical */ });
    }

    return Response.json({ ok: true });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'bridge/track-click');
  }
}