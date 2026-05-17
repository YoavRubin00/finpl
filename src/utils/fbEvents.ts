/**
 * Analytics events — thin, fail-safe wrappers that fan out to BOTH
 * Facebook (AppEventsLogger) AND Firebase / GA4 (@react-native-firebase/analytics).
 *
 * Why fan-out?
 *   • Facebook Ads optimizes against fb_mobile_purchase / fb_mobile_complete_registration.
 *   • Google Ads (App Campaigns) optimizes against GA4's purchase / sign_up events.
 *   • Posting to both lets each ad platform optimize on its native event names
 *     without having to add per-platform code in every call site.
 *
 * Why a wrapper?
 *   1. Native modules are absent in Expo Go / web / pre-prebuild dev builds.
 *      Direct calls would throw at import time; lazy require + try/catch
 *      keeps the rest of the app alive.
 *   2. Single place to add LDU/consent gating later (GDPR/CCPA users).
 *
 * Init lives in app/_layout.tsx after the ATT prompt. These wrappers assume
 * Settings.initializeSDK() (FB) and Firebase auto-init have already run; if
 * not, the events queue locally inside each SDK and flush on the next init.
 */
import { Platform } from "react-native";

// ── Facebook (AppEventsLogger) ──────────────────────────────────────────

type FBLoggerModule = {
  AppEventsLogger: {
    logEvent: (name: string, valueOrParams?: number | Record<string, string | number>, params?: Record<string, string | number>) => void;
    logPurchase: (amount: number, currency: string, params?: Record<string, string | number>) => void;
  };
};

function getFBLogger(): FBLoggerModule["AppEventsLogger"] | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-fbsdk-next") as FBLoggerModule;
    return mod.AppEventsLogger;
  } catch {
    return null;
  }
}

// ── Firebase / GA4 (@react-native-firebase/analytics) ───────────────────

type FirebaseAnalyticsModule = {
  default: () => {
    logEvent: (name: string, params?: Record<string, unknown>) => Promise<void>;
  };
};

function getFirebaseAnalytics(): ReturnType<FirebaseAnalyticsModule["default"]> | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@react-native-firebase/analytics") as FirebaseAnalyticsModule;
    return mod.default();
  } catch {
    return null;
  }
}

// ── Public API ──────────────────────────────────────────────────────────

/** Real-money purchase. Currency must be ISO 4217 (e.g. "ILS"). */
export function logPurchase(amount: number, currency: string, params?: Record<string, string | number>): void {
  // Facebook
  const fb = getFBLogger();
  if (fb) {
    try { fb.logPurchase(amount, currency, params); } catch { /* swallow */ }
  }
  // Firebase / GA4 — "purchase" is a reserved standard event name.
  const ga = getFirebaseAnalytics();
  if (ga) {
    try {
      ga.logEvent("purchase", {
        value: amount,
        currency,
        ...(params ?? {}),
      });
    } catch { /* swallow */ }
  }
}

/** Sign-up completion. Standard event Facebook + Google optimize against. */
export function logCompletedRegistration(method: string): void {
  // Facebook
  const fb = getFBLogger();
  if (fb) {
    try { fb.logEvent("fb_mobile_complete_registration", { fb_registration_method: method }); } catch { /* swallow */ }
  }
  // Firebase / GA4 — "sign_up" is a reserved standard event name.
  const ga = getFirebaseAnalytics();
  if (ga) {
    try { ga.logEvent("sign_up", { method }); } catch { /* swallow */ }
  }
}

/** Generic event passthrough — use for custom funnel steps. Mirrors to both. */
export function logEvent(name: string, params?: Record<string, string | number>): void {
  // Facebook
  const fb = getFBLogger();
  if (fb) {
    try {
      if (params) fb.logEvent(name, params);
      else fb.logEvent(name);
    } catch { /* swallow */ }
  }
  // Firebase / GA4
  const ga = getFirebaseAnalytics();
  if (ga) {
    try { ga.logEvent(name, params); } catch { /* swallow */ }
  }
}