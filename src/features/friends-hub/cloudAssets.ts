/**
 * Asset registry for the Friends Hub feature.
 *
 * Goal: keep the app bundle lean by serving images from a CDN once configured,
 * while retaining bundled `require()` fallbacks so dev/local runs work out of
 * the box.
 *
 * Behavior:
 *   - When `EXPO_PUBLIC_ASSETS_URL` is set → returns `{ uri: <cdn-url> }`
 *   - When unset → returns the local `require()` source (number/asset id)
 *
 * Both forms are valid `ExpoImage` sources, so consumers can use them directly:
 *
 *   <ExpoImage source={FRIENDS_HUB_ASSETS.heroBanner} ... />
 *
 * Setup:
 *   1. Upload the listed assets to your CDN under `/friends-hub/`.
 *   2. Set `EXPO_PUBLIC_ASSETS_URL` in `.env`
 *      (e.g. `https://cdn.finplay.app` or `https://your-vercel.vercel.app/static`).
 *   3. Once live, you may delete the local copies under `assets/webp/friends-hub/`.
 */

import type { ImageSource } from 'expo-image';

const ASSETS_BASE = process.env.EXPO_PUBLIC_ASSETS_URL ?? '';

function pick(path: string, local: number): ImageSource | number {
  return ASSETS_BASE ? { uri: `${ASSETS_BASE}${path}` } : local;
}

export const FRIENDS_HUB_ASSETS = {
  heroBanner: pick(
    '/friends-hub/hero-banner.png',
    require('../../../assets/webp/friends-hub/hero-banner.png'),
  ),
  bgDotsPattern: pick(
    '/friends-hub/bg-dots-pattern.png',
    require('../../../assets/webp/friends-hub/bg-dots-pattern.png'),
  ),
  neonDotsDecor: pick(
    '/friends-hub/neon-dots-decor.png',
    require('../../../assets/webp/friends-hub/neon-dots-decor.png'),
  ),
  proBannerDecor: pick(
    '/friends-hub/pro-banner-decor.png',
    require('../../../assets/webp/friends-hub/pro-banner-decor.png'),
  ),
} as const;

export const isCloudAssetsConfigured = (): boolean => ASSETS_BASE.length > 0;
