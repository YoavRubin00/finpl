import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useSubscriptionStore } from "../features/subscription/useSubscriptionStore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AdsModule: any = null;
let AD_UNIT_ID = "";

if (Platform.OS !== "web") {
  try {
    AdsModule = require("react-native-google-mobile-ads");
    const realIosId = process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS;
    const realAndroidId = process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID;
    AD_UNIT_ID = Platform.select({
      ios: realIosId || AdsModule.TestIds.REWARDED,
      android: realAndroidId || AdsModule.TestIds.REWARDED,
    }) ?? AdsModule.TestIds.REWARDED;
  } catch {
    // Ads SDK not available
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
    if (isPro || !AdsModule) return;
    try {
      // Non-personalized ads only — avoids ATT requirement + IDFA usage.
      // Safer for App Store review; slightly lower CPM.
      const ad = AdsModule.RewardedAd.createForAdRequest(AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
      });

      ad.addAdEventListener(AdsModule.RewardedAdEventType.LOADED, () => {
        setIsLoaded(true);
      });

      ad.addAdEventListener(AdsModule.RewardedAdEventType.EARNED_REWARD, () => {
        callbackRef.current?.();
        callbackRef.current = null;
      });

      ad.addAdEventListener(AdsModule.AdEventType.CLOSED, () => {
        setIsLoaded(false);
        setTimeout(loadAd, 1000);
      });

      ad.addAdEventListener(AdsModule.AdEventType.ERROR, () => {
        setIsLoaded(false);
        setTimeout(loadAd, 30000);
      });

      ad.load();
      adRef.current = ad;
    } catch {
      // Ad SDK may not be available
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
      }
    },
    [isPro, isLoaded],
  );

  return { showAd, isLoaded: isPro || isLoaded, isPro };
}
