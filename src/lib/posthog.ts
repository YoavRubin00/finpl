import PostHog from 'posthog-react-native';
import type { PostHogEventProperties } from '@posthog/core';

// Re-export under a friendlier name so feature code can import a single,
// well-known type rather than reaching into PostHog internals.
export type EventProperties = PostHogEventProperties;

const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

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

export function resetUser(): void {
  client?.reset();
}

export function getPostHogClient(): PostHog | null {
  return client;
}
