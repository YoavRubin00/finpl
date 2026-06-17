import type { VercelRequest, VercelResponse } from '@vercel/node';
import { capturePostHog } from '../_shared/posthogCapture';

/**
 * GET /api/email/track-open?u=<userId>&v=<variantId>
 *
 * Serves a 1×1 transparent GIF tracking pixel embedded in the retention
 * email. When the client loads the pixel we fire `retention_email_opened`
 * to PostHog (distinct_id = userProfiles.id, so it merges onto the same
 * person as the in-app events). This is the OPEN half of the funnel
 *   sent → OPENED → clicked → daily_active_day.
 *
 * Caveats (documented, not bugs): opens are systematically under-counted —
 * Gmail/Apple Mail proxy or pre-fetch images (inflating), while many clients
 * block remote images by default (deflating). Treat the open RATE as a
 * directional A/B signal between variants, not an absolute truth. The CLICK
 * event is the harder, more reliable signal.
 *
 * Always returns the pixel (200) even on bad input — a tracking failure must
 * never show a broken image in the email.
 */

// 1×1 transparent GIF.
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sendPixel(res: VercelResponse): void {
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.status(200).send(PIXEL);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = typeof req.query.u === 'string' ? req.query.u : '';
  const variantId = typeof req.query.v === 'string' ? req.query.v : '';

  // Only count opens for a real userProfiles UUID. Without this, Gmail/Apple
  // image proxies + link scanners hitting the pixel with garbage `u` would
  // create ghost PostHog persons and inflate the open rate.
  if (UUID_RE.test(userId)) {
    await capturePostHog('retention_email_opened', userId, {
      variant_id: variantId || 'unknown',
    });
  }

  sendPixel(res);
}
