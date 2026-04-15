import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from "react-native-google-mobile-ads";
import { useSubscriptionStore } from "../features/subscription/useSubscriptionStore";

// Test IDs for development — replace with real Ad Unit IDs for production
const AD_UNIT_ID = Platform.select({
  ios: TestIds.REWARDED,
  android: TestIds.REWARDED,
}) ?? TestIds.REWARDED;

/**
 * Hook to show a rewarded ad. PRO users skip ads entirely.
 * Returns { showAd, isLoaded } — call showAd(onReward) to display.
 */
export function useRewardedAd() {
  const isPro = useSubscriptionStore(
    (s) => s.tier === "pro" && s.status === "active",
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const adRef = useRef<RewardedAd | null>(null);
  const callbackRef = useRef<(() => void) | null>(null);

  const loadAd = useCallback(() => {
    if (isPro) return; // PRO users don't see ads
    try {
      const ad = RewardedAd.createForAdRequest(AD_UNIT_ID);

      ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        setIsLoaded(true);
      });

      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        callbackRef.current?.();
        callbackRef.current = null;
      });

      ad.addAdEventListener(AdEventType.CLOSED, () => {
        setIsLoaded(false);
        // Pre-load next ad
        setTimeout(loadAd, 1000);
      });

      ad.addAdEventListener(AdEventType.ERROR, () => {
        setIsLoaded(false);
        // Retry after delay
        setTimeout(loadAd, 30000);
      });

      ad.load();
      adRef.current = ad;
    } catch {
      // Ad SDK may not be available (web, etc.)
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
        // PRO users get reward for free
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
