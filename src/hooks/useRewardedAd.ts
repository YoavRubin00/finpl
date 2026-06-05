import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { useIsPro } from "../features/subscription/useSubscription";
import { useAuthStore } from "../features/auth/useAuthStore";

// Minimal shape of react-native-google-mobile-ads we actually call. Typed
// this way so we don't pull the SDK's type tree (it would crash the web build,
// which doesn't have the module installed) but still get type-safety on use.
interface RewardedAdEventListener {
  (event: unknown): void;
}
interface RewardedAdInstance {
  // addAdEventListener returns an unsubscribe fn — we MUST keep + call it,
  // otherwise listeners (and the native ad they reference) leak.
  addAdEventListener(eventType: string, listener: RewardedAdEventListener): () => void;
  load(): void;
  show(): void;
}
interface MobileAdsInstance {
  setRequestConfiguration(opts: {
    tagForUnderAgeOfConsent?: boolean;
    tagForChildDirectedTreatment?: boolean;
  }): Promise<void>;
}
interface AdsModuleShape {
  TestIds: { REWARDED: string };
  RewardedAd: {
    createForAdRequest(
      adUnitId: string,
      opts: { requestNonPersonalizedAdsOnly?: boolean },
    ): RewardedAdInstance;
  };
  RewardedAdEventType: { LOADED: string; EARNED_REWARD: string };
  AdEventType: { CLOSED: string; ERROR: string };
  default: () => MobileAdsInstance;
}

let AdsModule: AdsModuleShape | null = null;
let AD_UNIT_ID = "";
let USING_TEST_IDS = false;

if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AdsModule = require("react-native-google-mobile-ads") as AdsModuleShape;
    const realIosId = process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS;
    const realAndroidId = process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID;
    const platformId = Platform.select({
      ios: realIosId,
      android: realAndroidId,
    });
    if (platformId) {
      AD_UNIT_ID = platformId;
    } else {
      AD_UNIT_ID = AdsModule.TestIds.REWARDED;
      USING_TEST_IDS = true;
      console.warn("[AdMob] Using TEST IDs — EXPO_PUBLIC_ADMOB_REWARDED_* env var not injected");
    }
    console.log(`[AdMob] Initialized with ${USING_TEST_IDS ? "TEST" : "PROD"} unit: ${AD_UNIT_ID}`);
  } catch (error) {
    console.warn("[AdMob] SDK require failed:", error);
  }
}

// ───────────────────────────── Module-level singleton
// The rewarded ad lives OUTSIDE React so unmounting any consuming component
// (e.g. HeartsUI calling onDismiss inside the reward callback) can never drop
// the only JS reference to a currently-showing ad. Previously the ad was held
// in a component `adRef` that was nulled on unmount → GC during show → the ad
// UI tore down but the audio/media session kept playing in the background.
// One shared instance also avoids 3+ components each loading their own ad.

let currentAd: RewardedAdInstance | null = null;
let isAdLoaded = false;
let isLoading = false;
let unsubs: Array<() => void> = [];
// Per-show state. rewardCb fires exactly ONCE, and ONLY after the ad has both
// granted the reward AND closed — so the user returns to the app only at the
// END of the ad (not mid-video, which is when iOS fires EARNED_REWARD).
let rewardCb: (() => void) | null = null;
let rewardEarned = false;
let adClosed = false;
let graceTimer: ReturnType<typeof setTimeout> | null = null;

// Subscribers (hooks) notified when isAdLoaded flips, so each useRewardedAd()
// re-renders with the current readiness.
const loadedListeners = new Set<(v: boolean) => void>();
function setLoaded(v: boolean): void {
  isAdLoaded = v;
  loadedListeners.forEach((fn) => fn(v));
}

function clearUnsubs(): void {
  for (const u of unsubs) {
    try { u(); } catch { /* listener already gone */ }
  }
  unsubs = [];
}

function maybeComplete(): void {
  // Fire the caller's reward callback once both conditions hold: reward earned
  // AND ad dismissed. This is what makes "return to app only at ad end" true.
  if (adClosed && rewardEarned && rewardCb) {
    const cb = rewardCb;
    rewardCb = null;
    if (graceTimer) { clearTimeout(graceTimer); graceTimer = null; }
    try { cb(); } catch (e) { if (__DEV__) console.warn("[AdMob] reward callback threw:", e); }
  }
}

