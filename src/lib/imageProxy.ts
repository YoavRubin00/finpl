import { getApiBase } from '../db/apiBase';

// Our public Vercel Blob bucket. Only URLs on this host are rewritten; anything
// else (bundled assets, other CDNs) passes through untouched.
const BLOB_HOST = '8mnwcjygpqev3keg.public.blob.vercel-storage.com';

/**
 * Rewrite a Vercel Blob image URL to go through our own `/api/img` proxy.
 *
 * WHY: Vercel Blob answers a burst of image requests from one end-user mobile
 * IP with a sustained per-client http_403 (the same URL serves 200/206 to a
 * server / curl), so module infographics render BLANK for throttled users
 * while pearl videos (single Range request) still load. The proxy fetches the
 * bytes server-side (200) and serves them from the Vercel CDN — no per-client
 * throttle. See `api/img.ts`.
 *
 * Pass-through cases (return the URL unchanged):
 *  - dev builds — laptop IPs aren't throttled, and the proxy may not run under
 *    `vercel dev`; keep dev hitting Blob directly.
 *  - non-Blob URLs (already a different host).
 *  - unparseable input.
 */
export function toProxiedImageUri(uri: string): string {
  if (__DEV__) return uri;
  let host: string;
  try { host = new URL(uri).hostname; } catch { return uri; }
  if (host !== BLOB_HOST) return uri;
  // getApiBase() is '' on web prod → a same-origin relative `/api/img`, which
  // is exactly what we want when the web app is served from the same Vercel.
  const base = getApiBase();
  return `${base}/api/img?u=${encodeURIComponent(uri)}`;
}
