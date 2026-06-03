/**
 * Sends the parental-consent request email via Resend.
 *
 * Same fail-open posture as sendWelcomeEmail — never throws. The caller is
 * expected to have already inserted the parental_consents row (status=
 * 'pending') BEFORE calling this; if Resend fails, the row stays pending
 * and the user/parent can request a resend later. This keeps the DB the
 * source of truth and email delivery a best-effort side effect.
 */

import { Resend } from 'resend';
import { buildParentalConsentEmail } from '../../../src/features/email/parentalConsentEmail';

interface SendParentalConsentEmailParams {
  parentEmail: string;
  childName: string | null;
  /** Absolute URL the parent clicks to grant consent. */
  confirmUrl: string;
  /** Absolute URL the parent clicks to refuse. */
  revokeUrl: string;
}

const REPLY_TO = 'support@finplay.me';

export async function sendParentalConsentEmail({
  parentEmail,
  childName,
  confirmUrl,
  revokeUrl,
}: SendParentalConsentEmailParams): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info('[email] parental-consent skipped: reason=no-key');
    return { ok: false, error: 'email_not_configured' };
  }

  try {
    const resend = new Resend(apiKey);
    const { subject, html, text } = buildParentalConsentEmail({
      childName,
      confirmUrl,
      revokeUrl,
    });
    const fromAddress = process.env.EMAIL_FROM ?? 'FinPlay <onboarding@resend.dev>';

    await resend.emails.send({
      from: fromAddress,
      replyTo: REPLY_TO,
      to: parentEmail,
      subject,
      html,
      text,
    });

    console.info(`[email] parental-consent sent: parent=${parentEmail.split('@')[1] ?? '?'}`);
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[email] parental-consent failed: ${msg}`);
    return { ok: false, error: msg.slice(0, 200) };
  }
}
