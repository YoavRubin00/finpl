/**
 * Shared-CDN caching for PUBLIC, identical-for-everyone GET responses.
 *
 * `Vercel-CDN-Cache-Control` is read only by Vercel's CDN and is not passed on
 * to the client, so the app keeps seeing exactly the same `Cache-Control` it
 * sees today (no on-device caching change). Only successful (200) responses
 * should carry it: errors, 4xx and rate-limit 429s stay uncached.
 *
 * NEVER use this on anything authenticated or user-specific.
 */
export const CDN_CACHE_HEADER = 'Vercel-CDN-Cache-Control';

export function cdnCacheValue(maxAgeSec: number, staleWhileRevalidateSec: number): string {
  return `max-age=${maxAgeSec}, stale-while-revalidate=${staleWhileRevalidateSec}`;
}
