import PostHog from 'posthog-react-native';

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
    });
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[PostHog] init failed:', err);
    }
  }
}

export function identifyUser(distinctId: string, properties?: Record<string, unknown>): void {
  client?.identify(distinctId, properties);
}

export function captureEvent(name: string, properties?: Record<string, unknown>): void {
  client?.capture(name, properties);
}

export function captureScreen(screenName: string, properties?: Record<string, unknown>): void {
  client?.screen(screenName, properties);
}

export function resetUser(): void {
  client?.reset();
}

export function getPostHogClient(): PostHog | null {
  return client;
}
