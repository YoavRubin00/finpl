import { useCallback } from "react";
import { useSubscriptionStore } from "../features/subscription/useSubscriptionStore";

export function useRewardedAd() {
  const isPro = useSubscriptionStore(
    (s) => s.tier === "pro" && s.status === "active",
  );
  const showAd = useCallback((onReward: () => void) => {
    onReward();
  }, []);
  return { showAd, isLoaded: true, isPro };
}