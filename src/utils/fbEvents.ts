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
import { captureEvent } from "../lib/posthog";

function fbErrorPayload(eventName: string, err: unknown): Record<string, string> {
  const payload: Record<string, string> = { event: eventName };
  if (err instanceof Error) {
    payload.error = err.message;
    payload.error_name = err.name;
  } else {
    payload.error = String(err);
  }
  return payload;
}

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
    try {
      fb.logPurchase(amount, currency, params);
    } catch (err) {
      if (__DEV__) console.warn('[fbEvents] logPurchase failed', err);
      captureEvent('fb_event_failed', fbErrorPayload('fb_mobile_purchase', err));
    }
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
    try {
      fb.logEvent("fb_mobile_complete_registration", { fb_registration_method: method });
    } catch (err) {
      if (__DEV__) console.warn('[fbEvents] logCompletedRegistration failed', err);
      captureEvent('fb_event_failed', fbErrorPayload('fb_mobile_complete_registration', err));
    }
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
    } catch (err) {
      if (__DEV__) console.warn('[fbEvents] logEvent failed', { name, err });
      captureEvent('fb_event_failed', fbErrorPayload(name, err));
    }
  }
  // Firebase / GA4
  const ga = getFirebaseAnalytics();
  if (ga) {
    try { ga.logEvent(name, params); } catch { /* swallow */ }
  }
}

/**
 * Onboarding finished. FB's "tutorial_completion" is a recognized standard
 * event that Meta Ads can optimize on; GA4's "tutorial_complete" is reserved.
 */
export function logOnboardingComplete(): void {
  const fb = getFBLogger();
  if (fb) {
    try {
      fb.logEvent("fb_mobile_tutorial_completion");
    } catch (err) {
      if (__DEV__) console.warn('[fbEvents] logOnboardingComplete failed', err);
      captureEvent('fb_event_failed', fbErrorPayload('fb_mobile_tutorial_completion', err));
    }
  }
  const ga = getFirebaseAnalytics();
  if (ga) {
    try { ga.logEvent("tutorial_complete"); } catch { /* swallow */ }
  }
}

/**
 * A single lesson (module) finished. FB maps to "achievement_unlocked" which
 * is the closest standard event. GA4's "unlock_achievement" is reserved.
 */
export function logLessonComplete(moduleId: string, chapterId: string): void {
  const fb = getFBLogger();
  if (fb) {
    try {
      fb.logEvent("fb_mobile_achievement_unlocked", { fb_description: `${chapterId}/${moduleId}` });
    } catch (err) {
      if (__DEV__) console.warn('[fbEvents] logLessonComplete failed', err);
      captureEvent('fb_event_failed', fbErrorPayload('fb_mobile_achievement_unlocked', err));
    }
  }
  const ga = getFirebaseAnalytics();
  if (ga) {
    try { ga.logEvent("unlock_achievement", { achievement_id: `${chapterId}/${moduleId}` }); } catch { /* swallow */ }
  }
}

/** Custom: deeper progress than a single lesson — same trigger here, distinct signal. */
export function logModuleComplete(moduleId: string): void {
  logEvent("module_complete", { module_id: moduleId });
}

/** Custom: full chapter (incl. boss) finished. High-quality engagement signal. */
export function logChapterComplete(chapterId: string): void {
  logEvent("chapter_complete", { chapter_id: chapterId });
}

/**
 * Level-up milestone. FB's "level_achieved" is a recognized standard event;
 * GA4's "level_up" is reserved.
 */
export function logLevelUp(level: number): void {
  const fb = getFBLogger();
  if (fb) {
    try {
      fb.logEvent("fb_mobile_level_achieved", { fb_level: level });
    } catch (err) {
      if (__DEV__) console.warn('[fbEvents] logLevelUp failed', err);
      captureEvent('fb_event_failed', fbErrorPayload('fb_mobile_level_achieved', err));
    }
  }
  const ga = getFirebaseAnalytics();
  if (ga) {
    try { ga.logEvent("level_up", { level }); } catch { /* swallow */ }
  }
}

/** Custom: streak milestone reached (day 3, 7, 14, 30, 60, 90). Retention signal. */
export function logStreakMilestone(days: number): void {
  logEvent("streak_milestone", { days });
}

/**
 * Premium upgrade flow started — fires BEFORE the actual purchase resolves.
 * FB's "initiated_checkout" is a recognized standard event; GA4's
 * "begin_checkout" is reserved.
 */
export function logTrialStart(plan: string): void {
  const fb = getFBLogger();
  if (fb) {
    try {
      fb.logEvent("fb_mobile_initiated_checkout", { fb_content_type: "subscription", fb_content_id: plan });
    } catch (err) {
      if (__DEV__) console.warn('[fbEvents] logTrialStart failed', err);
      captureEvent('fb_event_failed', fbErrorPayload('fb_mobile_initiated_checkout', err));
    }
  }
  const ga = getFirebaseAnalytics();
  if (ga) {
    try { ga.logEvent("begin_checkout", { items: [{ item_id: plan, item_category: "subscription" }] }); } catch { /* swallow */ }
  }
}