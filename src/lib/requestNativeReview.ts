import { track } from './analytics/events';
import { openStoreReview } from './openStoreReview';

/**
 * Duolingo-style native in-app review (Yoav 2026-06-27). Presents the OS review
 * sheet (iOS SKStoreReviewController / Android Play In-App Review) INSIDE the app
 * — the user rates without leaving. The OS rate-limits it (~3/year on iOS) and
 * never reports back whether they actually rated (fire-and-forget). Falls back to
 * the store deep-link when the native sheet isn't available. Call this ONLY after
 * positive sentiment — never route unhappy users here.
 *
 * The `expo-store-review` import is DEFERRED to call-time (require inside the
 * function, not a top-level import): a static import of a native module throws at
 * Hermes module-eval if the binary doesn't bundle it, which would crash anything
 * that imports this file. This mirrors the live-voice deferred-import fix and
 * keeps the JS safe to ship via OTA onto a binary built before this module
 * landed — it simply degrades to the store deep-link.
 */
export async function requestNativeReview(opts?: { moduleId?: string }): Promise<void> {
  let available = false;
  let StoreReview: typeof import('expo-store-review') | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    StoreReview = require('expo-store-review') as typeof import('expo-store-review');
    available = (await StoreReview.isAvailableAsync()) === true;
  } catch {
    available = false;
    StoreReview = null;
  }

  try {
    track({ name: 'rate_review_requested', props: { available, module_id: opts?.moduleId } });
  } catch { /* non-fatal */ }

  if (available && StoreReview) {
    try {
      await StoreReview.requestReview();
      return;
    } catch { /* fall through to the deep-link */ }
  }
  // Native sheet unavailable (older binary / web / OS quota path) — deep-link.
  openStoreReview(opts);
}
