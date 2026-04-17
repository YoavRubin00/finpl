import "../global.css";
import { initSentry } from "../src/lib/sentry";
import { I18nManager } from "react-native";

// Undo forceRTL that was set by build 30 — it caused layout crashes
// because the app uses manual row-reverse throughout. This explicitly
// resets the persistent iOS setting. Takes effect after next launch.
if (I18nManager.isRTL) {
  try {
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
  } catch { /* ignore — older iOS may throw */ }
}

initSentry();

import { Slot, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput } from "react-native";
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

  // ── iOS audio session: allow sounds even when device is on Silent ──
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
      shouldPlayInBackground: false,
    }).catch(() => { /* fail silently — not supported on web / older OS */ });
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
      "tower-defense-boss", "interstitial",
    ].includes(segments[0] as string);

    if (!isAuthenticated) {
      // Go to onboarding intro (welcome screen with register/guest options)
      const currentPath = segments.join("/");
      if (currentPath !== "(auth)/onboarding" && currentPath !== "register" && currentPath !== "(auth)/register" && currentPath !== "(auth)/terms") {
        router.replace("/(auth)/onboarding");
      }
    } else if (!hasCompletedOnboarding) {
      if (segments.join("/") !== "(auth)/onboarding") {
        router.replace("/(auth)/onboarding");
      }
    } else {
      if (!inTabsGroup && !inContentRoute) router.replace("/(tabs)");
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
            <NetworkStatusBanner />
            <LevelUpBanner />
            <FreezeSaveModalGate />
            <StreakRepairModalGate />
          </StreakCelebrationProvider>
        </RewardAnimationProvider>
      </GlobalErrorBoundary>
    </GestureHandlerRootView>
  );
}
