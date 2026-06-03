import { useCallback, useEffect, useRef, useState } from "react";
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
  addAdEventListener(eventType: string, listener: RewardedAdEventListener): void;
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

/**
 * Hook to show a rewarded ad. PRO users skip ads entirely.
 * Returns { showAd, isLoaded, isPro } — call showAd(onReward) to display.
 */
export function useRewardedAd() {
  const isPro = useIsPro();
  // Israeli digital age of consent is 16; 16-17 users are still 'minor' in
  // capacity law and must be tagged TFUA (Tag For Under Age of Consent) so
  // AdMob suppresses behavioral targeting. Required by Google Play Families
  // Policy + Apple guideline 1.3 — missing this is a takedown risk.
  const isMinor = useAuthStore((s) => s.profile?.ageGroup === 'minor');
  const [isLoaded, setIsLoaded] = useState(false);
  const adRef = useRef<RewardedAdInstance | null>(null);
  const callbackRef = useRef<(() => void) | null>(null);

  const loadAd = useCallback(async () => {
    if (isPro || !AdsModule) {
      if (!AdsModule) console.warn("[AdMob] loadAd skipped — AdsModule unavailable");
      return;
    }
    try {
      // Apply TFUA before requesting the ad. setRequestConfiguration is a
      // global singleton mutation; re-applying on every load is cheap and
      // ensures the flag is always in sync with the latest profile state
      // (e.g. user finishes onboarding mid-session and ageGroup flips).
      try {
        await AdsModule.default().setRequestConfiguration({
          tagForUnderAgeOfConsent: isMinor,
          tagForChildDirectedTreatment: false, // we don't target <13
        });
      } catch (cfgErr) {
        console.warn("[AdMob] setRequestConfiguration failed:", cfgErr);
      }

      // Non-personalized ads only — avoids ATT requirement + IDFA usage.
      // Safer for App Store review; slightly lower CPM.
      const ad = AdsModule.RewardedAd.createForAdRequest(AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
      });

      ad.addAdEventListener(AdsModule.RewardedAdEventType.LOADED, () => {
        console.log("[AdMob] Ad loaded successfully");
        setIsLoaded(true);
      });

      // iOS עלול לפעמים לשלוח CLOSED לפני EARNED_REWARD (race condition של
      // AdMob). שני ה-listeners חולקים flag כדי שגם אם הסדר הפוך, ה-callback
      // יקרא בדיוק פעם אחת.
      let rewardEarned = false;

      ad.addAdEventListener(AdsModule.RewardedAdEventType.EARNED_REWARD, () => {
        console.log("[AdMob] Reward earned");
        rewardEarned = true;
        callbackRef.current?.();
        callbackRef.current = null;
      });

      ad.addAdEventListener(AdsModule.AdEventType.CLOSED, () => {
        console.log("[AdMob] Ad closed, reloading");
        // אם CLOSED מגיע לפני EARNED_REWARD ועדיין יש callback ממתין, נחכה
        // קצרות (iOS עדיין שולח EARNED אחרי) ואם עדיין לא נקרא — נפעיל ידנית
        // כדי שהמשתמש לא יישאר תקוע ב-modal.
        if (!rewardEarned && callbackRef.current) {
          setTimeout(() => {
            if (!rewardEarned && callbackRef.current) {
              callbackRef.current();
              callbackRef.current = null;
            }
          }, 500);
        }
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
  }, [isPro, isMinor]);

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