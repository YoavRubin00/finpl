/**
 * Facebook App Events — thin, fail-safe wrappers around AppEventsLogger.
 *
 * Why a wrapper?
 *   1. Native module is absent in Expo Go / web / pre-prebuild dev builds.
 *      Direct calls would throw at import time; lazy require + try/catch
 *      keeps the rest of the app alive.
 *   2. Centralizes event naming so Ads Manager attribution stays consistent.
 *   3. Single place to add LDU/consent gating later (GDPR/CCPA users).
 *
 * Init lives in app/_layout.tsx after the ATT prompt. These wrappers assume
 * Settings.initializeSDK() has already run; if it hasn't, the events queue
 * locally inside the SDK and flush on the next init.
 */
import { Platform } from "react-native";

type LoggerModule = {
  AppEventsLogger: {
    logEvent: (name: string, valueOrParams?: number | Record<string, string | number>, params?: Record<string, string | number>) => void;
    logPurchase: (amount: number, currency: string, params?: Record<string, string | number>) => void;
  };
};

function getLogger(): LoggerModule["AppEventsLogger"] | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-fbsdk-next") as LoggerModule;
    return mod.AppEventsLogger;
  } catch {
    return null;
  }
}

/** Real-money purchase. Currency must be ISO 4217 (e.g. "ILS"). */
export function logPurchase(amount: number, currency: string, params?: Record<string, string | number>): void {
  const logger = getLogger();
  if (!logger) return;
  try {
    logger.logPurchase(amount, currency, params);
  } catch { /* swallow — telemetry must never crash the user flow */ }
}

/** Sign-up completion. Standard event Facebook optimizes against. */
export function logCompletedRegistration(method: string): void {
  const logger = getLogger();
  if (!logger) return;
  try {
    logger.logEvent("fb_mobile_complete_registration", { fb_registration_method: method });
  } catch { /* swallow */ }
}

/** Generic event passthrough — use for custom funnel steps. */
export function logEvent(name: string, params?: Record<string, string | number>): void {
  const logger = getLogger();
  if (!logger) return;
  try {
    if (params) logger.logEvent(name, params);
    else logger.logEvent(name);
  } catch { /* swallow */ }
}