import { useCallback, useState } from 'react';
import { useSubscriptionStore } from './useSubscriptionStore';

/* ------------------------------------------------------------------ */
/*  Pro Feature types                                                  */
/* ------------------------------------------------------------------ */

export type ProFeature =
    | 'unlimited-hearts'
    | 'unlimited-replays'
    | 'analytics'
    | 'favorites'
    | 'bonus-challenges'
    | 'themes'
    | 'xp-boost'
    | 'share-wisdom';

interface ProFeatureResult {
    /** Whether the user has access to this feature */
    allowed: boolean;
    /** Call this to show paywall if not allowed */
    showPaywall: () => void;
    /** Whether the paywall is currently shown */
    paywallVisible: boolean;
    /** Dismiss the paywall */
    dismissPaywall: () => void;
}

/**
 * Feature gating hook for Pro features.
 * Returns `allowed: true` for Pro users, `false` for Free users.
 * Provides `showPaywall()` to trigger upgrade prompt.
 */
export function useProFeature(_feature: ProFeature): ProFeatureResult {
    const isPro = useSubscriptionStore((s) => s.tier === "pro" && s.status === "active");
    const [paywallVisible, setPaywallVisible] = useState(false);

    const showPaywall = useCallback(() => {
        if (!isPro) {
            setPaywallVisible(true);
        }
    }, [isPro]);

    const dismissPaywall = useCallback(() => {
        setPaywallVisible(false);
    }, []);

    return {
        allowed: isPro,
        showPaywall,
        paywallVisible,
        dismissPaywall,
    };
}