function loadAdSingleton(isMinor: boolean): void {
  if (isLoading || currentAd || !AdsModule) {
    if (!AdsModule) console.warn("[AdMob] loadAd skipped — AdsModule unavailable");
    return;
  }
  isLoading = true;
  const mod = AdsModule;

  // Apply TFUA before requesting the ad. setRequestConfiguration is a global
  // singleton mutation; re-applying on every load keeps the flag in sync with
  // the latest profile state (e.g. ageGroup flips after onboarding).
  mod
    .default()
    .setRequestConfiguration({
      tagForUnderAgeOfConsent: isMinor,
      tagForChildDirectedTreatment: false, // we don't target <13
    })
    .catch((cfgErr) => console.warn("[AdMob] setRequestConfiguration failed:", cfgErr));

  try {
    // Non-personalized only — avoids ATT/IDFA, safer for App Store review.
    const ad = mod.RewardedAd.createForAdRequest(AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    unsubs.push(
      ad.addAdEventListener(mod.RewardedAdEventType.LOADED, () => {
        console.log("[AdMob] Ad loaded");
        isLoading = false;
        setLoaded(true);
      }),
    );

    unsubs.push(
      ad.addAdEventListener(mod.RewardedAdEventType.EARNED_REWARD, () => {
        // Mark earned only — do NOT fire the callback here. The user must
        // return to the app at the END of the ad (CLOSED), not mid-video.
        console.log("[AdMob] Reward earned (deferred to CLOSED)");
        rewardEarned = true;
        maybeComplete();
      }),
    );

    unsubs.push(
      ad.addAdEventListener(mod.AdEventType.CLOSED, () => {
        console.log("[AdMob] Ad closed");
        adClosed = true;
        // Tear down THIS ad's listeners + reference so it can be GC'd cleanly
        // and a fresh one is loaded.
        clearUnsubs();
        currentAd = null;
        isLoading = false;
        setLoaded(false);

        // iOS race: CLOSED can arrive just before EARNED_REWARD. If we don't
        // have the reward yet, give a short grace window for a late EARNED
        // before giving up (no reward → host stays open).
        if (rewardCb && !rewardEarned) {
          if (graceTimer) clearTimeout(graceTimer);
          graceTimer = setTimeout(() => {
            graceTimer = null;
            // Either EARNED arrived (maybeComplete fired) or it never will —
            // drop the pending callback so a stale one can't fire later.
            rewardCb = null;
          }, 700);
        } else {
          maybeComplete();
        }

        // Preload the next ad.
        setTimeout(() => loadAdSingleton(isMinor), 1000);
      }),
    );

    unsubs.push(
      ad.addAdEventListener(mod.AdEventType.ERROR, (error: unknown) => {
        console.warn("[AdMob] Ad load/show error:", error);
        clearUnsubs();
        currentAd = null;
        isLoading = false;
        setLoaded(false);
        setTimeout(() => loadAdSingleton(isMinor), 30000);
      }),
    );

    currentAd = ad;
    ad.load();
  } catch (error) {
    isLoading = false;
    console.warn("[AdMob] createForAdRequest failed:", error);
  }
}

function showAdSingleton(onReward: () => void): void {
  if (!currentAd || !isAdLoaded) {
    console.warn(`[AdMob] showAd called but ad not ready — isLoaded=${isAdLoaded}, ad=${!!currentAd}`);
    return;
  }
  // Reset per-show state, then show. The singleton holds `currentAd` for the
  // ad's full lifetime, so no component unmount can GC it mid-show.
  rewardCb = onReward;
  rewardEarned = false;
  adClosed = false;
  if (graceTimer) { clearTimeout(graceTimer); graceTimer = null; }
  currentAd.show();
}

/**
 * Hook to show a rewarded ad. PRO users skip ads entirely.
 * Returns { showAd, isLoaded, isPro } — call showAd(onReward) to display.
 * The reward callback fires once, only after the ad has been EARNED and CLOSED.
 */
export function useRewardedAd() {
  const isPro = useIsPro();
  // Israeli digital age of consent is 16; 16-17 users are still 'minor' in
  // capacity law and must be tagged TFUA so AdMob suppresses behavioral
  // targeting. Required by Google Play Families Policy + Apple guideline 1.3.
  const isMinor = useAuthStore((s) => s.profile?.ageGroup === 'minor');
  const [loaded, setLoadedState] = useState(isAdLoaded);

  useEffect(() => {
    if (isPro) return;
    // Subscribe to singleton readiness; cleanup removes ONLY this hook's
    // listener — it never tears down the shared ad (that's the whole point).
    const listener = (v: boolean) => setLoadedState(v);
    loadedListeners.add(listener);
    setLoadedState(isAdLoaded);
    if (!currentAd && !isLoading) loadAdSingleton(isMinor);
    return () => {
      loadedListeners.delete(listener);
    };
  }, [isPro, isMinor]);

  const showAd = useCallback(
    (onReward: () => void) => {
      if (isPro) {
        onReward();
        return;
      }
      showAdSingleton(onReward);
    },
    [isPro],
  );

  return { showAd, isLoaded: isPro || loaded, isPro };
}
