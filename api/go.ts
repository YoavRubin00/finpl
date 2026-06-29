import type { VercelRequest, VercelResponse } from '@vercel/node';
import { appRedirectHtml } from './_shared/appRedirectPage';

/**
 * GET /api/go?to=learn|index — email → app "smart redirect".
 *
 * Serves the JS interstitial that opens the app deep link from a real browser
 * page load (reliable) instead of a bare `finpl://…` link, which browsers
 * ignore when tapped from an email — esp. Android / Gmail / webmail. Used by
 * the welcome email and the legacy daily email's "play" CTAs.
 */
const TARGETS: Record<string, string> = {
  learn: 'finpl://learn',
  index: 'finpl://index',
  // Re-engagement email CTA → today's daily challenge (same deep target as the
  // dailyChallenge push) so a returning tap lands in a 1-minute game, not the
  // map home. The CTA→action gap was the 0.3% click-through killer. (P4
  // retention 2026-06-29.)
  daily_dilemma: 'finpl://quest/daily-dilemma',
};
const FALLBACK_URL = 'https://finplay.me';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const to = typeof req.query.to === 'string' ? req.query.to : '';
  const deepLink = TARGETS[to] || 'finpl://learn';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(appRedirectHtml(deepLink, FALLBACK_URL));
}
