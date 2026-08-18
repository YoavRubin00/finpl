import PostHog from 'posthog-react-native';
import type { PostHogEventProperties } from '@posthog/core';
import * as Linking from 'expo-linking';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';
import { getAppVersion } from './version';

// Re-export under a friendlier name so feature code can import a single,
// well-known type rather than reaching into PostHog internals.
export type EventProperties = PostHogEventProperties;

const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
// EU project (176605) — default to the EU ingestion host so a missing env var
// can't silently divert analytics to the US region (Moni 2026-06-13). Currently
// masked on the client (the env var IS set in the build), but the server-side
// RevenueCat webhook shared this US default and lost every event — see that file.
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

let client: PostHog | null = null;

export function initPostHog(): void {
  if (!API_KEY) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[PostHog] No API key — skipping init');
    }
    return;
  }
  if (client) return;

  try {
    client = new PostHog(API_KEY, {
      host: HOST,
      captureAppLifecycleEvents: true,
      flushAt: 20,
      flushInterval: 30_000,
      // Diagnose Sign-in nosedive (28% conversion). Masking is mandatory —
      // we collect email + password fields, and PII in PostHog would breach
      // the privacy policy we ship to the store.
      enableSessionReplay: true,
      sessionReplayConfig: {
        maskAllTextInputs: true,
        maskAllImages: false,
        captureLog: true,
        captureNetworkTelemetry: true,
        androidDebouncerDelayMs: 1000,
        iOSdebouncerDelayMs: 1000,
      },
    });

    // Register platform as a SUPER PROPERTY so it attaches to EVERY event —
    // including the SDK's own autocaptured lifecycle events (Application
    // Installed / Opened) and $exception. The RN SDK doesn't populate `$os`
    // for this project, so installs/DAU/retention were impossible to split by
    // iOS vs Android (Yoav 2026-06-26: "how many of this week's downloads are
    // Apple?" was unanswerable). `platform` is 'ios' | 'android' | 'web'.
    // Super properties persist across launches, so even the once-per-install
    // event carries it going forward.
    client.register({
      platform: Platform.OS,
      os_version: Platform.Version != null ? String(Platform.Version) : 'unknown',
    });
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[PostHog] init failed:', err);
    }
  }

  // Capture UNCAUGHT JS errors to PostHog Error Tracking too — white-screen
  // crashes usually come from async/uncaught errors the React ErrorBoundary
  // never sees. Chain the previous handler so RN's red-box / fatal flow stays.
  type RNErrorUtils = {
    getGlobalHandler?: () => ((e: unknown, fatal?: boolean) => void) | undefined;
    setGlobalHandler?: (h: (e: unknown, fatal?: boolean) => void) => void;
  };
  try {
    const errorUtils = (globalThis as unknown as { ErrorUtils?: RNErrorUtils }).ErrorUtils;
    if (client && errorUtils?.setGlobalHandler) {
      const prev = errorUtils.getGlobalHandler?.();
      errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
        captureAppException(error, { source: 'global_handler', fatal: !!isFatal });
        prev?.(error, isFatal);
      });
    }
  } catch {
    /* never let instrumentation break boot */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exception capture (Yoav 9.8: `$exception` has been dark since 5.7)
// ─────────────────────────────────────────────────────────────────────────────

export type ExceptionSource =
  | 'global_handler'
  | 'error_boundary'
  | 'unhandled_rejection'
  | 'manual';

interface CaptureAppExceptionOptions {
  source: ExceptionSource;
  /** True when RN reports the error as fatal (app is about to die). */
  fatal?: boolean;
  /** Extra flat props (component stack, feature tag, …). */
  extra?: EventProperties;
}

/** Max exceptions we send per rolling minute — a render loop or a retry storm
 *  must not flood the project (and PostHog bills exceptions separately). */
const EXCEPTION_RATE_LIMIT = 5;
const EXCEPTION_RATE_WINDOW_MS = 60_000;
const exceptionTimestamps: number[] = [];

/** Last route name reported via captureScreen — attached to every exception
 *  so a crash can be tied to the screen it happened on. */
let currentScreenName: string | null = null;

function isExceptionRateLimited(now: number): boolean {
  while (exceptionTimestamps.length > 0 && now - exceptionTimestamps[0] > EXCEPTION_RATE_WINDOW_MS) {
    exceptionTimestamps.shift();
  }
  if (exceptionTimestamps.length >= EXCEPTION_RATE_LIMIT) return true;
  exceptionTimestamps.push(now);
  return false;
}

function getOtaUpdateId(): string | null {
  try {
    // Embedded launch = the bundle shipped inside the native binary (no OTA).
    if (Updates.isEmbeddedLaunch) return 'embedded';
    return Updates.updateId ?? null;
  } catch {
    return null;
  }
}

/**
 * Capture a JS error to PostHog Error Tracking. Uses the SDK's
 * `captureException` (posthog-react-native ≥4.45) so the stack trace is
 * parsed into `$exception_list[].stacktrace` and PostHog groups it into an
 * issue — a hand-rolled `$exception` event without frames never groups.
 *
 * Guarantees: never throws, rate-limited to EXCEPTION_RATE_LIMIT/min per
 * session, flushes immediately on fatal (the process is about to die, so a
 * queued event would be lost).
 */
export function captureAppException(error: unknown, options: CaptureAppExceptionOptions): void {
  try {
    if (!client) return;
    const now = Date.now();
    if (isExceptionRateLimited(now)) return;
    const fatal = options.fatal === true;
    const props: EventProperties = {
      ...(options.extra ?? {}),
      capture_source: options.source,
      is_fatal: fatal,
      fatal,
      $exception_level: fatal ? 'fatal' : 'error',
      screen_name: currentScreenName ?? 'unknown',
      app_version: getAppVersion(),
      ota_update_id: getOtaUpdateId() ?? 'unknown',
    };
    // Non-Error throwables (strings, plain objects) are coerced by the SDK.
    client.captureException(error, props);
    if (fatal) {
      void client.flush().catch(() => { /* best-effort */ });
    }
  } catch {
    /* analytics must NEVER crash the app */
  }
}

export function identifyUser(distinctId: string, properties?: EventProperties): void {
  client?.identify(distinctId, properties);
}

export function captureEvent(name: string, properties?: EventProperties): void {
  client?.capture(name, properties);
}

export function captureScreen(screenName: string, properties?: EventProperties): void {
  currentScreenName = screenName;
  // Register the route as a SUPER PROPERTY (next to `platform` above) so every
  // JS-side event carries `screen_name`. The SDK's own `screen()` only
  // session-registers `$screen_name`, which is lost on session rotation.
  // NOTE: `$rageclick` is emitted by the NATIVE session-replay SDK (its
  // `$screen_name` is the native view class — 'RNSScreen'/'UI'/'Modal') and
  // native events do NOT receive JS super properties; correlate those to a
  // route via `$session_id` + the preceding `$screen` event instead.
  try {
    void client?.register({ screen_name: screenName });
  } catch {
    /* non-fatal */
  }
  client?.screen(screenName, properties);
}

/**
 * Update person properties for the currently-identified user without
 * re-capturing an `$identify` event. Use this when a property changes
 * mid-session (e.g. user purchased Pro, exited guest mode) so subsequent
 * insights segment them correctly. No-op when the SDK isn't initialized.
 */
export function setPersonProperties(properties: EventProperties): void {
  // posthog-react-native fans `identify(distinctId, props)` calls to a $set
  // mutation, which is exactly what we want — re-passing the existing
  // distinct_id with new props patches the person record.
  const distinctId = client?.getDistinctId();
  if (!distinctId) return;
  client?.identify(distinctId, properties);
}

export function resetUser(): void {
  client?.reset();
}

/**
 * Capture install/launch attribution from the initial deep-link URL (utm_*).
 * Board 2026-06-18: 100% of installs were "Unknown". This catches users who
 * arrive via a TRACKED link (Instagram bio, WhatsApp CTA) once those links
 * carry ?utm_source=… — set them as person properties so the source attaches to
 * the eventual identified person. Organic store-referrer (Play/App Store) needs
 * a native install-referrer module (future); this is the link-based first step.
 */
export async function captureLaunchAttribution(): Promise<void> {
  try {
    const url = await Linking.getInitialURL();
    if (!url) return;
    const { queryParams } = Linking.parse(url);
    if (!queryParams) return;
    const pick = (k: string): string | undefined => {
      const v = queryParams[k];
      return typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined;
    };
    const source = pick('utm_source');
    const medium = pick('utm_medium');
    const campaign = pick('utm_campaign');
    if (!source && !medium && !campaign) return;
    setPersonProperties({
      ...(source ? { initial_utm_source: source } : {}),
      ...(medium ? { initial_utm_medium: medium } : {}),
      ...(campaign ? { initial_utm_campaign: campaign } : {}),
    });
  } catch {
    /* attribution is best-effort — never block launch */
  }
}

export function getPostHogClient(): PostHog | null {
  return client;
}
