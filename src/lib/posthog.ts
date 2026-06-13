import PostHog from 'posthog-react-native';
import type { PostHogEventProperties } from '@posthog/core';

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

export function getPostHogClient(): PostHog | null {
  return client;
}
