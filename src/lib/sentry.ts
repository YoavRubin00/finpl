import { Platform } from "react-native";
import * as Sentry from "@sentry/react-native";

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry(): void {
  // Skip Sentry on web — @sentry/react-native doesn't support web platform
  if (Platform.OS === "web") return;
  if (!DSN) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[Sentry] No DSN configured — skipping init");
    }
    return;
  }

  Sentry.init({
    dsn: DSN,
    debug: __DEV__,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
    environment: __DEV__ ? "development" : "production",
  });
}

export function captureException(error: Error, context?: Record<string, string>): void {
  if (!DSN) return;

  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}
