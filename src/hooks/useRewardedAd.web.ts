import { useCallback } from "react";
import { useIsPro } from "../features/subscription/useSubscription";

/**
 * Web stub: AdMob is native-only. On web, treat every "ad" as immediately rewarded
 * (PRO users do this anyway). Metro picks this file for web builds via the .web.ts suffix.
 */
export function useRewardedAd() {
  const isPro = useIsPro();

  const showAd = useCallback((onReward: () => void) => {
    onReward();
  }, []);

  return { showAd, isLoaded: true, isPro };
}