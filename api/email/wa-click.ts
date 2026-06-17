import type { VercelRequest, VercelResponse } from '@vercel/node';
import { capturePostHog } from '../_shared/posthogCapture';

/**
 * GET /api/email/wa-click?u=<userId>
 *
 * Tracks a tap on the "join the WhatsApp community" CTA in the WELCOME email,
 * then 302-redirects to the actual WhatsApp group. Fires
 * `whatsapp_cta_tapped { source: 'welcome_email' }` to PostHog so the
 * community-join funnel can compare email vs in-game (same event name + a
 * `source` split — see src/lib/analytics/events.ts).
 *
 * A 302 is fine here (unlike the app deep-link interstitial): the target is a
 * normal https:// URL that every email client / browser follows natively.
 *
 * The destination matches the welcome email's existing group link so this
 * change is tracking-only and does NOT move users to a different community.
 */
const WHATSAPP_URL = 'https://chat.whatsapp.com/JzyPhMvOOcyBbiwzlm4psT';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = typeof req.query.u === 'string' ? req.query.u : '';
  // Only attribute to a real userProfiles UUID — link scanners pre-fetch this
  // redirect, so a loose check would log phantom taps + create ghost persons.
  if (UUID_RE.test(userId)) {
    await capturePostHog('whatsapp_cta_tapped', userId, { source: 'welcome_email' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.redirect(302, WHATSAPP_URL);
}
