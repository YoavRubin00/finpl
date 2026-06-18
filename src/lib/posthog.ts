import PostHog from 'posthog-react-native';
import type { PostHogEventProperties } from '@posthog/core';
import * as Linking from 'expo-linking';

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
  const errorUtils = (globalThis as unknown as { ErrorUtils?: RNErrorUtils }).ErrorUtils;
  if (client && errorUtils?.setGlobalHandler) {
    const prev = errorUtils.getGlobalHandler?.();
    errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      try {
        const message = error instanceof Error ? error.message : String(error);
        const type = error instanceof Error ? error.name : 'Error';
        client?.capture('$exception', {
          $exception_list: [{ type, value: message, mechanism: { handled: false } }],
          $exception_message: message,
          $exception_type: type,
          is_fatal: !!isFatal,
          capture_source: 'global_handler',
        });
      } catch {
        /* never block the native handler */
      }
      prev?.(error, isFatal);
    });
  }
}

export function identifyUser(distinctId: string, properties?: EventProperties): void {
  client?.identify(distinctId, properties);
}

export function captureEvent(name: string, properties?: EventProperties): void {
  client?.capture(name, properties);
}

export function captureScreen(screenName: string, properties?: EventProperties): void {
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
