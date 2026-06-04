/**
 * Sends the post-purchase notification email to the parent (Hybrid flow).
 * Fired right after a minor (16-17) successfully purchased Pro.
 *
 * Same fail-open posture as the consent-request email — never throws. The
 * caller has already created/updated the parental_consents row before
 * calling this; if Resend fails, the row stays 'notified' but emailSent
 * is false, and the user/parent can request a resend via the same path.
 */

import { Resend } from 'resend';
import { buildPurchasePostNotificationEmail } from '../../../src/features/email/parentalConsentEmail';

interface SendPurchaseNotificationParams {
  parentEmail: string;
  childName: string | null;
  /** Absolute https URL the parent clicks to revoke + block future Pro. */
  revokeUrl: string;
  /** ISO timestamp of the purchase, for the email body's 'today' string. */
  purchasedAt: string;
}

const REPLY_TO = 'support@finplay.me';

export async function sendPurchaseNotificationEmail({
  parentEmail,
  childName,
  revokeUrl,
  purchasedAt,
}: SendPurchaseNotificationParams): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info('[email] purchase-notification skipped: reason=no-key');
    return { ok: false, error: 'email_not_configured' };
  }

  try {
    const resend = new Resend(apiKey);
    const { subject, html, text } = buildPurchasePostNotificationEmail({
      childName,
      revokeUrl,
      purchasedAt,
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

    console.info(`[email] purchase-notification sent: parent=${parentEmail.split('@')[1] ?? '?'}`);
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[email] purchase-notification failed: ${msg}`);
    return { ok: false, error: msg.slice(0, 200) };
  }
}
