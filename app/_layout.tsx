import "../global.css";
import { initSentry } from "../src/lib/sentry";
import { initPostHog } from "../src/lib/posthog";
import { I18nManager } from "react-native";

// Undo forceRTL that was set by build 30, it caused layout crashes
// because the app uses manual row-reverse throughout. This explicitly
// resets the persistent iOS setting. Takes effect after next launch.
if (I18nManager.isRTL) {
  try {
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
  } catch { /* ignore, older iOS may throw */ }
}

// Catch unhandled Promise rejections at module-load time, BEFORE any onboarding
// gesture can fire. Without this, a rejected promise inside a gesture callback
// reaches Hermes's `throwPendingError` → C++ exception → SIGABRT (Apple 2.1(a)
// reject pattern from build 1.0 (90), iPad Air 5th gen).
try {
  // Bundled with React Native via the `promise` polyfill — no extra install.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const tracking = require("promise/setimmediate/rejection-tracking") as {
    enable: (opts: {
      allRejections: boolean;
      onUnhandled: (id: number, error: unknown) => void;
      onHandled?: (id: number) => void;
    }) => void;
  };
  tracking.enable({
    allRejections: true,
    onUnhandled: (id, error) => {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[UnhandledRejection #${id}]`, msg);
    },
  });
} catch { /* ignore — polyfill not available, fall back to default behavior */ }

initSentry();
initPostHog();

import { Slot, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, Platform, Text, TextInput } from "react-native";
import { useUserStatsStore } from "../src/features/user-stats/useUserStatsStore";
import { setAudioModeAsync } from "expo-audio";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "@expo-google-fonts/heebo";
import {
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_600SemiBold,
  Heebo_700Bold,
  Heebo_800ExtraBold,
  Heebo_900Black,
} from "@expo-google-fonts/heebo";
import { useAuthStore } from "../src/features/auth/useAuthStore";
import { useEconomyStore } from "../src/features/economy/useEconomyStore";
import { RewardAnimationProvider } from "../src/hooks/useRewardAnimation";
import { StreakCelebrationProvider } from "../src/hooks/useStreakCelebration";
import { WisdomPopupCard } from "../src/features/wisdom-flashes/WisdomPopupCard";
import { ShopModal } from "../src/features/shop/ShopModal";
import { GlobalUpgradeModal } from "../src/features/subscription/UpgradeModal";

import { PostStreakIncomeSplash } from "../src/features/assets/PostStreakIncomeSplash";
import { useNotificationSetup } from "../src/features/notifications/useNotifications";
import { LoadingWisdom } from "../src/components/ui/LoadingWisdom";
import { AppIntroSplash } from "../src/components/ui/AppIntroSplash";
import { GlobalErrorBoundary } from "../src/components/ui/ErrorBoundary";
import { NetworkStatusBanner } from "../src/components/ui/NetworkStatusBanner";
import { LevelUpBanner } from "../src/components/ui/LevelUpBanner";
import { NotificationBanner } from "../src/components/ui/NotificationBanner";
import { useAIInsightBanner } from "../src/features/ai-insights/useAIInsightBanner";
import { useUpgradeNudgeBanner } from "../src/features/monetization/useUpgradeNudgeBanner";
import { GlobalQuestCompletionModal } from "../src/features/daily-quests/GlobalQuestCompletionModal";
import { DailyBridgeNudgeModal } from "../src/components/ui/DailyBridgeNudgeModal";
import { InviteFriendsNudgeModal } from "../src/components/ui/InviteFriendsNudgeModal";
import { GuestRegisterDailyNudge } from "../src/features/auth/GuestRegisterDailyNudge";
import { configureRevenueCat, loginRevenueCat } from "../src/services/revenueCat";
import { useSubscriptionStore } from "../src/features/subscription/useSubscriptionStore";
import { AppWalkthroughOverlay } from "../src/features/onboarding/AppWalkthroughOverlay";
import { StreakFreezeSaveModal } from "../src/features/streak/StreakFreezeSaveModal";
import { StreakRepairModal } from "../src/features/streak/StreakRepairModal";
import { useTutorialStore } from "../src/stores/useTutorialStore";
import { useGoogleAuth } from "../src/features/auth/useGoogleAuth";

