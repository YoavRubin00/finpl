import "../global.css";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/lib/queryClient';
import { initSentry } from "../src/lib/sentry";
import { initPostHog, getPostHogClient, captureScreen, captureLaunchAttribution } from "../src/lib/posthog";
import { PostHogProvider } from "posthog-react-native";
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
import { ForceUpdateGate } from "../src/features/force-update/ForceUpdateGate";
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
          default: () => {
            initialize(): Promise<unknown>;
            setAppMuted(muted: boolean): void;
            setAppVolume(volume: number): void;
          };
        };
        const ads = mobileAds();
        ads.initialize()
          .then(() => {
            // Start fully muted. Ad audio is unmuted only for the brief window
            // of an explicitly user-initiated rewarded show() (useRewardedAd).
            // Prevents iOS from leaking a preloaded video ad's audio in the
            // background under the Playback audio session.
            try { ads.setAppMuted(true); ads.setAppVolume(0); } catch { /* older SDK */ }
          })
          .catch(() => {});
      } catch { /* SDK not available in dev without native build */ }
    })();
  }, []);

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
  // Interrupt cadence (updated 2026-05-27 redesign):
  //   mod-0-1, clean. Only celebration. No tour, no popups (gated in LessonFlowScreen).
  //   After mod-0-1 lands on tabs → 1s delay → walkthrough fires.
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
          try { useEconomyUIStore.getState().addCoins(result.bonusGranted, 'referral-signup-bonus'); } catch { /* non-fatal */ }
        }
      } catch { /* non-fatal — deep link redeem will be retried next launch if user re-enters via link */ }
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
    bootFromToken().finally(() => setBootComplete(true));
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
      // R6 topic-tree — dedicated per-module chat screen reached from
      // the `chat` topic chip. Without listing it here the redirect
      // guard below bounces the user back to /(tabs) before the screen
      // can paint (Yoav: "בפועל הוא לא מצוביל לצאט").
      "topic-chat",
      // R7 — dedicated full-screen game route reached from the `game`
      // topic chip; mirror reasoning to topic-chat above.
      "topic-game",
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
        const target = isMod01Complete
          ? "/(tabs)"
          : "/lesson/mod-0-1?chapterId=chapter-0&startPhase=intro&returnTo=topic-tree";
        router.replace(target as never);
      } else if (!inTabsGroup && !inContentRoute && !inAuthGroup) {
        router.replace("/(tabs)");
      }
    }
  }, [isAuthenticated, hasCompletedOnboarding, segments, navState?.key, hydrated, isMod01Complete]);

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
              <DailyBridgeNudgeModal />
              <InviteFriendsNudgeModal />
              {allowAutoPopups && <GlobalCrowdQuestionGate />}
              {/* First-chest onboarding moment — shown to EVERY new user the
                  moment the walkthrough completes, BEFORE the register/Pro CTAs
                  (their gates wait on pendingPostWalkthroughFirstChest). Tap to
                  open → coins+XP → shark bubble → המשך hands off to register/Pro. */}
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
              {/* Force-update gate. Mounted unconditionally — internal fetch
                  decides whether to block based on remote config. Rendered
                  AFTER other modals so its full-screen Modal sits on top of
                  every other overlay when active. Self-contained: no boot
                  order changes required, no parent gating. */}
              <ForceUpdateGate />
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
      {splashVisible && <AppIntroSplash onDismiss={() => setSplashVisible(false)} />}
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
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
