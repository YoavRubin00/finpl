// api/_shared/sendLoginCodeEmail.ts
// Sends the 6-digit sign-in code through Resend, the same sender and
// EMAIL_FROM as the welcome / parental-consent emails. Unlike those, a failed
// send is reported to the caller: the user can't sign in without this email.

import { Resend } from 'resend';
import { buildLoginCodeEmail } from '../../src/features/email/loginCodeEmail';

const REPLY_TO = 'support@finplay.me';

export type SendLoginCodeResult = { ok: true } | { ok: false; reason: 'not_configured' | 'send_failed' };

export async function sendLoginCodeEmail({
  email,
  code,
  ttlMinutes,
}: {
  email: string;
  code: string;
  ttlMinutes: number;
}): Promise<SendLoginCodeResult> {
  const domain = email.split('@')[1] ?? '?';
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Local development only, and only when explicitly asked for: print the
    // code instead of mailing it. Never on a Vercel preview/production deploy.
    const vercelEnv = process.env.VERCEL_ENV;
    if (process.env.AUTH_DEV_LOG_EMAIL_CODES === '1' && (!vercelEnv || vercelEnv === 'development')) {
      console.info(`[email] login-code (dev, not sent) to=${email} code=${code}`);
      return { ok: true };
    }
    console.error('[email] login-code skipped: reason=no-key');
    return { ok: false, reason: 'not_configured' };
  }

  try {
    const resend = new Resend(apiKey);
    const { subject, html, text } = buildLoginCodeEmail({ code, ttlMinutes });
    const fromAddress = process.env.EMAIL_FROM ?? 'FinPlay <onboarding@resend.dev>';
    const { error } = await resend.emails.send({
      from: fromAddress,
      replyTo: REPLY_TO,
      to: email,
      subject,
      html,
      text,
    });
    if (error) {
      console.error(`[email] login-code failed: ${error.name} ${error.message} domain=${domain}`);
      return { ok: false, reason: 'send_failed' };
    }
    console.info(`[email] login-code sent: domain=${domain}`);
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[email] login-code threw: ${msg} domain=${domain}`);
    return { ok: false, reason: 'send_failed' };
  }
}
