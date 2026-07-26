import "../global.css";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/lib/queryClient';
import { initSentry } from "../src/lib/sentry";
import { initPostHog, getPostHogClient, captureScreen, captureEvent, captureLaunchAttribution } from "../src/lib/posthog";
import { PostHogProvider } from "posthog-react-native";
import { I18nManager } from "react-native";
import { enableFreeze } from "react-native-screens";

// PERF (user review 14.7: "תגובה איטית בניווט"): freeze screens that are not
// on top of the stack. Biggest win — during a lesson, every XP/coin store
// write used to re-render the whole learn map sitting beneath it. All the
// always-on hooks (push scheduler, streak tick, tomorrow-chest host) live in
// THIS root layout, outside any freezable screen, so they are unaffected.
enableFreeze(true);

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
// Best-effort: capture utm_* from a tracked launch deep-link as person props
// (board 2026-06-18: 100% installs "Unknown"). No-op for organic launches.
void captureLaunchAttribution();

import { Stack, useRouter, useSegments, useRootNavigationState, usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, Platform, Text, TextInput } from "react-native";
import { useUserStatsUIStore } from "../src/features/user-stats/useUserStatsUIStore";
import { useDailyQuestsStore } from "../src/features/daily-quests/useDailyQuestsStore";
import { recordSessionTime as apiRecordSessionTime } from "../src/lib/api/userStats";
import { userStatsQueryKey } from "../src/features/user-stats/useUserStats";
import { setAudioModeAsync } from "expo-audio";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { GlobalEnergyDepletedModal } from "../src/features/subscription/HeartsUI";
import { useHeartsStore } from "../src/features/subscription/useHeartsStore";
import { useIsPro } from "../src/features/subscription/useSubscription";
import { KeyboardProvider } from "react-native-keyboard-controller";
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
import { useEconomyUIStore } from "../src/features/economy/useEconomyUIStore";
import { useStreakDailyTick } from "../src/features/economy/useStreak";
import { setOnUnauthorized } from "../src/lib/api/client";
import { signOut as lifecycleSignOut, bootFromToken } from "../src/lib/auth/lifecycle";
import { startAppStateListener } from "../src/lib/auth/appStateListener";

setOnUnauthorized(() => {
  lifecycleSignOut().catch(() => { /* swallow */ });
});

// Dev-only: auto-grant PRO subscription + refill hearts so dev iteration
// isn't blocked by paywall/hearts-out. Removed in production builds.
if (__DEV__) {
  // Yoav 18/06: testing the FREE energy experience — force NON-Pro in dev so the
  // out-of-energy + upgrade-to-Pro flow is reachable. Flip to isPro:true to test Pro.
  queryClient.setQueryData(['subscription'], { isPro: false, proExpiresAt: null });
  // Refill hearts on cold start
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useHeartsStore, MAX_HEARTS } = require('../src/features/subscription/useHeartsStore');
    useHeartsStore.setState({ hearts: MAX_HEARTS, lastLostAt: null });
  } catch { /* swallow */ }
}
import { RewardAnimationProvider } from "../src/hooks/useRewardAnimation";
import { EnergyAnimationProvider } from "../src/features/energy/EnergyAnimationProvider";
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
import { GlobalCrowdQuestionGate } from "../src/components/ui/GlobalCrowdQuestionGate";
import { PostWalkthroughRegisterCTAGate } from "../src/features/auth/PostWalkthroughRegisterCTA";
import { PostWalkthroughProTeaserGate } from "../src/features/subscription/PostWalkthroughProTeaser";
import { PostWalkthroughFirstChestGate } from "../src/features/onboarding/PostWalkthroughFirstChest";
import { NotificationPermissionPrompt } from "../src/features/notifications/NotificationPermissionPrompt";
import { Day0ExitRitualHost } from "../src/features/retention-loops/Day0ExitRitualHost";
import { TomorrowChestReadyHost } from "../src/features/retention-loops/TomorrowChestReadyHost";
import { PredictionResultsHost } from "../src/features/crowd-wisdom/PredictionResultsHost";
import { GuestValueGateHost } from "../src/features/auth/guestValueGate";
import { ForceUpdateGate } from "../src/features/force-update/ForceUpdateGate";
import { ensureFirstRunAssignment, MODULE_FIRST_ENABLED } from "../src/features/onboarding/firstRunExperiment";
import { TermsReconsentGate } from "../src/features/legal/TermsReconsentGate";
import { configureRevenueCat } from "../src/services/revenueCat";
import { AppWalkthroughOverlay } from "../src/features/onboarding/AppWalkthroughOverlay";
import { StreakFreezeSaveModal } from "../src/features/streak/StreakFreezeSaveModal";
import {
  ComebackRewardModal,
  COMEBACK_COINS,
} from "../src/features/retention-loops/ComebackRewardModal";
import { useComebackRewardStore } from "../src/features/retention-loops/useComebackRewardStore";
import { SharkSkinsGate } from "../src/features/retention-loops/SharkSkinsGate";
import { useStreakSkinWatcher } from "../src/features/retention-loops/useStreakSkinWatcher";
import { StreakRepairModal } from "../src/features/streak/StreakRepairModal";
import { useTutorialStore } from "../src/stores/useTutorialStore";
import { useGoogleAuth } from "../src/features/auth/useGoogleAuth";
import { useIsModuleCompleted } from "../src/features/chapter-1-content/useProgress";

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
  const pending = useEconomyUIStore((s) => s.pendingFreezeSaveAck);
  const dismiss = useEconomyUIStore((s) => s.dismissFreezeSaveAck);
  return <StreakFreezeSaveModal visible={pending} onDismiss={dismiss} />;
}

