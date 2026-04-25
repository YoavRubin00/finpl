import "../global.css";
import { initSentry } from "../src/lib/sentry";
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

initSentry();

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

const origTextRender = (Text as unknown as { render: Function }).render;
(Text as unknown as { render: Function }).render = function (props: Record<string, unknown>, ref: unknown) {
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
};

const origInputRender = (TextInput as unknown as { render: Function }).render;
(TextInput as unknown as { render: Function }).render = function (props: Record<string, unknown>, ref: unknown) {
  const newProps = {
    ...props,
    style: [{ fontFamily: FONT_FAMILY }, props.style],
  };
  return origInputRender.call(this, newProps, ref);
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
  useEffect(() => {
    if (Platform.OS === "web") return;
    try {
      const { default: mobileAds } = require("react-native-google-mobile-ads") as {
        default: () => { initialize(): Promise<unknown> };
      };
      mobileAds().initialize().catch(() => {});
    } catch { /* SDK not available in dev without native build */ }
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
  }, []);

  // Reset Shark CTA session tokens on cold start (so BridgeCTA / ReferralCTA can fire once per session)
  useEffect(() => {
    // Dynamic import to avoid pulling the store into the critical boot path
    import("../src/stores/useNudgeQueueStore")
      .then(({ useNudgeQueueStore }) => useNudgeQueueStore.getState().resetSession())
      .catch(() => { /* non-fatal */ });
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

  const [hydrated, setHydrated] = useState(false);

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
      "duels", "squads", "referral", "fantasy", "assets", "assets-market", "finfeed",
      "scenario-lab", "suggest-scenario", "graham-personality", "legal", "settings",
      "pizza-index", "accessibility-statement", "fire-calculator",
      "tower-defense-boss", "interstitial", "ai-insights", "saved-items",
    ].includes(segments[0] as string);

    if (!isAuthenticated) {
      // Go to onboarding intro (welcome screen with register/guest options)
      const currentPath = segments.join("/");
      if (currentPath !== "(auth)/onboarding" && currentPath !== "register" && currentPath !== "(auth)/register" && currentPath !== "(auth)/terms" && currentPath !== "(auth)/sign-in") {
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
    </GestureHandlerRootView>
  );
}
