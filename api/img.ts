import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * GET /api/img?u=<encoded Vercel-Blob image URL>
 *
 * Image proxy for infographics. WHY: Vercel Blob returns an intermittent,
 * SUSTAINED per-client http_403 to end-user mobile IPs when a module opens and
 * fires a burst of image requests (the exact same URLs serve 200/206 to a
 * server / curl from any other IP — confirmed in the 2026-06 PostHog audits).
 * Mobile users whose IP gets throttled see BLANK infographics while pearl
 * videos (Range-streamed, single request) still load.
 *
 * Fetching the bytes here — server-side, from Vercel's egress — sidesteps that
 * per-client throttle, and the response is cached hard at the Vercel CDN so the
 * function runs roughly once per asset. Locked to our own Blob bucket so this
 * can never be used as an open proxy.
 */
const ALLOWED_HOST = '8mnwcjygpqev3keg.public.blob.vercel-storage.com';
const RETRYABLE = new Set([403, 408, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const raw = typeof req.query.u === 'string'
    ? req.query.u
    : Array.isArray(req.query.u) ? req.query.u[0] : '';
  if (!raw) { res.status(400).send('missing u'); return; }

  let target: URL;
  try { target = new URL(raw); } catch { res.status(400).send('bad url'); return; }
  // Open-proxy guard: only our own public Blob bucket, https only.
  if (target.protocol !== 'https:' || target.hostname !== ALLOWED_HOST) {
    res.status(403).send('host not allowed'); return;
  }

  let upstream: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      upstream = await fetch(target.toString(), { headers: { Accept: 'image/*' } });
      if (upstream.ok || !RETRYABLE.has(upstream.status)) break;
    } catch { /* transient network blip — retry */ }
    if (attempt < 2) await sleep(300 * (attempt + 1));
  }

  if (!upstream || !upstream.ok) {
    // Last resort: bounce the client to the origin so it can still try directly
    // (where the client-side retry + shimmer apply). Don't cache the miss.
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, target.toString());
    return;
  }

  const contentType = upstream.headers.get('content-type') ?? 'image/png';
  const buf = Buffer.from(await upstream.arrayBuffer());
  res.setHeader('Content-Type', contentType);
  // Infographics are immutable PNGs — cache hard at the Vercel edge + client so
  // the function effectively runs once per asset, then the CDN serves it.
  res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
  res.status(200).send(buf);
}
