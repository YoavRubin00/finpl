import { zustandStorage } from './zustandStorage';
import { captureEvent } from './posthog';

// Vercel Blob URL for the remote app config. Stable filename (no random
// suffix) — uploaded via scripts/publish-app-config.ts. The token prefix
// (8mnwcjygpqev3keg) matches the project's BLOB_READ_WRITE_TOKEN — same
// store that hosts audio assets.
const APP_CONFIG_URL =
  'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/config/app-config.json';

const CACHE_KEY = 'app-config-cache-v1';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const FETCH_TIMEOUT_MS = 4000; // 4 seconds — cold-start path, don't block boot

export interface AppConfig {
  /** Master kill switch. If false (or absent), the force-update gate is
   *  fully disabled regardless of version comparison. Defaults to false on
   *  parse errors so a malformed config can never lock users out. */
  enabled: boolean;
  /** Minimum semver string the app must report to NOT be blocked. */
  minSupportedVersion: string;
  /** Deep links to the App Store / Play Store listing. */
  iosStoreUrl: string;
  androidStoreUrl: string;
  /** Hebrew UI copy. Lives in the config so we can change wording without
   *  shipping an OTA — useful when the message itself is urgent. */
  title: string;
  message: string;
  ctaLabel: string;
  /** ISO timestamp the config was last published. Diagnostic only. */
  publishedAt?: string;
}

interface CachedEntry {
  config: AppConfig;
  fetchedAt: number;
}

const DISABLED_DEFAULT: AppConfig = {
  enabled: false,
  minSupportedVersion: '0.0.0',
  iosStoreUrl: '',
  androidStoreUrl: '',
  title: '',
  message: '',
  ctaLabel: '',
};

function isAppConfig(value: unknown): value is AppConfig {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.enabled === 'boolean' &&
    typeof v.minSupportedVersion === 'string' &&
    typeof v.iosStoreUrl === 'string' &&
    typeof v.androidStoreUrl === 'string' &&
    typeof v.title === 'string' &&
    typeof v.message === 'string' &&
    typeof v.ctaLabel === 'string'
  );
}

async function readCache(): Promise<CachedEntry | null> {
  try {
    const raw = await zustandStorage.getItem(CACHE_KEY);
    if (!raw || typeof raw !== 'string') return null;
    const parsed = JSON.parse(raw) as { config: unknown; fetchedAt: unknown };
    if (!isAppConfig(parsed.config) || typeof parsed.fetchedAt !== 'number') return null;
    return { config: parsed.config, fetchedAt: parsed.fetchedAt };
  } catch {
    return null;
  }
}

async function writeCache(config: AppConfig): Promise<void> {
  try {
    const entry: CachedEntry = { config, fetchedAt: Date.now() };
    await zustandStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Non-fatal — next cold start will refetch.
  }
}

/**
 * Fetches the app config from the remote Blob with a 30-minute MMKV cache.
 *
 * Resolution order:
 *  1. If cached < 30min old → return cache (no network call).
 *  2. Else fetch with 4s timeout. Success → cache + return.
 *  3. Fetch failed AND we have stale cache → return stale cache (better than
 *     nothing — prevents lockout when the user is offline mid-flight).
 *  4. Fetch failed AND no cache → return DISABLED_DEFAULT so the gate is a
 *     no-op. Fail-open is the safe default for a force-update mechanism.
 */
export async function fetchAppConfig(): Promise<AppConfig> {
  const cached = await readCache();
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.config;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // Append a cachebuster so Vercel Blob's edge cache doesn't serve a stale
    // body during the critical "config is on, build is in stores" window.
    // Combined with the publish script's `cacheControlMaxAge: 60`, this means
    // a fresh publish propagates to every cold-start within ~60s.
    const url = `${APP_CONFIG_URL}?t=${Math.floor(Date.now() / 60000)}`;
    const res = await fetch(url, {
      // Cast around the RN/global AbortSignal type collision — this is the
      // same workaround used elsewhere (useAppleAuth, useGoogleAuth, etc).
      signal: controller.signal as unknown as RequestInit['signal'],
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!isAppConfig(json)) throw new Error('Invalid config shape');
    await writeCache(json);
    return json;
  } catch (err) {
    try {
      captureEvent('force_update_config_fetch_failed', {
        error_message: err instanceof Error ? err.message : String(err),
      });
    } catch {
      // PostHog itself may not be initialized yet on cold start — swallow.
    }
    // Prefer stale cache over fail-open default — a stale "enabled: true"
    // is still safer than letting a user with no internet bypass a critical
    // block, and a stale "enabled: false" is what we want anyway.
    return cached?.config ?? DISABLED_DEFAULT;
  } finally {
    clearTimeout(timer);
  }
}
