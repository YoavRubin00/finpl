/**
 * Cloud-hosted asset URLs for the Fantasy League feature.
 *
 * All visual assets are served from a CDN to keep the app bundle small.
 * ExpoImage caches each fetched asset to disk on first load — subsequent
 * mounts are instant and offline-safe.
 *
 * Setup:
 *   1. Upload `.webp` files to your CDN under `/fantasy/`
 *   2. Set `EXPO_PUBLIC_ASSETS_URL` in `.env` (e.g. `https://cdn.finplay.app`)
 *   3. If the env var is missing, components fall back to styled placeholders
 *      so the UI still renders during development.
 */

const ASSETS_BASE = process.env.EXPO_PUBLIC_ASSETS_URL ?? '';

function buildUrl(path: string): string | null {
  return ASSETS_BASE ? `${ASSETS_BASE}${path}` : null;
}

export const FANTASY_ASSETS = {
  shieldBronze: buildUrl('/fantasy/league-bronze.webp'),
  shieldSilver: buildUrl('/fantasy/league-silver-inner.webp'),
  shieldGold: buildUrl('/fantasy/league-gold-inner.webp'),
  promotionBanner: buildUrl('/fantasy/promotion-banner.webp'),
  demotionBanner: buildUrl('/fantasy/demotion-banner.webp'),
} as const;

export type FantasyAssetKey = keyof typeof FANTASY_ASSETS;

export const isCloudAssetsConfigured = (): boolean => ASSETS_BASE.length > 0;
