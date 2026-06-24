import { Resend } from 'resend';
import { eq } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { userProfiles } from '../../src/db/schema';
import { buildWelcomeEmailHtml } from '../../src/features/email/emailTemplates';

interface SendWelcomeEmailParams {
  db: NeonHttpDatabase;
  userId: string;
  email: string;
  displayName: string | null;
}

const REPLY_TO = 'support@finplay.me';

/** Sends the one-time welcome email and flips welcomeEmailSent=true on success.
 *  Never throws — all errors are caught and logged. Safe to await from a request handler. */
export async function sendWelcomeEmail({
  db,
  userId,
  email,
  displayName,
}: SendWelcomeEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[email] welcome skipped: reason=no-key userId=${userId}`);
    return;
  }

  try {
    const resend = new Resend(apiKey);
    // Route the WhatsApp CTA through /api/email/wa-click so the tap is tracked
    // (whatsapp_cta_tapped, source:'welcome_email') before redirecting to the
    // group — lets us compare email vs in-game community acquisition.
    // Strip a trailing /api if the Vercel env var includes it (misconfig) — else
    // every link becomes a double /api/api/... → 404. Canonical base has NO /api.
    const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'https://finpl.vercel.app').replace(/\/+$/, '').replace(/\/api$/, '');
    const { subject, html, text } = buildWelcomeEmailHtml({
      name: displayName ?? 'חבר/ה',
      whatsappUrl: `${baseUrl}/api/email/wa-click?u=${encodeURIComponent(userId)}`,
    });
    const fromAddress = process.env.EMAIL_FROM ?? 'FinPlay <onboarding@resend.dev>';

    await resend.emails.send({
      from: fromAddress,
      replyTo: REPLY_TO,
      to: email,
      subject,
      html,
      text,
    });

    await db
      .update(userProfiles)
      .set({ welcomeEmailSent: true })
      .where(eq(userProfiles.id, userId));

    console.info(`[email] welcome sent: userId=${userId}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[email] welcome failed: ${msg} userId=${userId}`);
  }
}