function StreakRepairModalGate() {
  const pending = useEconomyUIStore((s) => s.pendingRepairOffer);
  const dismiss = useEconomyUIStore((s) => s.dismissRepairOffer);
  return <StreakRepairModal visible={pending} onDismiss={dismiss} />;
}

/** R8 T3.2 — Comeback Reward gate. Reads `pendingClaim` from the
 *  store (set by the boot hook below on lapse detection); on claim,
 *  credits the user +200 coins + 1 streak freeze and clears the flag. */
function ComebackRewardGate() {
  const pendingClaim = useComebackRewardStore((s) => s.pendingClaim);
  const lapsedDays = useComebackRewardStore((s) => s.lapsedDays);
  const claim = useComebackRewardStore((s) => s.claim);
  const claimAndStamp = useComebackRewardStore((s) => s.claimAndStamp);
  const addCoins = useEconomyUIStore((s) => s.addCoins);
  const addStreakFreezes = useEconomyUIStore((s) => s.addStreakFreezes);
  return (
    <ComebackRewardModal
      visible={pendingClaim}
      lapsedDays={lapsedDays}
      onClaim={() => {
        // Credit FIRST, then settle. If the app dies between these calls
        // the lapse stays owed (lastSeenAt un-advanced) and is re-offered
        // next boot — never silently lost.
        try { addCoins(COMEBACK_COINS, 'comeback'); } catch { /* non-fatal */ }
        try { addStreakFreezes(1); } catch { /* non-fatal */ }
        claimAndStamp(Date.now());
      }}
      // Defer ("maybe later") — hides for this session, re-offered next boot.
      onDismiss={() => { claim(); }}
    />
  );
}

