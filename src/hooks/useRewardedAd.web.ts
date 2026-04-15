import { useSubscriptionStore } from "../features/subscription/useSubscriptionStore";

/**
 * Web stub — no ads on web. PRO users get rewards for free.
 */
export function useRewardedAd() {
  const isPro = useSubscriptionStore(
    (s) => s.tier === "pro" && s.status === "active",
  );

  return {
    showAd: (onReward: () => void) => {
      if (isPro) onReward();
    },
    isLoaded: isPro,
    isPro,
  };
}