// ── Global font override: all <Text> and <TextInput> use Heebo ──
const FONT_FAMILY = "Heebo_400Regular";

// Map RN fontWeight values to specific Heebo font files
const WEIGHT_TO_FONT: Record<string, string> = {
  "400": "Heebo_400Regular",
  normal: "Heebo_400Regular",
  "500": "Heebo_500Medium",
  "600": "Heebo_600SemiBold",
  "700": "Heebo_700Bold",
  bold: "Heebo_700Bold",
  "800": "Heebo_800ExtraBold",
  "900": "Heebo_900Black",
};

// Defensive: any throw inside this monkey-patch propagates to Hermes →
// SIGABRT (Apple 2.1(a) reject pattern). On any failure, fall back to the
// original render so the screen still draws — just without the Heebo font.
const origTextRender = (Text as unknown as { render: Function }).render;
(Text as unknown as { render: Function }).render = function (props: Record<string, unknown>, ref: unknown) {
  try {
    const flatStyle = props.style
      ? (Array.isArray(props.style)
          ? Object.assign({}, ...props.style.map((s: unknown) => (s && typeof s === "object" ? s : {})))
          : props.style)
      : {};
    const weight = String((flatStyle as Record<string, unknown>).fontWeight ?? "400");
    const mappedFont = WEIGHT_TO_FONT[weight] ?? FONT_FAMILY;
    const newProps = {
      ...props,
      style: [{ fontFamily: mappedFont }, props.style],
    };
    return origTextRender.call(this, newProps, ref);
  } catch {
    // Fallback: render with original props (no font override) instead of crashing.
    return origTextRender.call(this, props, ref);
  }
};

const origInputRender = (TextInput as unknown as { render: Function }).render;
(TextInput as unknown as { render: Function }).render = function (props: Record<string, unknown>, ref: unknown) {
  try {
    const newProps = {
      ...props,
      style: [{ fontFamily: FONT_FAMILY }, props.style],
    };
    return origInputRender.call(this, newProps, ref);
  } catch {
    return origInputRender.call(this, props, ref);
  }
};

function FreezeSaveModalGate() {
  const pending = useEconomyStore((s) => s.pendingFreezeSaveAck);
  const dismiss = useEconomyStore((s) => s.dismissFreezeSaveAck);
  return <StreakFreezeSaveModal visible={pending} onDismiss={dismiss} />;
}

function StreakRepairModalGate() {
  const pending = useEconomyStore((s) => s.pendingRepairOffer);
  const dismiss = useEconomyStore((s) => s.dismissRepairOffer);
  return <StreakRepairModal visible={pending} onDismiss={dismiss} />;
}

