import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useSubscriptionStore } from "../features/subscription/useSubscriptionStore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AdsModule: any = null;
let AD_UNIT_ID = "";
let USING_TEST_IDS = false;

if (Platform.OS !== "web") {
  try {
    AdsModule = require("react-native-google-mobile-ads");
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

/**
 * Hook to show a rewarded ad. PRO users skip ads entirely.
 * Returns { showAd, isLoaded, isPro } — call showAd(onReward) to display.
 */
export function useRewardedAd() {
  const isPro = useSubscriptionStore(
    (s) => s.tier === "pro" && s.status === "active",
  );
  const [isLoaded, setIsLoaded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adRef = useRef<any>(null);
  const callbackRef = useRef<(() => void) | null>(null);

  const loadAd = useCallback(() => {
    if (isPro || !AdsModule) {
      if (!AdsModule) console.warn("[AdMob] loadAd skipped — AdsModule unavailable");
      return;
    }
    try {
      // Non-personalized ads only — avoids ATT requirement + IDFA usage.
      // Safer for App Store review; slightly lower CPM.
      const ad = AdsModule.RewardedAd.createForAdRequest(AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
      });

      ad.addAdEventListener(AdsModule.RewardedAdEventType.LOADED, () => {
        console.log("[AdMob] Ad loaded successfully");
        setIsLoaded(true);
      });

      ad.addAdEventListener(AdsModule.RewardedAdEventType.EARNED_REWARD, () => {
        console.log("[AdMob] Reward earned");
        callbackRef.current?.();
        callbackRef.current = null;
      });

      ad.addAdEventListener(AdsModule.AdEventType.CLOSED, () => {
        console.log("[AdMob] Ad closed, reloading");
        setIsLoaded(false);
        setTimeout(loadAd, 1000);
      });

      ad.addAdEventListener(AdsModule.AdEventType.ERROR, (error: unknown) => {
        console.warn("[AdMob] Ad load error:", error);
        setIsLoaded(false);
        setTimeout(loadAd, 30000);
      });

      ad.load();
      adRef.current = ad;
    } catch (error) {
      console.warn("[AdMob] createForAdRequest failed:", error);
    }
  }, [isPro]);

  useEffect(() => {
    loadAd();
    return () => {
      adRef.current = null;
    };
  }, [loadAd]);

  const showAd = useCallback(
    (onReward: () => void) => {
      if (isPro) {
        onReward();
        return;
      }
      if (adRef.current && isLoaded) {
        callbackRef.current = onReward;
        adRef.current.show();
      } else {
        console.warn(`[AdMob] showAd called but ad not ready — isLoaded=${isLoaded}, adRef=${!!adRef.current}`);
      }
    },
    [isPro, isLoaded],
  );

  return { showAd, isLoaded: isPro || isLoaded, isPro };
}