function RootLayoutInner() {
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

  // R8 T3.2 — Comeback Reward boot hook. Stamps `lastSeenAt` on every
  // foreground; if the gap crosses 7 days, queues a pending claim that
  // ComebackRewardGate surfaces on the next interactive paint. Runs
  // exactly once per mount — the foreground watcher below handles
  // subsequent re-opens within the same RN process.
  useEffect(() => {
    try {
      useComebackRewardStore.getState().registerAppOpen(Date.now());
    } catch { /* non-fatal */ }
  }, []);

  // R8 T3.5 — Captain Shark cosmetics watcher. Detects the 7-day
  // streak crossing (unlock Gold + Fire) and streak breaks (revert
  // to Classic + queue the lost-skin reveal). Idempotent on every
  // streak change.
  useStreakSkinWatcher();

  // ── Session time tracking: foreground/background events ──
  const foregroundEnteredAt = useRef<number | null>(Date.now());
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        foregroundEnteredAt.current = Date.now();
        // Foreground crossing midnight Israel-time: re-run the lazy day-key
        // check inside the quests store so the 4 stars + chest reset
        // immediately on resume, not on the next time the user navigates to
        // DuoLearnScreen. refreshQuests() is idempotent same-day.
        try { useDailyQuestsStore.getState().refreshQuests(); } catch { /* non-fatal */ }
        // R8 T3.2 — re-check comeback lapse on every foreground (covers
        // the "phone left charging for 8 days" pattern where the app is
        // still in memory but the lapse window has elapsed).
        try { useComebackRewardStore.getState().registerAppOpen(Date.now()); } catch { /* non-fatal */ }
      } else if (state === "background" || state === "inactive") {
        if (foregroundEnteredAt.current !== null) {
          const secs = Math.round((Date.now() - foregroundEnteredAt.current) / 1000);
          foregroundEnteredAt.current = null;
          useUserStatsUIStore.getState().addSessionSeconds(secs);
          apiRecordSessionTime(secs)
            .then(() => queryClient.invalidateQueries({ queryKey: userStatsQueryKey }))
            .catch(() => { /* fire-and-forget */ });
        }
      }
    });
    return () => sub.remove();
  }, []);

  // ── Foreground refetch: invalidate queries after 5min background ──
  useEffect(() => {
    const stop = startAppStateListener();
    return stop;
  }, []);

  // ── iOS audio session: allow sounds even when device is on Silent ──
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
      shouldPlayInBackground: false,
      // Force media playback (intro / module narration) onto the MAIN speaker.
      // allowsRecording:false keeps the category at .playback — never
      // .playAndRecord, which iOS routes to the quiet earpiece. The explicit
      // shouldRouteThroughEarpiece:false is a belt-and-suspenders default in
      // case anything flips the category (Yoav 2026-06-26: Captain Shark's
      // narration was coming out the small top speaker, not the loud bottom one).
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => { /* fail silently, not supported on web / older OS */ });
  }, []);

  // ── Google Mobile Ads init (iOS requires explicit initialize before ads load) ──
  // On iOS we MUST request App Tracking Transparency permission first — Apple
  // rejects ad-supported apps that load AdMob without prompting (Guideline 5.1.2).
  // The user's choice (granted/denied/restricted) flows into AdMob's RequestConfiguration
  // automatically via the SDK's IDFA reads. We just need to ask before init.
  //
  // Deferred until AFTER onboarding (ים 2026-07-02): the ATT dialog used to pop
  // at root mount — on top of the welcome screen, the funnel's most fragile
  // moment (74.5% pass post-26.6). Existing users (flag already true) still get
  // the exact old behavior: init on first mount. New users get ATT + the ads/FB
  // SDKs only when hasCompletedOnboarding flips, i.e. entering mod-0-1. Ads are
  // not needed earlier (rewarded ads / ad-bonus are all post-onboarding
  // surfaces). Tradeoff, deliberate: FB install-attribution now only logs users
  // who finish onboarding.
  const adsInitRanRef = useRef(false);
  const hasOnboardedForAds = useAuthStore((s) => s.hasCompletedOnboarding);
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!hasOnboardedForAds || adsInitRanRef.current) return;
    adsInitRanRef.current = true;
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
          default: () => {
            initialize(): Promise<unknown>;
            setAppMuted(muted: boolean): void;
            setAppVolume(volume: number): void;
          };
        };
        const ads = mobileAds();
        ads.initialize()
          .then(() => {
            // Open the useRewardedAd init gate FIRST — any ad consumer that
            // mounted during startup deferred its load (setAppMuted before init
            // throws a native FATAL on play-services-ads 25+); this flushes it.
            try {
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              const { markAdsInitialized } = require("../src/hooks/useRewardedAd");
              markAdsInitialized();
            } catch { /* hook module unavailable in dev without native build */ }
            // Start fully muted. Ad audio is unmuted only for the brief window
            // of an explicitly user-initiated rewarded show() (useRewardedAd).
            // Prevents iOS from leaking a preloaded video ad's audio in the
            // background under the Playback audio session.
            try { ads.setAppMuted(true); ads.setAppVolume(0); } catch { /* older SDK */ }
          })
          .catch(() => {});
      } catch { /* SDK not available in dev without native build */ }
    })();
  }, [hasOnboardedForAds]);

  // ── RevenueCat init ──
  useEffect(() => {
    configureRevenueCat();
  }, []);

  // Mirror PRO status into the energy store so EVERY energy mutation is inert
  // for Pro (Yoav 18/06: "למשתמש שהוא פרו לא צריך לרדת/להוסיף אנרגיה בכלל").
  // useHeart already skips via its param, but grantEnergy/combo/practice/restore
  // didn't — so Pro users still gained combo energy + a gain animation. The
  // store-level mirror short-circuits all of them.
  const isProForEnergy = useIsPro();
  useEffect(() => {
    try { useHeartsStore.getState().setIsPro(isProForEnergy); } catch { /* non-fatal */ }
  }, [isProForEnergy]);

  // DEV-only web pro override removed: subscription tier is now server-driven
  // via useSubscription() / React Query. Dev accounts that need Pro access
  // should be whitelisted server-side (see syncRevenueCatToServer in lifecycle.ts).

  const userEmail = useAuthStore((s) => s.email);

  // Award daily login XP on app open
  useEffect(() => {
    useEconomyUIStore.getState().awardLoginBonus();
    // Stacking session bonus — coins for repeat returns within the same day.
    // Tiered: 1h=50, 2h=120, 4h=300, 8h=800, 12h+=2000. Surfaces as banner via
    // pendingSessionBonus state (consumed wherever the UI wants to show it).
    useEconomyUIStore.getState().awardSessionStackingBonus();
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
  const pendingPostWalkthroughFirstChest = useTutorialStore((s) => s.pendingPostWalkthroughFirstChest);
  // Interrupt cadence (updated 2026-05-27 redesign):
  //   A welcome chest lands before the tour; the tour then enters mod-0-1.
  //   Mod-0-1 remains clean: no extra popup competes with first learning.
  //   After walkthrough → notification permission banner.
  //   mod-0-2 onwards: engagement content (SharkLove/DoN/Netflix prompt/videos) allowed,
  //                    plus profile questions and (for guests) register CTAs.
  //   Post-walkthrough register CTA (PostWalkthroughRegisterCTAGate) is the
  //   only global nudge for guests; per-module CTAs from LessonFlowScreen
  //   handle 0-3/4/5. Old dark-themed GuestRegisterDailyNudge removed
  //   2026-05-30 — it duplicated the post-walkthrough CTA.
  const isMod01Complete = useIsModuleCompleted("mod-0-1");
  // The walkthrough overlay also activates when the user explicitly opts
  // in via the topic-tree Mod01WalkthroughPromptModal (before mod-0-1 is
  // fully completed). See the AppWalkthroughOverlay gate below.
  const walkthroughTriggered = useTutorialStore((s) => s.walkthroughTriggered);
  // Module-first first-run experiment (onboarding_module_first, Yoav 5.7.26).
  // The redirect guard below must let a v1 guest INTO /lesson/mod-0-1 before
  // onboarding completes — and resume a killed app back into it.
  const firstRunArm = useTutorialStore((s) => s.firstRunArm);
  const firstRunStage = useTutorialStore((s) => s.firstRunStage);
  const allowAutoPopups = hasCompletedOnboarding && hasSeenWalkthrough && isMod01Complete;

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
  // onboarded. The pending key is cleared ONLY on a FINAL outcome (success /
  // ALREADY_REDEEMED / SELF_REFERRAL / CODE_NOT_FOUND / invalid) — a transient
  // failure (network, 5xx, or the REFEREE_NOT_FOUND race against user-row
  // creation) keeps the key so the next launch retries, capped by an attempt
  // counter so a permanently-stuck code doesn't retry forever.
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
        // Auto-register this user's OWN referral code server-side (Yoav 8.7):
        // registration used to run ONLY on ReferralScreen mount, so just
        // 12/1094 users had a resolvable code — every other shared invite
        // died with CODE_NOT_FOUND at redeem. Fire-and-forget + idempotent.
        try {
          const { useReferralStore } = await import('../src/features/social/useReferralStore');
          void useReferralStore.getState().registerCodeWithServer(userEmail);
        } catch { /* non-fatal */ }
        const PENDING_KEY = screenMod.PENDING_REFERRAL_STORAGE_KEY;
        const ATTEMPTS_KEY = screenMod.PENDING_REFERRAL_ATTEMPTS_STORAGE_KEY;
        const MAX_ATTEMPTS = 5;
        const pending = await AsyncStorage.getItem(PENDING_KEY);
        if (!pending) return;
        const attempts = Number(await AsyncStorage.getItem(ATTEMPTS_KEY)) || 0;
        if (attempts >= MAX_ATTEMPTS) {
          // Transient failures never resolved across MAX_ATTEMPTS launches —
          // give up so we don't hit the server on every open forever.
          await AsyncStorage.multiRemove([PENDING_KEY, ATTEMPTS_KEY]);
          try { captureEvent('referral_redeem_failed', { source: 'pending_hook', reason: 'MAX_ATTEMPTS', invite_code: pending, attempt: attempts }); } catch { /* non-fatal */ }
          return;
        }
        try { captureEvent('referral_redeem_attempted', { source: 'pending_hook', invite_code: pending, attempt: attempts + 1 }); } catch { /* non-fatal */ }
        const result = await syncRef.redeemReferralCode(pending, userEmail);
        if (result.ok) {
          await AsyncStorage.multiRemove([PENDING_KEY, ATTEMPTS_KEY]);
          try { captureEvent('referral_redeem_succeeded', { source: 'pending_hook', invite_code: pending, bonus_granted: result.bonusGranted }); } catch { /* non-fatal */ }
          if (!cancelled) {
            try { useEconomyUIStore.getState().addCoins(result.bonusGranted, 'referral-signup-bonus'); } catch { /* non-fatal */ }
          }
        } else if (result.final) {
          // Permanent rejection — retrying can never succeed. Clear and stop.
          await AsyncStorage.multiRemove([PENDING_KEY, ATTEMPTS_KEY]);
          try { captureEvent('referral_redeem_failed', { source: 'pending_hook', reason: result.reason, final: true, invite_code: pending }); } catch { /* non-fatal */ }
        } else {
          // Transient — keep the pending code, bump the counter, retry next launch.
          await AsyncStorage.setItem(ATTEMPTS_KEY, String(attempts + 1));
          try { captureEvent('referral_redeem_failed', { source: 'pending_hook', reason: result.reason, final: false, invite_code: pending, attempt: attempts + 1 }); } catch { /* non-fatal */ }
        }
      } catch { /* non-fatal — pending key survives, redeem retries next launch */ }
    })();
    return () => { cancelled = true; };
  }, [userEmail, hasCompletedOnboarding]);

  const [hydrated, setHydrated] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  // Cold-launch boot: attempt to restore session from stored JWT before rendering routes
  useEffect(() => {
    bootFromToken().finally(() => {
      // The module-first experiment is DEAD (ca38fda2 — guardrail smashed).
      // Its boot gate used to AWAIT auth+tutorial store rehydration here before
      // rendering any route; that unbounded wait shipped only in the 1.4.3
      // binary and is the prime suspect for 1.4.3's first-screen deficit
      // (welcome CTA 61% vs 79% on 1.4.2 — cohort 5-7.7, n=104/33, ~3σ): every
      // ms added before a FRESH install's first paint bleeds first-tap users.
      // Boot no longer blocks on hydration (Yoav 2026-07-08, pre-1.4.4). The
      // assignment call stays as a harmless flag-off no-op; a revived first-run
      // experiment MUST use a bounded (timeout-raced) wait instead.
      try { ensureFirstRunAssignment(); } catch { /* non-fatal */ }
      setBootComplete(true);
    });
  }, []);

  // Daily streak tick — fire `recordDailyActivity` once per Israeli day on app
  // open + foreground. Without this, the streak only advances on lesson/onboarding
  // completion, leaving DAUs who only play arena/feed/trading/quizzes stuck at 0.
  // Server endpoint is idempotent per dateIl; AsyncStorage gate spares the round-trip.
  useStreakDailyTick(hydrated && bootComplete && isAuthenticated);

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
      // Financial Tools hub routes merged from feature/flag — without these
      // every tap in the Tools hub was bounced back to /(tabs) by the auth/
      // onboarding redirect guard below.
      "stock-analyst", "payslip-analyzer", "compound-calculator",
      "salary-net-calculator", "tax-refund-calculator", "mortgage-calculator",
      "pension-fees-comparator", "breaking-news", "coming-soon",
      "net-worth-dashboard", "financial-profile",
      // יומן משקיעים — opened from the Tools hub as its own route. Without this
      // the auth/onboarding guard below bounced it to /(tabs) ~2s after mount
      // (Yoav 2026-07-04: "קורס אחרי 2 שניות ועובר למסך הלמידה"). The learn-map
      // chip is unaffected — it opens the sheet in place, never pushes a route.
      "investors-journal",
      // R6 topic-tree — dedicated per-module chat screen reached from
      // the `chat` topic chip. Without listing it here the redirect
      // guard below bounces the user back to /(tabs) before the screen
      // can paint (Yoav: "בפועל הוא לא מצוביל לצאט").
      "topic-chat",
      // Friends-page social suite (ported from feature/flag) — the friends
      // tab's sub-screens live outside (tabs) and need the same allowance.
      "trade-rooms", "crowd-wisdom", "friends-list", "anon-advice",
      // R7 — dedicated full-screen game route reached from the `game`
      // topic chip; mirror reasoning to topic-chat above.
      "topic-game",
      // Deep-link + post-purchase targets the redirect guard below was
      // bouncing to /(tabs): `quest` is the daily-dilemma push/email CTA
      // target (the P4 retention loop — sent 29.6, was dead on arrival);
      // `pro-welcome` is the post-purchase screen (also carries the returnTo
      // back to the lesson); plus the daily-challenge deep link, the support
      // screen, and the live shark-voice screen.
      "quest", "pro-welcome", "daily-challenge", "support", "shark-voice",
    ].includes(segments[0] as string);

    if (!isAuthenticated) {
      // Go to onboarding intro (welcome screen with register/guest options)
      const currentPath = segments.join("/");
      // Mirror allowedPreOnboardingPaths below — including forgot-password,
      // which an unauthenticated user can reach from the sign-in link and
      // would otherwise be redirected back to onboarding on every render
      // (an infinite ping-pong loop).
      if (
        currentPath !== "(auth)/onboarding"
        && currentPath !== "register"
        && currentPath !== "(auth)/register"
        && currentPath !== "(auth)/terms"
        && currentPath !== "(auth)/sign-in"
        && currentPath !== "(auth)/forgot-password"
        && currentPath !== "oauthredirect"
      ) {
        router.replace("/(auth)/onboarding");
      }
    } else if (!hasCompletedOnboarding) {
      // Module-first first-run (onboarding_module_first v1, Yoav 5.7.26):
      // while the guest is in the 'module' stage, mod-0-1 is the ONE content
      // route allowed pre-onboarding — and a cold start resumes INTO it
      // instead of bouncing to onboarding (which would both strand the run
      // and, worse, loop: the lesson's own exits route by stage). Scoped to
      // exactly `lesson/mod-0-1` so a deep link to any other lesson still
      // bounces and the guest paywall on mod-0-2+ stays intact.
      const moduleFirstInModule =
        MODULE_FIRST_ENABLED && firstRunArm === "module_first" && firstRunStage === "module";
      if (moduleFirstInModule) {
        const onMod01 = segments[0] === "lesson" && (segments as string[])[1] === "mod-0-1";
        if (!onMod01) {
          router.replace("/lesson/mod-0-1?chapterId=chapter-0&startPhase=intro&returnTo=topic-tree" as never);
        }
        return;
      }
      // Allow auth routes (register, sign-in, terms) even before onboarding is
      // complete. The SignupGateStep at the end of the mini-onboarding sends
      // users to /(auth)/register and we do not want to bounce them back.
      const currentPath = segments.join("/");
      const allowedPreOnboardingPaths = [
        "(auth)/onboarding",
        "(auth)/register",
        "(auth)/sign-in",
        "(auth)/terms",
        "(auth)/forgot-password",
        "oauthredirect",
      ];
      if (!allowedPreOnboardingPaths.includes(currentPath)) {
        router.replace("/(auth)/onboarding");
      }
    } else {
      // Still redirect out of (auth)/onboarding after completion, but allow
      // other auth routes (register, sign-in, terms) for already-authenticated
      // guests who want to upgrade to a real account.
      const onAuthOnboarding = inAuthGroup && (segments as string[])[1] === "onboarding";
      if (onAuthOnboarding) {
        // First-time completion: drop directly into mod-0-1 INTRO under
        // topic-tree mode. R7 Epic B1 — after the intro finishes,
        // LessonFlowScreen.replace ('returnTo=topic-tree') bounces the
        // user to /(tabs)/learn with the mod-0-1 accordion expanded so
        // they can see the cards chip glowing as the recommended next
        // step (Yoav: "לאחר האונבורדינג... מובל לאינטרו... לאחר מכן
        // נפתח לו מפת הלמידה של המודולה, שכרטיסיות הלמידה זוהרות").
        // Returning user that already finished mod-0-1 → land on the
        // learn map as before.
        // Keep either first-run ceremony on the map. Redirecting into a lesson
        // while the welcome chest or tour is pending would mount mod-0-1 behind
        // an overlay and bypass its intended sequence.
        const target = (isMod01Complete || walkthroughTriggered || pendingPostWalkthroughFirstChest)
          ? "/(tabs)"
          : "/lesson/mod-0-1?chapterId=chapter-0&startPhase=intro&returnTo=topic-tree";
        router.replace(target as never);
      } else if (!inTabsGroup && !inContentRoute && !inAuthGroup) {
        router.replace("/(tabs)");
      }
    }
  }, [isAuthenticated, hasCompletedOnboarding, segments, navState?.key, hydrated, isMod01Complete, walkthroughTriggered, pendingPostWalkthroughFirstChest, firstRunArm, firstRunStage]);

  // Fallback walkthrough re-arm (Yoav 2026-06-26, D1 lever). Diagnosed: ~38% of
  // users who commit (onboarding_enter_first_module) never fire walkthrough_started
  // — a committed user whose trigger didn't stick (closed before enterFirstModule
  // navigated, or a flag-reset edge) lands on the map with no tour. If an onboarded
  // user is sitting on the map with the walkthrough neither seen nor armed — and
  // hasn't finished mod-0-1 yet (so this NEVER re-fires for established users) —
  // re-arm it so the tour still appears. Scoped to (tabs) so it never pops over a
  // lesson. Fires once: triggerWalkthrough flips walkthroughTriggered → guard goes false.
  useEffect(() => {
    if (!hydrated || !isAuthenticated || !hasCompletedOnboarding) return;
    if (hasSeenWalkthrough || walkthroughTriggered || isMod01Complete || pendingPostWalkthroughFirstChest) return;
    if (segments[0] !== "(tabs)") return;
    try { useTutorialStore.getState().triggerWalkthrough(); } catch { /* non-fatal */ }
  }, [hydrated, isAuthenticated, hasCompletedOnboarding, hasSeenWalkthrough, walkthroughTriggered, isMod01Complete, pendingPostWalkthroughFirstChest, segments]);

  if (!hydrated || !bootComplete || !navState?.key || !fontsLoaded) {
    return <LoadingWisdom />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
      <GlobalErrorBoundary>
        <RewardAnimationProvider>
          <EnergyAnimationProvider>
            <StreakCelebrationProvider>
              {/* Root navigator. Was <Slot/> — which has NO stack, so pushing
                  /lesson/[id] swapped the whole (tabs) tree with no animation
                  and REMOUNTED it on return (the "learn map flashes briefly"
                  artifact). A native Stack keeps (tabs) mounted underneath,
                  slides the sub-module lesson in fast, and pops back without a
                  flash — the premium feel Yoav asked for (2026-06-11). Fast
                  220ms slide; back-gesture on. headerShown:false preserves the
                  existing custom headers. */}
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: "slide_from_right",
                  animationDuration: 220,
                  gestureEnabled: true,
                  contentStyle: { backgroundColor: "transparent" },
                }}
              />
              {/* Yoav 2026-06-11: also mount the walkthrough overlay BEFORE
                  mod-0-1 is fully completed, IF the user has explicitly
                  opted in (walkthroughTriggered=true). The new topic-tree
                  flow fires the prompt after the first non-intro chip,
                  long before 70% completion — the old isMod01Complete
                  gate kept the overlay dark until then, so "התחל סיור"
                  did nothing. AppWalkthroughOverlay's own internal gate
                  (walkthroughTriggered + !hasSeenWalkthrough) keeps it
                  off-screen for non-opted users. */}
              {isAuthenticated && hasCompletedOnboarding && (isMod01Complete || walkthroughTriggered) && <AppWalkthroughOverlay />}
              <ShopModal />
              {allowAutoPopups && <GlobalUpgradeModal />}
              {allowAutoPopups && <PostStreakIncomeSplash />}
              {allowAutoPopups && <WisdomPopupCard />}
              {allowAutoPopups && <GlobalQuestCompletionModal />}
              {/* FRONT-DECLUTTER (Yoav 11.7, data 14d): the daily bridge nudge
                  modal is part of the bridge-push family the data killed (465
                  dismissers vs 3 taps on the banner sibling; RETENTION-PLAN
                  already ruled bridge is an activated-user move, not a day-0
                  push). The bridge lives in its own tab. */}
              {false && <DailyBridgeNudgeModal />}
              <InviteFriendsNudgeModal />
              {/* FRONT-DECLUTTER (Yoav 11.7): crowd-question popup KILLED —
                  6 voters in 14 days for a global interrupt. */}
              {false && allowAutoPopups && <GlobalCrowdQuestionGate />}
              {/* First-chest onboarding moment — shown to every new user before
                  the walkthrough. Tap to open → coins+XP → shark bubble →
                  continue starts the tour, which hands directly into mod-0-1. */}
              <PostWalkthroughFirstChestGate />
              {/* Post-walkthrough register CTA for Guests. The gate handles
                  all conditions internally: pendingPostWalkthroughCTA flag
                  set by AppWalkthroughOverlay on completion + isGuest +
                  pathname check (only on the learn map, not /pricing). */}
              <PostWalkthroughRegisterCTAGate />
              {/* Soft post-walkthrough Pro teaser (non-Pro users). Self-gated:
                  pendingPostWalkthroughProTeaser flag + !isPro + NOT pending the
                  register CTA (never stacks) + learn-map pathname. Restores the
                  paywall_viewed{post_walkthrough} moment without blocking. */}
              <PostWalkthroughProTeaserGate />
              {/* Appointment-setting notification-permission primer. It is
                  self-gated until the learner completes mod-0-1, so the OS ask
                  never competes with the new reward → tour → lesson sequence. */}
              <NotificationPermissionPrompt />
              {/* Day-0 exit ritual "נתראה מחר" + shark wager (RETENTION-PLAN
                  2026-07-02, מוני 50→150 escrow / אודרי GO-with-conditions).
                  Fires once at the end of the first session (mod-0-1 done,
                  first IL-day, all CTA chains cleared); also hosts the
                  next-day win/loss resolution modal. */}
              <Day0ExitRitualHost />
              {/* Tomorrow-chest day-2 landing ceremony (RETENTION-SPRINT
                  2026-07-06): when the sealed chest armed by yesterday's
                  module/welcome chest is ready, runs chest → rewards →
                  "ממשיכים מאיפה שעצרנו" straight into the next lesson.
                  Self-gated: onboarding + walkthrough + (tabs) route + not
                  in-lesson + never over the wager-resolution or the
                  post-walkthrough chain; suppresses the same-day streak
                  daily-nudge so day-2 has ONE landing ritual. */}
              <TomorrowChestReadyHost />
              {/* Credits + announces predictions that settled while away
                  ("צדקתם בזמן שהייתם בחוץ"). Claims once on open; server dedupes. */}
              <PredictionResultsHost />
              {/* Guest value-action register gate (Yoav 2026-07-03 policy):
                  every completed value action → signup gate, 2-min cooldown.
                  Call sites fire requestGuestGate('<trigger>'). */}
              <GuestValueGateHost />
              {/* Force-update gate. Internal fetch decides whether to block
                  based on remote config; rendered AFTER other modals so its
                  full-screen Modal sits on top of every other overlay when
                  active. Gated on hasCompletedOnboarding so a forced-update
                  config can't hard-block users mid-onboarding — the blocking
                  modal was ~4× over-represented among intro-step drop-offs.
                  The gate fires the moment they finish onboarding instead.
                  Same onboarding exemption as TermsReconsentGate below. */}
              {hasCompletedOnboarding && <ForceUpdateGate />}
              {/* Terms re-consent gate. Blocks existing users whose accepted
                  terms version is older than CURRENT_TERMS_VERSION. New users
                  in onboarding flow are exempted (they accept latest on signup).
                  Mounted near the bottom so its fullScreen Modal sits on top. */}
              <TermsReconsentGate />
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
              <ComebackRewardGate />
              <SharkSkinsGate />
              <GlobalEnergyDepletedModal />
            </StreakCelebrationProvider>
          </EnergyAnimationProvider>
        </RewardAnimationProvider>
      </GlobalErrorBoundary>
      {splashVisible && (
        // The splash renders a native expo-video (<VideoView>). On a fresh iOS
        // first-open the OTA-delivered mp4 can lose the asset-resolve race and
        // throw in render — and since this sits OUTSIDE the main
        // GlobalErrorBoundary above (and prod swallows fatal errors), that throw
        // unmounted the tree into a frozen dark screen: the iOS first-open freeze
        // Yoav caught 2026-07-16 (recovered only after a force-quit → 2nd-launch
        // cache hit). Its own boundary now catches that and just dismisses the
        // splash, so the user drops straight to welcome. Video is cosmetic —
        // never let it block the first session.
        <GlobalErrorBoundary
          fallback={() => (
            <SplashDismissOnMount onDismiss={() => setSplashVisible(false)} />
          )}
        >
          <AppIntroSplash onDismiss={() => setSplashVisible(false)} />
        </GlobalErrorBoundary>
      )}
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

