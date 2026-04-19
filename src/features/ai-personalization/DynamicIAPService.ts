/**
 * PRD 34, US-004 AC#3: Dynamic IAP Service
 *
 * Reads the user's AI profile (monetizationContext) and selects the
 * best-fit IAP offer for the current emotional trigger moment.
 * Customizes copy, urgency, and cooldown timing so offers feel native
 * to the gamified experience rather than intrusive ads.
 */
import type { MonetizationTrigger, MonetizationOffer, AIProfile } from './types';
import { useAITelemetryStore } from './useAITelemetryStore';

/** Minimum ms between showing any IAP popup to the same user */
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/** Max offers shown per session before going silent */
const MAX_OFFERS_PER_SESSION = 3;

interface IAPDecision {
  /** Whether an offer should be shown right now */
  shouldShow: boolean;
  /** The selected offer (null when shouldShow is false) */
  offer: MonetizationOffer | null;
  /** Display duration in ms, higher urgency stays longer */
  displayDurationMs: number;
  /** Delay before showing the popup (lets the moment breathe) */
  entryDelayMs: number;
}

/** Internal session state, not persisted, resets on app restart */
let lastShownTimestamp = 0;
let offersShownThisSession = 0;

/**
 * Evaluate whether to show a personalized IAP offer at a given trigger moment.
 *
 * Call this from event handlers (e.g. after a quiz failure, chapter complete,
 * heart depletion) and use the returned IAPDecision to drive the popup UI.
 */
export function evaluateIAPOffer(trigger: MonetizationTrigger): IAPDecision {
  const noShow: IAPDecision = {
    shouldShow: false,
    offer: null,
    displayDurationMs: 0,
    entryDelayMs: 0,
  };

  /** Session cap reached, stop showing offers */
  if (offersShownThisSession >= MAX_OFFERS_PER_SESSION) return noShow;

  /** Cooldown, avoid spamming the user */
  if (Date.now() - lastShownTimestamp < COOLDOWN_MS) return noShow;

  const profile: AIProfile | null = useAITelemetryStore.getState().profile;
  if (!profile) return noShow;

  const { monetizationContext } = profile;
  if (!monetizationContext || monetizationContext.offers.length === 0) return noShow;

  /** Find the best offer matching the current trigger */
  const exactMatch = monetizationContext.offers.find((o) => o.trigger === trigger);
  if (!exactMatch) return noShow;

  /** Calculate timing based on urgency */
  const displayDurationMs = urgencyToDisplayMs(exactMatch.urgency);
  const entryDelayMs = urgencyToDelayMs(exactMatch.urgency);

  return {
    shouldShow: true,
    offer: exactMatch,
    displayDurationMs,
    entryDelayMs,
  };
}

/**
 * Mark that an offer was shown, updates cooldown and session counters.
 * Call this when the popup actually appears on screen.
 */
export function recordOfferShown(): void {
  lastShownTimestamp = Date.now();
  offersShownThisSession += 1;
}

/**
 * Record that the user accepted the IAP offer, logs to telemetry.
 */
export function recordOfferAccepted(bundleKey: string): void {
  useAITelemetryStore.getState().trackMonetizationSignal('iap_accepted', { bundleKey });
}

/**
 * Record that the user dismissed the IAP offer, logs to telemetry.
 */
export function recordOfferDismissed(bundleKey: string): void {
  useAITelemetryStore.getState().trackMonetizationSignal('iap_dismissed', { bundleKey });
}

/** Reset session counters (call on app foreground or new session) */
export function resetIAPSession(): void {
  lastShownTimestamp = 0;
  offersShownThisSession = 0;
}

// ── Helpers ──────────────────────────────────────────────────────────

function urgencyToDisplayMs(urgency: MonetizationOffer['urgency']): number {
  switch (urgency) {
    case 'high':
      return 8_000;
    case 'medium':
      return 6_000;
    case 'low':
      return 5_000;
  }
}

function urgencyToDelayMs(urgency: MonetizationOffer['urgency']): number {
  switch (urgency) {
    case 'high':
      return 500; // strike while hot
    case 'medium':
      return 1_500;
    case 'low':
      return 2_500; // let the moment settle
  }
}
