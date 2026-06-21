import { Linking, Platform } from 'react-native';
import { track } from './analytics/events';

// Stable store deep-links — mirror assets/app-config.json + ForceUpdateScreen's
// fallback chain. Hardcoded (not fetched) so the rating tap is INSTANT with no
// async config round-trip; the store ids are fixed for the app's lifetime.
// iOS jumps straight to the write-a-review screen via ?action=write-review.
const IOS_REVIEW_URL = 'itms-apps://apps.apple.com/app/id6761650222?action=write-review';
const ANDROID_URL = 'market://details?id=com.finplay.app';
const PLAY_WEB_FALLBACK = 'https://play.google.com/store/apps/details?id=com.finplay.app';

/**
 * Deep-link the user to the store rating/review page. iOS → App Store write-
 * review; Android → Play listing (the rating UI lives there). Fires the
 * `rate_prompt_cta_tapped` (open_store) funnel event. Best-effort: on Android
 * falls back to the web Play URL if `market://` can't resolve.
 */
export function openStoreReview(opts?: { moduleId?: string }): void {
  const store: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
  const url = store === 'ios' ? IOS_REVIEW_URL : ANDROID_URL;

  try {
    track({ name: 'rate_prompt_cta_tapped', props: { action: 'open_store', store, module_id: opts?.moduleId } });
  } catch { /* non-fatal */ }

  Linking.openURL(url).catch(() => {
    if (store === 'android') {
      Linking.openURL(PLAY_WEB_FALLBACK).catch(() => { /* no working store on device */ });
    }
  });
}