/** Failsafe rendered when the cold-start splash's native video throws in
 *  render. Dismisses the splash on mount (one-shot — the whole subtree unmounts
 *  once splashVisible flips false), dropping the user to the welcome screen
 *  instead of a frozen dark screen. See the splash boundary in RootLayout. */
function SplashDismissOnMount({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    onDismiss();
  }, [onDismiss]);
  return null;
}

/**
 * PostHog screen tracker for expo-router. The PostHogProvider's
 * `captureScreens` autocapture relies on a NavigationContainer ref that
 * expo-router doesn't expose — per the SDK docs, the recommended way is to
 * watch `usePathname()` and emit `$screen` manually. Fires one $screen per
 * route change so PostHog's path/funnel/stickiness queries that key off
 * $screen finally have data (was 0 events / 0 users for the past 30 days).
 */
function ScreenTracker(): null {
  const pathname = usePathname();
  const lastSentRef = useRef<string | null>(null);
  useEffect(() => {
    if (!pathname || pathname === lastSentRef.current) return;
    lastSentRef.current = pathname;
    captureScreen(pathname);
  }, [pathname]);
  return null;
}

export default function RootLayout() {
  // Use the singleton client created in initPostHog(); PostHogProvider then
  // exposes it via context to any `usePostHog()` hook in the tree. We set
  // `captureScreens: false` because the SDK's autocapture for that flag
  // requires a NavigationContainer ref (deprecated path) — ScreenTracker
  // above replaces it for expo-router. `captureAppLifecycleEvents` is kept
  // true so Application Opened/Backgrounded keep flowing.
  const phClient = getPostHogClient();
  const tree = (
    <QueryClientProvider client={queryClient}>
      <ScreenTracker />
      <RootLayoutInner />
    </QueryClientProvider>
  );
  if (!phClient) return tree;
  return (
    <PostHogProvider
      client={phClient}
      autocapture={{ captureScreens: false, captureTouches: false }}
    >
      {tree}
    </PostHogProvider>
  );
}
