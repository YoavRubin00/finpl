import type { VercelRequest, VercelResponse } from '@vercel/node';
import { unsubscribeByEmail } from '../_shared/sendDailyEmails';
import { capturePostHog } from '../_shared/posthogCapture';
import { Resend } from 'resend';

/**
 * Resend INBOUND webhook — auto opt-out for anyone who REPLIES "הסר"
 * (or הסירו / תסיר / להסיר / unsubscribe / stop / remove) to a FinPlay
 * daily/retention email. The email footer invites "השיבו ... הסר", but until
 * now nothing processed those replies (they sat in support@finplay.me). This
 * closes that loop automatically.
 *
 * ── One-time setup (Resend dashboard) ─────────────────────────────────────
 *  1. Add an inbound domain/route in Resend (e.g. `reply.finplay.me`) and add
 *     the MX record Resend gives you for it.
 *  2. Point the daily/retention emails' Reply-To at that inbound address
 *     (replace `support@finplay.me` in sendDailyEmails.ts, or forward).
 *  3. Add a webhook for inbound emails →
 *       POST https://finpl.vercel.app/api/email/inbound?token=<INBOUND_WEBHOOK_SECRET>
 *  4. Set `INBOUND_WEBHOOK_SECRET` in Vercel env (matching the ?token= value).
 *     (If unset, the endpoint still runs but logs a warning — set it for prod.)
 */

// Opt-out keywords. "הסר" is matched as a STANDALONE word (boundary on both
// sides) so it does NOT fire on הסרט / הסרטון etc.
const OPTOUT_RE =
  /(^|[\s"'״.,!?;:()\-])(הסר|הסירו|הסירני|תסיר|תסירו|להסיר|הסרה|unsubscribe|opt[\s-]?out|stop|remove)(?=[\s"'״.,!?;:()\-]|$)/i;
const EMAIL_RE = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i;

/** Pull the email address out of a "Name <a@b.com>" / object / raw string. */
function pickEmail(from: unknown): string | null {
  if (from && typeof from === 'object') {
    const o = from as { address?: string; email?: string; value?: Array<{ address?: string }> };
    from = o.address ?? o.email ?? o.value?.[0]?.address ?? JSON.stringify(from);
  }
  const m = String(from ?? '').match(EMAIL_RE);
  return m ? m[0].toLowerCase() : null;
}

/** Keep only the NEW reply text, dropping the quoted original — which contains
 *  the email's own "הסר" footer and would otherwise false-trigger on ANY reply. */
function topReply(text: string): string {
  const markers = [
    /\n\s*>/, /\nOn .+wrote:/i, /\n-{4,} ?Original/i, /\nבתאריך .+כתב/,
    /\n_{5,}/, /\nFrom:/i, /\nמאת:/, /\nהשיבו למייל/, /\nלהסרה מרשימת/,
  ];
  let cut = text.length;
  for (const m of markers) { const i = text.search(m); if (i >= 0 && i < cut) cut = i; }
  return text.slice(0, cut);
}

/** Forward a NON-opt-out reply to the human support inbox, so that once
 *  Reply-To points at the inbound address, real support questions aren't
 *  silently swallowed. Best-effort — a forward failure never fails the webhook. */
async function forwardToSupport(sender: string, subject: string, text: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn('[inbound] RESEND_API_KEY unset — cannot forward to support'); return; }
  const support = process.env.SUPPORT_EMAIL ?? 'support@finplay.me';
  const from = process.env.EMAIL_FROM ?? 'FinPlay <onboarding@resend.dev>';
  try {
    await new Resend(key).emails.send({
      from,
      to: support,
      replyTo: sender,
      subject: `↩︎ תגובה מ-${sender}: ${subject || '(ללא נושא)'}`,
      html: html || `<pre style="white-space:pre-wrap;font-family:inherit">${text || '(ריק)'}</pre>`,
      text: text || '(ריק)',
    });
  } catch (err) {
    console.error('[inbound] forward-to-support failed', err);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Lightweight auth: shared secret in the webhook URL (?token=) or header.
  const secret = process.env.INBOUND_WEBHOOK_SECRET;
  if (secret) {
    const token =
      (typeof req.query.token === 'string' ? req.query.token : '') ||
      (typeof req.headers['x-webhook-token'] === 'string' ? req.headers['x-webhook-token'] : '');
    if (token !== secret) return res.status(401).json({ error: 'unauthorized' });
  } else {
    console.warn('[inbound] INBOUND_WEBHOOK_SECRET not set — webhook is unauthenticated');
  }

  try {
    const raw = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
    const data = (raw?.data ?? raw ?? {}) as Record<string, unknown>;

    const sender = pickEmail(data.from ?? data.sender ?? data.envelope ?? '');
    if (!sender) {
      console.warn('[inbound] no sender email in payload');
      return res.status(200).json({ ok: true, skipped: 'no-sender' });
    }

    const subject = String(data.subject ?? '');
    const bodyText = String(data.text ?? data.plain ?? data['stripped-text'] ?? data.body ?? '');
    const reply = topReply(bodyText);

    if (!OPTOUT_RE.test(`${subject}\n${reply}`)) {
      return res.status(200).json({ ok: true, skipped: 'no-optout-keyword', sender });
    }

    const n = await unsubscribeByEmail(sender);
    console.log(`[inbound] opt-out reply from ${sender} → ${n} row(s) unsubscribed`);
    await capturePostHog('email_unsubscribed_via_reply', sender, { rows: n });
    return res.status(200).json({ ok: true, unsubscribed: n, sender });
  } catch (err) {
    // Return 200 so Resend doesn't retry-storm; the error is logged for inspection.
    console.error('[inbound] error', err);
    return res.status(200).json({ ok: false });
  }
}