export default function RootLayout() {
  useGoogleAuth();
  
  const [fontsLoaded] = useFonts({
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_600SemiBold,
    Heebo_700Bold,
    Heebo_800ExtraBold,
    Heebo_900Black,
  });


  useNotificationSetup();
  const { visible: aiVisible, dismiss: aiDismiss, navigate: aiNavigate, message: aiMessage } = useAIInsightBanner();
  const upgradeNudge = useUpgradeNudgeBanner();

  // ── Session time tracking: foreground/background events ──
  const foregroundEnteredAt = useRef<number | null>(Date.now());
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        foregroundEnteredAt.current = Date.now();
      } else if (state === "background" || state === "inactive") {
        if (foregroundEnteredAt.current !== null) {
          const secs = Math.round((Date.now() - foregroundEnteredAt.current) / 1000);
          foregroundEnteredAt.current = null;
          useUserStatsStore.getState().addSessionSeconds(secs);
        }
      }
    });
    return () => sub.remove();
  }, []);

  // ── iOS audio session: allow sounds even when device is on Silent ──
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
      shouldPlayInBackground: false,
    }).catch(() => { /* fail silently, not supported on web / older OS */ });
  }, []);

  // ── Google Mobile Ads init (iOS requires explicit initialize before ads load) ──
  // On iOS we MUST request App Tracking Transparency permission first — Apple
  // rejects ad-supported apps that load AdMob without prompting (Guideline 5.1.2).
  // The user's choice (granted/denied/restricted) flows into AdMob's RequestConfiguration
  // automatically via the SDK's IDFA reads. We just need to ask before init.
  useEffect(() => {
    if (Platform.OS === "web") return;
    (async () => {
      let attGranted = false;
      if (Platform.OS === "ios") {
        try {
          const { requestTrackingPermissionsAsync } = await import("expo-tracking-transparency");
          const { status } = await requestTrackingPermissionsAsync();
          attGranted = status === "granted";
        } catch { /* native module unavailable in Expo Go / pre-prebuild */ }
      } else {
        // Android has no ATT — FB SDK can collect IDFA-equivalent freely
        attGranted = true;
      }
      // Facebook SDK — must initialize AFTER ATT so iOS users who denied
      // tracking aren't profiled. setAdvertiserTrackingEnabled(false) on deny
      // gates the AAID/IDFA from the FB native bridge.
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Settings } = require("react-native-fbsdk-next");
        if (Platform.OS === "ios") {
          await Settings.setAdvertiserTrackingEnabled(attGranted);
        }
        Settings.initializeSDK();
      } catch { /* SDK not available in dev without native build */ }
      try {
        const { default: mobileAds } = require("react-native-google-mobile-ads") as {
          default: () => { initialize(): Promise<unknown> };
        };
        mobileAds().initialize().catch(() => {});
      } catch { /* SDK not available in dev without native build */ }
    })();
  }, []);

  // ── RevenueCat init ──
  useEffect(() => {
    configureRevenueCat();
  }, []);

  // Sync RevenueCat when user logs in
  const userEmail = useAuthStore((s) => s.email);
  useEffect(() => {
    if (!userEmail) return;
    loginRevenueCat(userEmail).catch(() => {});
    useSubscriptionStore.getState().syncWithRevenueCat();
    const unsub = useSubscriptionStore.getState().startRevenueCatListener();
    return unsub;
  }, [userEmail]);

  // Award daily login XP on app open
  useEffect(() => {
    useEconomyStore.getState().awardLoginBonus();
    // Stacking session bonus — coins for repeat returns within the same day.
    // Tiered: 1h=50, 2h=120, 4h=300, 8h=800, 12h+=2000. Surfaces as banner via
    // pendingSessionBonus state (consumed wherever the UI wants to show it).
    useEconomyStore.getState().awardSessionStackingBonus();
  }, []);

  // Reset Shark CTA session tokens on cold start (so BridgeCTA / ReferralCTA can fire once per session)
  useEffect(() => {
    // Dynamic import to avoid pulling the store into the critical boot path
    import("../src/stores/useNudgeQueueStore")
      .then(({ useNudgeQueueStore }) => useNudgeQueueStore.getState().resetSession())
      .catch(() => { /* non-fatal */ });
  }, []);

  // Bandit A/B testing: hydrate global alpha/beta from Neon on cold start, then
  // refresh every 5 minutes while in foreground so each user sees near-current
  // population-level data. Falls back silently to local Zustand cache on failure.
  // Pauses while the app is backgrounded and re-fetches once on resume so we
  // never burn battery polling Neon while the user can't see the result.
  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const hydrate = () => {
      import("../src/features/bandit/useBanditStore")
        .then(({ useBanditStore }) => {
          if (!cancelled) useBanditStore.getState().hydrateFromServer();
        })
        .catch(() => { /* non-fatal */ });
    };

    const start = () => {
      if (interval !== null) return;
      hydrate();
      interval = setInterval(hydrate, 5 * 60 * 1000);
    };

    const stop = () => {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    };

    if (AppState.currentState === "active") start();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") start();
      else stop();
    });

    return () => {
      cancelled = true;
      stop();
      sub.remove();
    };
  }, []);

  // Global JS error handler, prevents uncaught exceptions in gesture/callback
  // code from terminating the app. This was Apple rejection 2.1(a) cause on
  // iPad Air M3 review — a callback threw, Hermes re-threw as C++ exception,
  // process aborted. Swallowing non-fatal errors keeps the app alive.
  useEffect(() => {
    const anyGlobal = globalThis as unknown as {
      ErrorUtils?: {
        getGlobalHandler?: () => ((e: unknown, fatal?: boolean) => void) | undefined;
        setGlobalHandler?: (h: (e: unknown, fatal?: boolean) => void) => void;
      };
    };
    const utils = anyGlobal.ErrorUtils;
    if (!utils?.setGlobalHandler) return;
    const originalHandler = utils.getGlobalHandler?.();
    utils.setGlobalHandler((error, isFatal) => {
      const msg = (error as { message?: string } | null)?.message ?? String(error);
      console.warn("[GlobalErrorHandler] uncaught:", msg, "fatal:", isFatal);
      // In dev only: forward fatal errors so the dev overlay appears.
      // In production: swallow entirely — Sentry captures via its own beforeSend hook;
      // forwarding causes re-throw → abort() in Hermes gesture callbacks (2.1(a)).
      if (__DEV__ && isFatal && originalHandler) originalHandler(error, isFatal);
    });
  }, []);
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const hasSeenWalkthrough = useTutorialStore((s) => s.hasSeenAppWalkthrough);

  // ── Android Play Install Referrer — runs once on first launch ──
  // When a user clicks finplay.me/invite/CODE and installs from the Play Store,
  // Google passes the `referrer` param to the app on first open. We read it here,
  // extract the code, and write it to the pending key so the post-signup hook below
  // picks it up after onboarding — no manual code entry needed on Android.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const INSTALL_REFERRER_CHECKED = 'install_referrer_checked_v1';
    (async () => {
      try {
        const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
        const alreadyChecked = await AsyncStorage.getItem(INSTALL_REFERRER_CHECKED);
        if (alreadyChecked) return;
        await AsyncStorage.setItem(INSTALL_REFERRER_CHECKED, '1');
        const { PlayInstallReferrer } = await import('react-native-play-install-referrer');
        PlayInstallReferrer.getInstallReferrerInfo(async (info, error) => {
          if (error || !info?.installReferrer) return;
          const match = /invite_code=([A-Z0-9-]{4,12})/i.exec(info.installReferrer);
          const code = match?.[1]?.toUpperCase();
          if (!code) return;
          const existing = await AsyncStorage.getItem('pending_referral_code_v1');
          if (!existing) {
            await AsyncStorage.setItem('pending_referral_code_v1', code);
          }
        });
      } catch { /* non-fatal */ }
    })();
  }, []);

  // ── Post-signup referral redemption ──
  // If a deep link from finplay.me/invite/[code] saved a code in AsyncStorage
  // BEFORE the user signed up, redeem it now that they're authenticated +
  // onboarded. Single attempt — clears the pending key on success or
  // failure so we don't loop.
  useEffect(() => {
    if (!userEmail || !hasCompletedOnboarding) return;
    let cancelled = false;
    (async () => {
      try {
        const [{ default: AsyncStorage }, syncRef, screenMod] = await Promise.all([
          import('@react-native-async-storage/async-storage'),
          import('../src/db/sync/syncReferral'),
          import('../src/features/social/InviteRedemptionScreen'),
        ]);
        if (cancelled) return;
        const pending = await AsyncStorage.getItem(screenMod.PENDING_REFERRAL_STORAGE_KEY);
        if (!pending) return;
        const result = await syncRef.redeemReferralCode(pending, userEmail);
        await AsyncStorage.removeItem(screenMod.PENDING_REFERRAL_STORAGE_KEY);
        if (cancelled) return;
        if (result) {
          try { useEconomyStore.getState().addCoins(result.bonusGranted); } catch { /* non-fatal */ }
        }
      } catch { /* non-fatal — deep link redeem will be retried next launch if user re-enters via link */ }
    })();
    return () => { cancelled = true; };
  }, [userEmail, hasCompletedOnboarding]);

  const [hydrated, setHydrated] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (!navState?.key || !hydrated) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";
    // Allow content routes (chapter, lesson, simulator, shop) without redirecting
    const inContentRoute = [
      "chapter", "lesson", "simulator", "shop", "pricing",
      "trading-hub", "bridge", "clash",
      "duels", "squads", "referral", "invite", "fantasy", "assets", "assets-market", "finfeed",
      "scenario-lab", "suggest-scenario", "graham-personality", "legal", "settings",
      "pizza-index", "accessibility-statement", "fire-calculator",
      "tower-defense-boss", "interstitial", "ai-insights", "saved-items",
    ].includes(segments[0] as string);

    if (!isAuthenticated) {
      // Go to onboarding intro (welcome screen with register/guest options)
      const currentPath = segments.join("/");
      if (currentPath !== "(auth)/onboarding" && currentPath !== "register" && currentPath !== "(auth)/register" && currentPath !== "(auth)/terms" && currentPath !== "(auth)/sign-in" && currentPath !== "oauthredirect") {
        router.replace("/(auth)/onboarding");
      }
    } else if (!hasCompletedOnboarding) {
      if (segments.join("/") !== "(auth)/onboarding") {
        router.replace("/(auth)/onboarding");
      }
    } else {
      // Still redirect out of (auth)/onboarding after completion, but allow
      // other auth routes (register, sign-in, terms) for already-authenticated
      // guests who want to upgrade to a real account.
      const onAuthOnboarding = inAuthGroup && (segments as string[])[1] === "onboarding";
      if (onAuthOnboarding || (!inTabsGroup && !inContentRoute && !inAuthGroup)) {
        router.replace("/(tabs)");
      }
    }
  }, [isAuthenticated, hasCompletedOnboarding, segments, navState?.key, hydrated]);

  if (!hydrated || !navState?.key || !fontsLoaded) {
    return <LoadingWisdom />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GlobalErrorBoundary>
        <RewardAnimationProvider>
            <StreakCelebrationProvider>
              <Slot />
              {isAuthenticated && hasCompletedOnboarding && <AppWalkthroughOverlay />}
              <ShopModal />
              <GlobalUpgradeModal />
              <PostStreakIncomeSplash />
              <WisdomPopupCard />
              <GlobalQuestCompletionModal />
              <DailyBridgeNudgeModal />
              <InviteFriendsNudgeModal />
              {hasCompletedOnboarding && hasSeenWalkthrough && <GuestRegisterDailyNudge />}
              {/* Global top banners — suppressed during onboarding/tutorial to avoid distracting the first-run experience */}
              {hasCompletedOnboarding && hasSeenWalkthrough && (
                <>
                  <NetworkStatusBanner />
                  <LevelUpBanner />
                  <NotificationBanner
                    visible={aiVisible}
                    message={aiMessage}
                    actionLabel="לראות"
                    onAction={aiNavigate}
                    onDismiss={aiDismiss}
                    imageSource={require('../assets/webp/fin-happy.webp')}
                    duration={6000}
                  />
                  <NotificationBanner
                    visible={upgradeNudge.visible}
                    message={upgradeNudge.copy?.body ?? ''}
                    actionLabel="שדרג"
                    onAction={upgradeNudge.navigate}
                    onDismiss={upgradeNudge.dismiss}
                    imageSource={require('../assets/webp/fin-happy.webp')}
                    duration={7000}
                  />
                </>
              )}
              <FreezeSaveModalGate />
              <StreakRepairModalGate />
            </StreakCelebrationProvider>
        </RewardAnimationProvider>
      </GlobalErrorBoundary>
      {splashVisible && <AppIntroSplash onDismiss={() => setSplashVisible(false)} />}
    </GestureHandlerRootView>
  );
}
