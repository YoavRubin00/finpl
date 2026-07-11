import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { Image as ExpoImage } from "expo-image";
import { View, Text, SafeAreaView, ScrollView, StyleSheet, Modal, Pressable, Dimensions, ActivityIndicator, Keyboard, Platform } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { useVideoPlayer, VideoView } from "expo-video";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { useAudioStore } from "../../stores/useAudioStore";
import { useTopicTreeReturnStore } from "../topic-learning/useTopicTreeReturnStore";
import { useTopicProgressStore } from "../topic-learning/useTopicProgressStore";
import { useContinuousRunStore } from "../topic-learning/useContinuousRunStore";
import { resolveTopics, SIM_FIRST_MODULE_IDS, lessonRouteFor } from "../topic-learning/topicResolver";
import type { TopicKind } from "../topic-learning/types";
import { chestThresholdFor, chipsToChestFor } from "../topic-learning/types";
import { ahaLineFor } from "../topic-learning/moduleAhaLines";
import { SharkChipCallout } from "../topic-learning/components/SharkChipCallout";
import { pickContinueCompliment } from "../topic-learning/moduleCompliments";
import { useNudgeQueueStore } from "../../stores/useNudgeQueueStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  runOnJS,
  withRepeat,
  cancelAnimation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight, ChevronLeft, Bookmark } from "lucide-react-native";
import { LottieIcon } from "../../components/ui/LottieIcon";
import { GlobalErrorBoundary } from "../../components/ui/ErrorBoundary";
import { useLessonMusic } from "../../hooks/useLessonMusic";
import { useTimeoutCleanup } from "../../hooks/useTimeoutCleanup";

const LOTTIE_BRIDGE = require("../../../assets/lottie/wired-flat-1925-bridge-hover-pinch.json") as number;
import { chapter0Data } from "../chapter-0-content/chapter0Data";
import { WhatIsMoneyIntro } from "../chapter-0-content/WhatIsMoneyIntro";
import { CompoundInterestIntro } from "./CompoundInterestIntro";
import { ModuleIntroShort } from "./ModuleIntroShort";
import { MODULE_INTRO_CONFIGS } from "./moduleIntroConfigs";
import { chapter1Data } from "./chapter1Data";
import { chapter2Data } from "../chapter-2-content/chapter2Data";
import { chapter3Data } from "../chapter-3-content/chapter3Data";
import { chapter4Data } from "../chapter-4-content/chapter4Data";
import { chapter5Data } from "../chapter-5-content/chapter5Data";
import { useChapterUIStore } from "./useChapterUIStore";
import { useProgress, useUpsertModuleProgress, progressQueryKey, getCompletedModulesSync } from "./useProgress";
import { useLifestyleBreakStore } from "../inter-module-break/useLifestyleBreakStore";
import { pickNextLifestyleVideo, type LifestyleVideoSpec } from "../inter-module-break/lifestyleVideoConfig";
import {
  useEntranceAnimation,
  fadeInUp,
  slideInLeft,
} from "../../utils/animations";

import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { LiquidButton } from "../../components/ui/LiquidButton";
import { RewardPopup } from "../../components/ui/RewardPopup";
import { successHaptic, errorHaptic, heavyHaptic, tapHaptic, mediumHaptic, doubleHeavyHaptic } from "../../utils/haptics";
import { InteractiveIntroCard } from "./InteractiveIntroCard";
import { QuizStartPopup } from "./QuizStartPopup";
import { SimulatorLoader } from "./SimulatorLoader";
import { useAITelemetryStore } from "../ai-personalization/useAITelemetryStore";
import { useEconomy, economyQueryKey } from "../economy/useEconomy";
import { useEconomyUIStore, fireEconomyDelta } from "../economy/useEconomyUIStore";
import { useCompletedModulesStore } from "../economy/useCompletedModulesStore";
import { useStreak, useRecordDailyActivity, markDailyActivityCompleted } from "../economy/useStreak";
import type { Economy } from "../../lib/api/economy";
import { recordModuleDuration as apiRecordModuleDuration } from "../../lib/api/userStats";
import { userStatsQueryKey } from "../user-stats/useUserStats";
import { useWisdomStore } from "../wisdom-flashes/useWisdomStore";
import { useIsPro, subscriptionQueryKey } from "../subscription/useSubscription";
import { useHeartsStore, MAX_ENERGY, isEnergyEnabledForModule } from "../subscription/useHeartsStore";
import { useUsageStore } from "../subscription/useUsageStore";
import { queryClient } from "../../lib/queryClient";
import type { SubscriptionState } from "../../lib/api/subscription";
import { useUpgradeModalStore } from "../../stores/useUpgradeModalStore";
import { PRO_LOCKED_SIMS } from "../../constants/proGates";
import { OutOfHeartsModal } from "../subscription/HeartsUI";
import { GlobalWealthHeader } from "../../components/ui/GlobalWealthHeader";
import { ConfettiExplosion } from "../../components/ui/ConfettiExplosion";
import { EnergyBatteryIcon } from "../../components/ui/EnergyBatteryIcon";
import { ENERGY } from "../energy/energyTheme";
import { SHARK_FULL_CHEER } from "../energy/energyScenes";
import { DoubleOrNothingModal } from "../../components/ui/DoubleOrNothingModal";
import { SharkLoveModal } from "../../components/ui/SharkLoveModal";
import { SharkBridgeCTA, SharkReferralCTA, SharkToolCTA, moduleHasDividendContent } from "../../components/ui/SharkCTAModals";
import { useToolNudgeStore } from "../../features/notifications/useToolNudgeStore";
import { InvestmentCard } from "../daily-challenges/InvestmentCard";
import { CrashGameCard } from "../daily-challenges/CrashGameCard";
import { MythFeedCard } from "../myth-or-tachles/MythFeedCard";
import { useMythStore } from "../myth-or-tachles/useMythStore";
import { DilemmaCard } from "../daily-challenges/DilemmaCard";
import { FomoKillerCard } from "../finfeed/minigames/fomo-killer/FomoKillerCard";
import { BullshitSwipeCard } from "../finfeed/minigames/bullshit-swipe/BullshitSwipeCard";
import { HigherLowerCard } from "../finfeed/minigames/higher-lower/HigherLowerCard";
import { PriceSliderCard } from "../finfeed/minigames/price-slider/PriceSliderCard";
import { BudgetNinjaCard } from "../finfeed/minigames/budget-ninja/BudgetNinjaCard";
import { CashoutRushCard } from "../finfeed/minigames/cashout-rush/CashoutRushCard";
import { getGameForModule } from "../topic-learning/moduleGameMap";
import { MacroEventCard } from "../macro-events/MacroEventCard";
import { macroEventsData } from "../macro-events/macroEventsData";
// Inter-module CONTENT components (Feed-derived; rendered when a module
// declares `interModuleContent` but no `interModuleGame`).
import { PremiumLearningCard } from "../premium-learning/PremiumLearningCard";
import { PREMIUM_LEARNING_ITEMS } from "../premium-learning/data";
import { DidYouKnowCard } from "../did-you-know/DidYouKnowCard";
import { LiveMarketCard } from "../live-market/LiveMarketCard";
import { LiveNewsQuizCard } from "../live-news/LiveNewsQuizCard";
import { TA125WarRecoveryChart } from "../chapter-4-content/components/TA125WarRecoveryChart";
import { FlyingRewards } from "../../components/ui/FlyingRewards";
import { GoldCoinIcon } from "../../components/ui/GoldCoinIcon";
import { SharkLoader } from "../../components/ui/SharkLoader";
import { PopModal } from "../../components/ui/PopModal";
import { useAuthStore } from "../auth/useAuthStore";
import { InModuleProfileQuestion, type ProfileQuestionKind } from "../onboarding/InModuleProfileQuestion";
import { isModuleFirstArm } from "../onboarding/firstRunExperiment";
import { ChestCelebrationModal } from "../topic-learning/ChestCelebrationModal";
import {
  CHEST_RARITY_BONUS,
  MODULE_TT_XP,
  MODULE_TT_COINS,
  CHEST_ENERGY_REWARD,
  type ChestRarity as TTChestRarity,
} from "../topic-learning/types";
import { pearlConfigFor } from "../pearls/pearlConfig";
import { useRewardedAd } from "../../hooks/useRewardedAd";
import { DecorationOverlay } from "../../components/ui/DecorationOverlay";
import { generateChestDrop } from "../retention-loops/chestDrops";
import { useRetentionStore } from "../retention-loops/useRetentionStore";
import { useTomorrowChestStore } from "../retention-loops/useTomorrowChestStore";
import type { ChestRarity, ChestReward } from "../retention-loops/types";
import type { Module, Flashcard, QuizQuestion } from "./types";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import { useAdaptiveStore } from "../social/useAdaptiveStore";
import { useSavedItemsStore } from "../saved-items/useSavedItemsStore";
import { LifelineModal } from "../social/LifelineModal";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { captureEvent } from "../../lib/posthog";
import { track } from "../../lib/analytics/events";
import { PizzaIndexScreen } from "../fun/PizzaIndexScreen";
import { LifelineChatOverlay } from "../social/LifelineChatOverlay";
import { ProBadge } from "../../components/ui/ProBadge";
import LottieView from "lottie-react-native";
import { FINN_HELLO, FINN_STANDARD, FINN_HAPPY, FINN_EMPATHIC, FINN_DANCING, getFinnImage } from "../retention-loops/finnMascotConfig";
import { EnergyStationCard } from "../energy/EnergyStationCard";
import { InteractiveRecallScreen } from "../sentence-exercise/InteractiveRecallScreen";
import { SharkDilemmaCard } from "../shark-dilemma/SharkDilemmaCard";
import { VideoSharkDilemmaCard } from "../shark-dilemma/VideoSharkDilemmaCard";
import { getDilemma } from "../shark-dilemma/dilemmasData";
import { PodcastSegmentScreen } from "../podcast-segment/PodcastSegmentScreen";
import { getPodcastForModule } from "../podcast-segment/podcasts";
import { getCoupleDilemmaForModule } from "../couple-dilemma/coupleDilemmas";
import { CoupleDilemmaScreen } from "../couple-dilemma/CoupleDilemmaScreen";
import { prefetchCoupleDilemmaAsset } from "../couple-dilemma/couple-dilemma-prefetch";

// Small helper that advances phase → summary via useEffect (never during render).
function FallbackToSummary({ setPhase }: { setPhase: (p: "summary") => void }) {
  useEffect(() => { setPhase("summary"); }, [setPhase]);
  return <View style={{ flex: 1, backgroundColor: "#f8fafc" }} />;
}

// Same idea for any phase transition that needs to fire on mount (used by
// the video / mid-quiz-video / post-infographic-video fallbacks). Doing the
// setState in render produces a "Cannot update during render" warning.
function FallbackToPhaseEffect({ run }: { run: () => void }) {
  useEffect(() => { run(); }, [run]);
  return <View style={{ flex: 1, backgroundColor: "#f8fafc" }} />;
}
import { FINN_MEME_REACTIONS } from "../fun/finnJokesData";
import type { FinnAnimationState } from "../retention-loops/finnMascotConfig";
import { FlashcardInfographic, FINN_MAP, INFOGRAPHIC_MAP } from "./FlashcardInfographic";
import { useModulePrefetch, getCachedVideoPath, prefetchModuleAudio } from "../../hooks/useModulePrefetch";
import { GlossaryTooltip } from "../../components/ui/GlossaryTooltip";
import { ChatScreen } from "../chat/ChatScreen";
import type { LessonContext } from "../chat/buildChatPrompt";

const AnimatedExpoImage = Animated.createAnimatedComponent(ExpoImage);

type FlowPhase = "hero" | "intro" | "flashcards" | "podcast" | "couple-dilemma" | "interactive-recall" | "quizzes" | "mid-quiz-video" | "sim-intro" | "sim" | "game" | "module-infographic" | "post-infographic-video" | "shark-dilemma" | "summary" | "video";

/** Active learning sub-modules that cost −1 energy on completion (Yoav 18/06).
 *  Excludes passive phases (intro / video / hero / summary / interstitials /
 *  infographic) — energy is spent only on real activity, not on watching. */
const ACTIVE_SUBMODULE_PHASES: ReadonlySet<FlowPhase> = new Set<FlowPhase>([
  "flashcards", "podcast", "couple-dilemma", "interactive-recall", "quizzes", "sim",
  // Content sub-modules too (Yoav 18/06 — "every sub-module, not just activities").
  // EXCEPT the intro/explainer video — passive content shouldn't cost energy
  // (Yoav 2026-06-22: "האינטרו, וסרטון אינטרו אם יש לא צריכים להוריד אנרגיה").
  // 'intro' + 'hero' were never in this set, so they're already free.
  // 'shark-dilemma' REMOVED (Yoav 2026-06-23: "השארק אף פעם לא לוקח אנרגיה") —
  // the shark must never cost energy (live-voice + shark chat are already free).
  "module-infographic",
]);

/** "למידה רציפה" progress sync (Yoav 2026-06-11): maps a linear FlowPhase
 *  to the topic-tree chip kind it completes, so the continuous flow can
 *  light up the accordion chips as it advances. Mirrors DuoLearnScreen's
 *  phaseToKind. Intentionally OMITS the pre-content / transitional phases
 *  ('hero', 'video', 'sim-intro', 'mid-quiz-video', 'summary') — leaving a
 *  phase OUT means we never falsely credit a chip the user merely passed
 *  through (e.g. the auto-playing hook video before the real intro). */
const TT_PHASE_TO_KIND: Partial<Record<FlowPhase, TopicKind>> = {
  intro: 'intro',
  flashcards: 'cards',
  'interactive-recall': 'recall',
  quizzes: 'quiz',
  sim: 'sim',
  game: 'game',
  'module-infographic': 'infographic',
  'post-infographic-video': 'post-video',
  podcast: 'podcast',
  'couple-dilemma': 'couple-dilemma',
  'shark-dilemma': 'shark-dilemma',
};

// MODULE_HERO_MAP / MODULE_INFOGRAPHIC_MAP / MODULE_POST_VIDEO_MAP were
// extracted to ./moduleAssetMaps.ts (architect P0 pre-release audit
// 2026-06-11) so topic-learning's prefetch hook can import them without
// pulling in this 6k-line module. Re-exported here for back-compat with
// the dozens of internal callsites still importing from this file.
export { MODULE_HERO_MAP, MODULE_INFOGRAPHIC_MAP, MODULE_POST_VIDEO_MAP } from './moduleAssetMaps';
import { MODULE_HERO_MAP, MODULE_INFOGRAPHIC_MAP, MODULE_POST_VIDEO_MAP } from './moduleAssetMaps';

/** Modules that have a playable simulation game.
 *  2026-05-30 chapter-0 swap: BarterPuzzleScreen moved from mod-0-1 to
 *  mod-0-2 (the "מה זה בכלל כסף?" slot). mod-0-1 ("מושגי יסוד פיננסיים")
 *  has no sim — leaving it in this set caused the lesson to enter
 *  sim-intro → sim, then SimulatorLoader returned null → blank screen. */
const MODULES_WITH_SIM = new Set(["mod-0-2", "mod-0-3", "mod-0-4", "mod-1-1", "mod-1-2", "mod-1-3", "mod-1-4", "mod-1-5", "mod-1-6", "mod-1-7", "mod-1-8", "mod-1-9", "mod-2-10", "mod-2-11", "mod-2-12", "mod-2-13", "mod-2-14", "mod-3-15", "mod-3-16", "mod-3-17", "mod-3-18", "mod-4-19", "mod-4-20", "mod-4-21", "mod-4-22", "mod-4-23", "mod-4-24", "mod-5-25", "mod-5-26", "mod-5-27", "mod-5-28", "mod-5-29", "mod-4-25", "mod-4-26", "mod-4-27", "mod-4-28", "mod-4-29", "mod-4-30", "mod-5-30", "mod-4-b1", "mod-4-b2", "mod-4-b3", "mod-4-b4"]);

/** Modules where sim comes BEFORE flashcards (intro → sim → flashcards → quizzes
 *  → summary). Single source of truth = `SIM_FIRST_MODULE_IDS` in topicResolver
 *  (imported above) — no duplicate Set here, so the accordion order and this
 *  lesson branch can't desync (the bug that orphaned mod-0-2's sim). */

/**
 * Module whose quiz-tail injects the knowledgeLevel onboarding question
 * inline (see advanceQuiz). Bound to the FIRST chapter-0 slot — currently
 * the financial-basics content after the 2026-05-30 swap. Keep it as a
 * named constant so a future content reorg only updates one place.
 */
const KNOWLEDGE_LEVEL_INLINE_MODULE_ID = 'mod-0-1';

/**
 * Modules that insert an Interactive Recall phase between flashcards and quizzes.
 * Each moduleId listed here must also have a matching entry in
 * `recallExerciseSets` (see src/features/sentence-exercise/sentenceData.ts);
 * missing entries fall back to an "אין תרגילים זמינים" screen.
 */
const MODULES_WITH_INTERACTIVE_RECALL = new Set([
  "mod-1-1",
  // 2026-05-30 chapter-0 swap: Financial Basics moved from mod-0-2 to mod-0-1.
  // The recall prompts (interest / overdraft / loan / pension) belong to that
  // content, so the gate follows to mod-0-1.
  "mod-0-1", "mod-0-3",
  "mod-1-2",
  "mod-2-10", "mod-2-11",
  "mod-3-15",
  "mod-4-19", "mod-4-20",
  "mod-5-25", "mod-5-26",
  // 2026-06-20 batch 1: opening modules (chapters 0–1). Each id below has a
  // matching set in sentenceData.ts. mod-0-2 now HAS a recall set (money basics)
  // so it correctly enters the recall phase.
  "mod-0-1b", "mod-0-2", "mod-0-4", "mod-0-5",
  "mod-1-3", "mod-1-4", "mod-1-5", "mod-1-9",
]);

// MODULE_INFOGRAPHIC_MAP + MODULE_POST_VIDEO_MAP records now live in
// ./moduleAssetMaps.ts (re-exported at the top of this file).

/** Cards that use infographic-top layout: big image at top, text hidden, Finn at bottom */
const INFOGRAPHIC_TOP_CARDS = new Set([
  "fc-1-5-1", "fc-1-5-2", "fc-1-5-3", "fc-1-5-4", "fc-1-5-5", "fc-1-5-6",
  "fc-1-6-1", "fc-1-6-2", "fc-1-6-3", "fc-1-6-4", "fc-1-6-5", "fc-1-6-6",
  // Graham bonus modules, infographic at top with Finn explanation at bottom
  "fc-4-b1-1", "fc-4-b1-2", "fc-4-b1-2b", "fc-4-b1-3",
  "fc-4-b2-1", "fc-4-b2-2",
  "fc-4-b3-1", "fc-4-b3-2",
  // fc-4-b4-1, fc-4-b4-2, use default layout (text + image) so text is visible
]);

const RTL_STYLE = { writingDirection: "rtl" as const, textAlign: "right" as const };

/* Justified body text for lesson cards. Use on long paragraphs only — short
 * labels/titles look bad with justify. To get Android's balanced line-breaker
 * (which minimizes "orphan" lines), pair this style with the prop
 * `textBreakStrategy="balanced"` on the <Text> itself — RN exposes that as a
 * Text prop, not a style. */
const JUSTIFY_RTL = {
  writingDirection: "rtl" as const,
  textAlign: "right" as const,
};

/** Phases where progress is worth saving so the user can resume mid-module */
const RESTORABLE_PHASES = new Set<FlowPhase>(["flashcards", "interactive-recall", "quizzes", "game", "sim-intro", "sim", "podcast", "couple-dilemma"]);

/** Summary infographic map, maps summary card IDs to portrait PNGs */
const SUMMARY_MAP: Record<string, { uri: string } | number | null> = {
  // Chapter 0
  "fc-0-1-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-0-1/summary-0-1.png' },
  "fc-0-2-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-0-2/summary-0-2.png' },
  "fc-0-3-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-0-3/summary-0-3.png' },
  "fc-0-4-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-0-4/summary-0-4.png' },
  "fc-0-5-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-0-5/summary-0-5.png' },

  // Chapter 1
  "fc-1-1-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-4/summary-1-4.png' },
  "fc-1-2-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-2/summary-1-2.png' },
  "fc-1-3-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-3/summary-1-3.png' },
  "fc-1-4-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-1/summary-1-1.png' },
  "fc-1-5-payslip": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-5/payslip.jpg' },
  "fc-1-5-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-5/summary-1-5-v2.png' },
  "fc-1-6-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-6/summary-1-6.png' },
  "fc-1-7-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-7/summary-1-7.png' },
  "fc-1-8-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-8/summary-1-8.png' },
  "fc-1-9-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-9/summary-1-9.png' },

  // Chapter 2
  "fc-2-10-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-2-10/summary-2-10.png' },
  "fc-2-11-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-2-11/summary-2-11.png' },
  "fc-2-12-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-2-12/summary-2-12.png' },
  "fc-2-13-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-2-13/summary-2-13.png' },
  "fc-2-14-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-2-14/summary-2-14.png' },

  // Chapter 3
  "fc-3-15-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-3-15/summary-3-15.png' },
  "fc-3-16-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-3-16/summary-3-16.png' },
  "fc-3-17-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-3-17/summary-3-17.png' },
  "fc-3-18-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-3-18/summary-3-18.png' },

  // Chapter 4
  "fc-4-19-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-4-19/summary-4-19.png' },
  "fc-4-20-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-4-20/summary-4-20.png' },
  "fc-4-21-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-4-21/summary-4-21.png' },
  "fc-4-22-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-4-22/summary-4-22.png' },
  "fc-4-23-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-4-23/summary-4-23.png' },
  "fc-4-24-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-4-24/summary-4-24.png' },
  "fc-4-25-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-4-25/summary-4-25.png' },
  "fc-4-26-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-4-26/summary-4-26.png' },
  "fc-4-27-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-4-27/summary-4-27.png' },
  "fc-4-28-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-4-28/summary-4-28.png' },
  "fc-4-29-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-4-29/summary-4-29.png' },
  "fc-4-30-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-4-30/summary-4-30.png' },

  // Chapter 5
  "fc-5-25-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-5-25/summary-5-25.png' },
  "fc-5-26-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-5-26/summary-5-26.png' },
  "fc-5-27-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-5-27/summary-5-27.png' },
  "fc-5-28-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-5-28/summary-5-28.png' },
  "fc-5-29-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-5-29/summary-5-29.png' },
  "fc-5-30-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-5-30/summary-5-30.png' },

  // Graham bonus modules, feed infographics
  "fc-4-b1-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/graham-7-rules/gr-1.png' },
  "fc-4-b2-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/graham-margin-safety/gs-1.png' },
  "fc-4-b3-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/graham-price-value/gv-1.png' },
  "fc-4-b4-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/graham-ap-story/ga-1.png' },
};

const quizFeedbackStyles = StyleSheet.create({
  bar: {
    marginTop: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1.5,
  },
  barCorrect: {
    backgroundColor: "rgba(20, 120, 60, 0.95)",
    borderColor: "#4ade80",
  },
  barWrong: {
    backgroundColor: "rgba(120, 30, 30, 0.93)",
    borderColor: "#f87171",
  },
  emoji: {
    fontSize: 20,
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    writingDirection: "rtl",
    textAlign: "right",
  },
  continueBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  continueBtn: {
    backgroundColor: "#0ea5e9",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: "#0369a1",
  },
  continueBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
});

/* ------------------------------------------------------------------ */
/*  renderBoldText, bolds English terms and parenthetical content     */
/* ------------------------------------------------------------------ */

function renderBoldText(text: string, onTermPress?: (term: string) => void): React.ReactNode[] {
  const regex = /(\[\[[^\]]+\]\]|\([^)\[]+\)|[A-Za-z][A-Za-z\d\s&.,-]*)/g;
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(<Text key={key++}>{text.slice(lastIndex, match.index)}</Text>);
    }
    const token = match[0];
    if (token.startsWith("[[") && token.endsWith("]]")) {
      const inner = token.slice(2, -2);
      const pipeIdx = inner.indexOf("|");
      const lookupTerm = pipeIdx >= 0 ? inner.slice(0, pipeIdx) : inner;
      const displayText = pipeIdx >= 0 ? inner.slice(pipeIdx + 1) : inner;
      result.push(
        <Text
          key={key++}
          style={{ fontWeight: "900", color: "#0ea5e9", textDecorationLine: "underline", textDecorationStyle: "solid", textDecorationColor: "#0ea5e9" }}
          onPress={() => onTermPress?.(lookupTerm)}
          suppressHighlighting
        >
          {displayText}
        </Text>
      );
    } else {
      // English words inside Hebrew text: render inline with matching style
      // (no color, no emphasized weight) so they don't tip off quiz answers.
      result.push(<Text key={key++}>{token}</Text>);
    }
    // Inject strong Right-To-Left Mark to prevent punctuation breaking
    result.push('\u200F');
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    result.push(<Text key={key++}>{text.slice(lastIndex)}</Text>);
  }
  return result;
}

/**
 * Tiny helper: when shown, fires onSkip once on mount.
 * Used for inter-module myth when the user has already played
 * 3 myth sessions within the cooldown window — skip straight to the next module.
 */
function MythInterModuleAutoSkip({ onSkip }: { onSkip: () => void }) {
  useEffect(() => { onSkip(); }, [onSkip]);
  return null;
}

/* ------------------------------------------------------------------ */
/*  VideoHookPlayer, full-screen video hook with title overlay         */
/* ------------------------------------------------------------------ */

function VideoHookPlayer({ videoUri, hookText, onFinish, unitColors, fitContain, trimEnd = 0.5 }: {
  videoUri: string | number;
  hookText: string;
  onFinish: () => void;
  unitColors: { bg: string; dim: string; glow: string; bottom: string };
  fitContain?: boolean;
  trimEnd?: number;
}) {
  const videoRef = useRef<VideoView>(null);
  const [isFastMode, setIsFastMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const finishedRef = useRef(false);
  const hasPlayedRef = useRef(false);
  const retryCountRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const reportedStartRef = useRef(false);
  const insets = useSafeAreaInsets();
  const safeTimeout = useTimeoutCleanup();

  // Extracts a stable identifier for the video so PostHog events can be
  // grouped — bundle (number) is the static asset id; URI strips the CDN
  // host so we can pivot by filename even when the host changes (R2 vs Blob).
  const videoKey = typeof videoUri === 'number'
    ? `bundle:${videoUri}`
    : videoUri.split('/').slice(-2).join('/');

  // Derive lesson_id from the video URI when possible (e.g. "fc-0-2-video.mp4"
  // → "mod-0-2", "finn-mod-0-4.mp4" → "mod-0-4"). Lets PostHog funnel
  // lesson_video_started against lesson_started without prop threading.
  const lessonIdFromUri = typeof videoUri === 'string'
    ? (videoUri.match(/(?:mod-|fc-)(\d+)-(\d+)/)?.slice(1, 3) ?? null)
    : null;
  const derivedLessonId = lessonIdFromUri ? `mod-${lessonIdFromUri[0]}-${lessonIdFromUri[1]}` : null;

  const safeFinish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  }, [onFinish]);

  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = false;
    // Aggressive buffer settings for fast start on remote mp4s.
    p.bufferOptions = {
      preferredForwardBufferDuration: 10,
      waitsToMinimizeStalling: false,
      minBufferForPlayback: 0.5,
    };
    p.play();
  });

  useEffect(() => {
    const subs: { remove: () => void }[] = [];

    // Track playback end — only after video has actually started playing at least once
    subs.push(player.addListener('playingChange', (e: { isPlaying: boolean }) => {
      if (e.isPlaying) {
        hasPlayedRef.current = true;
        setIsLoading(false);
        if (!reportedStartRef.current) {
          reportedStartRef.current = true;
          startedAtRef.current = Date.now();
          captureEvent('video_started', { video_key: videoKey, platform: Platform.OS });
          if (derivedLessonId) {
            try { captureEvent('lesson_video_started', { lesson_id: derivedLessonId, video_key: videoKey, platform: Platform.OS }); } catch { /* non-fatal */ }
          }
        }
      }
      if (hasPlayedRef.current && !e.isPlaying && player.duration > 0 && player.currentTime >= player.duration - trimEnd) {
        const duration_ms = startedAtRef.current ? Date.now() - startedAtRef.current : null;
        captureEvent('video_completed', { video_key: videoKey, platform: Platform.OS, duration_ms });
        safeTimeout(safeFinish, 500);
      }
    }));

    // Track errors. Retry once silently after 2s before showing the error overlay —
    // most failures here are transient CDN/network blips that resolve on a second
    // attempt. Only after the retry also fails do we surface the "דלג" hint.
    subs.push(player.addListener('statusChange', (e: { status: string; error?: unknown }) => {
      if (e.status === 'error') {
        const errorCode = (e.error as { code?: string } | undefined)?.code
          ?? (e.error instanceof Error ? e.error.message : String(e.error ?? 'unknown'));
        captureEvent('video_load_failed', {
          video_key: videoKey,
          platform: Platform.OS,
          error_code: errorCode,
          retry: retryCountRef.current,
        });
        if (retryCountRef.current < 1) {
          retryCountRef.current += 1;
          setIsLoading(true);
          setHasError(false);
          setTimeout(() => {
            try { player.replay(); } catch {
              try { player.play(); } catch { /* ignore */ }
            }
          }, 2000);
        } else {
          setHasError(true);
          setIsLoading(false);
        }
      }
      if (e.status === 'readyToPlay') {
        setHasError(false);
        setIsLoading(false);
      }
    }));

    // Safety timeout — if video doesn't start within 20s, skip it (generous for slow networks)
    const timeout = setTimeout(() => {
      if (!hasPlayedRef.current) {
        captureEvent('video_timed_out', { video_key: videoKey, platform: Platform.OS });
        safeFinish();
      }
    }, 20000);

    return () => {
      subs.forEach((s) => s.remove());
      clearTimeout(timeout);
    };
  }, [player, safeFinish]);

  return (
    <View style={{ flex: 1, backgroundColor: "#0a1628" }}>
      <Pressable
        style={{ flex: 1 }}
        accessibilityRole="button"
        accessibilityLabel="סרטון, לחיצה ארוכה להאצה"
        onLongPress={() => { player.playbackRate = 1.8; setIsFastMode(true); }}
        onPressOut={() => { player.playbackRate = 1.0; setIsFastMode(false); }}
        delayLongPress={300}
      >
        <VideoView
          ref={videoRef}
          player={player}
          style={{ flex: 1 }}
          contentFit={fitContain ? "contain" : "cover"}
          nativeControls={false}
        />
      </Pressable>
      {/* Loading — branded card so a slow video reads as "loading new content",
          not a frozen/broken screen. Readable white text (was faint #64748b).
          (Yoav 2026-06-26, app-store review "הטעינות... קלמזי".) */}
      {isLoading && !hasError && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center" }} pointerEvents="none">
          <View style={{ alignItems: "center", gap: 12, backgroundColor: "rgba(10,22,40,0.8)", borderRadius: 22, paddingVertical: 22, paddingHorizontal: 30, borderWidth: 1, borderColor: "rgba(56,189,248,0.35)" }}>
            <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 60, height: 60 }} contentFit="contain" />
            <ActivityIndicator size="small" color="#38bdf8" />
            <Text style={{ fontSize: 14, fontWeight: "800", color: "#ffffff", writingDirection: "rtl" }}>טוען תוכן...</Text>
          </View>
        </View>
      )}
      {/* Error overlay — branded card with a RETRY (was skip-only, faint text).
          The skip button below stays as the secondary action. */}
      {hasError && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          <View style={{ alignItems: "center", gap: 10, backgroundColor: "rgba(10,22,40,0.85)", borderRadius: 22, paddingVertical: 22, paddingHorizontal: 26, borderWidth: 1, borderColor: "rgba(148,163,184,0.3)" }}>
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#ffffff", textAlign: "center", writingDirection: "rtl" }}>
              לא הצלחנו לטעון את הסרטון
            </Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#cbd5e1", textAlign: "center", writingDirection: "rtl" }}>
              בדקו את החיבור לאינטרנט ונסו שוב, או דלגו כדי להמשיך
            </Text>
            <Pressable
              onPress={() => { setHasError(false); setIsLoading(true); try { player.replay(); } catch { try { player.play(); } catch { /* ignore */ } } }}
              accessibilityRole="button"
              accessibilityLabel="נסה שוב"
              style={{ marginTop: 4, backgroundColor: "#0ea5e9", borderRadius: 14, paddingVertical: 11, paddingHorizontal: 26 }}
            >
              <Text style={{ fontSize: 15, fontWeight: "900", color: "#ffffff", writingDirection: "rtl" }}>נסה שוב</Text>
            </Pressable>
          </View>
        </View>
      )}
      {/* Fast-mode indicator removed — speed change alone is enough feedback.
          User asked for a silent speed-up on long-press. */}
      {/* Safe area top overlay, only for full-screen video hooks (not flashcard videos) */}
      {hookText ? (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, backgroundColor: "rgba(0,0,0,0.6)" }} pointerEvents="none" />
      ) : null}
      {/* Hook text overlay, bottom */}
      {hookText ? (
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: Math.max(40, insets.bottom + 16), paddingTop: 60 }} pointerEvents="none">
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.85)"]} style={StyleSheet.absoluteFill} />
          <Text style={{ fontSize: 22, fontWeight: "900", color: "#ffffff", writingDirection: "rtl", textAlign: "right", lineHeight: 32, textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 8, textShadowOffset: { width: 0, height: 2 } }}>
            {hookText}
          </Text>
        </View>
      ) : null}
      {/* Skip button, right side for RTL */}
      <Pressable
        onPress={safeFinish}
        style={{ position: "absolute", top: insets.top + 12, right: 16, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}
        accessibilityRole="button"
        accessibilityLabel="דלג על הסרטון"
      >
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#ffffff" }}>דלג</Text>
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  FlashcardCard, mounts with a slide-in animation per card          */
/* ------------------------------------------------------------------ */

function FlashcardCard({
  card,
  index,
  total,
  onNext,
  onPrev,
  onClose,
  onSkipAll,
  unitColors,
  onTermPress,
  onOpenChat,
  showFinnTip = false,
}: {
  card: Flashcard;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onSkipAll: () => void;
  unitColors: { bg: string; dim: string; glow: string; bottom: string };
  onTermPress?: (term: string) => void;
  onOpenChat?: () => void;
  showFinnTip?: boolean;
}) {
  const cardStyle = useEntranceAnimation(slideInLeft, { delay: 0 });
  const { playSound } = useSoundEffect();
  const [finnTipDismissed, setFinnTipDismissed] = useState(false);
  const showFinnPopup = showFinnTip && index === 2 && !finnTipDismissed;

  // R8 pre-release audit (Yoav + ארכיטקט 2026-06-11): Math.random()
  // previously sat in the JSX render body (line 828) — every re-render
  // re-rolled the meme caption, producing visible text jitter when the
  // card animated or a parent state changed. Memoise per card.id so the
  // caption stays stable for the lifetime of this card.
  const memeFallback = useMemo(
    () => FINN_MEME_REACTIONS[Math.floor(Math.random() * FINN_MEME_REACTIONS.length)],
    [card.id],
  );

  // Audio Playback
  useEffect(() => {
    let playerObj: AudioPlayer | null = null;
    let isActive = true;

    if (card.topAudio?.uri) {
      try {
        const player = createAudioPlayer({ uri: card.topAudio.uri });
        player.play();
        if (isActive) {
          playerObj = player;
        } else {
          player.remove();
        }
      } catch { /* audio playback failed, silent */ }
    }

    return () => {
      isActive = false;
      if (playerObj) {
        try { playerObj.pause(); playerObj.remove(); } catch { /* ignore */ }
      }
    };
  }, [card.topAudio?.uri]);

  // Dive mode state
  const [diveStep, setDiveStep] = useState(0);
  const isDiveMode = card.diveMode && card.zoomRegions && card.zoomRegions.length > 0;
  const totalDiveSteps = isDiveMode ? (card.finnExplanations?.length ?? card.zoomRegions?.length ?? 1) : 1;

  const comicZoomStyle = useAnimatedStyle(() => {
    if (!isDiveMode || !card.zoomRegions) return { transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] };
    const step = card.zoomRegions[diveStep] || [0, 0, 1];
    return {
      transform: [
        { translateX: withSpring(step[0], { damping: 15, stiffness: 90 }) },
        { translateY: withSpring(step[1], { damping: 15, stiffness: 90 }) },
        { scale: withSpring(step[2], { damping: 15, stiffness: 90 }) }
      ]
    };
  }, [card.zoomRegions, diveStep, isDiveMode]);

  const handleNextBtn = useCallback(() => {
    // Haptic FIRST — before the sound, before any state mutation. Users
    // rage-clicked the המשך button on dive-mode cards because the zoom
    // transition is the only visible cue. A guaranteed haptic on every
    // tap makes the press feel registered even when the visual lag is high.
    tapHaptic();
    playSound('btn_click_soft_2');
    if (isDiveMode && diveStep < totalDiveSteps - 1) {
      setDiveStep(d => d + 1);
    } else {
      // onPress של React Native אינו worklet — runOnJS היה כפילות שלפעמים
      // עיכבה את ה-callback אחרי סגירת modal של הצ׳אט (ChatScreen).
      onNext();
    }
  }, [isDiveMode, diveStep, totalDiveSteps, playSound, onNext]);

  const handlePrevBtn = useCallback(() => {
    tapHaptic();
    playSound('btn_click_soft_2');
    if (isDiveMode && diveStep > 0) {
      setDiveStep(d => d - 1);
    } else {
      onPrev();
    }
  }, [isDiveMode, diveStep, playSound, onPrev]);

  // Swipe left → next card (RTL: natural reading direction)
  const swipeLeft = Gesture.Fling()
    .direction(1) // left direction constant
    .onEnd(() => {
      runOnJS(handleNextBtn)();
    });

  // Swipe right → previous card
  const swipeRight = Gesture.Fling()
    .direction(2) // right direction constant
    .onEnd(() => {
      runOnJS(handlePrevBtn)();
    });

  const swipeGesture = Gesture.Race(swipeLeft, swipeRight);

  return (
    <GestureDetector gesture={swipeGesture}>
    <Animated.View style={[cardStyle, { flex: 1 }]}>
      {/* Finn help popup notification, bottom of card, after 3s */}
      {showFinnPopup && (
        <Animated.View entering={FadeInUp.delay(3000).duration(400)} style={{
          position: "absolute", bottom: 80, left: 12, right: 12, zIndex: 100,
          flexDirection: "row-reverse", alignItems: "center", gap: 10,
          backgroundColor: "#ffffff", borderRadius: 18, padding: 14,
          borderWidth: 1, borderColor: "#e0f2fe",
          shadowColor: "#0c4a6e", shadowOpacity: 0.1, shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 }, elevation: 8,
        }}>
          <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 52, height: 52, flexShrink: 0 }} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Text style={{ ...RTL_STYLE, fontSize: 12.5, lineHeight: 19, color: "#334155", fontWeight: "600" }}>
              משהו לא מובן? לחצו על המילים המודגשות לקבלת הסבר
            </Text>
          </View>
          <Pressable onPress={() => setFinnTipDismissed(true)} hitSlop={10} style={{ position: "absolute", top: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="סגור טיפ"
          >
            <Text style={{ color: "#64748b", fontSize: 18, fontWeight: "600" }}>✕</Text>
          </Pressable>
        </Animated.View>
      )}

      {card.isInteractiveChart && card.chartId === 'ta125_war_recovery' ? (
        /* ── Interactive TA-125 chart (Chapter 4, Module 27) ── */
        <TA125WarRecoveryChart onContinue={handleNextBtn} />
      ) : card.videoUri ? (
        /* ── Full-screen video flashcard ── */
        <VideoHookPlayer videoUri={getCachedVideoPath(card.videoUri)} hookText="" onFinish={handleNextBtn} unitColors={unitColors} />
      ) : card.isMeme ? (
        /* ── Meme break card, humor pause, no XP ── */
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: "#1e293b", borderRadius: 20, overflow: "hidden", position: "relative" }}>
            {card.memeImage ? (
              <ExpoImage
                source={card.memeImage}
                style={{ width: "100%", height: "100%", position: "absolute", top: 0 }}
                contentFit={card.hideTextOverlay ? "contain" : "cover"}
                cachePolicy="memory-disk"
                transition={150}
              />
            ) : null}

            {!card.hideTextOverlay && (
              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: card.memeImage ? "rgba(15, 23, 42, 0.85)" : "transparent" }}>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
                  <ExpoImage source={FINN_HAPPY} accessible={false} style={{ width: 64, height: 64 }} contentFit="contain" />
                  <View style={{ flex: 1, backgroundColor: "#334155", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#475569" }}>
                    <Text style={{ writingDirection: "rtl", textAlign: "right", fontSize: 16, color: "#f8fafc", fontWeight: "700", lineHeight: 24 }}>
                      {card.text || memeFallback}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
          <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <AnimatedPressable
              onPress={handleNextBtn}
              style={{ backgroundColor: "#0ea5e9", borderRadius: 16, paddingVertical: 14, alignItems: "center", justifyContent: "center", borderBottomWidth: 3, borderBottomColor: "#0284c7" }}
              accessibilityRole="button"
              accessibilityLabel="המשך"
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>{"המשך"}</Text>
            </AnimatedPressable>
          </View>
        </View>
      ) : card.isComic ? (
        /* ── Summary infographic (generated by NotebookLM) ── */
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 6, paddingVertical: 10 }}>
            {SUMMARY_MAP[card.id] ? (
              <View style={{ width: "100%", height: "100%", backgroundColor: "#f8fafc", borderRadius: 16, overflow: "hidden", position: "relative" }}>
                <AnimatedExpoImage
                  source={SUMMARY_MAP[card.id]!}
                  style={[{ width: "100%", height: "100%", position: "absolute" }, comicZoomStyle]}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  transition={150}
                  accessible={false}
                />
                {["fc-1-5-summary", "fc-1-6-summary", "fc-1-7-summary", "fc-4-19-summary", "fc-4-20-summary", "fc-4-21-summary", "fc-4-22-summary", "fc-4-23-summary", "fc-4-24-summary", "fc-5-25-summary", "fc-5-26-summary", "fc-5-27-summary", "fc-5-28-summary", "fc-5-29-summary"].includes(card.id) && card.text && (
                  <View style={{ padding: 24, paddingTop: 48, flex: 1 }}>
                     <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                        <Text style={{ ...RTL_STYLE, fontSize: 24, color: "#0c4a6e", fontWeight: "800", marginBottom: 12, backgroundColor: "rgba(255,255,255,0.85)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" }}>
                          {renderBoldText(card.text.split('\n')[0], onTermPress)}
                        </Text>
                        <Text style={{ ...JUSTIFY_RTL, fontSize: 18, color: "#1e293b", lineHeight: 28, fontWeight: "600", backgroundColor: "rgba(255,255,255,0.85)", padding: 12, borderRadius: 12 }}>
                          {renderBoldText(card.text.split('\n').slice(1).join('\n'), onTermPress)}
                        </Text>
                     </ScrollView>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ width: "100%", aspectRatio: 1, backgroundColor: "#f8fafc", borderRadius: 16, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ color: "#0891b2", fontSize: 18, fontWeight: "700" }}>{card.text}</Text>
              </View>
            )}
          </View>

          {/* Dive mode: Finn's explanation bubble for comics */}
          {isDiveMode && card.finnExplanations && card.finnExplanations[diveStep] && (
            <Animated.View entering={FadeInUp.duration(300)} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 8, backgroundColor: "#eff6ff", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#bfdbfe" }}>
              <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 44, height: 44, flexShrink: 0 }} contentFit="contain" />
              <Text style={{ ...JUSTIFY_RTL, fontSize: 14, color: "#1e3a8a", fontWeight: "600", flex: 1 }}>{card.finnExplanations[diveStep]}</Text>
            </Animated.View>
          )}

          {/* Bottom navigation bar for comics. RTL: back chevron on right side. */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
              <AnimatedPressable onPress={handlePrevBtn} disabled={index === 0 && (!isDiveMode || diveStep === 0)} style={{ padding: 8, opacity: (index === 0 && (!isDiveMode || diveStep === 0)) ? 0.3 : 1 }} accessibilityRole="button" accessibilityLabel="הקודם">
                <ChevronRight size={28} color={unitColors.bg} />
              </AnimatedPressable>
              <AnimatedPressable onPress={handleNextBtn} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: unitColors.bg, borderRadius: 16, paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: unitColors.bottom ?? unitColors.bg }} accessibilityRole="button" accessibilityLabel="המשך">
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>{"המשך"}</Text>
                <ChevronLeft size={18} color="#fff" />
              </AnimatedPressable>
            </View>
          </View>
        </View>
      ) : INFOGRAPHIC_TOP_CARDS.has(card.id) ? (
        /* ── Infographic-top layout: big image at top, text hidden, Finn at bottom ── */
        <View style={{ flex: 1 }}>
          {/* Infographic fills the top area */}
          <View style={{ flex: 1, backgroundColor: "#ffffff", borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6, justifyContent: "center", alignItems: "center", padding: 8 }}>
            <FlashcardInfographic cardId={card.id} diveStep={diveStep} zoomRegions={card.zoomRegions} />
          </View>

          {/* Finn explanation pinned at bottom */}
          {isDiveMode && card.finnExplanations && card.finnExplanations[diveStep] ? (
            <Animated.View entering={FadeInUp.duration(300)} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, marginHorizontal: 8, marginTop: 10, marginBottom: 4, backgroundColor: "#eff6ff", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#bfdbfe" }}>
              <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 44, height: 44, flexShrink: 0 }} contentFit="contain" />
              <Text style={{ ...JUSTIFY_RTL, fontSize: 14, color: "#1e3a8a", fontWeight: "600", flex: 1 }}>{card.finnExplanations[diveStep]}</Text>
            </Animated.View>
          ) : (
            <View style={{ height: 10 }} />
          )}

          {/* Bottom navigation bar. RTL: back chevron on right side. */}
          <View style={{ paddingHorizontal: 8, paddingVertical: 8, paddingBottom: 16 }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
              <AnimatedPressable
                onPress={handlePrevBtn}
                disabled={index === 0 && (!isDiveMode || diveStep === 0)}
                style={{ padding: 8, opacity: (index === 0 && (!isDiveMode || diveStep === 0)) ? 0.3 : 1 }}
                accessibilityRole="button"
                accessibilityLabel="הקודם"
              >
                <ChevronRight size={28} color={unitColors.bg} />
              </AnimatedPressable>
              <AnimatedPressable
                onPress={handleNextBtn}
                style={{ flex: 1, backgroundColor: unitColors.bg, borderRadius: 16, paddingVertical: 14, alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 6, borderBottomWidth: 3, borderBottomColor: unitColors.bottom }}
                accessibilityRole="button"
                accessibilityLabel={!isDiveMode || diveStep === totalDiveSteps - 1 ? (index === total - 1 ? "יאללה לקוויז" : "הבא") : "המשך זום"}
              >
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
                  {(!isDiveMode || diveStep === totalDiveSteps - 1) ? (index === total - 1 ? "יאללה לקוויז!" : "המשך") : "המשך"}
                </Text>
                <ChevronLeft size={18} color="#fff" />
              </AnimatedPressable>
            </View>
          </View>
        </View>
      ) : (
        /* ── Text flashcard ── */
        <>
          <View style={{ flex: 1, backgroundColor: "#ffffff", borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
            <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: (!card.text || (isDiveMode && diveStep > 0 && card.hideTextOnDive)) ? "flex-start" : "center" }} showsVerticalScrollIndicator={false}>
              {(() => {
                // Strip intro phrase (before ':'), it's now shown in the title row
                const colonIdx = card.text.indexOf(":");
                const rawBody = (colonIdx > 0 && colonIdx < 80)
                  ? card.text.substring(colonIdx + 1).trim()
                  : card.text;
                const bodyText = /^[A-Za-z]/.test(rawBody) ? '\u200F' + rawBody : rawBody;
                if (!bodyText || (isDiveMode && diveStep > 0 && card.hideTextOnDive)) return null;
                return (
                  <Text style={{ ...JUSTIFY_RTL, fontSize: bodyText.length > 100 ? 17 : 21, lineHeight: bodyText.length > 100 ? 28 : 34, color: "#1c1917", fontWeight: "600", marginBottom: 16 }}>
                    {renderBoldText(bodyText, onTermPress)}
                  </Text>
                );
              })()}
              <FlashcardInfographic cardId={card.id} diveStep={diveStep} zoomRegions={card.zoomRegions} />

              {/* Dive mode: Finn's explanation bubble at the bottom */}
              {isDiveMode && card.finnExplanations && card.finnExplanations[diveStep] && (
                <Animated.View entering={FadeInUp.duration(300)} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, marginTop: 12, backgroundColor: "#eff6ff", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#bfdbfe" }}>
                  <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 44, height: 44, flexShrink: 0 }} contentFit="contain" />
                  <Text style={{ ...JUSTIFY_RTL, fontSize: 14, color: "#1e3a8a", fontWeight: "600", flex: 1 }}>{card.finnExplanations[diveStep]}</Text>
                </Animated.View>
              )}

              {/* Paradigm footnote, only on fc-1-1-1 */}
              {card.id === "fc-1-1-1" && (!isDiveMode || diveStep === 0) && (
                <Text style={{ ...JUSTIFY_RTL, fontSize: 13, color: "#64748b", fontWeight: "600", marginTop: 10, lineHeight: 20 }}>
                  💡 פרדיגמה = דרך חשיבה, מסגרת מנטלית שדרכה אנחנו מפרשים את המציאות.
                </Text>
              )}

              {/* Finn tip removed, shown as popup notification instead */}
            </ScrollView>
          </View>

          {/* Bottom navigation bar, continue + back (RTL: continue on right side, back chevron on left in DOM = right in RTL). */}
          <View style={{ paddingHorizontal: 8, paddingVertical: 8, paddingBottom: 16 }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
              <AnimatedPressable
                onPress={handlePrevBtn}
                disabled={index === 0 && (!isDiveMode || diveStep === 0)}
                style={{ padding: 8, opacity: (index === 0 && (!isDiveMode || diveStep === 0)) ? 0.3 : 1 }}
                accessibilityRole="button"
                accessibilityLabel="הקודם"
              >
                <ChevronRight size={28} color={unitColors.bg} />
              </AnimatedPressable>

              <AnimatedPressable
                onPress={handleNextBtn}
                style={{
                  flex: 1,
                  backgroundColor: unitColors.bg,
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row-reverse",
                  gap: 6,
                  borderBottomWidth: 3,
                  borderBottomColor: unitColors.bottom,
                }}
                accessibilityRole="button"
                accessibilityLabel={!isDiveMode || diveStep === totalDiveSteps - 1 ? (index === total - 1 ? "יאללה לקוויז" : "הבא") : "המשך זום"}
              >
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
                  {(!isDiveMode || diveStep === totalDiveSteps - 1) ? (index === total - 1 ? "יאללה לקוויז!" : "המשך") : "המשך"}
                </Text>
                <ChevronLeft size={18} color="#fff" />
              </AnimatedPressable>
            </View>
          </View>
        </>
      )}
    </Animated.View>
    </GestureDetector>
  );
}

/* ------------------------------------------------------------------ */
/*  QuizCard, shows question + option buttons with feedback           */
/* ------------------------------------------------------------------ */

interface AnswerState {
  selectedIndex: number;
  isCorrect: boolean;
  revealed: boolean;
}

/** Seeded shuffle, deterministic per quiz ID so answer order stays stable across re-renders */
function seededShuffle<T>(arr: T[], seed: string): { shuffled: T[]; indexMap: number[] } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) { h = ((h << 5) - h + seed.charCodeAt(i)) | 0; }
  const indices = arr.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) | 0;
    const j = ((h >>> 0) % (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return { shuffled: indices.map(i => arr[i]), indexMap: indices };
}

function QuizCard({
  quiz,
  quizIndex,
  totalQuizzes,
  onCorrectAnswer,
  onWrongRevealed,
  onWrongImmediate,
  unitColors,
  onTermPress,
}: {
  quiz: QuizQuestion;
  quizIndex: number;
  totalQuizzes: number;
  onCorrectAnswer: () => void;
  onWrongRevealed: () => void;
  onWrongImmediate: () => void;
  unitColors: { bg: string; dim: string; glow: string; bottom: string };
  onTermPress?: (term: string) => void;
}) {
  // Shuffle options deterministically per quiz, correct answer changes position each quiz
  const { shuffledOptions, shuffledCorrectIndex } = useMemo(() => {
    const { shuffled, indexMap } = seededShuffle(quiz.options, quiz.id);
    const newCorrect = indexMap.indexOf(quiz.correctAnswer);
    return { shuffledOptions: shuffled, shuffledCorrectIndex: newCorrect };
  }, [quiz.id, quiz.options, quiz.correctAnswer]);

  const cardStyle = useEntranceAnimation(slideInLeft, { delay: 0 });
  const shakeX = useSharedValue(0);
  const celebrationScale = useSharedValue(0);
  const [wrongAttempts, setWrongAttempts] = useState<Set<number>>(new Set());
  const [answerState, setAnswerState] = useState<AnswerState | null>(null);
  const [showCalc, setShowCalc] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcPrev, setCalcPrev] = useState<number | null>(null);
  const [calcOp, setCalcOp] = useState<string | null>(null);
  const [calcReset, setCalcReset] = useState(false);
  const needsCalc = quiz.needsCalculator === true;

  const handleCalcPress = useCallback((btn: string) => {
    if (btn === "C") {
      setCalcDisplay("0"); setCalcPrev(null); setCalcOp(null); setCalcReset(false);
      return;
    }
    if (btn === "⌫") {
      setCalcDisplay((d) => d.length <= 1 ? "0" : d.slice(0, -1));
      return;
    }
    if (["+", "-", "×", "÷"].includes(btn)) {
      setCalcPrev(parseFloat(calcDisplay.replace(/,/g, "")));
      setCalcOp(btn); setCalcReset(true);
      return;
    }
    if (btn === "=") {
      if (calcPrev === null || !calcOp) return;
      const cur = parseFloat(calcDisplay.replace(/,/g, ""));
      let result = 0;
      if (calcOp === "+") result = calcPrev + cur;
      else if (calcOp === "-") result = calcPrev - cur;
      else if (calcOp === "×") result = calcPrev * cur;
      else if (calcOp === "÷" && cur !== 0) result = calcPrev / cur;
      setCalcDisplay(Number.isInteger(result) ? result.toLocaleString() : result.toLocaleString(undefined, { maximumFractionDigits: 2 }));
      setCalcPrev(null); setCalcOp(null); setCalcReset(true);
      return;
    }
    // digit or dot
    setCalcDisplay((d) => {
      if (calcReset) { setCalcReset(false); return btn === "." ? "0." : btn; }
      if (btn === "." && d.includes(".")) return d;
      if (d === "0" && btn !== ".") return btn;
      return d + btn;
    });
  }, [calcDisplay, calcPrev, calcOp, calcReset]);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => { if (autoTimerRef.current) clearTimeout(autoTimerRef.current); };
  }, []);
  const safeTimeout = useTimeoutCleanup();
  const { playSound } = useSoundEffect();
  const [finnState, setFinnState] = useState<FinnAnimationState>("thinking");

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
    opacity: celebrationScale.value,
  }));

  const handlePress = useCallback(
    (idx: number) => {
      if (answerState?.revealed) return;
      const correct = idx === shuffledCorrectIndex;

      playSound('btn_click_soft_3');

      if (correct) {
        // Correct answer - celebrate!
        setAnswerState({ selectedIndex: idx, isCorrect: true, revealed: true });
        celebrationScale.value = withSpring(1, { damping: 20, stiffness: 150 });
        setFinnState("celebrate");
        successHaptic();
        safeTimeout(() => { playSound('modal_open_2'); }, 100);
        autoTimerRef.current = setTimeout(() => onCorrectAnswer(), 3400);
      } else {
        // Wrong answer, give up to 3 chances
        shakeX.value = 0;
        errorHaptic();
        onWrongImmediate(); // Heart drops immediately
        setFinnState("empathy");
        safeTimeout(() => { playSound('modal_open_3'); }, 100);
        const newWrong = new Set(wrongAttempts);
        newWrong.add(idx);
        setWrongAttempts(newWrong);

        if (newWrong.size >= 3) {
          // 3rd wrong, auto-select correct answer, show feedback
          setAnswerState({ selectedIndex: quiz.correctAnswer, isCorrect: false, revealed: true });
          autoTimerRef.current = setTimeout(() => onWrongRevealed(), 3600);
        }
        // 1st/2nd wrong, option greyed out, user can try remaining options
      }
    },
    [answerState, quiz.correctAnswer, wrongAttempts, onCorrectAnswer, onWrongRevealed, onWrongImmediate, shakeX, celebrationScale, playSound, setFinnState],
  );

  const isRevealed = answerState?.revealed ?? false;
  const glowColor = isRevealed
    ? answerState?.isCorrect
      ? "#22c55e"
      : "#ef4444"
    : "#d4a017";

  return (
    <Animated.View style={[cardStyle, shakeStyle]} className="flex-1">
      {/* Top row: Finn on right, quiz counter on left */}
      <View style={{ flexDirection: "row-reverse", alignItems: "center", marginBottom: 6, gap: 8 }}>
        <View style={{
          width: 90, height: 90, borderRadius: 45,
          borderWidth: 2,
          borderColor: finnState === "celebrate" ? "#22c55e" : finnState === "empathy" ? "#ef4444" : unitColors.bg,
          backgroundColor: "#ffffff",
          overflow: "hidden", alignItems: "center", justifyContent: "center",
          shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
        }}>
          <ExpoImage
            source={getFinnImage(finnState)}
            style={{ width: 86, height: 86 }}
            contentFit="contain"
            accessible={false}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{
          backgroundColor: "#ffffff",
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: isRevealed ? (answerState?.isCorrect ? "#86efac" : "#fca5a5") : "#e5e7eb",
          padding: 12,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 5,
        }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "flex-start", gap: 8 }}>
              <Text
                numberOfLines={5}
                style={[RTL_STYLE, { fontSize: 15, fontWeight: "700", color: "#1f2937", lineHeight: 22, marginBottom: 6, flex: 1 }]}
              >
                {renderBoldText(quiz.question, onTermPress)}
              </Text>
              {needsCalc && (
                <Pressable
                  onPress={() => setShowCalc((v) => !v)}
                  style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: showCalc ? unitColors.bg : "#f3f4f6", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: showCalc ? unitColors.bg : "#e5e7eb" }}
                  accessibilityRole="button"
                  accessibilityLabel="מחשבון"
                  accessibilityState={{ expanded: showCalc }}
                >
                  <Text style={{ fontSize: 20 }}>🧮</Text>
                </Pressable>
              )}
            </View>

            {/* Mini calculator overlay */}
            {needsCalc && showCalc && (
              <Animated.View entering={FadeIn.duration(200)} style={{ backgroundColor: "#1f2937", borderRadius: 16, padding: 14, marginBottom: 16 }}>
                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Pressable onPress={() => setShowCalc(false)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }} accessibilityRole="button" accessibilityLabel="סגור מחשבון" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>✕</Text>
                  </Pressable>
                  <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "600" }}>מחשבון</Text>
                </View>
                <View style={{ backgroundColor: "#111827", borderRadius: 10, padding: 12, marginBottom: 10, alignItems: "flex-end" }}>
                  <Text style={{ color: "#ffffff", fontSize: 28, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{calcDisplay}</Text>
                  {calcOp && <Text style={{ color: "#6b7280", fontSize: 14 }}>{calcPrev?.toLocaleString()} {calcOp}</Text>}
                </View>
                <View style={{ gap: 6 }}>
                  {[
                    ["C", "⌫", "÷", "×"],
                    ["7", "8", "9", "-"],
                    ["4", "5", "6", "+"],
                    ["1", "2", "3", "="],
                    ["0", ".", "", ""],
                  ].map((row, ri) => (
                    <View key={ri} style={{ flexDirection: "row", gap: 6 }}>
                      {row.map((btn, ci) => {
                        if (!btn) return <View key={ci} style={{ flex: 1 }} />;
                        const isOp = ["+", "-", "×", "÷", "="].includes(btn);
                        const isUtil = btn === "C" || btn === "⌫";
                        return (
                          <Pressable
                            key={ci}
                            onPress={() => handleCalcPress(btn)}
                            style={{
                              flex: btn === "0" && ri === 4 ? 2.12 : 1,
                              height: 44,
                              borderRadius: 10,
                              backgroundColor: isOp ? unitColors.bg : isUtil ? "#374151" : "#1f2937",
                              borderWidth: 1,
                              borderColor: isOp ? unitColors.bottom : "#374151",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={btn === "⌫" ? "מחק" : btn === "C" ? "נקה" : btn === "×" ? "כפל" : btn === "÷" ? "חילוק" : btn === "+" ? "חיבור" : btn === "-" ? "חיסור" : btn === "=" ? "שווה" : btn}
                          >
                            <Text style={{ color: "#ffffff", fontSize: isOp ? 20 : 18, fontWeight: "700" }}>{btn}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            <View style={{ gap: 6 }}>
              {shuffledOptions.map((option, idx) => {
                const isWrong = wrongAttempts.has(idx);
                let borderColor = `${unitColors.bg}33`;
                let bgColor = unitColors.dim;

                if (isRevealed) {
                  if (idx === shuffledCorrectIndex) {
                    borderColor = "#22c55e";
                    bgColor = "rgba(34,197,94,0.1)";
                  } else if (idx === answerState?.selectedIndex && !answerState.isCorrect) {
                    borderColor = "#ef4444";
                    bgColor = "rgba(239,68,68,0.1)";
                  }
                } else if (isWrong) {
                  borderColor = "#d1d5db";
                  bgColor = "#f3f4f6";
                }

                return (
                  <AnimatedPressable
                    key={`${quiz.id}-opt-${idx}`}
                    onPress={() => handlePress(idx)}
                    disabled={isRevealed || isWrong}
                    style={{
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor,
                      backgroundColor: bgColor,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      opacity: isWrong && !isRevealed ? 0.5 : 1,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={option}
                    accessibilityState={{ selected: isRevealed && idx === answerState?.selectedIndex, disabled: isRevealed || isWrong }}
                  >
                    <Text
                      numberOfLines={4}
                      style={[RTL_STYLE, { fontSize: 13, lineHeight: 18, color: isWrong && !isRevealed ? "#64748b" : "#1f2937" }]}
                    >
                      {renderBoldText(option, onTermPress)}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>

            {/* Hint for retry */}
            {wrongAttempts.size > 0 && !isRevealed && (
              <Animated.View entering={FadeIn.duration(200)} style={{ marginTop: 12 }}>
                <Text style={[RTL_STYLE, { fontSize: 12, color: "#f59e0b" }]}>
                  לא נכון, ננסה שוב! 💪 ({wrongAttempts.size}/3)
                </Text>
              </Animated.View>
            )}
        </View>

        {/* ── Feedback, inline below question card ── */}
        {isRevealed && (
          <>
            <Animated.View
              entering={FadeIn.duration(200).delay(100)}
              style={[
                quizFeedbackStyles.bar,
                answerState?.isCorrect ? quizFeedbackStyles.barCorrect : quizFeedbackStyles.barWrong,
              ]}
            >
              <View accessible={false}>
                <LottieView
                  source={answerState?.isCorrect
                    ? require("../../../assets/lottie/wired-flat-1103-confetti-hover-pinch.json")
                    : require("../../../assets/lottie/wired-flat-36-bulb-hover-blink.json")}
                  style={{ width: 32, height: 32 }}
                  autoPlay
                  loop={false}
                />
              </View>
              <Text style={[
                quizFeedbackStyles.text,
                { color: answerState?.isCorrect ? "#4ade80" : "#f87171" },
              ]}>
                {answerState?.isCorrect ? quiz.successFeedback : quiz.failFeedback}
              </Text>
            </Animated.View>
            <Animated.View entering={FadeIn.delay(200)} style={{ marginTop: 8 }}>
              <LiquidButton
                onPress={() => {
                  if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
                  if (answerState?.isCorrect) onCorrectAnswer();
                  else onWrongRevealed();
                }}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 16, paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: unitColors.bottom ?? unitColors.bg }}
                color={unitColors.bg}
              >
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>המשך {'>'}</Text>
              </LiquidButton>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  SummaryScreen, module/quiz completion screen                      */
/* ------------------------------------------------------------------ */

function SummaryScreen({
  correctCount,
  totalCount,
  currentModIdx,
  chapterModules,
  completedInChapter,
  chapterId,
  nextModule,
  showWisdom,
  onContinue,
  onBack,
  unitColors,
  chestClaimed,
  chestElement,
}: {
  correctCount: number;
  totalCount: number;
  currentModIdx: number;
  chapterModules: Module[];
  completedInChapter: number;
  chapterId: string | undefined;
  nextModule: Module | undefined;
  showWisdom: boolean;
  onContinue: () => void;
  onBack: () => void;
  unitColors: { bg: string; dim: string; glow: string; bottom: string };
  chestClaimed?: boolean;
  chestElement?: React.ReactNode;
}) {
  const wisdomItem = useWisdomStore((s) => s.activeItem);
  const summaryFinnState: FinnAnimationState =
    correctCount === totalCount ? "celebrate" : correctCount >= totalCount / 2 ? "idle" : "empathy";

  // Haptic feedback based on quiz performance
  useEffect(() => {
    if (correctCount === totalCount && totalCount > 0) {
      doubleHeavyHaptic(); // Perfect score, major win
    } else if (correctCount >= totalCount / 2) {
      successHaptic(); // Good score
    }
  }, []);

  const medalCount = Math.min(totalCount, 5);
  const goldCount = Math.round((correctCount / Math.max(totalCount, 1)) * medalCount);

  const isChapterComplete = completedInChapter >= chapterModules.length;

  const completionMessagesPerfect = [
    "מושלם! ענית נכון על כל השאלות",
    "כל הכבוד! הידע שלך בשמיים",
    "מצוין! ממש מקצוען/ית פיננסי/ת",
    "מושלם! קפטן שארק מתרשם מאוד",
  ];

  const completionMessagesGood = [
    "כל הכבוד! סיימת את המודול",
    "יופי! צעד גדול קדימה",
    "עבודה מעולה! בדרך הנכונה",
    "סחתיין! עוד מודול בארון",
  ];

  const randomIdx = useMemo(() => Math.floor(Math.random() * 4), []);

  const completionLabel =
    isChapterComplete
      ? (chapterId === "chapter-5" ? "השלמת את כל המסע הפיננסי!" : "כל הכבוד! סיימת את כל המודולים בפרק")
      : correctCount === totalCount
        ? completionMessagesPerfect[randomIdx]
        : correctCount >= totalCount / 2
          ? completionMessagesGood[randomIdx]
          : "סיימת! ננסה שוב כדי לשפר";

  const progressLabel =
    isChapterComplete
      ? ""
      : `עוד ${chapterModules.length - completedInChapter} מודולים לסיום הפרק`;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ alignItems: "center", paddingTop: 20, gap: 16, paddingHorizontal: 16 }}>

        {/* Finn mascot, free-floating. Removed the shadow wrapper: RN-Web
            translated `shadowColor/shadowOpacity/shadowRadius` into a
            rectangular box-shadow on the View, which Safari rendered as a
            visible white/bluish square frame around the character. Native
            iOS/Android render fine without the shadow too. */}
        <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: "center", backgroundColor: "transparent" }}>
          <ExpoImage
            source={getFinnImage(summaryFinnState)}
            style={{ width: 150, height: 150, backgroundColor: "transparent" }}
            contentFit="contain"
          />
        </Animated.View>

        {/* Medals row removed */}

        {/* Title */}
        {chestClaimed && (
          <View style={{ alignItems: "center", gap: 8, paddingHorizontal: 16 }}>
            <Text style={{ fontSize: 26, fontWeight: "900", color: "#0c4a6e", textAlign: "center" }} accessibilityRole="header">
              {isChapterComplete ? "הפרק הושלם!" : "מודול הושלם!"}
            </Text>
            <Text style={{ ...RTL_STYLE, fontSize: 15, color: "#475569", textAlign: "center", lineHeight: 22 }}>
              {completionLabel}
            </Text>
            {!isChapterComplete && chapterModules.length > 0 && progressLabel !== "" && (
              <Text style={{ ...RTL_STYLE, fontSize: 13, color: "#818cf8", textAlign: "center", fontWeight: "600", marginTop: 4 }}>
                {progressLabel}
              </Text>
            )}

            {/* Dancing shark for ETF module, trophy circles for all others */}
            {chapterModules[currentModIdx]?.id === 'mod-4-21' ? (
              <Animated.View entering={FadeIn.delay(300).duration(500)} style={{ marginTop: 14 }} accessible={false}>
                <ExpoImage source={FINN_DANCING} style={{ width: 120, height: 120 }} contentFit="contain" />
              </Animated.View>
            ) : (
              <View style={{ flexDirection: "row-reverse", justifyContent: "center", gap: 4, marginTop: 14 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Animated.View key={i} entering={FadeIn.delay(300 + i * 120).duration(350)} accessible={false}>
                    <LottieView
                      source={require("../../../assets/lottie/wired-flat-3263-trophy-circle-hover-roll.json")}
                      style={{ width: 44, height: 44, opacity: i < completedInChapter ? 1 : 0.25 }}
                      autoPlay={i < completedInChapter}
                      loop={false}
                    />
                  </Animated.View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Chest Element rendered perfectly centered in the remaining bottom space */}
        {!chestClaimed && chestElement && (
          <View style={{ flex: 1, justifyContent: "center", width: "100%", paddingBottom: 20 }}>
            {chestElement}
          </View>
        )}

        {/* UP NEXT, Wisdom Flash (deep ocean blue) */}
        {chestClaimed && wisdomItem && showWisdom && (
          <View style={{ width: "100%", paddingHorizontal: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Text style={{ color: "#64748b", fontSize: 13, fontWeight: "700", letterSpacing: 1.2 }}>➔  UP NEXT</Text>
            </View>
            <View style={{
              backgroundColor: "#0c1929",
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              borderWidth: 1,
              borderColor: "rgba(56,189,248,0.2)",
              shadowColor: "#0891b2",
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 5,
            }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(14,116,144,0.25)", alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 1, borderColor: "rgba(56,189,248,0.3)" }}>
                <Text style={{ fontSize: 26 }}>{wisdomItem.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#38bdf8", fontSize: 11, fontWeight: "800", letterSpacing: 0.8, marginBottom: 4 }}>
                  {wisdomItem.type === "quote" ? wisdomItem.authorRole : wisdomItem.type === "psych" ? wisdomItem.category.replace(/-/g, " ") : "טיפ"}
                </Text>
                <Text style={{ ...RTL_STYLE, color: "#e0f2fe", fontSize: 14, fontWeight: "500", lineHeight: 20 }} numberOfLines={3}>
                  {wisdomItem.text}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Spacer to push button to bottom */}
        <View style={{ flex: 1 }} />

        {/* CONTINUE button, hidden until chest is claimed.
            Names the next lesson explicitly — sessions showed users closing
            the app right after summary because the generic "המשך" didn't
            signal there was anything waiting on the other side. */}
        {chestClaimed !== false && (
          <Animated.View entering={FadeIn.duration(300)} style={{ width: "100%", marginBottom: 16 }}>
            <AnimatedPressable
              onPress={onContinue}
              style={{
                width: "100%",
                backgroundColor: unitColors.bg,
                borderRadius: 18,
                paddingVertical: 18,
                paddingHorizontal: 16,
                alignItems: "center",
                borderBottomWidth: 4,
                borderBottomColor: unitColors.bottom,
                shadowColor: unitColors.glow,
                shadowOpacity: 0.4,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
              }}
              accessibilityRole="button"
              accessibilityLabel={nextModule ? `המשך לשיעור הבא: ${nextModule.title}` : "המשך"}
            >
              <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <View style={{ width: 24, height: 24, overflow: "hidden" }} accessible={false}>
                  <LottieView
                    source={require("../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json")}
                    style={{ width: 24, height: 24 }}
                    autoPlay
                    loop
                  />
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  {nextModule ? (
                    <>
                      <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 }} numberOfLines={1}>
                        השיעור הבא
                      </Text>
                      <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "900", letterSpacing: 0.3, textAlign: "center" }} numberOfLines={1}>
                        {nextModule.title}
                      </Text>
                    </>
                  ) : (
                    <Text style={{ color: "#ffffff", fontSize: 19, fontWeight: "900", letterSpacing: 1 }}>המשך</Text>
                  )}
                </View>
              </View>
            </AnimatedPressable>
          </Animated.View>
        )}
      </View>
    </View>
  );
}


/* ------------------------------------------------------------------ */
/*  ChestFlyToSlot, chest icon flies from center to inventory         */
/* ------------------------------------------------------------------ */

const UNLOCK_MINUTES: Record<ChestRarity, number> = {
  common: 15,
  rare: 180,
  epic: 480,
};

function ChestFlyToSlot({
  visible,
  rarity,
  onFinish,
}: {
  visible: boolean;
  rarity: ChestRarity | null;
  onFinish: () => void;
}) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (!visible || !rarity) return;

    // Reset
    scale.value = 1.2;
    opacity.value = 1;
    translateY.value = 0;
    rotate.value = 0;

    // Phase 1: Slight bounce at center (0-300ms)
    scale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 300 }),
      withDelay(200, withSpring(0.4, { damping: 12, stiffness: 80 })),
    );

    // Phase 2: Fly downward to inventory area (300-900ms)
    translateY.value = withDelay(
      200,
      withSpring(320, { damping: 14, stiffness: 80 }),
    );

    // Spin slightly while flying
    rotate.value = withDelay(
      200,
      withTiming(360, { duration: 600 }),
    );

    // Phase 3: Fade out at destination
    opacity.value = withDelay(700, withTiming(0, { duration: 300 }));

    // Grant chest to inventory + dismiss
    const timeout = setTimeout(() => {
      const grantChest = useRetentionStore.getState().grantChest;
      grantChest({
        id: `chest-${Date.now()}`,
        name: rarity === "epic" ? "Epic Chest" : rarity === "rare" ? "Rare Chest" : "Silver Chest",
        rarity,
        unlockTimeMinutes: UNLOCK_MINUTES[rarity],
      });
      successHaptic();
      onFinish();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [visible, rarity]);

  if (!visible || !rarity) return null;

  // Mystery reveal (Yoav 17/06): the chest flies to inventory as a NEUTRAL
  // sealed box — its rarity is no longer spoiled here; it's revealed only when
  // the user opens it. (rarity is still read above to gate the animation.)
  const chestIcon = "📦";

  const flyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <View style={chestFlyStyles.overlay} pointerEvents="none">
      <Animated.View style={[chestFlyStyles.chestContainer, flyStyle]}>
        <Text style={chestFlyStyles.chestEmoji}>{chestIcon}</Text>
        <Text style={chestFlyStyles.label}>→ תיבות שלך</Text>
      </Animated.View>
    </View>
  );
}

const chestFlyStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 91,
  },
  chestContainer: {
    alignItems: "center",
    gap: 8,
  },
  chestEmoji: {
    fontSize: 64,
    textShadowColor: "rgba(212, 160, 23, 0.8)",
    textShadowRadius: 20,
    textShadowOffset: { width: 0, height: 0 },
  },
  label: {
    color: "#facc15",
    fontSize: 14,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 2 },
  },
});

/* ------------------------------------------------------------------ */
/*  SlotsFullModal, prompt when all 4 chest slots are occupied         */
/* ------------------------------------------------------------------ */

const INSTANT_OPEN_GEM_COST = 10;

function SlotsFullModal({
  visible,
  rarity,
  onGemOpen,
  onDiscard,
}: {
  visible: boolean;
  rarity: ChestRarity | null;
  onGemOpen: () => void;
  onDiscard: () => void;
}) {
  const { data: economyDataGem } = useEconomy();
  const gems = economyDataGem?.gems ?? 0;
  const canAfford = gems >= INSTANT_OPEN_GEM_COST;

  if (!visible || !rarity) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={slotsFullStyles.backdrop} accessibilityViewIsModal>
        <View style={slotsFullStyles.card}>
          <Text style={slotsFullStyles.icon}>📦</Text>
          <Text style={slotsFullStyles.title} accessibilityRole="header">התיבות מלאות!</Text>
          <Text style={slotsFullStyles.subtitle}>
            כל 4 המשבצות תפוסות. פתח תיבה ישנה עכשיו או וותר על התיבה החדשה.
          </Text>

          <AnimatedPressable
            style={[
              slotsFullStyles.gemButton,
              !canAfford && slotsFullStyles.gemButtonDisabled,
            ]}
            onPress={() => {
              if (canAfford) onGemOpen();
            }}
            disabled={!canAfford}
            accessibilityRole="button"
            accessibilityLabel={`פתח תיבה, ${INSTANT_OPEN_GEM_COST} ג׳מים`}
            accessibilityState={{ disabled: !canAfford }}
          >
            <Text style={slotsFullStyles.gemButtonText}>
              💎 פתח תיבה, {INSTANT_OPEN_GEM_COST} ג׳מים
            </Text>
            {!canAfford && (
              <Text style={slotsFullStyles.insufficientText}>
                (חסרים {INSTANT_OPEN_GEM_COST - gems} ג׳מים)
              </Text>
            )}
          </AnimatedPressable>

          <AnimatedPressable style={slotsFullStyles.discardButton} onPress={onDiscard} accessibilityRole="button" accessibilityLabel="ויתור על התיבה">
            <Text style={slotsFullStyles.discardButtonText}>🗑️ ויתור</Text>
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

const slotsFullStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#a855f7",
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    writingDirection: "rtl",
    marginBottom: 8,
  },
  subtitle: {
    color: "#a0a0b8",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 22,
    marginBottom: 24,
  },
  gemButton: {
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#a855f7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  gemButtonDisabled: {
    backgroundColor: "#3a3a4e",
    shadowOpacity: 0,
    elevation: 0,
  },
  gemButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    writingDirection: "rtl",
  },
  insufficientText: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    writingDirection: "rtl",
  },
  discardButton: {
    backgroundColor: "transparent",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#555",
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: "100%",
    alignItems: "center",
  },
  discardButtonText: {
    color: "#888",
    fontSize: 15,
    fontWeight: "700",
    writingDirection: "rtl",
  },
});

const quizStreakPopupStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(14,165,233,0.92)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    zIndex: 100,
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    writingDirection: "rtl",
  },
});

/* ------------------------------------------------------------------ */
/*  SimIntroOverlay, intro card before simulation starts               */
/* ------------------------------------------------------------------ */

function SimIntroOverlay({
  title,
  description,
  onStart,
  unitColors,
}: {
  title: string;
  description: string;
  onStart: () => void;
  unitColors: { bg: string; dim: string; glow: string; bottom: string };
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 14,
      }}
    >
      {/* Finn + speech bubble */}
      <View style={{ flexDirection: "row-reverse", alignItems: "flex-start", gap: 10, width: "100%", marginBottom: 20 }}>
        <ExpoImage source={FINN_HELLO} accessible={false} style={{ width: 80, height: 80, flexShrink: 0 }} contentFit="contain" />

        <View style={{
          flex: 1, backgroundColor: "#ffffff", borderRadius: 20, borderTopRightRadius: 4,
          padding: 18, borderWidth: 1, borderColor: "#e2e8f0",
          shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 }, elevation: 4,
        }}>
          <View style={{ position: "absolute", top: 16, right: -7, width: 0, height: 0,
            borderLeftWidth: 7, borderTopWidth: 6, borderBottomWidth: 6,
            borderLeftColor: "#ffffff", borderTopColor: "transparent", borderBottomColor: "transparent",
          }} />
          <Text style={{
            fontSize: 20, fontWeight: "900", color: "#0f172a",
            textAlign: "right", writingDirection: "rtl", marginBottom: 6,
          }}>
            {title}
          </Text>
          <Text style={{
            fontSize: 16, fontWeight: "600", color: "#475569",
            ...JUSTIFY_RTL, lineHeight: 24,
          }}>
            {description}
          </Text>
        </View>
      </View>

      {/* Start button */}
      <AnimatedPressable
        onPress={onStart}
        style={{
          width: "100%",
          backgroundColor: unitColors.bg,
          borderRadius: 18,
          paddingVertical: 16,
          alignItems: "center",
          borderBottomWidth: 4,
          borderBottomColor: unitColors.bottom,
          shadowColor: unitColors.bg,
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
        accessibilityRole="button"
        accessibilityLabel="התחל סימולציה"
      >
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900" }}>
          בואו נתחיל!
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  LessonFlowScreen                                                   */
/* ------------------------------------------------------------------ */

const CHAPTER_DATA_MAP: Record<string, typeof chapter1Data> = {
  "chapter-0": chapter0Data,
  "chapter-1": chapter1Data,
  "chapter-2": chapter2Data,
  "chapter-3": chapter3Data,
  "chapter-4": chapter4Data,
  "chapter-5": chapter5Data,
};

// Hoisted to module scope: ordered chapter list for the access gate. Was
// rebuilt every render inside the component (PERF). Both chapter0Data and
// chapter1Data are typed `: Chapter`, so no cast is needed.
const ALL_CHAPTERS_ORDERED = [chapter0Data, chapter1Data, chapter2Data, chapter3Data, chapter4Data, chapter5Data];

const LESSON_COLORS: Record<string, { bg: string; dim: string; glow: string; bottom: string }> = {
  "chapter-0": { bg: "#3b82f6", dim: "#dbeafe", glow: "#93c5fd", bottom: "#1d4ed8" },
  "chapter-1": { bg: "#3b82f6", dim: "#dbeafe", glow: "#93c5fd", bottom: "#1d4ed8" },
  "chapter-2": { bg: "#38bdf8", dim: "#e0f2fe", glow: "#7dd3fc", bottom: "#0284c7" },
  "chapter-3": { bg: "#2563eb", dim: "#dbeafe", glow: "#93c5fd", bottom: "#1d4ed8" },
  "chapter-4": { bg: "#4f46e5", dim: "#e0e7ff", glow: "#a5b4fc", bottom: "#4338ca" },
  "chapter-5": { bg: "#7c3aed", dim: "#ede9fe", glow: "#c4b5fd", bottom: "#6d28d9" },
};
const DEFAULT_UNIT_COLORS = LESSON_COLORS["chapter-3"]; // fallback ocean blue

/** Convert chapter data id ("chapter-1") → store key ("ch-1") */
function chapterStoreKey(chapterId: string): string {
  return `ch-${chapterId.split("-")[1]}`;
}

export function LessonFlowScreen() {
  const isFocused = useIsFocused();
  const { id, chapterId, replay, startPhase, returnTo, cardFilter, ttProgress } = useLocalSearchParams<{
    id: string;
    chapterId?: string;
    replay?: string;
    /** Topic-tree pilot (R4 2026-06-09): when present, the lesson jumps
     *  STRAIGHT to this phase on mount instead of running the regular
     *  hero/video/intro chain. Used by DuoLearnScreen's chip-tap handler
     *  so chips open the legacy LessonFlowScreen at the matching phase
     *  with all the host chrome intact (chat, shark callouts, bottom bar). */
    startPhase?: string;
    /** Topic-tree exit signal — when 'topic-tree', the lesson does NOT
     *  advance to the next phase on phase-complete. Instead it
     *  router.back()'s with `?completedPhase=X` so DuoLearnScreen can
     *  mark the matching topic done. */
    returnTo?: string;
    /** R5 cards/tutorial-video split — 'video' keeps only videoUri
     *  flashcards (tutorial-video chip), 'non-video' filters them out
     *  (regular cards chip). */
    cardFilter?: string;
    /** "למידה רציפה" (Yoav 2026-06-11): when '1', this is the continuous
     *  "autopilot" run of the WHOLE module (no startPhase/returnTo, so it
     *  plays like master). Tells the lesson to stamp each completed phase
     *  into useTopicProgressStore as it advances, so a mid-flow exit still
     *  lights up the matching chips back in the accordion. */
    ttProgress?: string;
  }>();
  const isReplay = replay === '1';
  // Energy is OFF for mod-0-1 (brand-new users meet the first lesson with zero
  // lives friction); ON from mod-0-1b onward. Gates every in-lesson spend below.
  const energyOn = isEnergyEnabledForModule(id);
  const router = useRouter();
  /** Return to the learn map. Under the root <Stack> the map is still mounted
   *  beneath this lesson, so dismissTo POPS back to it — no remount / "flash",
   *  and it carries any ?openPearl= param through (Yoav 2026-06-11: fast,
   *  premium transitions). Cold start (no back-history) falls back to a fresh
   *  replace. The store-signal chip-completion path (returnTo=topic-tree) has
   *  its own router.back() above; this covers the module-completion returns. */
  const returnToMap = useCallback((path: string = "/(tabs)/index") => {
    if (router.canGoBack()) router.dismissTo(path as never);
    else router.replace(path as never);
  }, [router]);
  /** Module-first v1 (Yoav 5.7.26): the earned mod-0-1 threshold chest opens
   *  AT the lesson→profiling seam — instant gratification at the win moment —
   *  instead of waiting on the post-onboarding map. null = not showing. */
  const [handoffChest, setHandoffChest] = useState<{
    xp: number; coins: number; energy: number; rarity: TTChestRarity; thresholdPct: number;
  } | null>(null);

  /** Grant the mod-0-1 threshold chest at the module-first handoff — the SAME
   *  stamp + rarity roll + rewards + completion records the accordion chest
   *  performs on the map, so the accordion's own chest (guarded by
   *  modulesPastThreshold) can never double-fire afterwards. Returns false
   *  when already stamped (resume after a mid-modal kill) — the caller then
   *  navigates without repeating the ceremony or the rewards. */
  function grantHandoffChest(): boolean {
    if (!mod) return false;
    const progress = useTopicProgressStore.getState();
    if (!progress.stampModuleThreshold('mod-0-1')) return false;
    // Chest lifecycle (Yoav 11.7): the grant DECIDED. chest_presented fires
    // from inside ChestCelebrationModal on actual render — earned>0 with
    // presented=0 is the white-screen-class alarm. activation_reached is the
    // stable one-per-user activation marker (stamp is atomic → single fire).
    try { track({ name: 'chest_earned', props: { module_id: 'mod-0-1', source: 'inline' } }); } catch { /* non-fatal */ }
    try { track({ name: 'activation_reached', props: { module_id: 'mod-0-1', via: 'inline_chest' } }); } catch { /* non-fatal */ }
    // Full completion record — dedupe, lesson_completed, streak, server sync.
    completeModule('mod-0-1');
    const { multiplier, rarity } = progress.recordChestOpen();
    const coins = Math.round(MODULE_TT_COINS * multiplier * CHEST_RARITY_BONUS[rarity]);
    try {
      useEconomyUIStore.getState().addXP(MODULE_TT_XP, 'daily_task');
      useEconomyUIStore.getState().addCoins(coins, 'lesson');
    } catch { /* non-fatal */ }
    try { useHeartsStore.getState().grantEnergy(CHEST_ENERGY_REWARD, 'chest'); } catch { /* non-fatal */ }
    successHaptic();
    try { playSound('modal_open_3'); } catch { /* non-fatal */ }
    // Same event shape as the accordion chest so every chest funnel and the
    // chest-completion metric keep counting this open. NOTE: for v1 this
    // fires PRE-onboarding — the compound experiment read pairs it with
    // onboarding_completed (see banditConfig).
    try {
      track({
        name: 'chest_opened',
        props: {
          module_id: 'mod-0-1',
          chapter_id: 'chapter-0',
          rarity,
          xp: MODULE_TT_XP,
          coins,
          offered_don: false,
          offered_quit: false,
          reveal_variant: 'mystery',
        },
      });
    } catch { /* non-fatal */ }
    const topics = resolveTopics(mod);
    const thresholdPct = Math.round((chipsToChestFor('mod-0-1', Math.max(1, topics.length)) / Math.max(1, topics.length)) * 100);
    setHandoffChest({ xp: MODULE_TT_XP, coins, energy: CHEST_ENERGY_REWARD, rarity, thresholdPct });
    // Tomorrow-chest (RETENTION-SPRINT 2026-07-06): the handoff chest arms
    // tomorrow's sealed chest too, so module-first v1 users get the same
    // day-2 appointment as control's accordion chest. Arming pre-onboarding
    // is fine — the ready ceremony itself gates on hasCompletedOnboarding.
    try { useTomorrowChestStore.getState().armForTomorrow('handoff_chest'); } catch { /* non-fatal */ }
    return true;
  }

  /** Close the handoff chest → v1 pre-onboarding continues to profiling;
   *  everyone else (the INLINE mod-0-1 chest, panel item 4, Yoav 8.7) returns
   *  to the live map exactly like the premium chip-return path. */
  /** When set, the inline chest's "המשך" resumes the auto-flow from this
   *  chip (the post-chest chips: shark-dilemma → game → …) instead of
   *  returning to the map (Yoav 11.7). */
  const postChestResumeRef = useRef<TopicKind | null>(null);

  function closeHandoffChest() {
    try { track({ name: 'chest_closed', props: { module_id: 'mod-0-1', source: 'inline' } }); } catch { /* non-fatal */ }
    // In-lesson continuation: resume straight into the next chip.
    const resumeFrom = postChestResumeRef.current;
    if (resumeFrom) {
      postChestResumeRef.current = null;
      setHandoffChest(null);
      advanceFromChip(resumeFrom);
      return;
    }
    setHandoffChest(null);
    if (isModuleFirstArm() && useTutorialStore.getState().firstRunStage === 'profiling') {
      router.replace('/(auth)/onboarding' as never);
      return;
    }
    if (router.canGoBack()) {
      useTopicTreeReturnStore.getState().signalReturn({
        completedPhase: phase,
        completedModuleId: id ?? '',
        expandedModule: id ?? '',
      });
      router.back();
    } else {
      returnToMap("/(tabs)/index");
    }
  }

  /** Module-first first-run (onboarding_module_first v1, Yoav 5.7.26): ANY
   *  exit from mod-0-1 while the guest is still pre-onboarding must hand off
   *  to ProfilingFlow instead of the map — the map is blocked pre-onboarding,
   *  so a map navigation would get bounced by the _layout guard right back
   *  into this lesson (an infinite trap). Covers the auto-flow chest-threshold
   *  exit, back-button bails, and the post-module nav paths. Returns true when
   *  it navigated / took ownership of navigation (callers must stop theirs). */
  function maybeHandoffToProfiling(trigger: string): boolean {
    if (id !== 'mod-0-1') return false;
    if (!isModuleFirstArm()) return false;
    const tut = useTutorialStore.getState();
    if (tut.firstRunStage !== 'module') return false;
    // Flip the stage BEFORE any UI: from here on, a kill resumes into
    // profiling (the chest rewards, once granted, are not re-earnable).
    tut.setFirstRunStage('profiling');
    try { captureEvent('onboarding_module_first_handoff', { trigger }); } catch { /* non-fatal */ }
    // Natural threshold completion → open the earned chest HERE (Yoav 5.7.26:
    // the reward lands at the win moment, not after profiling). The modal's
    // close CTA performs the navigation. Bails (back / force-exit) skip the
    // ceremony — their chest fires later from the accordion, like control's.
    if (trigger === 'chest_threshold' && grantHandoffChest()) return true;
    router.replace('/(auth)/onboarding' as never);
    return true;
  }
  /** Safe back: go back if possible, otherwise fall back to tabs home */
  function safeGoBack() {
    // Show the "stay another minute" confirm during a long contiguous session:
    // the legacy linear flow, OR the new auto-flow (Yoav 2026-06-25 — auto-flow
    // chains the chips into one long session again, so leaving mid-flow DOES lose
    // real momentum; the per-chip skip from 2026-06-11 no longer applies here).
    if (
      (returnTo !== 'topic-tree' || autoFlow)
      && (phase === "flashcards" || phase === "interactive-recall" || phase === "quizzes" || phase === "sim")
    ) {
      setShowExitConfirm(true);
      return;
    }
    if (maybeHandoffToProfiling('back')) return;
    if (router.canGoBack()) {
      router.back();
    } else {
      returnToMap("/(tabs)/index");
    }
  }

  function forceExit() {
    try { captureEvent('lesson_exited_early', { lesson_id: id ?? null, chapter_id: chapterId ?? null, reason: 'back_button', phase }); } catch { /* non-fatal */ }
    // Mark mod-0-1 complete on any exit so the user never gets stuck on it
    if (id === 'mod-0-1') completeModule('mod-0-1');
    setShowExitConfirm(false);
    if (maybeHandoffToProfiling('force_exit')) return;
    if (router.canGoBack()) router.back();
    else returnToMap("/(tabs)/index");
  }
  const safeInsets = useSafeAreaInsets();
  const [activeGlossaryTerm, setActiveGlossaryTerm] = useState<string | null>(null);
  const [showChatOverlay, setShowChatOverlay] = useState(false);

  const mod: Module | undefined = useMemo(() => {
    if (chapterId && CHAPTER_DATA_MAP[chapterId]) {
      return CHAPTER_DATA_MAP[chapterId].modules.find((m) => m.id === id);
    }
    // Fallback: search all chapters
    for (const chapter of Object.values(CHAPTER_DATA_MAP)) {
      const found = chapter.modules.find((m) => m.id === id);
      if (found) return found;
    }
    return undefined;
  }, [id, chapterId]);

  useEffect(() => {
    if (mod) {
      captureEvent('lesson_started', {
        module_id: mod.id,
        // Schema unification (11.7): registry declared lesson_id, emitters
        // sent module_id — now both carry the same value everywhere.
        lesson_id: mod.id,
        chapter_id: chapterId ?? null,
        is_replay: isReplay,
        // 2026-06-04: mod-0-1 was split into mod-0-1 (short, first half)
        // + mod-0-1b (continuation). module_variant lets PostHog funnels
        // measure the NEW short module's completion rate without mixing
        // with the historical long-version data. Absent for every other
        // module so existing dashboards keep working unchanged.
        ...(mod.id === 'mod-0-1' ? { module_variant: 'short' } :
            mod.id === 'mod-0-1b' ? { module_variant: 'continuation' } :
            {}),
      });
    }
  }, [mod, chapterId, isReplay]);

  const unitColors = LESSON_COLORS[chapterId ?? ""] ?? DEFAULT_UNIT_COLORS;

  // Collect all remote image URIs for the current module so we can prefetch
  // them in the background as soon as the lesson screen mounts.
  const prefetchUris = useMemo<readonly string[]>(() => {
    if (!mod) return [];
    const modNum = mod.id.replace("mod-", ""); // e.g. "1-5" from "mod-1-5"
    const cardPrefix = `fc-${modNum}-`;
    const uris: string[] = [];

    function addUri(src: unknown): void {
      if (!src) return;
      if (typeof src === "string") { uris.push(src); return; }
      if (typeof src === "object") {
        const u = (src as Record<string, unknown>).uri;
        if (typeof u === "string") uris.push(u);
      }
    }

    addUri(MODULE_HERO_MAP[mod.id]);
    addUri(MODULE_INFOGRAPHIC_MAP[mod.id]);

    // All summary/payslip cards belonging to this module
    for (const [k, v] of Object.entries(SUMMARY_MAP)) {
      if (k.startsWith(cardPrefix)) addUri(v);
    }

    // Per-flashcard imageUrl fields (URI-based only; require() numbers are local)
    for (const fc of mod.flashcards) addUri(fc.imageUrl);

    // Per-flashcard memeImage (the funny shark images that "break routine"
    // alongside the celebrating webp). Hosted remotely on Vercel Blob and
    // surprisingly slow on first paint without prefetch — Apple/Android both
    // need the file in disk cache before the user reaches the meme card.
    for (const fc of mod.flashcards) {
      const meme = (fc as { memeImage?: { uri?: string } | number }).memeImage;
      if (meme && typeof meme === "object" && typeof meme.uri === "string") {
        addUri(meme.uri);
      }
    }

    // Per-card infographic PNGs from FlashcardInfographic
    for (const [k, v] of Object.entries(INFOGRAPHIC_MAP)) {
      if (k.startsWith(cardPrefix)) addUri(v);
    }

    // Finn character art for this module's cards
    for (const [k, v] of Object.entries(FINN_MAP)) {
      if (k.startsWith(cardPrefix)) addUri(v);
    }

    return [...new Set(uris)];
  }, [mod]);

  // Remote mp4 URIs to predownload into the file cache for instant playback.
  const prefetchVideoUris = useMemo<readonly string[]>(() => {
    if (!mod) return [];
    const videos: string[] = [];
    const hook = mod.videoHookAsset as { uri?: string } | number | undefined;
    if (hook && typeof hook === "object" && typeof hook.uri === "string") videos.push(hook.uri);
    const post = MODULE_POST_VIDEO_MAP[mod.id];
    if (typeof post === "string") videos.push(post);
    const inter = mod.interModuleVideoAsset as { uri?: string } | number | undefined;
    if (inter && typeof inter === "object" && typeof inter.uri === "string") videos.push(inter.uri);
    for (const fc of mod.flashcards) {
      if (typeof fc.videoUri === "string") videos.push(fc.videoUri);
    }
    return [...new Set(videos)];
  }, [mod]);

  // Intro audio (MP3 on Vercel Blob). Prefetched in parallel with images and
  // videos so useIntroAudio can read it from the file cache instead of cold-
  // downloading on mount — eliminates the silent-Finn period that drove the
  // `intro_audio_delayed` event spike.
  // INTRO ONLY on purpose: audioReady (the intro-narration go-signal) must not
  // wait on any other file — card audio is warmed separately below.
  const prefetchAudioUris = useMemo<readonly string[]>(() => {
    if (!mod?.introAudio?.uri) return [];
    return [mod.introAudio.uri];
  }, [mod]);

  // Warm the first flashcards' narration (topAudio) fire-and-forget — ים
  // 2026-07-02: the shark went silent on card 1 while its MP3 cold-fetched,
  // right after the intro on the activation path. First 4 only; the shared
  // download pool (3 slots, dedup, FIFO behind the intro audio already queued)
  // keeps this under the Vercel-Blob burst limit while later cards fetch as
  // the user reads the early ones. Does NOT touch audioReady.
  useEffect(() => {
    (mod?.flashcards ?? []).slice(0, 4).forEach((fc) => {
      prefetchModuleAudio(fc.topAudio?.uri);
    });
  }, [mod]);
  const { imagesReady, audioReady } = useModulePrefetch(prefetchUris, prefetchVideoUris, prefetchAudioUris);

  // When the user finishes the intro, we'd like the first flashcard's image
  // already cached so they don't stare at a blank box. Block the transition
  // until imagesReady — but cap the wait so a slow CDN never strands the user
  // on the intro. Cap 4000→1500ms (ים 2026-07-02): this sits on the
  // intro→cards seam of the activation path; a slightly-later image pop-in
  // beats a long full-screen wait. SharkLoader's content_loader_shown
  // (context 'intro_to_cards') measures the real durations + %hit_cap.
  const POST_INTRO_CAP_MS = 1500;
  const [pendingPostIntroPhase, setPendingPostIntroPhase] = useState<FlowPhase | null>(null);
  useEffect(() => {
    if (!pendingPostIntroPhase) return;
    if (imagesReady) {
      setPhase(pendingPostIntroPhase);
      setPendingPostIntroPhase(null);
      return;
    }
    const t = setTimeout(() => {
      setPhase(pendingPostIntroPhase);
      setPendingPostIntroPhase(null);
    }, POST_INTRO_CAP_MS);
    return () => clearTimeout(t);
  }, [pendingPostIntroPhase, imagesReady]);

  const handleIntroStart = useCallback(() => {
    if (!mod) return;
    // mod-0-1 LEGACY (non-auto-flow) onboarding: bounce to the map after the
    // intro so the user picks the next chip manually. Under the new auto-flow
    // (returnTo==='topic-tree', Yoav 2026-06-25) we do NOT bounce — the intro
    // flows straight into the cards / sentence-completion IN-LESSON, like every
    // other module, so the first lesson is continuous ("מקושר וברצף, לא בנפרד").
    if (mod.id === 'mod-0-1' && returnTo !== 'topic-tree') {
      router.replace(
        `/(tabs)/learn?completedPhase=intro&completedModuleId=${encodeURIComponent(mod.id)}&expandedModule=${encodeURIComponent(mod.id)}&onboardingPhase=welcome` as never,
      );
      return;
    }
    const target: FlowPhase =
      SIM_FIRST_MODULE_IDS.has(mod.id) && MODULES_WITH_SIM.has(mod.id) ? "sim" : "flashcards";
    if (imagesReady) {
      setPhase(target);
    } else {
      setPendingPostIntroPhase(target);
    }
  }, [mod, imagesReady, router, returnTo]);

  // Mark "in-lesson" so the Daily Bridge nudge (and any other session-level
  // CTA) knows not to interrupt the user mid-module.
  useEffect(() => {
    useNudgeQueueStore.getState().setInLesson(true);
    return () => {
      useNudgeQueueStore.getState().setInLesson(false);
    };
  }, []);

  const isPro = useIsPro();
  const heartsCount = useHeartsStore((s) => s.getHearts());
  const recordQuizAnswer = useChapterUIStore((s) => s.recordQuizAnswer);
  const saveResume = useChapterUIStore((s) => s.saveResume);
  const clearResume = useChapterUIStore((s) => s.clearResume);
  const setCurrentChapter = useChapterUIStore((s) => s.setCurrentChapter);
  const setCurrentModule = useChapterUIStore((s) => s.setCurrentModule);
  const { data: progressData } = useProgress();
  const { mutate: upsertProgress } = useUpsertModuleProgress();
  const quizResults = useChapterUIStore((s) => s.quizResults);
  // Streak: record on any lesson completion so the user only enters the streak
  // system once they've actually engaged with content (used to fire at the end
  // of onboarding — but with D1 retention ~7%, most users never came back and
  // their "streak" was meaningless / led to confusing at-risk nudges).
  const recordDailyActivity = useRecordDailyActivity();

  // Keep UI nav store in sync with the currently-viewed chapter
  useEffect(() => {
    if (chapterId) setCurrentChapter(chapterStoreKey(chapterId));
  }, [chapterId, setCurrentChapter]);

  // completeModule: server-sync + telemetry + XP/coins (mirrors old store action)
  const MODULE_COMPLETE_XP = 30;
  const completeModule = useCallback((moduleId: string) => {
    // Guard: skip if already completed (server is source of truth)
    const alreadyDone = getCompletedModulesSync(chapterStoreKey(chapterId ?? 'chapter-1'));
    if (alreadyDone.includes(moduleId)) return;

    // Telemetry event
    const totalCompletedBefore = (queryClient.getQueryData<import('../../lib/api/progress').ModuleProgressRow[]>(progressQueryKey) ?? [])
      .filter((m) => m.status === 'completed').length;
    captureEvent('lesson_completed', {
      module_id: moduleId,
      // Schema unification (11.7): both keys, same value — see lesson_started.
      lesson_id: moduleId,
      chapter_id: chapterId ?? '',
      is_first_lesson: totalCompletedBefore === 0,
      total_completed: totalCompletedBefore + 1,
      // 2026-06-04: pair with lesson_started.module_variant so the
      // post-split mod-0-1 + mod-0-1b can be funneled separately from
      // the historical long-version data. See lesson_started above.
      ...(moduleId === 'mod-0-1' ? { module_variant: 'short' } :
          moduleId === 'mod-0-1b' ? { module_variant: 'continuation' } :
          {}),
    });

    // Durable local completion record — unlocks the next module immediately and
    // survives stale/empty server refetches + cold starts (see useProgress.ts).
    useCompletedModulesStore.getState().markCompleted(moduleId);

    // 2026-06-04: base XP + coins (30 XP + 150 coins) used to fire here.
    // Moved to the chest onPress handler so the GlobalWealthHeader's flying
    // animation fires AFTER the user taps the chest — not on summary-phase
    // entry. Pre-tap flying made the chest feel passive (user complaint
    // "rewards fly without me touching anything"). Telemetry + server sync
    // below still fire on summary entry so completion records aren't lost
    // for a user who exits before tapping.

    // Streak: idempotent per day, so calling on every lesson completion is safe.
    try { recordDailyActivity.mutate(); } catch (e) { if (__DEV__) console.warn('[streak] recordDailyActivity failed:', e); }

    // AI telemetry
    const quiz = useChapterUIStore.getState().quizResults[moduleId];
    useAITelemetryStore.getState().addEvent('module_complete', moduleId, {
      correct: quiz ? quiz.correct > 0 : null,
      meta: {
        quizCorrect: quiz?.correct ?? 0,
        quizTotal: quiz?.total ?? 0,
      },
    });

    // Perfect-lesson bonus: 0 quiz mistakes → +2 energy (not on replay).
    if (!isReplay && quiz && quiz.total > 0 && quiz.correct === quiz.total) {
      const grantedPerfect = useHeartsStore.getState().grantEnergy(2, 'perfect-lesson');
      if (grantedPerfect > 0) { try { captureEvent('combo_energy_earned', { granted: grantedPerfect, source: 'perfect-lesson' }); } catch { /* non-fatal */ } }
    }

    // Server sync (optimistic via upsertProgress)
    upsertProgress({
      moduleId,
      status: 'completed',
      quizScore: quiz?.correct,
      quizAttempts: quiz?.total,
      bestScore: quiz?.correct,
      xpEarned: MODULE_COMPLETE_XP,
    });
  }, [chapterId, upsertProgress, recordDailyActivity, isReplay]);

  const { isMuted, toggleMute } = useLessonMusic();
  const safeTimeout = useTimeoutCleanup();

  // Bookmark state
  const isSaved = useSavedItemsStore((s) => s.isSaved);
  const removeItem = useSavedItemsStore((s) => s.removeItem);
  const addItem = useSavedItemsStore((s) => s.addItem);
  const bookmarkId = id ? `lesson-${id}` : "";
  const isBookmarked = isSaved(bookmarkId);
  const showUpgradeModal = useUpgradeModalStore((s) => s.show);

  const handleBookmarkPress = useCallback(() => {
    if (!isPro) {
      showUpgradeModal("saved_items");
      return;
    }
    if (!mod || !id) return;
    if (isBookmarked) {
      removeItem(bookmarkId);
    } else {
      addItem({
        id: bookmarkId,
        type: "lesson",
        title: mod.title,
        chapterId: chapterId ? Number(chapterId) : undefined,
        moduleId: id,
      });
    }
  }, [isPro, isBookmarked, bookmarkId, mod, id, chapterId, showUpgradeModal, removeItem, addItem]);

  // Check if this module is accessible (in sequence or PRO)
  // ALL_CHAPTERS_ORDERED hoisted to module scope (see top of file).
  // Subscribe to the durable local completion store so the gate re-evaluates the
  // instant a module is marked complete (getCompletedModulesSync unions it in).
  const localCompletedIds = useCompletedModulesStore((s) => s.completedIds);
  const isModuleAccessible = useMemo(() => {
    if (isPro) return true;
    if (!chapterId) return true; // no chapter context, allow
    const chapterIdx = ALL_CHAPTERS_ORDERED.findIndex((c) => c.id === chapterId);
    if (chapterIdx < 0) return true;
    for (let ci = 0; ci < chapterIdx; ci++) {
      const prev = ALL_CHAPTERS_ORDERED[ci];
      const prevCompleted = getCompletedModulesSync(chapterStoreKey(prev.id));
      if (!prev.modules.every((m) => m.comingSoon || PRO_LOCKED_SIMS.has(m.id) || prevCompleted.includes(m.id))) return false;
    }
    const chapter = ALL_CHAPTERS_ORDERED[chapterIdx];
    const modIdx = chapter.modules.findIndex((m) => m.id === id);
    if (modIdx < 0) return true;
    const completed = getCompletedModulesSync(chapterStoreKey(chapter.id));
    for (let mi = 0; mi < modIdx; mi++) {
      if (chapter.modules[mi].comingSoon) continue;
      if (PRO_LOCKED_SIMS.has(chapter.modules[mi].id)) continue;
      if (!completed.includes(chapter.modules[mi].id)) return false;
    }
    return true;
  }, [isPro, chapterId, id, progressData, localCompletedIds]);

  const [showProGate, setShowProGate] = useState(false);

  // Guard: show locked modal immediately if module isn't accessible
  /** After hook video → check access before proceeding */
  const advanceFromVideo = useCallback(() => {
    if (isModuleAccessible) {
      setPhase("intro");
    } else {
      setPhase("intro"); // exit video phase so proGateModal can render
      setShowProGate(true);
    }
  }, [isModuleAccessible]);

  /**
   * Maps a just-completed module to the profile question we want to ask after it.
   * Returns null if the user already answered that field (skip-on-known) or if
   * the module has no associated question.
   */
  function pendingProfileQuestionFor(moduleId: string): ProfileQuestionKind | null {
    // Snapshot read — called from event handlers (lesson complete), not during render.
    // Subscribing via the hook would add re-renders for no benefit.
    const profile = useAuthStore.getState().profile;
    // Mapping moved (2026-05-30 swap): mod-0-1 now teaches financial basics
    // (was mod-0-2). The knowledgeLevel question is asked INLINE right after
    // mod-0-1's last quiz (see advanceQuiz) so it feels like a continuation of
    // onboarding rather than a post-module modal. The mod-0-2 entry below is
    // intentionally removed to avoid double-asking.
    if (moduleId === "mod-0-3" && !profile?.learningTime) return "learningTime";
    if (moduleId === "mod-0-4" && !profile?.dailyGoalMinutes) return "dailyGoal";
    return null;
  }

  /**
   * Returns the same destination URL that goToNextSequentialModule would have
   * navigated to if this were a registered user. Used as `returnTo` when the
   * guest accepts the register CTA, so after registration they continue with
   * the next lesson in the sequence instead of landing on the learn map.
   */
  function getNextRouteAfterRegister(): string {
    if (id === 'mod-1-9') return '/tower-defense-boss';
    if (chapterId && currentModIdx >= 0 && currentModIdx + 1 < chapterModules.length) {
      const next = chapterModules[currentModIdx + 1];
      if (!next.comingSoon && (isPro || !PRO_LOCKED_SIMS.has(next.id))) {
        return lessonRouteFor(next, chapterId);
      }
    }
    for (const ch of ALL_CHAPTERS_ORDERED) {
      const completed = getCompletedModulesSync(chapterStoreKey(ch.id));
      const nextIdx = ch.modules.findIndex((m) => !m.comingSoon && (isPro || !PRO_LOCKED_SIMS.has(m.id)) && !completed.includes(m.id));
      if (nextIdx >= 0) {
        return lessonRouteFor(ch.modules[nextIdx], ch.id);
      }
    }
    return '/(tabs)';
  }

  /** Navigate past mod-0-1 to the next incomplete module (called from register nudge buttons) */
  function navigateToNextModuleNormally() {
    // Force-complete mod-0-1 before navigating so we never loop back to it.
    if (id === 'mod-0-1') completeModule('mod-0-1');
    // Module-first v1 defense-in-depth: any post-module nav pre-onboarding
    // goes to profiling, not the (blocked) map.
    if (maybeHandoffToProfiling('post_module_nav')) return;

    // Pearl gate — if the just-completed module has a pearl after it, drop
    // the user on the learn map with `?openPearl=<moduleId>` so DuoLearnScreen
    // auto-opens the pearl sheet. The pearl sheet has its own "דלג על
    // הפנינה" footer that advances to the next module, so the user always
    // has both paths (complete the pearl OR skip it). Skipping the pearl
    // sheet via X just returns to the learn map (pearl stays optional).
    if (id) {
      const pearl = pearlConfigFor(id);
      if (pearl) {
        // Park the learn cursor on the current chapter so the map opens to
        // the right place behind the pearl sheet.
        const chapterStoreId = chapterStoreKey(pearl.chapterId);
        setCurrentChapter(chapterStoreId);
        // Find the index of the just-completed module in its chapter so the
        // cursor highlights the right node behind the pearl modal.
        const chapter = ALL_CHAPTERS_ORDERED.find((c) => c.id === pearl.chapterId);
        const myIdx = chapter ? chapter.modules.findIndex((m) => m.id === id) : -1;
        if (myIdx >= 0) setCurrentModule(myIdx);
        // Route to the Learn screen explicitly. (tabs)/_layout sets
        // initialRouteName="investments", so a bare /(tabs)?openPearl=... lands
        // on Investments and the openPearl listener (lives only in DuoLearnScreen,
        // index/learn) never sees the param — the pearl would never auto-open.
        returnToMap(`/(tabs)/index?openPearl=${id}`);
        return;
      }
    }

    // After mod-0-1 specifically, return to the main learn map with the
    // cursor parked on mod-0-2, instead of auto-playing the next lesson.
    // (mod-0-1 also has a pearl now, so this branch is unreachable in
    // practice — kept as a safety net.)
    if (id === 'mod-0-1') {
      setCurrentChapter('ch-0');
      setCurrentModule(1);
      returnToMap("/(tabs)/index");
      return;
    }
    for (const ch of ALL_CHAPTERS_ORDERED) {
      const completed = getCompletedModulesSync(chapterStoreKey(ch.id));
      const nextIdx = ch.modules.findIndex((m) => !m.comingSoon && (isPro || !PRO_LOCKED_SIMS.has(m.id)) && !completed.includes(m.id));
      if (nextIdx >= 0) {
        const nextMod = ch.modules[nextIdx];
        setCurrentChapter(chapterStoreKey(ch.id));
        setCurrentModule(nextIdx);
        router.replace(lessonRouteFor(nextMod, ch.id) as never);
        return;
      }
    }
    returnToMap("/(tabs)/index");
  }

  /** Navigate to user's next sequential module */
  function goToNextSequentialModule() {
    // Graduate Onboarding gate: if this module owns a profile question and the
    // user hasn't answered it yet, show the question first. The question's
    // onDone callback re-invokes this function, which will then short-circuit
    // (profile is now populated, pendingProfileQuestionFor returns null).
    //
    // The askedRef guard prevents an infinite re-show loop: tapping "דלג" (skip)
    // on the question calls onDone WITHOUT setting the profile field, so without
    // this guard pendingProfileQuestionFor would keep returning the same kind and
    // re-open the modal forever. We ask each module's question at most once per
    // visit — skip or answer both then fall through to the next step.
    if (id) {
      const q = pendingProfileQuestionFor(id);
      if (q && profileQuestionAskedRef.current !== id) {
        profileQuestionAskedRef.current = id;
        setProfileQuestionKind(q);
        return;
      }
    }
    // mod-0-1: clean lesson, no signup popup. Just drop back to the learn map.
    // Earlier behavior: nudge fired here for guests, but that overwhelmed users
    // right after their first taste of content.
    if (id === 'mod-0-1') {
      navigateToNextModuleNormally();
      return;
    }
    // After mod-0-1b (non-Pro): show the Pro paywall once, before mod-0-2.
    // Moved here from the post-walkthrough slot (2026-06-11) — analytics showed
    // the old early paywall fired before the user got value: ~38% of onboarders
    // hit it during module 0-1 and first-module completion cratered. Now the
    // user finishes the full intro module (0-1 + 0-1b) first, THEN sees the
    // paywall; both dismiss and purchase route forward to mod-0-2 via returnTo,
    // so they always continue. Shown a single time.
    if (id === 'mod-0-1b' && !isPro && !useUsageStore.getState().hasSeenMod01bPaywall) {
      useUsageStore.getState().markMod01bPaywallSeen();
      try { captureEvent('paywall_viewed', { paywall: 'post_mod_0_1b', source: 'post_mod_0_1b' }); } catch { /* non-fatal */ }
      const mod02 = chapterModules.find((m) => m.id === 'mod-0-2');
      const returnTo = mod02
        ? lessonRouteFor(mod02, 'chapter-0')
        : '/lesson/mod-0-2?chapterId=chapter-0&startPhase=intro&returnTo=topic-tree';
      router.replace(`/pricing?returnTo=${encodeURIComponent(returnTo)}` as never);
      return;
    }
    // Register CTA cadence (guests only): fire after mod-0-2/3/4/5, but ONLY on
    // odd-indexed modules (mod-0-2, mod-0-4) where the PostCelebration "Netflix?"
    // modal doesn't fire. This prevents the two end-of-module modals from stacking
    // on the same module (mod-0-3 and mod-0-5 are even-indexed and own the Netflix
    // slot). User can dismiss; we re-prompt the next time the odd slot lines up.
    if (isGuest && (id === 'mod-0-2' || id === 'mod-0-3' || id === 'mod-0-4' || id === 'mod-0-5') && currentModIdx % 2 !== 0) {
      try { captureEvent('register_cta_shown', { module_id: id, source: 'lesson' }); } catch { /* non-fatal */ }
      setShowRegisterNudge(true);
      return;
    }
    // After mod-0-4 (non-guest, non-Pro): show the Pro paywall once, before
    // mod-0-5. Both dismiss and purchase route forward to mod-0-5 via the
    // returnTo param, so the user is never stranded on the paywall. Guests are
    // handled by the register CTA above and skip this. Shown a single time.
    if (id === 'mod-0-4' && !isPro && !useUsageStore.getState().hasSeenMod04Paywall) {
      useUsageStore.getState().markMod04PaywallSeen();
      // Use `paywall_viewed` (the canonical event used by StarterPackModal,
      // IAPModal, PricingScreen) instead of the legacy `paywall_shown` name.
      // The two-name split fragmented funnels — all paywall surfaces now land
      // on the same event with `paywall` / `source` properties for breakdown.
      try { captureEvent('paywall_viewed', { paywall: 'post_mod_0_4', source: 'post_mod_0_4' }); } catch { /* non-fatal */ }
      const mod05 = chapterModules.find((m) => m.id === 'mod-0-5');
      const returnTo = mod05
        ? lessonRouteFor(mod05, 'chapter-0')
        : '/lesson/mod-0-5?chapterId=chapter-0&startPhase=intro&returnTo=topic-tree';
      router.replace(`/pricing?returnTo=${encodeURIComponent(returnTo)}` as never);
      return;
    }
    // After completing the Emergency Fund module, route to the Tower Defense boss.
    // Skip on replay — the boss/interstitial is a one-time first-pass beat, not
    // something the user wants to redo every time they revisit the module.
    if (id === 'mod-1-9' && !isReplay) {
      router.replace("/tower-defense-boss" as never);
      return;
    }
    // (Removed 2026-06-01: BullshitSwipe interstitial after mod-0-3 was cut
    //  per user request — go straight to mod-0-4 / Budget Balance via the
    //  normal pearl + next-module flow below. The /interstitial/bullshit-ch0
    //  route is now orphan; safe to delete in a follow-up.)
    // Pearl gate — if the just-completed module has a pearl after it, drop
    // the user on the learn map with `?openPearl=<moduleId>` so DuoLearnScreen
    // auto-opens the pearl sheet. Was missing on this path (only
    // navigateToNextModuleNormally had it, which only fires from mod-0-1) —
    // so users on mod-0-2 → mod-0-3 transition never saw the pearl auto-open
    // (user bug report 2026-05-31). Now every chapter-0 module triggers its
    // pearl on Continue.
    if (id) {
      const pearl = pearlConfigFor(id);
      if (pearl) {
        const chapterStoreId = chapterStoreKey(pearl.chapterId);
        setCurrentChapter(chapterStoreId);
        const chapter = ALL_CHAPTERS_ORDERED.find((c) => c.id === pearl.chapterId);
        const myIdx = chapter ? chapter.modules.findIndex((m) => m.id === id) : -1;
        if (myIdx >= 0) setCurrentModule(myIdx);
        // Route to /(tabs)/index explicitly — (tabs)/_layout has
        // initialRouteName="investments", so a bare /(tabs)?openPearl=...
        // lands on Investments and the openPearl listener never sees it.
        returnToMap(`/(tabs)/index?openPearl=${id}`);
        return;
      }
    }
    // Prefer the next module in the current chapter, by index. The global
    // search below can regress to the just-completed module because completion
    // may not be persisted yet when this runs.
    //
    // 2026-05-30: Route to the learn map (not directly to the next lesson)
    // so the user lands on the path with the just-unlocked Pearl visible
    // beside the next module — opt-in bonus content gets a fair chance.
    // The setCurrentChapter / setCurrentModule calls keep the auto-scroll
    // logic in DuoLearnScreen parked on the right row.
    if (chapterId && currentModIdx >= 0 && currentModIdx + 1 < chapterModules.length) {
      const next = chapterModules[currentModIdx + 1];
      if (!next.comingSoon && (isPro || !PRO_LOCKED_SIMS.has(next.id))) {
        setCurrentChapter(chapterStoreKey(chapterId));
        setCurrentModule(currentModIdx + 1);
        // Land on Learn map (index tab), NOT default tabs route — the tabs
        // layout has initialRouteName="investments" so "/(tabs)" sends the
        // user to the Investments tab instead of seeing the next module
        // highlighted on the learn map (QA blocker 2026-05-31).
        returnToMap("/(tabs)/index");
        return;
      }
    }
    for (const ch of ALL_CHAPTERS_ORDERED) {
      const completed = getCompletedModulesSync(chapterStoreKey(ch.id));
      const nextIdx = ch.modules.findIndex((m) => !m.comingSoon && (isPro || !PRO_LOCKED_SIMS.has(m.id)) && !completed.includes(m.id));
      if (nextIdx >= 0) {
        const nextMod = ch.modules[nextIdx];
        setCurrentChapter(chapterStoreKey(ch.id));
        setCurrentModule(nextIdx);
        returnToMap("/(tabs)/index");
        return;
      }
    }
    returnToMap("/(tabs)/index");
  }

  const [phase, setPhase] = useState<FlowPhase>(() => {
    // Topic-tree pilot (R4 → R5.6): explicit startPhase from query
    // overrides everything else — replay checkpoints, video hooks,
    // hero. Used when DuoLearnScreen's topic chip taps deep-link
    // straight into a phase. R5.6 (2026-06-10) widens the allowed set
    // from just RESTORABLE_PHASES + intro/video/hero to every
    // user-tappable phase, so taps on the sim / infographic /
    // post-video chips actually land at those phases instead of
    // silently falling back to intro (Yoav: "הסרטון לא נפתח", "לא
    // כל דבר פותח את מה שהוא אמור").
    const ALLOWED_START_PHASES = new Set<string>([
      'hero', 'video', 'intro',
      'flashcards', 'interactive-recall', 'quizzes',
      'sim-intro', 'sim', 'game',
      'podcast', 'couple-dilemma',
      'module-infographic', 'post-infographic-video',
      'shark-dilemma',
    ]);
    if (startPhase && ALLOWED_START_PHASES.has(startPhase)) {
      return startPhase as FlowPhase;
    }
    // On replay (user explicitly chose "do it again"), ignore the resume
    // checkpoint — they want to start from intro, not pick up at quizzes.
    const r = !isReplay && mod?.id ? useChapterUIStore.getState().moduleResume[mod.id] : undefined;
    if (r && RESTORABLE_PHASES.has(r.phase as FlowPhase)) return r.phase as FlowPhase;
    if (mod?.videoHookAsset) return "video";
    if (mod?.id && MODULE_HERO_MAP[mod.id]) return "hero";
    return "intro";
  });
  const setVideoPlaying = useAudioStore((s) => s.setVideoPlaying);

  useEffect(() => {
    setVideoPlaying(phase === "video" || phase === "post-infographic-video" || phase === "mid-quiz-video");
    // Reset the global audio-duck flag on unmount-during-video so it never
    // leaks "video playing" into the next screen.
    return () => setVideoPlaying(false);
  }, [phase]);

  // remember the entry phase. The moment the lesson advances past it (the
  // user finished the phase + tapped next), bounce back to DuoLearnScreen
  // with `?completedPhase=X` so the topic tree can mark the matching topic
  // done. Auto-advances (hero→video→intro) aren't a concern because chips
  // always deep-link to a concrete user-facing phase.
  const tt_initialPhaseRef = useRef<FlowPhase | null>(returnTo === 'topic-tree' ? phase : null);
  const tt_exitFiredRef = useRef(false);
  // Auto-flow (Yoav 2026-06-25): instead of bouncing to the map after EVERY
  // chip, flow straight to the next chip (the pre-chips continuous momentum)
  // and only return to the map when the chip just finished crosses the chest
  // threshold — so the chest + debrief + next module fire there. Map = opt-in.
  // Replays still return per-chip. AUTO_FLOW_ENABLED is a kill-switch.
  const AUTO_FLOW_ENABLED = true;
  const autoFlow = AUTO_FLOW_ENABLED && returnTo === 'topic-tree' && !isReplay;
  // Mirror the accordion's mod-0-1 chest gate so auto-flow returns for the chest
  // only AFTER the inline knowledgeLevel question (shown right after the quiz by
  // advanceQuiz) is resolved — keeping the order quiz → question → chest (Yoav 25.6).
  const mod01KnowledgeResolved = useTutorialStore((s) => s.mod01KnowledgeResolved);
  const profileKnowledgeLevel = useAuthStore((s) => s.profile?.knowledgeLevel);
  const mod01QuestionResolved = id !== 'mod-0-1' || Boolean(profileKnowledgeLevel) || mod01KnowledgeResolved;
  useEffect(() => {
    if (returnTo !== 'topic-tree') return;
    if (tt_exitFiredRef.current) return;
    if (!tt_initialPhaseRef.current) return;
    if (phase === tt_initialPhaseRef.current) return;
    // The chip we were tracking just completed (the phase machine already
    // advanced to `phase` via its own next-handler).
    const completed = tt_initialPhaseRef.current;
    // R5.5: flashcards phase covers two chips — 'cards' and
    // 'tutorial-video' — disambiguated by cardFilter.
    const completedKind =
      completed === 'flashcards' && cardFilter === 'video' ? 'tutorial-video'
      : completed === 'flashcards' && cardFilter === 'non-video' ? 'cards'
      : '';

    if (autoFlow && mod) {
      // Mark the completed chip, then keep flowing unless the chest threshold
      // is crossed (count-based 50% mod-0-1 / 75% others).
      const markKind = completedKind ? (completedKind as TopicKind) : TT_PHASE_TO_KIND[completed];
      const topics = resolveTopics(mod);
      const topic = markKind ? topics.find((t) => t.kind === markKind) : undefined;
      if (topic) useTopicProgressStore.getState().markTopicCompleted(topic, 'continuous');
      const summary = useTopicProgressStore.getState().summaryForModule(mod.id, topics);
      // Exit only when the chest would actually fire — threshold crossed AND
      // (mod-0-1) the inline knowledgeLevel question resolved. So the auto-flow
      // runs quiz → knowledgeLevel question → chest, in that order.
      const chipsToChest = chipsToChestFor(mod.id, topics.length);
      // The chest opens ONLY on the chip that first CROSSES the threshold (count-
      // based), gated for mod-0-1 by the knowledgeLevel question. AFTER the chest
      // the auto-flow KEEPS going chip-to-chip (no per-chip map detour) all the way
      // to 100% (Yoav 2026-06-25) — the user opted in by tapping "continue".
      // Exit as soon as the threshold is REACHED (>=), not only on the single
      // exact-crossing transition. tt_exitFiredRef already guarantees ONE fire,
      // so ">=" is both safe AND robust — the old exact-crossing check could miss
      // the threshold (count off by one at the crossing) and run the whole module
      // through to the legacy summary chest (part of the 2026-06-27 mod-0-2 bug).
      const reachedChest = summary.completed >= chipsToChest;
      const moduleComplete = summary.total > 0 && summary.completed >= summary.total;
      // POST-CHEST CONTINUITY (Yoav 11.7: "שממשיכים ללמוד במודולה אחרי התיבה
      // צריך ברצף עד סיום ולא אחד אחד"): once the threshold chest was ALREADY
      // granted (stamped), later chips must keep auto-flowing — the old
      // `>= threshold` exit re-fired on EVERY post-chest chip and bounced the
      // user to the map after each one. The exit now belongs only to the
      // un-stamped crossing (the chest moment itself) or to 100%.
      const alreadyStamped = Boolean(useTopicProgressStore.getState().modulesPastThreshold[mod.id]);
      const chestReady = reachedChest && mod01QuestionResolved && !alreadyStamped;
      const shouldExit = chestReady || moduleComplete;
      if (!shouldExit) {
        // Fire the "עוד X לתיבה" callout (pop+confetti) once per real chip — only
        // BEFORE the chest (post-chest the chest is open, so the count is moot).
        // (mod-0-1b's energy intro now fires on MODULE ENTRY — see the mount effect
        // above — not here, so it no longer depends on the fragile completed===1.)
        if (topic && summary.completed < chipsToChest) {
          setCalloutRemaining(Math.max(1, chipsToChest - summary.completed));
          setCalloutSeq((s) => s + 1);
        }
        // Keep flowing — pre-chest chips, the pending knowledgeLevel question, OR
        // post-chest chips on the way to 100%. Track the new phase to re-fire.
        tt_initialPhaseRef.current = phase;
        bumpTtSeam((t) => t + 1); // force the guard-release re-render (see decl)
        return;
      }
      // 100% → bonus gold + XP. RewardAnimationProvider (app-root) auto-detects the
      // economy bump and flies the reward to the home header (Yoav 2026-06-25:
      // "שתעוף לו במסך הבית זהב+XP"). Fires once — only the chip that reaches 100%.
      if (moduleComplete) {
        try {
          useEconomyUIStore.getState().addCoins(50, 'lesson');
          useEconomyUIStore.getState().addXP(50, 'lesson_complete');
        } catch { /* non-fatal */ }
      }
      // Chest crossed OR module 100% → fall through to return to the map; the
      // accordion (un-suppressed on unmount) fires the chest debrief there.
    }

    // Return to the map: chip-mode after every chip, or auto-flow at the chest.
    tt_exitFiredRef.current = true;
    // Module-first v1: the chest-threshold exit is the natural end of the
    // pre-onboarding module — hand off to profiling. The earned chest fires
    // from the accordion when the user reaches the map AFTER profiling+tour
    // (state-based: threshold crossed + unstamped), so the reward isn't lost —
    // it's the pull that carries them through the questions.
    if (maybeHandoffToProfiling('chest_threshold')) return;
    // INLINE mod-0-1 chest (panel item 4, Yoav 8.7): the threshold chest now
    // opens HERE, at the win moment — no map detour. The lesson→chest seam was
    // the biggest in-module leak (30-35% never reached the accordion chest on
    // the map). Explicitly re-gated on the REAL threshold + the knowledgeLevel
    // question (this exit path also runs in chip-mode after EVERY chip — the
    // grant must never fire early). grantHandoffChest stamps
    // modulesPastThreshold, so the map accordion can never double-fire;
    // closeHandoffChest routes back to the live map. mod-0-1 only — deeper
    // modules keep the map debrief.
    if (id === 'mod-0-1' && mod && mod01QuestionResolved) {
      const inlineTopics = resolveTopics(mod);
      const inlineDone = useTopicProgressStore.getState().summaryForModule('mod-0-1', inlineTopics).completed;
      if (inlineDone >= chipsToChestFor('mod-0-1', inlineTopics.length) && grantHandoffChest()) return;
    }
    // Premium return (Yoav 2026-06-11): under the root <Stack> the topic-tree
    // map is still mounted beneath this lesson. Signal the completion to the
    // map's store and router.back() — popping this lesson so the user lands on
    // the LIVE map (no remount / "flash"), a fast smooth transition. Only on a
    // cold start (no back-history) fall back to the URL-param replace, which
    // the map's cold-start consumer handles. back() also satisfies the original
    // "drop the half-finished lesson from history" intent — it's popped.
    if (router.canGoBack()) {
      useTopicTreeReturnStore.getState().signalReturn({
        completedPhase: completed,
        completedModuleId: id ?? '',
        completedKind: completedKind || undefined,
        expandedModule: id ?? '',
      });
      router.back();
    } else {
      const kindParam = completedKind ? `&completedKind=${encodeURIComponent(completedKind)}` : '';
      const path = `/(tabs)/learn?completedPhase=${encodeURIComponent(completed)}&completedModuleId=${encodeURIComponent(id ?? '')}&expandedModule=${encodeURIComponent(id ?? '')}${kindParam}`;
      router.replace(path as never);
    }
  }, [phase, returnTo, id, router, cardFilter, autoFlow, mod, mod01QuestionResolved]);

  // While an auto-flow run is mounted, flag its module so the TopicTreeAccordion
  // beneath suppresses its OWN threshold chest (it would otherwise pop OVER the
  // running lesson). Cleared on unmount → the accordion fires its single chest
  // on the map when we return at the threshold.
  useEffect(() => {
    if (!autoFlow || !id) return;
    useContinuousRunStore.getState().setActive(id);
    return () => { useContinuousRunStore.getState().clear(); };
  }, [autoFlow, id]);

  // Per-chip VIEW telemetry (ים 2026-07-02): stamp the chip whose content the
  // user actually entered. Complements the store's topic_completed so PostHog
  // reads per-kind pass-through (topic_viewed → topic_completed) — the black
  // box behind "~35% of lesson entrants never reach the chest" opens here.
  // Re-entering a phase re-fires deliberately: a revisit IS a view.
  useEffect(() => {
    if (!mod) return;
    const kind = TT_PHASE_TO_KIND[phase];
    if (!kind) return;
    const topic = resolveTopics(mod).find((t) => t.kind === kind);
    if (!topic) return;
    try {
      track({
        name: 'topic_viewed',
        props: {
          module_id: mod.id,
          topic_id: topic.id,
          topic_kind: topic.kind,
          chapter_id: typeof chapterId === 'string' ? chapterId : undefined,
          via: autoFlow ? 'continuous' : 'chip',
        },
      });
    } catch { /* non-fatal */ }
    // Only a real phase change (or module swap) should re-fire — autoFlow/
    // chapterId are stable for the lesson's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mod]);

  // "למידה רציפה" per-phase progress sync (Yoav 2026-06-11). When the
  // continuous "autopilot" flow is active (ttProgress=1, no topic-tree
  // params → master-style linear run), stamp each phase the user FINISHES
  // into useTopicProgressStore as we leave it. Marking on phase-LEAVE (not
  // enter) means we only credit a phase the user actually completed, so a
  // mid-flow exit lights up exactly the chips they cleared — letting them
  // start in autopilot and switch to the broken-down accordion mid-way.
  // Continuous-run "autopilot" (ttProgress=1) was REMOVED 2026-06-19 — the app is
  // chip-only now. HARD kill-switch so a STALE ttProgress=1 link/route can't
  // silently auto-run a whole module (Yoav 2026-06-19: it ran the credit module
  // on its own). Every effect below gates on ttProgressActive → all become
  // no-ops, so the module runs as a normal lesson. ttProgress/returnTo stay
  // referenced so the disable is explicit (flip to re-enable — don't).
  const CONTINUOUS_RUN_ENABLED = false;
  const ttProgressActive = CONTINUOUS_RUN_ENABLED && ttProgress === '1' && returnTo !== 'topic-tree';
  const ttPrevPhaseRef = useRef<FlowPhase | null>(ttProgressActive ? phase : null);
  useEffect(() => {
    if (!ttProgressActive || !mod) return;
    const prev = ttPrevPhaseRef.current;
    ttPrevPhaseRef.current = phase;
    if (!prev || prev === phase) return;
    const kind = TT_PHASE_TO_KIND[prev];
    if (kind) {
      const topic = resolveTopics(mod).find((t) => t.kind === kind);
      if (topic) {
        useTopicProgressStore.getState().markTopicCompleted(topic, 'continuous');
        continuousChipsMarkedRef.current += 1;
      }
    }
    // Yoav 2026-06-11 (rev 3): the previous design stamped the 70%
    // threshold on continuous-run summary so the accordion would NOT
    // re-fire its chest on return — but the LEGACY chest was still
    // visible BEFORE we returned (gated only on returnTo !== 'topic-tree',
    // which is false in continuous mode). Net effect: user saw the
    // legacy chest, dismissed it, returned to the map, and the
    // accordion's chest immediately fired again → two chests in a row.
    // The accordion's ChestCelebrationModal is the preferred UX, so we
    // now suppress the LEGACY chest in continuous mode (render gate
    // below) and SKIP the stamp here, letting the accordion fire its
    // single chest on return.
  }, [phase, ttProgressActive, mod]);

  // "למידה רציפה" mid-run guard: while THIS continuous run is mounted, flag
  // its module so the (still-mounted, store-subscribed) TopicTreeAccordion
  // beneath us suppresses its OWN threshold chest. Without this, the moment
  // the run crosses 70% mid-lesson the accordion's ChestCelebrationModal
  // (a RN Modal) pops OVER the running lesson. Cleared on unmount — on return
  // the accordion fires its single chest as the canonical reward.
  // Analytics: lifecycle bracketed by continuous_run_completed (when phase
  // reaches summary) and continuous_run_exited (any other unmount).
  const continuousRunStartMsRef = useRef<number | null>(null);
  const continuousRunCompletedRef = useRef(false);
  const continuousChipsMarkedRef = useRef(0);
  useEffect(() => {
    if (!ttProgressActive || !id) return;
    useContinuousRunStore.getState().setActive(id);
    continuousRunStartMsRef.current = Date.now();
    continuousRunCompletedRef.current = false;
    continuousChipsMarkedRef.current = 0;
    // continuous_run_started — fire from the lifecycle owner (here) so it
    // brackets continuous_run_completed/exited SYMMETRICALLY and fires for
    // EVERY entry path (autopilot key, jump-here, a direct ttProgress=1 URL),
    // not only TopicTreeAccordion's key. The key-only wiring fired `started`
    // just 1× vs 15 completed/exited, so the D7 retention cohort read ~0
    // (Moni 2026-06-14).
    try {
      captureEvent('continuous_run_started', {
        module_id: id,
        chapter_id: chapterId ?? null,
      });
    } catch { /* non-fatal */ }
    return () => {
      const startMs = continuousRunStartMsRef.current ?? Date.now();
      const duration_ms = Date.now() - startMs;
      if (!continuousRunCompletedRef.current) {
        try {
          captureEvent('continuous_run_exited', {
            module_id: id,
            chapter_id: chapterId ?? null,
            phase,
            chips_marked_this_run: continuousChipsMarkedRef.current,
            duration_ms,
          });
        } catch { /* non-fatal */ }
      }
      useContinuousRunStore.getState().clear();
    };
  }, [ttProgressActive, id]);
  // Bracket the completed event from the same place we auto-exit: when the
  // continuous run reaches phase=summary (= the user actually finished the
  // module front-to-back), stamp `completed` first so the unmount cleanup
  // suppresses the redundant `exited` event.
  useEffect(() => {
    if (!ttProgressActive) return;
    if (phase !== 'summary') return;
    if (continuousRunCompletedRef.current) return;
    continuousRunCompletedRef.current = true;
    // Reachability fix (Yoav 2026-06-15: "במודולה 0-1 פתיחת התיבה כן עבדה"):
    // a full front-to-back continuous run finished the module, but the per-phase
    // LEAVE marking never credits the FINAL phase (it transitions straight into
    // summary) and the optional `chat` chip is never opened during a run. So a
    // complete run could end stuck just below the 70% gate → the accordion's
    // single chest never fired. mod-0-1 / mod-0-2 slipped through only because
    // their gate is 50%, which is why those felt fine. Credit every CONTENT
    // topic here so isModuleDone is reliably true across all thresholds; `chat`
    // stays excluded — it's marked only on real chat entry. Idempotent, so chips
    // already lit by the LEAVE effect are no-ops.
    if (mod) {
      resolveTopics(mod).forEach((t) => {
        if (t.kind !== 'chat') {
          useTopicProgressStore.getState().markTopicCompleted(t, 'continuous');
        }
      });
    }
    const startMs = continuousRunStartMsRef.current ?? Date.now();
    try {
      captureEvent('continuous_run_completed', {
        module_id: id,
        chapter_id: chapterId ?? null,
        duration_ms: Date.now() - startMs,
      });
    } catch { /* non-fatal */ }
    // Completion side-effects that the LEGACY summary chest's onPress used to
    // run. In continuous mode that chest never renders (gate below) and the
    // legacy completeModule effect is skipped (the accordion owns the single
    // lesson_completed + upsert + chest on return) — so without these calls a
    // continuous run lost its daily-activity credit, kept a stale resume
    // pointer, and never recorded duration (code-review 2026-06-12 P0).
    // Reward parity note: XP/coins intentionally NOT granted here — the
    // accordion's ChestCelebrationModal is the canonical reward, same as the
    // chip path. Only the quiz-skill streak bonus is kept (earned in-run).
    if (!isReplay && id) {
      if (peakStreak >= 3) {
        const bonusMultiplier = peakStreak >= 7 ? 1.0 : peakStreak >= 5 ? 0.75 : 0.5;
        useEconomyUIStore.getState().addXP(Math.round(30 * bonusMultiplier), "streak_bonus");
      }
      // Local daily-task counter + server streak day, both idempotent.
      try { markDailyActivityCompleted(); } catch { /* non-fatal */ }
      clearResume(id);
      const durationSec = Math.round((Date.now() - moduleStartTimeRef.current) / 1000);
      if (durationSec >= 5 && durationSec <= 7200) {
        apiRecordModuleDuration(id, durationSec)
          .then(() => queryClient.invalidateQueries({ queryKey: userStatsQueryKey }))
          .catch(() => { /* fire-and-forget */ });
      }
    }
    // peakStreak + moduleStartTimeRef are declared LATER in the component —
    // referencing them in the deps array would evaluate during render (TDZ
    // crash). Closure reads inside the callback are safe (run post-render),
    // and the value is final by the time phase reaches 'summary'.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttProgressActive, phase, id, chapterId, isReplay, clearResume]);

  // "למידה רציפה" auto-exit on summary (Yoav 2026-06-11 rev 3). The legacy
  // summary chest is now hidden in continuous mode (render gate below), so we
  // need to actively bounce back to the topic-tree map — otherwise the screen
  // sits blank after the last chip's phase resolves. On unmount the continuous
  // guard above clears, and the accordion fires its own ChestCelebrationModal
  // as the single canonical reward.
  useEffect(() => {
    if (!ttProgressActive) return;
    if (phase !== 'summary') return;
    // Small delay so any in-flight phase-leave side effects (recall stamping,
    // analytics) settle before we navigate away.
    const t = setTimeout(() => returnToMap("/(tabs)/index"), 120);
    return () => clearTimeout(t);
  }, [ttProgressActive, phase, returnToMap]);

  // mod-0-1 inline-chest seam (Yoav 8.7, hardened 10.7). The auto-flow opens the
  // mod-0-1 chest IN-LESSON right after the quiz + "איך הרגשת עם החומר?"
  // (knowledgeLevel) question. It used to rely purely on the Effect-A phase-
  // transition race (the seam above), which routes through the hidden `summary`
  // phase — and `summary` renders NOTHING on returnTo=topic-tree (see the summary
  // render gate). If that grant was ever missed, the user was stranded on a blank
  // `summary` with no chest and no navigation → a WHITE SCREEN "instead of the
  // chest". This fires the chest DECLARATIVELY from state whenever mod-0-1 reaches
  // the terminal seam, independent of the transition timing. Idempotent: once
  // stampModuleThreshold records it, the guard below short-circuits, so it can
  // never double-fire (and the accordion's own chest stays suppressed).
  useEffect(() => {
    if (returnTo !== 'topic-tree' || isReplay) return;
    if (id !== 'mod-0-1' || !mod) return;
    if (phase !== 'summary') return;           // the terminal seam of the auto-flow
    if (handoffChest) return;                  // chest already on screen
    if (useTopicProgressStore.getState().modulesPastThreshold['mod-0-1']) return; // already granted
    // We're at the end of mod-0-1's content — mark every content chip done so the
    // threshold/reward records are consistent, then open the inline chest.
    resolveTopics(mod).forEach((t) => {
      if (t.kind !== 'chat') useTopicProgressStore.getState().markTopicCompleted(t, 'continuous');
    });
    if (mod01QuestionResolved && grantHandoffChest()) return; // chest now showing inline
    // Question not yet resolved (or grant no-op) → bounce to the map so the
    // accordion fires the canonical chest. Never leave the blank summary white.
    if (tt_exitFiredRef.current) return;
    tt_exitFiredRef.current = true;
    returnToMap("/(tabs)/index");
  }, [returnTo, isReplay, id, mod, phase, handoffChest, mod01QuestionResolved, returnToMap]);

  // Topic-tree safety net (Yoav 2026-06-27): under the chip auto-flow the chest
  // exits at the threshold (seam above) and the user never reaches the legacy
  // `summary`. But if a topic-tree module ever lands here anyway (count fell
  // short of the threshold, or a future entry point slips through without
  // returnTo=topic-tree being honored), we must NEVER render the OLD
  // end-of-lesson chest. Mark every content chip done (the lesson reached its
  // end) and bounce to the map so the accordion fires its single canonical
  // chest. Gated on the LIVE flag (returnTo), not the dead ttProgressActive.
  useEffect(() => {
    if (returnTo !== 'topic-tree' || isReplay) return;
    if (phase !== 'summary') return;
    if (id === 'mod-0-1') return; // mod-0-1's summary seam is owned by the inline-chest effect above
    if (tt_exitFiredRef.current) return;
    tt_exitFiredRef.current = true;
    if (mod) {
      resolveTopics(mod).forEach((t) => {
        if (t.kind !== 'chat') {
          useTopicProgressStore.getState().markTopicCompleted(t, 'continuous');
        }
      });
    }
    returnToMap("/(tabs)/index");
  }, [returnTo, isReplay, phase, mod, id, returnToMap]);

  // Fire once per lesson session when the user actually reaches the summary
  // screen — closes the funnel gap between lesson_started and lesson_completed
  // (some users see the summary then bail before claiming the chest).
  const summaryViewedFiredRef = useRef(false);
  useEffect(() => {
    if (phase === "summary" && mod && !summaryViewedFiredRef.current) {
      summaryViewedFiredRef.current = true;
      try { captureEvent('lesson_summary_viewed', { lesson_id: mod.id, chapter_id: chapterId ?? null }); } catch { /* non-fatal */ }
    }
  }, [phase, mod, chapterId]);

  // Detect navigation away mid-lesson (user tapped a tab, swipe-back, deep
  // link, etc.) — distinct from `forceExit` which only covers the explicit
  // exit-confirm flow. Together they should account for nearly all bails.
  const ACTIVE_LESSON_PHASES = new Set<FlowPhase>(["flashcards", "interactive-recall", "quizzes", "sim", "summary"]);
  const wasFocusedRef = useRef(true);
  useEffect(() => {
    if (wasFocusedRef.current && !isFocused && mod && ACTIVE_LESSON_PHASES.has(phase) && phase !== "summary") {
      try { captureEvent('lesson_exited_early', { lesson_id: mod.id, chapter_id: chapterId ?? null, reason: 'navigation', phase }); } catch { /* non-fatal */ }
    }
    wasFocusedRef.current = isFocused;
  }, [isFocused, mod, chapterId, phase]);

  // Show Pro gate for locked modules, but only after video finishes
  useEffect(() => {
    if (mod && !isModuleAccessible && phase !== "video") {
      setShowProGate(true);
    }
  }, [mod, isModuleAccessible, phase]);
  const [flashcardIndex, setFlashcardIndex] = useState(() => {
    // A cardFilter chip ('video' / 'non-video') targets a SPECIFIC subset of
    // cards, not a resume continuation. Honoring the resume checkpoint here is
    // a bug: if the saved index is PAST the target card (e.g. the video at
    // index 2, but resume=5 from a prior cards run), the forward-only jump
    // effect below never finds it and bumps to the end — the video silently
    // never plays ("הסרטון לא נפתח" in mod-1-1). Start at 0 for filtered chips
    // so the forward search reliably lands on the first matching card.
    if (cardFilter === 'video' || cardFilter === 'non-video') return 0;
    const r = !isReplay && mod?.id ? useChapterUIStore.getState().moduleResume[mod.id] : undefined;
    return (r && RESTORABLE_PHASES.has(r.phase as FlowPhase)) ? r.flashcardIndex : 0;
  });

  // R5.5 (2026-06-10) — topic-tree flashcards filter. Two modes:
  //   cardFilter='non-video' (cards chip) — skip videoUri flashcards
  //   cardFilter='video' (tutorial-video chip) — skip non-video cards
  // Whenever the current flashcard doesn't match the desired class,
  // jump to the next matching one; if none remain, bump past the end
  // so the "end of flashcards → next phase" path fires and the
  // topic-tree exit effect takes over.
  useEffect(() => {
    if (returnTo !== 'topic-tree') return;
    if (cardFilter !== 'non-video' && cardFilter !== 'video') return;
    if (phase !== 'flashcards') return;
    if (!mod) return;
    const flashcards = mod.flashcards;
    const matches = (i: number) => {
      const isVideo = Boolean(flashcards[i]?.videoUri);
      return cardFilter === 'video' ? isVideo : !isVideo;
    };
    if (flashcardIndex >= flashcards.length) return;
    if (matches(flashcardIndex)) return;
    for (let j = flashcardIndex + 1; j < flashcards.length; j++) {
      if (matches(j)) {
        setFlashcardIndex(j);
        return;
      }
    }
    setFlashcardIndex(flashcards.length);
  }, [phase, flashcardIndex, cardFilter, returnTo, mod]);

  // Podcast injection — appears between flashcards (at midpoint). Replays naturally
  // if the user navigates back to the trigger card; no one-shot lockout.
  const modPodcast = useMemo(() => (mod?.id ? getPodcastForModule(mod.id) : undefined), [mod?.id]);
  /** Last flashcard index AFTER which the podcast appears (midpoint placement). */
  const podcastTriggerAfter = useMemo(() => {
    if (!mod || !modPodcast || mod.flashcards.length < 2) return -1;
    return Math.floor((mod.flashcards.length - 1) / 2);
  }, [mod, modPodcast]);

  // Couple-dilemma injection — appears between flashcards (~70% through). If the
  // module also has a podcast at midpoint, the dilemma slot is bumped one card
  // later so the two breaks don't fire back-to-back.
  const modCoupleDilemma = useMemo(
    () => (mod?.id ? getCoupleDilemmaForModule(mod.id) : undefined),
    [mod?.id],
  );
  // Kick off video + audio download the moment we know a couple-dilemma is
  // wired to this module. We have ~70% of the lesson worth of reading time
  // before the dilemma triggers, plenty to fully download the 5s mp4 even
  // on a slow connection.
  useEffect(() => {
    if (!modCoupleDilemma) return;
    prefetchCoupleDilemmaAsset(modCoupleDilemma.videoUri);
    prefetchCoupleDilemmaAsset(modCoupleDilemma.narrationAudioUri);
  }, [modCoupleDilemma]);
  /** Last flashcard index AFTER which the couple dilemma appears. -1 if absent or unresolvable. */
  const coupleDilemmaTriggerAfter = useMemo(() => {
    if (!mod || !modCoupleDilemma || mod.flashcards.length < 2) return -1;
    const raw = Math.floor((mod.flashcards.length - 1) * 0.7);
    if (!modPodcast || raw !== podcastTriggerAfter) return raw;
    const bumped = raw + 1;
    if (bumped > mod.flashcards.length - 2 || bumped === podcastTriggerAfter) return -1;
    return bumped;
  }, [mod, modCoupleDilemma, modPodcast, podcastTriggerAfter]);

  const chatLessonContext = useMemo<LessonContext | undefined>(() => {
    if (!mod) return undefined;
    const phaseMap: Record<FlowPhase, LessonContext["phase"]> = {
      hero: "intro",
      intro: "intro",
      flashcards: "flashcards",
      podcast: "other",
      "couple-dilemma": "other",
      "interactive-recall": "interactive-recall",
      quizzes: "quizzes",
      "mid-quiz-video": "other",
      "sim-intro": "sim",
      sim: "sim",
      game: "other",
      "module-infographic": "other",
      "post-infographic-video": "other",
      "shark-dilemma": "other",
      summary: "summary",
      video: "other",
    };
    const mappedPhase: LessonContext["phase"] = phaseMap[phase] ?? "other";
    const currentCard = mappedPhase === "flashcards" ? mod.flashcards[flashcardIndex] : undefined;
    const cleanedText = currentCard?.text
      ? currentCard.text.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
      : undefined;
    return {
      moduleId: mod.id,
      moduleTitle: mod.title,
      phase: mappedPhase,
      flashcardId: currentCard?.id,
      flashcardText: cleanedText,
    };
  }, [mod, phase, flashcardIndex]);

  const [finnTransitionSource, setFinnTransitionSource] = useState<{ uri: string } | null>(null);
  const [finnTipText, setFinnTipText] = useState<string | null>(null);
  useEffect(() => { setFinnTipText(null); }, [phase]);
  // Mid-lesson Finn checkpoint
  const [showMidCheckpoint, setShowMidCheckpoint] = useState(false);
  const [checkpointReturnIndex, setCheckpointReturnIndex] = useState<number | null>(null);
  const checkpointIndex = useMemo(() =>
    mod && mod.flashcards.length >= 5 ? (2 + Math.round(Math.random())) : -1,
    [mod?.id],
  );
  // Post-module celebration
  const [showPostCelebration, setShowPostCelebration] = useState(false);
  // Architect P2 (2026-06-11): pre-pick the playful "quit" label once when
  // the post-celebration screen mounts so it doesn't flip-flop on every
  // re-render (was Math.random() inline in JSX).
  const POST_QUIT_LABELS = useRef([
    "עפתי לנטפליקס 📺",
    "עפתי לאינסטגרם 📱",
    "עפתי לטיקטוק 🎵",
    "אני הולך לישון 😴",
    "יש לי שווארמה שמחכה 🌯",
    "יש לי פיצה שמתקררת 🍕",
  ]).current;
  const postQuitLabel = useMemo(
    () => POST_QUIT_LABELS[Math.floor(Math.random() * POST_QUIT_LABELS.length)],
    [showPostCelebration, POST_QUIT_LABELS],
  );
  // Yoav 2026-06-11: the playful "I'm bailing to Netflix" quit button is
  // a treat, not a fixture — show it on ~30% of chest reveals.
  const showPostQuitOption = useMemo(
    () => Math.random() < 0.3,
    [showPostCelebration],
  );
  const [showBreakMessage, setShowBreakMessage] = useState(false);
  // Auto-next countdown: dataS showed 48% drop between lessons (23 finished
  // mod-0-2 but only 12 started mod-0-3). Netflix-style 3s auto-advance keeps
  // the learning streak warm without forcing it — user can cancel to read.
  const [autoNextSeconds, setAutoNextSeconds] = useState<number | null>(null);
  const autoNextCancelledRef = useRef(false);
  // Shark Love, every 3rd module completion
  const [showSharkLove, setShowSharkLove] = useState(false);
  const moduleStartTimeRef = useRef(Date.now());
  // R8 pre-release audit: snapshot elapsed once when SharkLove first
  // becomes visible so the inline Date.now() in JSX (now removed) no
  // longer recomputes every parent render while the modal is open.
  const sharkLoveElapsedSec = useMemo(
    () => showSharkLove
      ? Math.round((Date.now() - moduleStartTimeRef.current) / 1000)
      : 0,
    [showSharkLove],
  );
  // Shark CTA notifications, Bridge (every 4) + Referral (every 5 + dividend content)
  const [showBridgeCTA, setShowBridgeCTA] = useState(false);
  const [showReferralCTA, setShowReferralCTA] = useState(false);
  // Tool-of-the-day CTA — lowest-priority post-chest nudge; fires only on
  // modules where no bridge/referral/cover is due, once/day (useToolNudgeStore).
  const [showToolCTA, setShowToolCTA] = useState(false);
  // Triggering metadata for copy variant rotation (Duolingo A/B: +8-12% CTR)
  const [ctaModuleCount, setCtaModuleCount] = useState(0);
  const [referralByDividend, setReferralByDividend] = useState(false);
  // Shark Party, every 2 consecutive or 4 total completed modules
  const [showPartyInvite, setShowPartyInvite] = useState(false);
  const [showPartyVideo, setShowPartyVideo] = useState(false);
  // Lifestyle break — every 3 completed modules (skipped on % 4 to defer to Party)
  const [showLifestyleInvite, setShowLifestyleInvite] = useState(false);
  const [showLifestyleVideo, setShowLifestyleVideo] = useState(false);
  const [lifestyleVideo, setLifestyleVideo] = useState<LifestyleVideoSpec | null>(null);
  const lifestyleSeenIds = useLifestyleBreakStore(useShallow((s) => s.seenIds));
  const lifestyleOneShotSeenIds = useLifestyleBreakStore(useShallow((s) => s.oneShotSeenIds));
  const markLifestyleSeen = useLifestyleBreakStore((s) => s.markSeen);
  const [quizIndex, setQuizIndex] = useState(() => {
    const r = !isReplay && mod?.id ? useChapterUIStore.getState().moduleResume[mod.id] : undefined;
    return (r && RESTORABLE_PHASES.has(r.phase as FlowPhase)) ? r.quizIndex : 0;
  });
  // The module's "fun" Finn video (MODULE_POST_VIDEO_MAP) now plays INLINE
  // mid-quiz instead of as a standalone phase after the infographic (Yoav
  // 2026-06-10). This guards against showing it twice: once it's been played
  // mid-quiz the trailing post-infographic-video phase self-skips. Stays false
  // when the module has too few quizzes to host a mid-point, so that the
  // trailing phase still plays it as a fallback.
  const funVideoShownRef = useRef(false);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(() => {
    const r = !isReplay && mod?.id ? useChapterUIStore.getState().moduleResume[mod.id] : undefined;
    return (r && RESTORABLE_PHASES.has(r.phase as FlowPhase)) ? r.consecutiveCorrect : 0;
  });
  const [peakStreak, setPeakStreak] = useState(() => {
    const r = !isReplay && mod?.id ? useChapterUIStore.getState().moduleResume[mod.id] : undefined;
    return (r && RESTORABLE_PHASES.has(r.phase as FlowPhase)) ? (r.peakStreak ?? 0) : 0;
  });
  const [showStreakPopup, setShowStreakPopup] = useState(false);
  // True when the most recent correct answer charged the energy battery (combo
  // milestone). Drives the "+אנרגיה" badge in the streak popup. Energy sync.
  const [comboEnergyGranted, setComboEnergyGranted] = useState(false);
  const [showQuizIntro, setShowQuizIntro] = useState(false);
  const [showWisdom, setShowWisdom] = useState(false);
  // (legacy showInterGame + interGamePhase removed — the inter-module game
  //  modal moved to the Pearl bonus node on the learn map; see
  //  src/features/pearls/. No callers remain in this file.)
  // Inter-module CONTENT (Feed-derived cards: PremiumLearning, DidYouKnow,
  // LiveMarket, LiveNews). Fires only when interModuleGame is absent — each
  // module gets at most one inter-module artifact, never both back-to-back.
  const [showInterContent, setShowInterContent] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [showXpReward, setShowXpReward] = useState(false);
  const [showCoinsReward, setShowCoinsReward] = useState(false);
  const [showOutOfHearts, setShowOutOfHearts] = useState(false);

  // Energy Sink (Yoav 18/06): completing an active learning sub-module costs −1
  // energy — once per sub-module per lesson, skipped on replay + for Pro. We
  // charge on LEAVING an active phase, dedup'd so interstitials (mid-quiz video)
  // don't double-charge. Depleting here surfaces the in-lesson out-of-energy modal.
  const prevPhaseRef = useRef<FlowPhase | null>(null);
  const chargedSubmodulesRef = useRef<Set<FlowPhase>>(new Set<FlowPhase>());
  useEffect(() => {
    prevPhaseRef.current = null;
    chargedSubmodulesRef.current = new Set<FlowPhase>();
  }, [mod?.id]);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (!prev || prev === phase || isReplay || isPro || !energyOn) return;
    if (ACTIVE_SUBMODULE_PHASES.has(prev) && !chargedSubmodulesRef.current.has(prev)) {
      chargedSubmodulesRef.current.add(prev);
      const ok = useHeartsStore.getState().useHeart(isPro || !energyOn);
      try { captureEvent('energy_spent', { source: 'submodule', phase: prev }); } catch { /* non-fatal */ }
      if (!ok || useHeartsStore.getState().getHearts() <= 0) setShowOutOfHearts(true);
    }
  }, [phase, isReplay, isPro, mod?.id]);
  const [lifelineConcept, setLifelineConcept] = useState<string | null>(null);
  const { showAd: showRewardedAd, isLoaded: adLoaded, isPro: isProForAds } = useRewardedAd();
  const [lifelineChatConcept, setLifelineChatConcept] = useState<string | null>(null);
  const [showChapterComplete, setShowChapterComplete] = useState(false);
  const [showFinnBridgeNudge, setShowFinnBridgeNudge] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // Auto-flow "עוד X לתיבה" chip-callout (pop+confetti, preserved). Driven by the
  // seam: bumped once per chip completion (NOT the chest-crossing one).
  const [calloutSeq, setCalloutSeq] = useState(0);
  const [calloutRemaining, setCalloutRemaining] = useState(3);
  // seam-bump: the auto-flow "keep flowing" branch only updates a REF
  // (tt_initialPhaseRef) — no re-render. A transition whose completed phase
  // isn't mapped in TT_PHASE_TO_KIND (sim-intro→sim, mid-quiz-video→quizzes)
  // therefore stayed stuck on the empty-View guard (~line 4319) — the WHITE
  // SCREEN on the continuous path into the sandbox (Yoav 2026-07-04; entering
  // the sim from the accordion deep-links straight to 'sim' and never hits
  // the seam). Bumping this dummy state forces the release re-render.
  const [, bumpTtSeam] = useState(0);
  // Init TRUE on the FIRST render for mod-0-1b (non-Pro, unseen) so the intro
  // audio's `audioPaused` is true from frame 0 — otherwise the intro card's audio
  // effect (a child) runs before a mount effect would and the voice blips before
  // the energy-intro modal covers it (Yoav 2026-06-25).
  const [showEnergyIntro, setShowEnergyIntro] = useState(
    () => mod?.id === 'mod-0-1b' && !isPro && !useTutorialStore.getState().hasSeenEnergyIntro,
  );
  const [complimentSeq, setComplimentSeq] = useState(0);
  const [complimentMsg, setComplimentMsg] = useState<string | null>(null);
  // Energy intro shows on ENTRY to mod-0-1b (state initialised true above for the
  // first encounter). The one-shot is RECORDED on DISMISS (not on mount): stamping
  // on mount marked it "seen" even when the modal never actually showed / was
  // dismissed (transient mount / isPro race), so it stopped re-appearing for users
  // who never actually saw it (Yoav 2026-06-26). Now it persists until the user
  // really closes it.
  const dismissEnergyIntro = useCallback(() => {
    setShowEnergyIntro(false);
    try { useTutorialStore.getState().markEnergyIntroSeen(); } catch { /* non-fatal */ }
  }, []);
  // C (Yoav 2026-06-25): on a post-chest RE-ENTRY (module already past its chest
  // threshold but not yet 100%, in auto-flow), greet the choice to keep going with
  // a varied inline Captain Shark compliment — "מיד לאחר ההחלטה, כחלק מרצף הלמידה".
  useEffect(() => {
    if (!autoFlow || !mod) return;
    const t = resolveTopics(mod);
    const sum = useTopicProgressStore.getState().summaryForModule(mod.id, t);
    const chipsToChest = chipsToChestFor(mod.id, t.length);
    const pastChest = chipsToChest > 0 && sum.completed >= chipsToChest;
    const done = sum.total > 0 && sum.completed >= sum.total;
    if (pastChest && !done) {
      setComplimentMsg(pickContinueCompliment());
      setComplimentSeq((s) => s + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Progress-to-chest bar removed 2026-06-25 — the non-blocking "עוד X לתיבה"
  // callouts are enough; the segmented bar added clutter ("מספיק ההודעות שקופצות").
  const [showRegisterNudge, setShowRegisterNudge] = useState(false);
  // mod-0-1 dedicated continue CTA — replaces the entire post-chest modal queue
  // for the first lesson so the user lands on a single "המשך" button.
  const [showMod01ContinueCTA, setShowMod01ContinueCTA] = useState(false);
  // In-module profile question (Graduate Onboarding, see interrupt-cadence doc).
  // mod-0-1, knowledgeLevel. mod-0-4, learningTime. mod-0-5, dailyGoalMinutes.
  // The question fires only if the user has not already answered it in onboarding
  // or in a previous module visit (skip-on-known).
  const [profileQuestionKind, setProfileQuestionKind] = useState<ProfileQuestionKind | null>(null);
  // Tracks the module id whose profile question was already presented this visit,
  // so skipping (which doesn't set the profile field) can't re-trigger it in a loop.
  const profileQuestionAskedRef = useRef<string | null>(null);
  // When a profile question is injected MID-MODULE (e.g. mod-0-1 knowledgeLevel
  // fires between last quiz and sim-intro), this holds the resume action to run
  // after the modal closes. If null, the modal close falls through to the normal
  // post-module nav flow (goToNextSequentialModule).
  const pendingPostQuestionActionRef = useRef<(() => void) | null>(null);
  // "Grade skip" celebration — shown when the user self-identifies as an expert
  // ("כריש מוול סטריט") on the mod-0-2 knowledge question. We mark all of chapter 0
  // complete, park the cursor on mod-1-1, and surface this screen instead of
  // marching them through the remaining beginner modules.
  const [showGradeSkipCelebration, setShowGradeSkipCelebration] = useState(false);
  const [showPizzaModal, setShowPizzaModal] = useState(false);
  const [showMod01BarterNotif, setShowMod01BarterNotif] = useState(false);
  const hasSeenPizza = useTutorialStore((s) => s.hasSeenPizzaIndexModal);
  const markPizzaSeen = useTutorialStore((s) => s.markPizzaIndexSeen);
  const hasSeenMod01BarterNotif = useTutorialStore((s) => s.hasSeenMod01BarterNotif);
  const markMod01BarterNotifSeen = useTutorialStore((s) => s.markMod01BarterNotifSeen);
  const hasSeenMod05BridgeCTA = useTutorialStore((s) => s.hasSeenMod05BridgeCTA);
  const markMod05BridgeCTASeen = useTutorialStore((s) => s.markMod05BridgeCTASeen);
  const isGuest = useAuthStore((s) => s.isGuest);
  const [chestFullScreen, setChestFullScreen] = useState(false);
  const [chestClaimed, setChestClaimed] = useState(false);
  const [chestRewards, setChestRewards] = useState<ChestReward | null>(null);
  const [flyingXp, setFlyingXp] = useState(0);
  const [flyingCoins, setFlyingCoins] = useState(0);
  const { data: streakDataLesson } = useStreak();
  const streak = streakDataLesson?.currentStreak ?? 0;

  const completedRef = useRef(false);
  const confettiLottieRef = useRef<LottieView>(null);
  const chestLottieRef = useRef<LottieView>(null);
  const [chestOpened, setChestOpened] = useState(false);
  const chestAnimationStartedRef = useRef(false);
  const pendingChestDropRef = useRef<{ rarity: ChestRarity; rewards: ChestReward; streakBonusPercent: number } | null>(null);
  const chestGlowScale = useSharedValue(1);
  const chestGlowOpacity = useSharedValue(0.4);
  const chestBodyScale = useSharedValue(1);
  const [showDoubleOrNothing, setShowDoubleOrNothing] = useState(false);
  const [showAdBonus, setShowAdBonus] = useState(false);
  const [pendingMultiplierRewards, setPendingMultiplierRewards] = useState<ChestReward | null>(null);
  const [flyingCoinsDown, setFlyingCoinsDown] = useState(0);
  const shouldTriggerDoNRef = useRef(false);
  // FIFO chokepoint for post-chest nudges: only fire Bridge/Referral after any
  // higher-priority modal (SharkLove/DoubleOrNothing/AdBonus/PostCelebration/etc)
  // has been dismissed, so the user sees them one at a time, not stacked.
  const [pendingPostChestNudge, setPendingPostChestNudge] = useState<'referral' | 'bridge' | 'cover' | 'tools' | null>(null);
  const [showCoverCTA, setShowCoverCTA] = useState(false);
  const [coverCTAShownCount, setCoverCTAShownCount] = useState(0);

  // Persist mid-module progress (debounced) so the user can resume on re-entry
  useEffect(() => {
    if (!mod?.id || !RESTORABLE_PHASES.has(phase)) return;
    const timer = setTimeout(() => {
      saveResume(mod.id, { phase, flashcardIndex, quizIndex, consecutiveCorrect, peakStreak });
    }, 500);
    return () => clearTimeout(timer);
  }, [phase, flashcardIndex, quizIndex, consecutiveCorrect, peakStreak, mod?.id, saveResume]);

  // Reset all state when navigating to a different module (same route, different id)
  const prevIdRef = useRef(id);
  useEffect(() => {
    if (prevIdRef.current === id) return;
    prevIdRef.current = id;
    // Same guard as the initial useState: replay = ignore resume checkpoint.
    const r = !isReplay && mod?.id ? useChapterUIStore.getState().moduleResume[mod.id] : undefined;
    const resumable = r !== undefined && RESTORABLE_PHASES.has(r.phase as FlowPhase);
    setPhase(resumable ? r!.phase as FlowPhase : (mod?.videoHookAsset ? "video" : (mod?.id && MODULE_HERO_MAP[mod.id]) ? "hero" : "intro"));
    setFlashcardIndex(resumable ? r!.flashcardIndex : 0);
    setQuizIndex(resumable ? r!.quizIndex : 0);
    setConsecutiveCorrect(resumable ? r!.consecutiveCorrect : 0);
    // peakStreak must reset too — otherwise a streak earned in module A inflates
    // the next module's chest-reward multiplier (audit P2 #9). Mirror the init.
    setPeakStreak(resumable ? (r!.peakStreak ?? 0) : 0);
    setShowStreakPopup(false);
    setShowQuizIntro(false);
    setShowWisdom(false);
    setConfettiActive(false);
    setShowXpReward(false);
    setShowCoinsReward(false);
    setShowOutOfHearts(false);
    setLifelineConcept(null);
    setShowChapterComplete(false);
    setChestFullScreen(false);
    setChestClaimed(false);
    setChestRewards(null);
    setChestOpened(false);
    setShowDoubleOrNothing(false);
    setPendingMultiplierRewards(null);
    setFlyingXp(0);
    setFlyingCoins(0);
    setFlyingCoinsDown(0);
    setShowSharkLove(false);
    setShowBridgeCTA(false);
    setShowReferralCTA(false);
    setShowToolCTA(false);
    setPendingPostChestNudge(null);
    moduleStartTimeRef.current = Date.now();
    shouldTriggerDoNRef.current = false;
    completedRef.current = false;
    chestAnimationStartedRef.current = false;
    // Re-arm the per-module "fun video" guard so module 2+ in the same session
    // still plays its mid-quiz / post-infographic content video (audit P1 #1).
    funVideoShownRef.current = false;
    pendingChestDropRef.current = null;
    // Reset the per-module profile-question guard so a user who skipped
    // the in-lesson prompt the first time gets another chance to answer
    // when they re-enter the same module later (QA audit 2026-05-31).
    profileQuestionAskedRef.current = null;
  }, [id, mod]);

  // Auto-dismiss hero phase after 2 seconds
  useEffect(() => {
    if (phase !== "hero") return;
    const timer = setTimeout(() => setPhase("intro"), 2000);
    return () => clearTimeout(timer);
  }, [phase]);

  const titleStyle = useEntranceAnimation(fadeInUp, { delay: 0 });
  const contentStyle = useEntranceAnimation(fadeInUp, { delay: 150 });

  const { playSound } = useSoundEffect();

  const grantChestRewards = useCallback((rewards: ChestReward, multiplier: number) => {
    const finalRewards: ChestReward = {
      coins: Math.round(rewards.coins * multiplier),
      xp: Math.round(rewards.xp * multiplier),
      gems: Math.round(rewards.gems * multiplier),
    };
    setChestRewards(finalRewards);
    // Economy + visuals are triggered from the chest onPress setTimeout, NOT here
  }, []);

  const handleDoubleOrNothingResolve = useCallback((multiplier: number) => {
    setShowDoubleOrNothing(false);
    const rewards = pendingMultiplierRewards;
    if (rewards) {
      const eco = useEconomyUIStore.getState();
      if (multiplier === 2) {
        // Correct! Double coins only (XP is not at risk)
        eco.addCoins(rewards.coins, 'lesson');
        // Fly bonus coins UP
        safeTimeout(() => {
          setFlyingCoins(rewards.coins);
        }, 400);
      } else if (multiplier === 0) {
        // Wrong! Lose the original 1x that was already granted
        fireEconomyDelta({ coinsDelta: -rewards.coins });
        // Fly coins back DOWN
        safeTimeout(() => {
          setFlyingCoinsDown(rewards.coins);
        }, 400);
      }
      // multiplier === 1 (took loot): no change, already have 1x
      setPendingMultiplierRewards(null);
    }
    // Show wisdom after DoN resolves (compute isLast inline to avoid declaration order issue)
    const chapters = chapterId ? (CHAPTER_DATA_MAP[chapterId]?.modules ?? []) : [];
    const modIdx = chapters.findIndex((m) => m.id === id);
    const isLast = modIdx === chapters.length - 1;
    if (!isLast) {
      safeTimeout(() => {
        useWisdomStore.getState().showRandomWisdom();
        setShowWisdom(true);
      }, 1400);
    }
    // Offer ad bonus to non-PRO users after DoN resolves.
    // Skip for the very first module (mod-0-1) so the first-time experience
    // stays clean — no ads on the user's introduction to the app.
    if (!isPro && id !== "mod-0-1") {
      safeTimeout(() => setShowAdBonus(true), 1800);
    }
  }, [pendingMultiplierRewards, chapterId, id, isPro, safeTimeout]);

  // Shark Love dismiss, chain into DoN or wisdom
  const handleSharkLoveDismiss = useCallback(() => {
    setShowSharkLove(false);
    successHaptic();
    // Compute isLast inline (same pattern as handleDoubleOrNothingResolve)
    const chapters = chapterId ? (CHAPTER_DATA_MAP[chapterId]?.modules ?? []) : [];
    const modIdx = chapters.findIndex((m) => m.id === id);
    const isLast = modIdx === chapters.length - 1;
    // If DoN was pending, show it now
    if (shouldTriggerDoNRef.current) {
      shouldTriggerDoNRef.current = false;
      safeTimeout(() => {
        setShowDoubleOrNothing(true);
        playSound('modal_open_4');
      }, 500);
    } else {
      if (!isLast) {
        safeTimeout(() => {
          useWisdomStore.getState().showRandomWisdom();
          setShowWisdom(true);
        }, 800);
      }
      if (!isPro && id !== "mod-0-1") {
        safeTimeout(() => setShowAdBonus(true), 1800);
      }
    }
  }, [chapterId, id, isPro, playSound, safeTimeout]);

  // Drain the post-chest nudge queue: only show Referral/Bridge once every
  // higher-priority modal has been dismissed, so the user never sees two
  // popups stacked. Re-runs whenever a blocker toggles.
  // PERF TODO: this modal-effect chain re-runs on every one of ~8 boolean
  // toggles; consider consolidating the blocker flags into a single
  // reducer/derived state instead of one effect keyed on all of them.
  useEffect(() => {
    if (!pendingPostChestNudge) return;
    const blockerActive =
      showSharkLove ||
      showDoubleOrNothing ||
      showAdBonus ||
      showWisdom ||
      showPartyInvite ||
      showPartyVideo ||
      showBreakMessage;
    if (blockerActive) return;
    const t = setTimeout(() => {
      if (pendingPostChestNudge === 'referral') setShowReferralCTA(true);
      else if (pendingPostChestNudge === 'bridge') setShowBridgeCTA(true);
      else if (pendingPostChestNudge === 'cover') {
        setCoverCTAShownCount(c => c + 1);
        setShowCoverCTA(true);
      } else if (pendingPostChestNudge === 'tools') {
        useToolNudgeStore.getState().markShown();
        setShowToolCTA(true);
      }
      setPendingPostChestNudge(null);
    }, 600);
    return () => clearTimeout(t);
  }, [pendingPostChestNudge, showSharkLove, showDoubleOrNothing, showAdBonus, showWisdom, showPartyInvite, showPartyVideo, showBreakMessage]);

  // Chapter context for progress display
  const chapterData = chapterId ? CHAPTER_DATA_MAP[chapterId] : undefined;
  const chapterModules = chapterData?.modules ?? [];
  const chapterStoreId = chapterId ? `ch-${chapterId.split("-")[1]}` : "";
  // getCompletedModulesSync does filter+map+Set+spread; memoize it (and the
  // derived counts) so it doesn't recompute on every render — keyed on the
  // same inputs as isModuleAccessible (progressData/localCompletedIds keep it
  // fresh when completion changes).
  const { currentModIdx, completedInChapter } = useMemo(() => {
    const set = getCompletedModulesSync(chapterStoreId);
    const idx = chapterModules.findIndex((m) => m.id === id);
    const alreadyCounted = id ? set.includes(id) : false;
    return {
      currentModIdx: idx,
      completedInChapter: set.length + (phase === "summary" && !alreadyCounted ? 1 : 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterStoreId, chapterModules, id, phase, progressData, localCompletedIds]);
  const isLastModule = currentModIdx === chapterModules.length - 1;
  const nextModule = !isLastModule ? chapterModules[currentModIdx + 1] : undefined;

  // Pizza index modal, one-time popup after completing mod-2-12 (ch 2 mid-point).
  // Delayed 600ms so the chest animation plays first — one-at-a-time feel.
  useEffect(() => {
    if (!mod) return;
    if (phase === "summary" && mod.id === "mod-2-12" && !hasSeenPizza) {
      safeTimeout(() => setShowPizzaModal(true), 600);
    }
  }, [phase, mod, hasSeenPizza, safeTimeout]);

  // (The chapter-0 BullshitSwipe shark intro now lives on the
  // /interstitial/bullshit-ch0 page itself so the explanation appears
  // immediately before the game, not during the mod-0-3 summary phase
  // where the chest + celebration sat in between.)

  // Barter notif (dancing shark) right after the post-infographic video of the
  // "what is money / barter" module. Content lives at mod-0-2 since the 2026-05-30
  // swap (mod-0-1 now teaches financial basics; mod-0-2 teaches barter/money origin).
  // The notif intentionally fires while the barter context is fresh.
  useEffect(() => {
    if (!mod) return;
    if (phase === "shark-dilemma" && mod.id === "mod-0-2" && !hasSeenMod01BarterNotif) {
      safeTimeout(() => setShowMod01BarterNotif(true), 200);
    }
  }, [phase, mod, hasSeenMod01BarterNotif, safeTimeout]);

  // Complete module and show rewards when entering summary phase.
  // SKIP for topic-tree chips (Yoav 2026-06-11): a chip whose last phase
  // advances to "summary" briefly flashed THIS legacy dark-backdrop chest
  // before tt_exit's router.back() — then the topic-tree's own
  // ChestCelebrationModal fired, so the user saw TWO chests back-to-back.
  // The topic-tree owns its completion + chest (upsertProgress + recordChestOpen),
  // so the legacy summary chest must not fire (or mark the whole module done)
  // on this path. The render below is gated the same way.
  useEffect(() => {
    if (!mod) return;
    // ttProgressActive (continuous "למידה רציפה") is excluded too: the run
    // marks topics live, so on return the accordion fires lesson_completed
    // (learning_mode='topic-tree') + upsertProgress + its own chest. Running
    // completeModule here as well double-fired lesson_completed and skewed
    // NSM / WoW-retention / is_first_lesson (code-review 2026-06-12). The
    // non-event side-effects this effect used to provide for continuous runs
    // (daily activity, resume clear, duration) moved to the
    // continuous-run-completed effect above.
    if (phase === "summary" && !completedRef.current && returnTo !== 'topic-tree' && !ttProgressActive) {
      completedRef.current = true;
      // Mark the module completed the moment the chest screen appears —
      // earlier the completion fired only on chest-tap, so a user who reached
      // the summary but exited without tapping was left stuck (server +
      // local-durable store both missed the upsert, next module re-locked).
      // The chest BONUS rewards (drop.rewards) still grant on tap; this only
      // ensures the completion record + base XP/coins land on summary entry.
      // Replay stays guarded — completeModule's own dedupe handles re-entry.
      if (!isReplay) completeModule(mod.id);
      successHaptic();
      playSound('modal_open_1');

      // Practice-to-Refill (US-006): if this replay was started from OutOfHeartsModal, grant +1 heart
      if (isReplay) {
        useHeartsStore.getState().grantPracticeHeart();
      }

      // Generate chest drop: premium for arena/chapter completion, regular for module
      // Skip rewards on replay
      if (!isReplay) {
        const dropType = isLastModule ? "premium" : "regular";
        const currentStreak = streak;
        const drop = generateChestDrop(dropType, currentStreak);
        pendingChestDropRef.current = { rarity: drop.rarity, rewards: drop.rewards, streakBonusPercent: drop.streakBonusPercent };
      }

      // Pulse the chest glow to invite the user to tap
      chestGlowScale.value = withRepeat(withSequence(
        withTiming(1.15, { duration: 700 }),
        withTiming(1.0,  { duration: 700 }),
      ), -1, false);
      chestGlowOpacity.value = withRepeat(withSequence(
        withTiming(0.9, { duration: 700 }),
        withTiming(0.3, { duration: 700 }),
      ), -1, false);
      chestBodyScale.value = withRepeat(withSequence(
        withTiming(1.04, { duration: 800 }),
        withTiming(0.98, { duration: 800 }),
      ), -1, false);

      // Check if this was the last module in the chapter
      if (isLastModule) {
        safeTimeout(() => {
          setShowChapterComplete(true);
          playSound('btn_click_heavy');
          doubleHeavyHaptic();
        }, 4500);
        safeTimeout(() => setShowChapterComplete(false), 7500);
        // Show Finn bridge nudge after chapter 0 completion (skip for minors, no bridge access)
        if (chapterId === "chapter-0" && !isGuest && useAuthStore.getState().profile?.ageGroup !== "minor") {
          safeTimeout(() => setShowFinnBridgeNudge(true), 8000);
        }
      }
    }
    return () => {
      cancelAnimation(chestGlowScale);
      cancelAnimation(chestGlowOpacity);
      cancelAnimation(chestBodyScale);
    };
  }, [phase, mod?.id, completeModule, mod, isLastModule, isReplay, playSound, safeTimeout, returnTo, ttProgressActive]);

  // Post-module celebration ("Continue or Netflix?") is intentionally LAST in the
  // end-of-module nudge sequence. Wait for every other modal AND for the pending
  // Referral/Bridge nudge to fire AND dismiss before showing the continue/quit choice.
  useEffect(() => {
    if (
      !chestClaimed ||
      showDoubleOrNothing ||
      showSharkLove ||
      showAdBonus ||
      showReferralCTA ||
      showBridgeCTA ||
      showCoverCTA ||
      showToolCTA ||
      showWisdom ||
      showPartyInvite ||
      showPostCelebration ||
      showBreakMessage ||
      pendingPostChestNudge !== null
    ) return;
    // mod-0-1: clean — no PostCelebration modal, dedicated Mod01ContinueCTA handles it.
    if (id === 'mod-0-1') return;
    // Show every other module (0, 2, 4... = yes, 1, 3, 5... = no).
    // For guests in mod-0-3/4/5 the register CTA fires from goToNextSequentialModule
    // *only on the odd-indexed mod-0-4*, so the two modals never stack on the same module.
    if (currentModIdx % 2 !== 0) return;
    // Wait 2s after all higher-priority nudges have cleared
    const timer = setTimeout(() => setShowPostCelebration(true), 2000);
    return () => clearTimeout(timer);
  }, [chestClaimed, showDoubleOrNothing, showSharkLove, showAdBonus, showReferralCTA, showBridgeCTA, showCoverCTA, showToolCTA, showWisdom, showPartyInvite, currentModIdx, showPostCelebration, showBreakMessage, pendingPostChestNudge, id, isGuest]);

  // Auto-next countdown: when the celebration modal opens, start a 3s timer
  // that fires goToNextSequentialModule unless the user cancels or quits.
  //
  // Bypass for mod-0-5 first-completion: the special Bridge handoff CTA needs
  // an explicit user decision (Bridge vs continue), not an auto-advance.
  // Once the user has seen it, the standard auto-next behaviour resumes.
  useEffect(() => {
    if (!showPostCelebration || showBreakMessage) {
      setAutoNextSeconds(null);
      return;
    }
    if (mod?.id === 'mod-0-5' && !hasSeenMod05BridgeCTA) {
      setAutoNextSeconds(null);
      return;
    }
    autoNextCancelledRef.current = false;
    setAutoNextSeconds(3);
    const tick = setInterval(() => {
      setAutoNextSeconds((prev) => {
        if (prev === null || autoNextCancelledRef.current) return null;
        if (prev <= 1) {
          clearInterval(tick);
          try { captureEvent('lesson_auto_next_triggered', { lesson_id: mod?.id ?? null }); } catch { /* non-fatal */ }
          successHaptic();
          setShowPostCelebration(false);
          safeTimeout(() => goToNextSequentialModule(), 80);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [showPostCelebration, showBreakMessage, mod, hasSeenMod05BridgeCTA]);

  // Fire mod05_bridge_cta_shown exactly once per first appearance of the
  // special Bridge handoff CTA. Tied to PostCelebration becoming visible
  // while the mod-0-5 + first-completion conditions hold.
  const mod05BridgeCtaFiredRef = useRef(false);
  useEffect(() => {
    if (!showPostCelebration) {
      mod05BridgeCtaFiredRef.current = false;
      return;
    }
    if (mod?.id === 'mod-0-5' && !hasSeenMod05BridgeCTA && !mod05BridgeCtaFiredRef.current) {
      mod05BridgeCtaFiredRef.current = true;
      try { captureEvent('mod05_bridge_cta_shown', { partner: 'altshuler' }); } catch { /* non-fatal */ }
    }
  }, [showPostCelebration, mod, hasSeenMod05BridgeCTA]);

  // Shark Party, trigger only on chapter transitions (last module of chapter) every 4 total completed modules
  useEffect(() => {
    if (!chestClaimed || !isLastModule || showDoubleOrNothing || showSharkLove || showPostCelebration || showPartyInvite || showPartyVideo) return;
    // Count total completed modules across all chapters
    const totalCompleted = (queryClient.getQueryData<import('../../lib/api/progress').ModuleProgressRow[]>(progressQueryKey) ?? [])
      .filter((m) => m.status === 'completed').length;
    // Show party every 4 completed modules, only at chapter end
    if (totalCompleted > 0 && totalCompleted % 4 === 0) {
      const timer = setTimeout(() => setShowPartyInvite(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [chestClaimed, isLastModule, showDoubleOrNothing, showPostCelebration, showPartyInvite, showPartyVideo, progressData]);

  // Lifestyle break, every 3 total completed modules — fires at any module end.
  // Skipped on % 4 multiples so Shark Party (chapter end) takes priority on collisions.
  useEffect(() => {
    if (!chestClaimed || showDoubleOrNothing || showSharkLove || showPostCelebration || showPartyInvite || showPartyVideo || showLifestyleInvite || showLifestyleVideo) return;
    const totalCompleted = (queryClient.getQueryData<import('../../lib/api/progress').ModuleProgressRow[]>(progressQueryKey) ?? [])
      .filter((m) => m.status === 'completed').length;
    if (totalCompleted > 0 && totalCompleted % 3 === 0 && totalCompleted % 4 !== 0) {
      const next = pickNextLifestyleVideo(lifestyleSeenIds, lifestyleOneShotSeenIds);
      setLifestyleVideo(next);
      const timer = setTimeout(() => setShowLifestyleInvite(true), 2500);
      return () => clearTimeout(timer);
    }
  }, [chestClaimed, showDoubleOrNothing, showSharkLove, showPostCelebration, showPartyInvite, showPartyVideo, showLifestyleInvite, showLifestyleVideo, progressData, lifestyleSeenIds, lifestyleOneShotSeenIds]);

  const moduleResult = mod ? quizResults[mod.id] : undefined;
  const correctCount = moduleResult?.correct ?? 0;
  const totalCount = moduleResult?.total ?? (mod?.quizzes.length ?? 0);

  const chestGlowAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chestGlowScale.value }],
    opacity: chestGlowOpacity.value,
  }));
  const chestBodyAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chestBodyScale.value }],
  }));

  // Play chest animation reliably after state settles (avoids double-tap issue)
  useEffect(() => {
    if (chestOpened) {
      const t = setTimeout(() => chestLottieRef.current?.play(), 50);
      return () => clearTimeout(t);
    }
  }, [chestOpened]);

  // ── Unified chip driver (Yoav 2026-06-26) ─────────────────────────────────
  // The lesson advances chip-to-chip in the SAME order the accordion shows
  // (resolveTopics), so "the module runs by the chip order" and the quiz lands on
  // its threshold slot (75% / 50% mod-0-1) → the chest fires right after it. Game
  // + couple-dilemma are real chips in the sequence now (no longer orphaned).
  const goToChipPhase = useCallback((kind: TopicKind) => {
    switch (kind) {
      case 'cards':
      case 'tutorial-video': setFlashcardIndex(0); setPhase('flashcards'); return;
      case 'recall': mediumHaptic(); setPhase('interactive-recall'); return;
      case 'sim': mediumHaptic(); setPhase('sim-intro'); return;
      case 'game': mediumHaptic(); setPhase('game'); return;
      case 'podcast': mediumHaptic(); setPhase('podcast'); return;
      case 'couple-dilemma': mediumHaptic(); setPhase('couple-dilemma'); return;
      case 'quiz': setPhase('quizzes'); safeTimeout(() => setShowQuizIntro(true), 50); return;
      case 'shark-dilemma': setPhase('shark-dilemma'); return;
      default: setPhase('summary'); return; // chat (separate route) / unknown → end
    }
  }, []);
  const advanceFromChip = useCallback((currentKind: TopicKind) => {
    if (!mod) { setPhase('summary'); return; }
    // After the QUIZ, run the lesson-only tail (infographic / fun-video) before
    // the next chip — those aren't accordion chips.
    if (currentKind === 'quiz') {
      if (mod.id && MODULE_INFOGRAPHIC_MAP[mod.id]) { setPhase('module-infographic'); return; }
      if (mod.id && MODULE_POST_VIDEO_MAP[mod.id]) { setPhase('post-infographic-video'); return; }
    }
    // mod-0-1 CHEST-FIRST seam (Yoav 11.7: "תעביר את ההתייעצות עם שארק להיות
    // בצ'יפים שאחרי התיבה"): the quiz is the 4th and LAST pre-chest chip, so
    // right after it (and the knowledgeLevel question, which already ran —
    // advanceQuiz resumes into this call) the chest opens IMMEDIATELY, before
    // the shark-dilemma/game. The chest's "המשך" CTA resumes the in-lesson
    // flow into those post-chest chips (postChestResumeRef) instead of
    // bouncing to the map.
    if (
      currentKind === 'quiz' &&
      mod.id === 'mod-0-1' &&
      returnTo === 'topic-tree' &&
      !isReplay &&
      !useTopicProgressStore.getState().modulesPastThreshold['mod-0-1']
    ) {
      const resolved =
        Boolean(useAuthStore.getState().profile?.knowledgeLevel) ||
        useTutorialStore.getState().mod01KnowledgeResolved;
      if (resolved) {
        // Mark the quiz done NOW (no phase transition happens, so Effect A
        // won't) — the threshold math needs it counted before the grant.
        const quizTopic = resolveTopics(mod).find((t) => t.kind === 'quiz');
        if (quizTopic) useTopicProgressStore.getState().markTopicCompleted(quizTopic, 'continuous');
        postChestResumeRef.current = 'quiz';
        if (grantHandoffChest()) return; // chest renders over the quiz phase
        postChestResumeRef.current = null; // grant no-op (raced) → normal flow
      }
    }
    const ordered: TopicKind[] = resolveTopics(mod).map((t) => t.kind).filter((k) => k !== 'tutorial-video' && k !== 'chat');
    const i = ordered.indexOf(currentKind);
    const next = i >= 0 ? ordered[i + 1] : undefined;
    if (!next) {
      // End of the module's content. mod-0-1's chest opens IN-LESSON here (Yoav
      // 8.7). Do NOT route it through the legacy `summary` phase — `summary`
      // renders NOTHING on returnTo=topic-tree (see the summary render gate), so
      // any effect-timing miss left the user on a WHITE screen exactly where the
      // chest should appear ("מסך לבן במקום פתיחת תיבה"). Handle it synchronously
      // and deterministically right here, with zero dependence on effect races.
      if (returnTo === 'topic-tree' && !isReplay && mod.id === 'mod-0-1') {
        resolveTopics(mod).forEach((t) => {
          if (t.kind !== 'chat') useTopicProgressStore.getState().markTopicCompleted(t, 'continuous');
        });
        const resolved =
          Boolean(useAuthStore.getState().profile?.knowledgeLevel) ||
          useTutorialStore.getState().mod01KnowledgeResolved;
        const alreadyStamped = Boolean(useTopicProgressStore.getState().modulesPastThreshold['mod-0-1']);
        // First honest completion → open the inline chest. grantHandoffChest is
        // idempotent (stampModuleThreshold), so a stray re-entry can't double-fire.
        if (resolved && !alreadyStamped && grantHandoffChest()) return;
        // Replay / already earned / question not yet resolved → clean return to
        // the live map (the accordion owns the chest there). NEVER a blank summary.
        tt_exitFiredRef.current = true;
        if (router.canGoBack()) {
          useTopicTreeReturnStore.getState().signalReturn({
            completedPhase: 'summary',
            completedModuleId: mod.id,
            expandedModule: mod.id,
          });
          router.back();
        } else {
          returnToMap('/(tabs)/index');
        }
        return;
      }
      setPhase('summary');
      return;
    }
    goToChipPhase(next);
  }, [mod, goToChipPhase, returnTo, isReplay, router, returnToMap]);

  // Self-heal: if we entered sim-intro without simConcept data (gating drift),
  // skip to the next chip instead of crashing on the unguarded title access or
  // stalling on a blank overlay. 2026-06-30.
  useEffect(() => {
    if (phase === 'sim-intro' && mod && !mod.simConcept) advanceFromChip('sim');
  }, [phase, mod, advanceFromChip]);

  const advanceQuiz = useCallback(() => {
    if (!mod) return;
    // Mid-quiz fun video: play the module's Finn video INLINE between two quiz
    // questions (right after the middle question) instead of as a standalone
    // full-screen phase after the infographic (Yoav 2026-06-10: "embedded
    // mid-quiz, not a unit of its own"). Only when there's a real mid-point
    // (≥3 quizzes, and the mid index isn't the last) — otherwise it falls
    // through to the trailing post-infographic-video phase as a fallback.
    const midIndex = Math.floor(mod.quizzes.length / 2);
    if (
      !funVideoShownRef.current &&
      quizIndex === midIndex &&
      midIndex < mod.quizzes.length - 1 &&
      mod.id && MODULE_POST_VIDEO_MAP[mod.id]
    ) {
      funVideoShownRef.current = true;
      mediumHaptic();
      setPhase("mid-quiz-video");
      return;
    }
    if (quizIndex < mod.quizzes.length - 1) {
      setQuizIndex((prev) => prev + 1);
      tapHaptic();
      return;
    }
    // Last quiz done. Resolve the next phase first, then decide whether to
    // inject an inline onboarding-style question before transitioning.
    const advanceToNextPhase = () => {
      // Unified driver: sim + game already played BEFORE the quiz (accordion
      // order), so the quiz is the last content chip → the chest fires right after
      // it. advanceFromChip handles the post-quiz tail (infographic / fun-video)
      // then the next chip (shark-dilemma / summary).
      advanceFromChip('quiz');
    };
    // mod-0-1 (post-2026-05-30 swap = financial basics, first lesson) acts as a
    // continuation of onboarding: ask knowledgeLevel RIGHT after the last quiz,
    // before the simulation. The resume action runs once the user answers/skips.
    if (mod.id === KNOWLEDGE_LEVEL_INLINE_MODULE_ID && !useAuthStore.getState().profile?.knowledgeLevel && profileQuestionAskedRef.current !== KNOWLEDGE_LEVEL_INLINE_MODULE_ID) {
      profileQuestionAskedRef.current = KNOWLEDGE_LEVEL_INLINE_MODULE_ID;
      pendingPostQuestionActionRef.current = advanceToNextPhase;
      setProfileQuestionKind('knowledgeLevel');
      return;
    }
    advanceToNextPhase();
  }, [mod, quizIndex]);

  const handleCorrectAnswer = useCallback(() => {
    if (!mod) return;
    const quiz = mod.quizzes[quizIndex];
    recordQuizAnswer(mod.id, true);
    // AI telemetry for quiz answers
    useAITelemetryStore.getState().addEvent('quiz_answer', mod.id, { correct: true, meta: { questionId: quiz.id } });
    const newStreak = consecutiveCorrect + 1;
    setConsecutiveCorrect(newStreak);
    if (newStreak > peakStreak) setPeakStreak(newStreak);
    // Shared combo streak — SINGLE source of truth. Counts correct answers across
    // quizzes + recall + sims + dilemmas + podcast; every 4-in-a-row → +1 energy
    // (capped per day inside registerComboCorrect so it never dents the paywall;
    // accuracy-only, skipped on replay). consecutiveCorrect above stays for the
    // 3/5/7 popup. NOTE: this REPLACES the older quiz-only comboEnergy() grant —
    // the two were double-counting on the same 'combo' source (דואו review).
    const grantedCombo = useHeartsStore.getState().registerComboCorrect(isReplay);
    const energyCharged = grantedCombo > 0;
    if (energyCharged) { try { captureEvent('combo_energy_earned', { granted: grantedCombo }); } catch { /* non-fatal */ } }
    try { captureEvent('lesson_quiz_question_answered', { lesson_id: mod.id, question_index: quizIndex, is_correct: true, combo_at_answer: newStreak }); } catch { /* non-fatal */ }
    setComboEnergyGranted(energyCharged);
    if (newStreak === 3 || newStreak === 5 || newStreak === 7) {
      if (newStreak >= 7) { doubleHeavyHaptic(); playSound('btn_click_heavy'); }
      else if (newStreak >= 5) { successHaptic(); playSound('btn_click_heavy'); }
      else { playSound('modal_open_4'); }
      setShowStreakPopup(true);
      safeTimeout(() => setShowStreakPopup(false), 2000);
    } else if (energyCharged) {
      // Surface the energy charge even when it lands off a 3/5/7 streak tier.
      successHaptic();
      setShowStreakPopup(true);
      safeTimeout(() => setShowStreakPopup(false), 1600);
    }
    advanceQuiz();
  }, [mod, quizIndex, recordQuizAnswer, advanceQuiz, consecutiveCorrect, peakStreak, playSound, isReplay]);

  // Immediate heart drop, called right when wrong answer is selected.
  // Skipped entirely on replay so users can re-do completed modules without
  // being punished for wrong answers — replay should encourage practice.
  const handleWrongImmediate = useCallback(() => {
    if (!mod) return;
    setConsecutiveCorrect(0); // Reset streak on ANY wrong answer
    useHeartsStore.getState().resetCombo();
    const quiz = mod.quizzes[quizIndex];
    if (isReplay) return;
    const heartUsed = useHeartsStore.getState().useHeart(isPro || !energyOn);
    if (heartUsed) {
      // Loss animation fires globally via the useHeart() store signal.
      heavyHaptic();
      if (quiz.conceptTag) {
        const isStruggling = useAdaptiveStore.getState().isConceptStruggledWith(quiz.conceptTag);
        if (isStruggling) {
          safeTimeout(() => setLifelineConcept(quiz.conceptTag), 1600);
        }
      }
    } else {
      setShowOutOfHearts(true);
    }
  }, [mod, quizIndex, isReplay, isPro, energyOn]);

  // Deferred, advances quiz after feedback shown (stops if no hearts left)
  const handleWrongRevealed = useCallback(() => {
    if (!mod) return;
    const quiz = mod.quizzes[quizIndex];
    recordQuizAnswer(mod.id, false);
    // AI telemetry + adaptive for wrong answers
    useAITelemetryStore.getState().addEvent('quiz_answer', mod.id, { correct: false, meta: { questionId: quiz.id } });
    try { captureEvent('lesson_quiz_question_answered', { lesson_id: mod.id, question_index: quizIndex, is_correct: false }); } catch { /* non-fatal */ }
    if (quiz.conceptTag) {
      useAdaptiveStore.getState().logFailure(quiz.id, quiz.conceptTag, mod.id);
    }
    setConsecutiveCorrect(0);
    // If hearts ran out, stop playing, show out-of-hearts
    const currentHearts = useHeartsStore.getState().getHearts();
    if (!isPro && currentHearts <= 0) {
      setShowOutOfHearts(true);
      return;
    }
    advanceQuiz();
  }, [mod, quizIndex, recordQuizAnswer, advanceQuiz, isPro]);

  const handleSimComplete = useCallback(() => {
    if (mod) {
      useAITelemetryStore.getState().addEvent('sim_decision', mod.id);
    }
    // Unified driver: sim → next chip (game/quiz) in the accordion order.
    advanceFromChip('sim');
  }, [mod, advanceFromChip]);

  const handleInteractiveRecallComplete = useCallback(() => {
    mediumHaptic();
    // Unified driver: recall → next chip (sim/game/quiz) in the accordion order.
    advanceFromChip('recall');
  }, [advanceFromChip]);
  const handleGameComplete = useCallback(() => {
    mediumHaptic();
    // Unified driver: game → next chip (couple-dilemma/quiz) in the accordion order.
    advanceFromChip('game');
  }, [advanceFromChip]);

  // Tracks (currentIndex, total) of the interactive-recall set so the
  // outer progress bar can fill incrementally per solved prompt. Default
  // (0/0) keeps the bar flat when no recall is active.
  const [recallProgress, setRecallProgress] = useState<{ current: number; total: number }>(
    { current: 0, total: 0 },
  );
  const handleInteractiveRecallProgress = useCallback((current: number, total: number) => {
    setRecallProgress({ current, total });
  }, []);

  // Same shape as recall — podcast surfaces (current, total) so the bar
  // fills 1/5 → 2/5 → ... → 5/5 through the podcast's internal phases
  // (Yoav 2026-06-11: "תראה כמה רכיבים יש בפודקסט, נגיד 6, ושיתקדם כל
  // פעם ב 1/6", not by audio time).
  const [podcastProgress, setPodcastProgress] = useState<{ current: number; total: number }>(
    { current: 0, total: 0 },
  );
  const handlePodcastProgress = useCallback((current: number, total: number) => {
    setPodcastProgress({ current, total });
  }, []);

  const handleFlashcardNext = useCallback(() => {
    if (!mod) return;
    playSound('btn_click_soft_1');

    // Return from checkpoint review → jump back to where we were and
    // re-open the "is everything OK?" modal so the user can pick another
    // segment to revisit or click "all clear, let's go" to continue forward.
    if (checkpointReturnIndex !== null) {
      setFlashcardIndex(checkpointReturnIndex);
      setCheckpointReturnIndex(null);
      setShowMidCheckpoint(true);
      return;
    }

    // Check if current card has a finnTip to show before advancing
    const currentCard = mod.flashcards[flashcardIndex];
    if (currentCard?.finnTip && !finnTipText) {
      setFinnTipText(currentCard.finnTip);
      return;
    }

    // Mid-lesson Finn checkpoint, show once at random position (card 3 or 4)
    if (flashcardIndex === checkpointIndex && !showMidCheckpoint && checkpointReturnIndex === null) {
      mediumHaptic();
      setShowMidCheckpoint(true);
      return;
    }

    // Topic-tree "cards" chip plays ALL flashcards 1→2→3 cleanly. The
    // podcast and couple-dilemma each have their own chip in the tree,
    // so the interleaved mid-flow injections must NOT fire when entered
    // via topic-tree (Yoav 2026-06-11: "כשנכנסים לכרטיסיות, מבצעים רק
    // כרטסיות"; the podcast / dilemma "יהיו בנפרד, ברצף").
    const isTopicTreeCardsRun = returnTo === 'topic-tree';

    // Inject Daisy podcast at midpoint of flashcards (once per module)
    if (!isTopicTreeCardsRun && modPodcast && flashcardIndex === podcastTriggerAfter) {
      mediumHaptic();
      setPhase("podcast");
      return;
    }

    // Inject couple dilemma (~70% through). Decoupled from the podcast slot.
    if (!isTopicTreeCardsRun && modCoupleDilemma && flashcardIndex === coupleDilemmaTriggerAfter) {
      mediumHaptic();
      setPhase("couple-dilemma");
      return;
    }

    if (flashcardIndex < mod.flashcards.length - 1) {
      const nextCardId = mod.flashcards[flashcardIndex + 1]?.id;
      const finnSource = nextCardId ? FINN_MAP[nextCardId] : undefined;
      if (finnSource) {
        setFinnTransitionSource(finnSource as { uri: string });
        safeTimeout(() => {
          setFinnTransitionSource(null);
          setFlashcardIndex((prev) => prev + 1);
        }, 1500);
      } else {
        setFlashcardIndex((prev) => prev + 1);
      }
    } else {
      mediumHaptic();
      // Unified driver: cards → next chip (recall/sim/game/quiz) in accordion order.
      advanceFromChip('cards');
    }
  }, [mod, flashcardIndex, finnTipText, checkpointIndex, showMidCheckpoint, checkpointReturnIndex, modPodcast, podcastTriggerAfter, modCoupleDilemma, coupleDilemmaTriggerAfter, returnTo, advanceFromChip]);

  const handleDismissFinnTip = useCallback(() => {
    setFinnTipText(null);
    // Advance to next card after dismissing
    if (!mod) return;

    // Topic-tree "cards" chip: skip podcast/dilemma injection (both have
    // their own chips in the tree). See handleFlashcardNext for context.
    const isTopicTreeCardsRun = returnTo === 'topic-tree';

    // Inject Daisy podcast at midpoint of flashcards (once per module)
    if (!isTopicTreeCardsRun && modPodcast && flashcardIndex === podcastTriggerAfter) {
      mediumHaptic();
      setPhase("podcast");
      return;
    }

    // Inject couple dilemma (~70% through). Decoupled from the podcast slot.
    if (!isTopicTreeCardsRun && modCoupleDilemma && flashcardIndex === coupleDilemmaTriggerAfter) {
      mediumHaptic();
      setPhase("couple-dilemma");
      return;
    }

    if (flashcardIndex < mod.flashcards.length - 1) {
      const nextCardId = mod.flashcards[flashcardIndex + 1]?.id;
      const finnSource = nextCardId ? FINN_MAP[nextCardId] : undefined;
      if (finnSource) {
        setFinnTransitionSource(finnSource as { uri: string });
        safeTimeout(() => {
          setFinnTransitionSource(null);
          setFlashcardIndex((prev) => prev + 1);
        }, 1500);
      } else {
        setFlashcardIndex((prev) => prev + 1);
      }
    } else {
      mediumHaptic();
      // Unified driver — mirror handleFlashcardNext's last-card branch (advanceFromChip).
      // The old hardcoded cards→interactive-recall jump was written when the order
      // was cards→recall→quiz; after ים 2.7 pinned the quiz BETWEEN cards and recall
      // (types.ts MODULE_CHIPS_TO_CHEST), that hardcode leapfrogged the quiz and
      // orphaned it (advanceFromChip('recall') then resumed past it). Following the
      // resolveTopics chip order fixes the skipped-quiz bug for finn-tip cards.
      advanceFromChip('cards');
    }
  }, [mod, flashcardIndex, modPodcast, podcastTriggerAfter, modCoupleDilemma, coupleDilemmaTriggerAfter, advanceFromChip]);

  const handleFlashcardPrev = useCallback(() => {
    if (flashcardIndex > 0) {
      setFlashcardIndex((prev) => prev - 1);
    }
  }, [flashcardIndex]);

  // ── PRO Gate Modal (shown after hook video for inaccessible modules) ──
  const proGateModal = (
    <Modal visible={showProGate} transparent animationType="fade" accessibilityViewIsModal onRequestClose={() => { setShowProGate(false); safeGoBack(); }}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 }} accessibilityViewIsModal>
        <View style={{ backgroundColor: "#fff", borderRadius: 24, padding: 28, width: "100%", alignItems: "center", gap: 16 }}>
          <ExpoImage source={FINN_STANDARD} accessible={false}
            style={{ width: 180, height: 180 }} contentFit="contain" />
          <Text style={{ fontSize: 20, fontWeight: "900", color: "#1f2937", textAlign: "center", writingDirection: "rtl" }} accessibilityRole="header">
            המודול הזה עדיין לא נפתח 🔒
          </Text>
          <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center", writingDirection: "rtl", lineHeight: 22 }}>
            שדרג לPRO כדי לגשת לכל המודולים, או המשך מהמקום שהפסקת ברצף הלמידה
          </Text>
          <Pressable
            onPress={() => { setShowProGate(false); router.push("/pricing" as never); }}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#0a2540", paddingHorizontal: 28, paddingVertical: 16, borderRadius: 999, width: "100%", borderWidth: 2, borderColor: "rgba(22, 78, 99, 0.6)", shadowColor: "#0a2540", shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 8 }}
            accessibilityRole="button"
            accessibilityLabel="שדרג לPRO"
          >
            <View style={{ width: 22, height: 22, overflow: "hidden" }}>
              <LottieView
                source={require("../../../assets/lottie/Pro Animation 3rd.json")}
                style={{ width: 22, height: 22 }}
                autoPlay
                loop
              />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#ffffff", writingDirection: "rtl" }}>שדרג לPRO</Text>
          </Pressable>
          <Pressable
            onPress={() => { setShowProGate(false); goToNextSequentialModule(); }}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#f3f4f6", paddingHorizontal: 28, paddingVertical: 14, borderRadius: 999, width: "100%" }}
            accessibilityRole="button"
            accessibilityLabel="המשך מאיפה שהפסקתי"
          >
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#6b7280", writingDirection: "rtl" }}>המשך מאיפה שהפסקתי</Text>
            <ChevronLeft size={18} color="#6b7280" />
          </Pressable>
          <Pressable onPress={() => { setShowProGate(false); safeGoBack(); }} accessibilityRole="button" accessibilityLabel="חזרו">
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#64748b", writingDirection: "rtl" }}>חזרו</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  if (!mod) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <Text style={{ fontSize: 16, color: '#f87171' }}>הפרק לא נמצא</Text>
      </View>
    );
  }

  // Yoav 2026-06-11 — topic-tree chip exit guard. Once the user's
  // chip phase advances (e.g. shark-dilemma → summary), the bounce-back
  // effect schedules a router.replace to the learn map. But the new
  // phase ALSO renders for one frame before the replace lands —
  // including the legacy summary/chest screen. Suppress that flash by
  // rendering a blank screen until the navigation fires
  // ("הביא אותי למסך פתיחת תיבה הישן במקום להביא אותי למפת הלמידה").
  // Yoav 2026-07-10: EXCEPT when the mod-0-1 inline chest is active. This guard
  // sits ABOVE the chest render (ChestCelebrationModal below) — without the
  // `!handoffChest` exception it painted a blank #f8fafc screen OVER the chest
  // after the quiz+knowledgeLevel question (the phase advances quiz→shark-dilemma
  // while the 50% chest fires from the auto-flow exit), producing a permanent
  // WHITE SCREEN instead of the opening chest. The chest is not a bounce-nav, so
  // it must be allowed to paint.
  if (
    returnTo === 'topic-tree'
    && tt_initialPhaseRef.current
    && phase !== tt_initialPhaseRef.current
    && !handoffChest
  ) {
    return <View style={{ flex: 1, backgroundColor: '#f8fafc' }} />;
  }

  // Video hook phase, full-screen video with hook text overlay
  if (phase === "video" && mod?.videoHookAsset) {
    return (
      <VideoHookPlayer
        videoUri={getCachedVideoPath((mod.videoHookAsset as { uri: string }).uri)}
        hookText={mod.videoHook ?? ""}
        onFinish={advanceFromVideo}
        unitColors={unitColors}
      />
    );
  }
  if (phase === "video") {
    return <FallbackToPhaseEffect run={advanceFromVideo} />;
  }

  // Mid-quiz fun video — same player as the old post-infographic phase, but
  // injected between two quiz questions and returning to the quiz run on
  // finish, so it reads as part of the lesson flow rather than a standalone
  // ceremony (Yoav 2026-06-10).
  if (phase === "mid-quiz-video" && mod && MODULE_POST_VIDEO_MAP[mod.id]) {
    return (
      <VideoHookPlayer
        videoUri={getCachedVideoPath(MODULE_POST_VIDEO_MAP[mod.id])}
        hookText={mod.videoHook ?? ""}
        onFinish={() => { setQuizIndex((i) => i + 1); setPhase("quizzes"); }}
        unitColors={unitColors}
      />
    );
  }
  if (phase === "mid-quiz-video") {
    return <FallbackToPhaseEffect run={() => { setQuizIndex((i) => i + 1); setPhase("quizzes"); }} />;
  }

  // Post-infographic video, full-screen, plays after the infographic before the
  // chest. Now a FALLBACK: skipped when the fun video already played mid-quiz.
  if (phase === "post-infographic-video" && mod && MODULE_POST_VIDEO_MAP[mod.id] && !funVideoShownRef.current) {
    return (
      <VideoHookPlayer
        videoUri={getCachedVideoPath(MODULE_POST_VIDEO_MAP[mod.id])}
        hookText={mod.videoHook ?? ""}
        onFinish={() => setPhase("summary")}
        unitColors={unitColors}
      />
    );
  }
  if (phase === "post-infographic-video") {
    return <FallbackToPhaseEffect run={() => setPhase("summary")} />;
  }

  // Shark Dilemma ("לייעץ לשארק") — advisory scenario right before the chest.
  if (phase === "shark-dilemma" && mod) {
    const dilemma = getDilemma(mod.id);
    if (!dilemma) {
      // Missing content for this module — fall through to summary without
      // a render-time setState (that triggers a React warning). Next render
      // tick will re-evaluate phase.
      return <FallbackToSummary setPhase={setPhase} />;
    }
    const handleDilemmaComplete = (result: import("../shark-dilemma/types").DilemmaResult) => {
      const eco = useEconomyUIStore.getState();
      // Branching dilemmas only: base 5 coins + 3 per net-positive score point.
      // Legacy single-slide dilemmas keep the original flat 5-coin reward to avoid
      // retroactive inflation across the 49 unchanged dilemmas.
      const isBranching = result.path.length > 1;
      const bonusCoins = isBranching ? Math.max(0, result.totalScore) * 3 : 0;
      eco.addCoins(5 + bonusCoins, 'lesson');
      // Soft penalty: each unwise choice in the path costs a heart.
      // useHeart() returns false silently at 0 — the in-card feedback IS the feedback.
      // Skipped on replay to encourage practice without punishment.
      if (!isReplay) {
        const isProNow = queryClient.getQueryData<SubscriptionState | null>(subscriptionQueryKey)?.isPro === true;
        for (let i = 0; i < result.unwiseCount; i++) useHeartsStore.getState().useHeart(isProNow || !energyOn);
        // This path used to deplete SILENTLY (no CTA). If the unwise choices
        // drained energy to 0, surface the out-of-energy modal here too so the
        // watch-ad/refill/upgrade options always appear on depletion.
        if (!isProNow && result.unwiseCount > 0 && useHeartsStore.getState().getHearts() <= 0) {
          setShowOutOfHearts(true);
        }
        // Combo: a clean dilemma (no unwise choices) feeds the streak; any unwise resets it.
        if (result.unwiseCount === 0) {
          const g = useHeartsStore.getState().registerComboCorrect();
          if (g > 0) { try { captureEvent('combo_energy_earned', { granted: g, source: 'dilemma' }); } catch { /* non-fatal */ } }
        } else {
          useHeartsStore.getState().resetCombo();
        }
      }
      // XP bonus only for branching dilemmas with a perfect path.
      if (result.unwiseCount === 0 && result.path.length > 1) {
        eco.addXP(20, "challenge_complete");
      }
      // shark-dilemma is now a mid-flow chip (before the quiz, R5.16 2026-06-27) —
      // continue the chip order instead of ending the lesson.
      advanceFromChip("shark-dilemma");
    };

    // Video-first dilemma (pause-in-place over the Finn scene) — picked when the
    // dilemma carries a videoUri AND has the single-slide scenario+options shape.
    // Branching-only dilemmas keep using the static card.
    if (dilemma.videoUri && dilemma.scenario && dilemma.options) {
      return <VideoSharkDilemmaCard dilemma={dilemma} onComplete={handleDilemmaComplete} />;
    }

    return <SharkDilemmaCard dilemma={dilemma} onComplete={handleDilemmaComplete} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {proGateModal}
      {phase !== "quizzes" && <DecorationOverlay screenName="LessonFlowScreen" active={isFocused} />}
      
      <View style={{ backgroundColor: "#ffffff" }}>
        <View style={{ paddingTop: safeInsets.top }} />
        <GlobalWealthHeader />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: safeInsets.bottom }}>
        {/* Top bar: Back + Mute + Bookmark */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: -4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {/* Mute button */}
            <AnimatedPressable
              onPress={toggleMute}
              style={{
                padding: 8,
                borderRadius: 20,
                backgroundColor: "rgba(0,0,0,0.05)",
              }}
              accessibilityRole="button"
              accessibilityLabel={isMuted ? "הפעל צליל" : "השתק"}
            >
              <Text style={{ fontSize: 18 }}>{isMuted ? "🔇" : "🔉"}</Text>
            </AnimatedPressable>

            {/* Bookmark button */}
            <AnimatedPressable
              onPress={handleBookmarkPress}
              style={{
                padding: 8,
                borderRadius: 20,
                backgroundColor: "rgba(0,0,0,0.05)",
              }}
              accessibilityRole="button"
              accessibilityLabel={isBookmarked ? "הסר סימניה" : "הוסף סימניה"}
            >
              <Bookmark
                size={20}
                color={isBookmarked ? "#16a34a" : unitColors.bg}
                fill={isBookmarked ? "#16a34a" : "transparent"}
              />
            </AnimatedPressable>

            {/* Chat bot button */}
            <AnimatedPressable
              onPress={() => setShowChatOverlay(true)}
              style={{
                padding: 8,
                borderRadius: 20,
                backgroundColor: "rgba(0,0,0,0.05)",
              }}
              accessibilityRole="button"
              accessibilityLabel="פתח צ׳אט עם הקפטן"
            >
              <View accessible={false}>
                <LottieView
                  source={require("../../../assets/lottie/wired-flat-202-chat-hover-oscillate.json")}
                  style={{ width: 20, height: 20 }}
                  autoPlay loop speed={0.7}
                />
              </View>
            </AnimatedPressable>
          </View>

          {/* Module title + Back button */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
            {isPro && <ProBadge size="sm" />}
            <Text
              style={{ fontSize: 14, fontWeight: "800", color: "#0f172a", writingDirection: "rtl", flexShrink: 1 }}
              numberOfLines={1}
            >
              {mod.title}
            </Text>
            <AnimatedPressable
              onPress={safeGoBack}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 8,
                paddingHorizontal: 4,
              }}
              accessibilityRole="button"
              accessibilityLabel="חזור"
            >
              <ChevronRight size={22} color={unitColors.bg} />
            </AnimatedPressable>
          </View>
        </View>

        {/* Streak text, fire lottie + label, absolute so it doesn't push content down */}
        {showStreakPopup && consecutiveCorrect >= 3 && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={{ position: 'absolute', left: 16, top: 58, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 10 }}
          >
            <View style={{ width: 18, height: 18 }} accessible={false}>
              <LottieView
                source={require("../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json")}
                style={{ width: 18, height: 18 }}
                autoPlay
                loop
              />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '900', color: '#f97316' }}>
              {consecutiveCorrect >= 7 ? "גאונים פיננסיים!" : consecutiveCorrect >= 5 ? "מושלם!" : "רצף!"}
            </Text>
            <View
              accessible
              accessibilityLabel={consecutiveCorrect >= 7 ? "בונוס כפול XP" : consecutiveCorrect >= 5 ? "בונוס פי 1.75 XP" : "בונוס פי 1.5 XP"}
              style={{ backgroundColor: 'rgba(249,115,22,0.25)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(249,115,22,0.5)' }}
            >
              <Text style={{ fontSize: 11, fontWeight: '900', color: '#f97316' }}>
                {consecutiveCorrect >= 7 ? "x2 XP" : consecutiveCorrect >= 5 ? "x1.75 XP" : "x1.5 XP"}
              </Text>
            </View>
            {/* Energy-battery sync: the streak also charged the purple battery. */}
            {comboEnergyGranted && (
              <View
                accessible
                accessibilityLabel="טענת יחידת אנרגיה"
                style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 3, backgroundColor: ENERGY.track, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: ENERGY.base }}
              >
                <EnergyBatteryIcon size={14} level={1} />
                <Text style={{ fontSize: 11, fontWeight: '900', color: ENERGY.deep }}>+אנרגיה</Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Energy-earned celebration — dancing shark + "+1 אנרגיה" (Yoav 18/06).
            Makes charging the battery from a streak feel genuinely rewarding. */}
        {showStreakPopup && comboEnergyGranted && (
          <Animated.View
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(220)}
            style={{ position: 'absolute', top: 86, left: 0, right: 0, alignItems: 'center', zIndex: 11 }}
            pointerEvents="none"
          >
            <ExpoImage source={SHARK_FULL_CHEER} style={{ width: 96, height: 96 }} contentFit="contain" accessible={false} />
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: ENERGY.base, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 7, marginTop: -6, shadowColor: ENERGY.deep, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff', writingDirection: 'rtl' }}>+1 אנרגיה ⚡</Text>
            </View>
          </Animated.View>
        )}

        <Animated.View style={titleStyle}>
          {/* Title row, hidden during intro, quizzes, sim, sim-intro, and comic flashcards */}
          {!(phase === "flashcards" && (mod.flashcards[flashcardIndex]?.isComic || mod.flashcards[flashcardIndex]?.isMeme || mod.flashcards[flashcardIndex]?.videoUri)) && phase !== "intro" && phase !== "quizzes" && phase !== "sim" && (phase as string) !== "sim-intro" && (() => {
            let titleNodes: React.ReactNode[] | null = null;
            let titleText =
              phase === "podcast" && modPodcast
                ? `🎙️  ${modPodcast.title}`
                : phase === "couple-dilemma"
                  ? "הדילמות של הזוג הצעיר"
                  : phase === "interactive-recall"
                    ? "השלמת משפטים"
                    : mod.title;
            if (phase === "flashcards") {
              const cardText = mod.flashcards[flashcardIndex]?.text ?? "";
              const colonIdx = cardText.indexOf(":");
              if (colonIdx > 0 && colonIdx < 80) {
                const rawTitle = cardText.substring(0, colonIdx);
                const extracted = rawTitle
                  .replace(/\[\[([^|\]]+)\|?[^\]]*\]\]/g, "$1")
                  .replace(/\s*\([A-Za-z][A-Za-z\s&/.,'%\-–—:;$#0-9]*\)\s*/g, " ")
                  .trim();
                if (rawTitle.includes('[[')) {
                  titleNodes = renderBoldText(rawTitle, setActiveGlossaryTerm);
                }
                titleText = /^[A-Za-z]/.test(extracted) ? '\u200F' + extracted : extracted;
              }
            }
            return (
              <View style={{ marginBottom: 6 }}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start' }}>
                  <Text
                    style={[RTL_STYLE, { color: '#1f2937', fontSize: 18, fontWeight: '900' }]}
                    numberOfLines={2}
                    accessibilityRole="header"
                  >
                    {titleNodes ?? titleText}
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* Progress bar, hidden during sim-intro AND the sim itself — a
              sandbox ("ארגז חול") has no linear step progress, so any bar there
              reads as a stale "whole-module" indicator (Yoav 2026-06-19: "בר
              ההתקדמות... מראה עדיין את כל המודולה"). */}
          {(phase as string) !== "sim-intro" && (phase as string) !== "sim" && (() => {
            const hasSim = MODULES_WITH_SIM.has(mod.id);
            const isSimFirst = SIM_FIRST_MODULE_IDS.has(mod.id);
            // Podcast + couple-dilemma each add one step to the lesson flow.
            const hasPodcastStep = !!modPodcast;
            const hasCoupleDilemmaStep = !!modCoupleDilemma && coupleDilemmaTriggerAfter >= 0;
            const podcastOffset = hasPodcastStep ? 1 : 0;
            const dilemmaOffset = hasCoupleDilemmaStep ? 1 : 0;
            const breakOffset = podcastOffset + dilemmaOffset;
            const totalSteps = 1 + mod.flashcards.length + mod.quizzes.length + (hasSim ? 1 : 0) + 1 + breakOffset;
            // For a flashcard at `idx`, account for break steps that sit before this card
            const fcOffset = (idx: number) =>
              (hasPodcastStep && idx > podcastTriggerAfter ? 1 : 0) +
              (hasCoupleDilemmaStep && idx > coupleDilemmaTriggerAfter ? 1 : 0);
            // Each break phase's own position in the progress bar
            const podcastStep = (base: number) => base + podcastTriggerAfter + 1;
            const dilemmaStep = (base: number) =>
              base + coupleDilemmaTriggerAfter + 1 +
              (hasPodcastStep && coupleDilemmaTriggerAfter > podcastTriggerAfter ? 1 : 0);
            const currentStep = isSimFirst
              ? (phase === "hero" || phase === "intro" ? 0
                : phase === "sim-intro" || phase === "sim" ? 1
                : phase === "flashcards" ? 2 + flashcardIndex + fcOffset(flashcardIndex)
                : phase === "podcast" ? podcastStep(2)
                : phase === "couple-dilemma" ? dilemmaStep(2)
                : phase === "interactive-recall" ? 2 + mod.flashcards.length + breakOffset
                : phase === "quizzes" ? 2 + mod.flashcards.length + quizIndex + breakOffset
                : totalSteps)
              : (phase === "hero" || phase === "intro" ? 0
                : phase === "flashcards" ? 1 + flashcardIndex + fcOffset(flashcardIndex)
                : phase === "podcast" ? podcastStep(1)
                : phase === "couple-dilemma" ? dilemmaStep(1)
                : phase === "interactive-recall" ? 1 + mod.flashcards.length + breakOffset
                : phase === "quizzes" ? 1 + mod.flashcards.length + quizIndex + breakOffset
                : phase === "sim-intro" || phase === "sim" ? 1 + mod.flashcards.length + mod.quizzes.length + breakOffset
                : totalSteps);
            // Topic-tree (R5): the user entered at a specific phase via a
            // chip, so the bar should reflect only that phase's progress
            // — not the whole lesson. Otherwise cards reads "12% of lesson"
            // which is unhelpful inside the topic-tree pilot.
            const pctLessonWide = Math.min((currentStep / totalSteps) * 100, 100);
            const pct = returnTo === 'topic-tree'
              ? (phase === 'flashcards'
                  ? (flashcardIndex / Math.max(1, mod.flashcards.length)) * 100
                  : phase === 'quizzes'
                  ? (quizIndex / Math.max(1, mod.quizzes.length)) * 100
                  : phase === 'interactive-recall' && recallProgress.total > 0
                  // Yoav 2026-06-11: השלמת משפטים — fill per prompt
                  // solved (3-ish prompts each). Previously flat 0 →
                  // felt broken.
                  ? (recallProgress.current / recallProgress.total) * 100
                  : phase === 'podcast' && podcastProgress.total > 0
                  // Yoav 2026-06-11: tick podcast 1/5 → 5/5 across its
                  // internal phases (intro → listen → summary → q1 → q2)
                  // instead of falling back to lesson-wide pct ("שיתקדם
                  // כל פעם ב 1/N").
                  ? (podcastProgress.current / podcastProgress.total) * 100
                  // Remaining singleton phases (sim/couple-dilemma/
                  // shark-dilemma/infographic/post-video/video) don't
                  // expose internal progress. Show a 50% baseline so
                  // the bar reads as "you're inside this section,
                  // making progress" instead of "empty bar = nothing
                  // happened".
                  : 50)
              : pctLessonWide;
            // Fire bar ignites at 2-in-a-row (Yoav 2026-06-19: "אחרי 2 תשובות
            // הבר יהיה לוהט עם אש") — NOT Pro-gated, so both Pro and free users
            // get the cool streak visual. The energy combo bonus (every 4) is
            // granted separately in handleCorrectAnswer via registerComboCorrect.
            const isOnFire = consecutiveCorrect >= 2;
            const barColors: [string, string, string] = isOnFire ? ['#fbbf24', '#f97316', '#ef4444'] : [unitColors.glow, unitColors.glow, unitColors.bg];
            const barShadow = isOnFire ? '#f97316' : unitColors.glow;
            const barBorder = isOnFire ? '#ef4444' : '#d1d5db';
            const barHeight = isOnFire ? 16 : 14;
            return (
              <View style={{ marginTop: 8, marginBottom: (phase === "flashcards" && (mod.flashcards[flashcardIndex]?.isComic || mod.flashcards[flashcardIndex]?.isMeme || mod.flashcards[flashcardIndex]?.videoUri)) ? 2 : 6, transform: [{ scaleX: -1 }] }}>
                {/* Outer glow wrapper for fire effect */}
                {isOnFire && (
                  <View style={{ position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: 999, shadowColor: '#f97316', shadowOpacity: 0.9, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 6 }} />
                )}
                <View style={{ height: barHeight, backgroundColor: '#e5e7eb', borderRadius: 999, overflow: 'hidden', borderWidth: isOnFire ? 2.5 : 1.5, borderColor: barBorder, shadowColor: barShadow, shadowOpacity: isOnFire ? 1 : 0.5, shadowRadius: isOnFire ? 28 : 8, shadowOffset: { width: 0, height: 0 }, elevation: isOnFire ? 12 : 4 }}>
                  <LinearGradient
                    colors={barColors}
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: '100%', borderRadius: 999, width: `${pct}%` }}
                  >
                    {/* Shine effect, brighter on fire */}
                    <View style={{ position: 'absolute', top: 2, left: 6, right: 6, height: isOnFire ? 4 : 3, backgroundColor: isOnFire ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.35)', borderRadius: 999 }} />
                  </LinearGradient>
                </View>
              </View>
            );
          })()}
        </Animated.View>

        {/* ── Hero phase, full-screen character art ── */}
        {phase === "hero" && MODULE_HERO_MAP[mod.id] && (
          <Animated.View entering={FadeIn.duration(600)} style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f0f7ff" }}>
            <Pressable
              onPress={() => { tapHaptic(); setPhase("intro"); }}
              style={{ flex: 1, width: "100%", justifyContent: "center", alignItems: "center" }}
              accessibilityRole="button"
              accessibilityLabel="לחץ להתחיל"
            >
              <ExpoImage
                source={MODULE_HERO_MAP[mod.id]}
                style={{ width: "90%", height: "75%", borderRadius: 24 }}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={150}
                accessible={false}
              />
              <Animated.Text
                entering={FadeInUp.delay(800).duration(500)}
                style={{ marginTop: 24, fontSize: 18, fontWeight: "700", color: "#64748b", textAlign: "center" }}
              >
                לחץ להתחיל ▶
              </Animated.Text>
            </Pressable>
          </Animated.View>
        )}

        {/* ── Intro phase ── */}
        {phase === "intro" && (
          <Animated.View style={[contentStyle, { flex: 1 }]}>
            {mod.introVariant === 'short' && mod.id === 'mod-1-1' ? (
              <CompoundInterestIntro
                onStart={handleIntroStart}
                unitColors={unitColors}
                chartImageUri={mod.introImage?.uri}
                audioUri={mod.introAudio?.uri}
                audioReady={audioReady}
                audioPaused={showEnergyIntro}
              />
            ) : mod.introVariant === 'short' && MODULE_INTRO_CONFIGS[mod.id] ? (
              <ModuleIntroShort
                onStart={handleIntroStart}
                unitColors={unitColors}
                config={MODULE_INTRO_CONFIGS[mod.id]}
                audioUri={mod.introAudio?.uri}
                audioReady={audioReady}
                audioPaused={showEnergyIntro}
              />
            ) : mod.introVariant === 'short' ? (
              <WhatIsMoneyIntro
                onStart={handleIntroStart}
                unitColors={unitColors}
              />
            ) : (
              <InteractiveIntroCard
                introText={mod.interactiveIntro}
                audioUri={mod.introAudio?.uri}
                audioReady={audioReady}
                audioPaused={showEnergyIntro}
                introImageUri={mod.introImage?.uri}
                onStart={handleIntroStart}
                unitColors={unitColors}
              />
            )}
          </Animated.View>
        )}

        {/* Branded loading beat between intro and cards, while module images
            finish prefetching. Capped at POST_INTRO_CAP_MS by the effect above
            so it never blocks the user on a slow network. */}
        {pendingPostIntroPhase && (
          <SharkLoader
            variant="overlay"
            subtitle="קפטן שארק מכין את הכרטיסיות"
            context="intro_to_cards"
            capMs={POST_INTRO_CAP_MS}
          />
        )}

        {/* ── Flashcards phase ── */}
        {/* Guard before destructuring mod.flashcards[flashcardIndex] — the
            cardFilter effect (line ~3095) sets flashcardIndex = flashcards.length
            when no card matches the filter (e.g. cardFilter='video' on a module
            with no video flashcards). Without this guard, `card[…].id` threw
            synchronously and crashed the screen. Self-heal: skip to quizzes
            so the user is never trapped on a blank phase (QA 2026-06-12). */}
        {phase === "flashcards" && mod.flashcards[flashcardIndex] && (
          <Animated.View style={[contentStyle, { flex: 1 }]}>
            <FlashcardCard
              key={mod.flashcards[flashcardIndex].id}
              card={mod.flashcards[flashcardIndex]}
              index={flashcardIndex}
              total={mod.flashcards.length}
              onNext={handleFlashcardNext}
              onPrev={handleFlashcardPrev}
              onClose={() => returnToMap("/(tabs)/index")}
              onSkipAll={() => { mediumHaptic(); setFlashcardIndex(mod.flashcards.length - 1); }}
              unitColors={unitColors}
              onTermPress={setActiveGlossaryTerm}
              onOpenChat={() => setShowChatOverlay(true)}
              showFinnTip={mod.id === "mod-0-1"}
            />
          </Animated.View>
        )}
        {phase === "flashcards" && !mod.flashcards[flashcardIndex] && (
          <FallbackToPhaseEffect run={() => setPhase("quizzes")} />
        )}

        {/* ── Daisy Podcast phase (between flashcards) ── */}
        {phase === "podcast" && modPodcast && (
          <Animated.View style={{ flex: 1 }}>
            <PodcastSegmentScreen
              podcast={modPodcast}
              onProgress={handlePodcastProgress}
              onComplete={() => advanceFromChip('podcast')}
            />
          </Animated.View>
        )}

        {/* ── Couple Dilemma phase (between flashcards) ── */}
        {phase === "couple-dilemma" && modCoupleDilemma && (
          <Animated.View style={{ flex: 1 }}>
            <CoupleDilemmaScreen
              dilemma={modCoupleDilemma}
              onComplete={() => advanceFromChip('couple-dilemma')}
            />
          </Animated.View>
        )}

        {/* ── Interactive Recall phase (Duolingo-style consolidation) ── */}
        {phase === "interactive-recall" && (
          <Animated.View style={[contentStyle, { flex: 1 }]}>
            <InteractiveRecallScreen
              moduleId={mod.id}
              unitColors={unitColors}
              onComplete={handleInteractiveRecallComplete}
              onProgress={handleInteractiveRecallProgress}
            />
          </Animated.View>
        )}

        {/* ── Quizzes phase ── */}
        {phase === "quizzes" && (
          <Animated.View style={[contentStyle, { flex: 1 }]}>
            {/* Energy display — hidden for Pro (unlimited; no ∞ advertising).
                Tappable: when empty → straight to the Pro paywall (Yoav 18/06);
                otherwise open the refill modal (timer + ad + coins).
                Also hidden when energy is OFF for this module (mod-0-1): the
                meter there was pure noise pointing at a paywall mid-first-quiz
                (ים 2026-07-02, activation pass). */}
            {!isPro && energyOn && (
            <Pressable
              onPress={() => {
                tapHaptic();
                if (heartsCount <= 0) {
                  try { captureEvent('energy_indicator_tapped', { state: 'empty' }); } catch { /* non-fatal */ }
                  router.push('/pricing?source=energy_indicator_empty' as never);
                } else {
                  setShowOutOfHearts(true);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={heartsCount <= 0 ? 'אזלה האנרגיה — שדרגו לאנרגיה אינסופית' : `אנרגיה: ${heartsCount} מתוך ${MAX_ENERGY}`}
              hitSlop={8}
              style={{ flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 6, marginBottom: 6 }}
            >
              <EnergyBatteryIcon size={20} level={MAX_ENERGY > 0 ? heartsCount / MAX_ENERGY : 0} />
              <Text style={{ fontSize: 14, color: ENERGY.deep, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
                {`${heartsCount}/${MAX_ENERGY}`}
              </Text>
            </Pressable>
            )}
            <QuizCard
              key={mod.quizzes[quizIndex].id}
              quiz={mod.quizzes[quizIndex]}
              quizIndex={quizIndex}
              totalQuizzes={mod.quizzes.length}
              onCorrectAnswer={handleCorrectAnswer}
              onWrongRevealed={handleWrongRevealed}
              onWrongImmediate={handleWrongImmediate}
              unitColors={unitColors}
              onTermPress={setActiveGlossaryTerm}
            />
            {/* Streak popup moved above progress bar */}
          </Animated.View>
        )}

        {/* ── Quiz Start Popup ── */}
        <QuizStartPopup
          visible={showQuizIntro}
          quizCount={mod.quizzes.length}
          onStart={() => setShowQuizIntro(false)}
          unitColors={unitColors}
        />

        {/* ── Sim phases (intro + sandbox) ── Wrapped in an error boundary so a
            missing/broken simulator (or absent simConcept) recovers with a
            "המשך" instead of a white screen. Yoav 2026-06-30: recall →
            "סיפור בהמשכים" (the sim chip) blanked the lesson. ── */}
        {(phase === "sim-intro" || phase === "sim") && (
          <GlobalErrorBoundary
            resetKey={phase}
            fallback={(reset) => (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
                <Pressable
                  onPress={() => { reset(); advanceFromChip('sim'); }}
                  accessibilityRole="button"
                  accessibilityLabel="המשך"
                  style={{ backgroundColor: unitColors.bg ?? "#2563eb", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 }}
                >
                  <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900", writingDirection: "rtl" }}>המשך</Text>
                </Pressable>
              </View>
            )}
          >
            {phase === "sim-intro" && mod.simConcept && (
              <SimIntroOverlay
                title={mod.simConcept.title}
                description={mod.simConcept.description}
                onStart={() => { playSound('modal_open_4'); setPhase("sim"); }}
                unitColors={unitColors}
              />
            )}
            {phase === "sim" && (
              <Animated.View style={[contentStyle, { flex: 1, marginHorizontal: -16 }]}>
                <SimulatorLoader moduleId={mod.id} onComplete={handleSimComplete} />
                {/* Skip button removed, users complete sims naturally */}
              </Animated.View>
            )}
          </GlobalErrorBoundary>
        )}

        {/* ── Game phase (inter-module mini-game, IN-LESSON between recall and
            quiz — Yoav 2026-06-25). Mirrors app/topic-game/[gameId].tsx. ── */}
        {phase === "game" && mod && (
          <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={handleGameComplete}>
            {/* GestureHandlerRootView is REQUIRED inside a Modal — RN renders the
                Modal in a SEPARATE native hierarchy outside the app-root GHRV, so
                the game cards' Pan/swipe gestures don't fire without it (Yoav
                2026-06-26: "ההחלקה ימינה ושמאלה לא עבדה"). */}
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#f0f9ff" }}>
            <View style={{ flex: 1, paddingTop: safeInsets.top, paddingBottom: safeInsets.bottom }}>
              <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 12, paddingBottom: 12 }}
                showsVerticalScrollIndicator={false}
              >
                {(() => {
                  switch (getGameForModule(mod.id)) {
                    case 'budget-ninja': return <BudgetNinjaCard isActive freePlay onContinue={handleGameComplete} />;
                    case 'bullshit-swipe': return <BullshitSwipeCard isActive bypassDailyGate onContinue={handleGameComplete} />;
                    case 'cashout-rush': return <CashoutRushCard isActive freePlay onContinue={handleGameComplete} />;
                    case 'fomo-killer': return <FomoKillerCard isActive freePlay onContinue={handleGameComplete} />;
                    case 'higher-lower': return <HigherLowerCard isActive freePlay onComplete={handleGameComplete} />;
                    case 'price-slider': return <PriceSliderCard isActive freePlay onContinue={handleGameComplete} />;
                    default: return null;
                  }
                })()}
              </ScrollView>
            </View>
            </GestureHandlerRootView>
          </Modal>
        )}

        {/* ── Module infographic phase (before chest) ── */}
        {phase === "module-infographic" && mod && MODULE_INFOGRAPHIC_MAP[mod.id] && (
          <Animated.ScrollView
            entering={FadeIn.duration(400)}
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingVertical: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ borderRadius: 18, overflow: "hidden", shadowColor: "#0ea5e9", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 6, backgroundColor: "#fff" }}>
              <ExpoImage
                source={MODULE_INFOGRAPHIC_MAP[mod.id]}
                style={{ width: Dimensions.get("window").width - 56, height: (Dimensions.get("window").width - 56) * 1.5, borderRadius: 18 }}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={150}
              />
            </View>
            <Pressable
              onPress={() => { tapHaptic(); setPhase(mod.id && MODULE_POST_VIDEO_MAP[mod.id] ? "post-infographic-video" : "summary"); }}
              style={{ marginTop: 14, backgroundColor: "#0ea5e9", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, borderBottomWidth: 4, borderBottomColor: "#0369a1" }}
              accessibilityRole="button"
              accessibilityLabel="המשך"
            >
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff" }}>המשך</Text>
            </Pressable>
          </Animated.ScrollView>
        )}

        {/* ── Summary phase ── */}
        {/* Hidden on BOTH (a) the topic-tree chip path (returnTo='topic-tree')
            AND (b) the "למידה רציפה" continuous run (ttProgressActive). Both
            paths return to the map and the accordion's own ChestCelebrationModal
            is the canonical chest — rendering this legacy one too means the
            user sees two chests back-to-back. (Yoav 2026-06-11: "שתי תיבות ברצף").
            The topic-tree's own ChestCelebrationModal is the keeper. */}
        {phase === "summary" && returnTo !== 'topic-tree' && !ttProgressActive && (
          <Animated.View style={[contentStyle, { flex: 1, marginHorizontal: -16 }]}>
            {/* Full-screen confetti overlay, only rendered while active */}
            {confettiActive && (
              <View
                style={[StyleSheet.absoluteFill, { zIndex: 99 }]}
                pointerEvents="none"
              >
                <LottieView
                  ref={confettiLottieRef}
                  source={require("../../../assets/lottie/Confetti.json")}
                  style={{ flex: 1 }}
                  autoPlay
                  loop={false}
                  onAnimationFinish={() => { setConfettiActive(false); }}
                />
              </View>
            )}

            {/* Flying rewards moved to top-level for full-screen reach */}

            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>


            <SummaryScreen
              correctCount={correctCount}
              totalCount={totalCount}
              currentModIdx={currentModIdx}
              chapterModules={chapterModules}
              completedInChapter={completedInChapter}
              chapterId={chapterId}
              nextModule={nextModule}
              showWisdom={showWisdom}
              unitColors={unitColors}
              chestClaimed={chestClaimed}
              chestElement={
                <View style={{ alignItems: "center", justifyContent: "center", flex: chestOpened ? 0 : 1 }}>
                  {/* Elegant centered glow behind chest */}
                  {!chestOpened && (
                    <Animated.View
                      style={[
                        {
                          position: "absolute",
                          alignSelf: "center",
                          width: 180,
                          height: 180,
                          borderRadius: 90,
                          backgroundColor: "rgba(14,165,233,0.08)",
                          shadowColor: "#0ea5e9",
                          shadowOffset: { width: 0, height: 0 },
                          shadowRadius: 30,
                          shadowOpacity: 0.5,
                        },
                        chestGlowAnimStyle,
                      ]}
                    />
                  )}

                  {/* Chest */}
                  <Animated.View style={chestBodyAnimStyle}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="פתח תיבת אוצר"
                      onPress={() => {
                        // SYNCHRONOUS double-tap guard: chestOpened is async state,
                        // so a fast second tap before it flushes would double-grant
                        // coins/XP. chestAnimationStartedRef is set synchronously below.
                        if (chestOpened || chestAnimationStartedRef.current) return;
                        if (!chestOpened) {
                          playSound('btn_click_heavy');
                          chestAnimationStartedRef.current = true;
                          setChestOpened(true);
                          chestGlowScale.value = withTiming(1.2, { duration: 100 });
                          chestGlowOpacity.value = withTiming(0, { duration: 300 });
                          chestBodyScale.value = withTiming(1, { duration: 200 });
                          const drop = pendingChestDropRef.current;
                          if (drop) {
                            grantChestRewards(drop.rewards, 1);
                            // Yoav 2026-06-11: DoN offer rate = 25% per chest
                            // (skipped on chapter-0 which stays celebration-only).
                            if (chapterId !== "chapter-0" && Math.random() < 0.25) {
                              shouldTriggerDoNRef.current = true;
                              setPendingMultiplierRewards(drop.rewards);
                            }
                            // 700ms: chest rewards + flying animation (after chest Lottie opens)
                            safeTimeout(() => {
                              if (!isReplay) {
                                if (peakStreak >= 3) {
                                  const bonusMultiplier = peakStreak >= 7 ? 1.0 : peakStreak >= 5 ? 0.75 : 0.5;
                                  const bonusXp = Math.round(30 * bonusMultiplier);
                                  useEconomyUIStore.getState().addXP(bonusXp, "streak_bonus");
                                }
                                completeModule(mod.id);
                                clearResume(mod.id);
                                // Unified streak credit (local popup + server sync
                                // for notifications/cross-device), not a bare
                                // completeDailyTask() which only updated local state.
                                markDailyActivityCompleted();
                                const durationSec = Math.round((Date.now() - moduleStartTimeRef.current) / 1000);
                                if (durationSec >= 5 && durationSec <= 7200) {
                                  apiRecordModuleDuration(mod.id, durationSec)
                                    .then(() => queryClient.invalidateQueries({ queryKey: userStatsQueryKey }))
                                    .catch(() => { /* fire-and-forget */ });
                                }
                              }
                              const eco = useEconomyUIStore.getState();
                              // 2026-06-04: base module-completion reward
                              // moved out of completeModule() to here so the
                              // GlobalWealthHeader's flying animation fires
                              // on tap, not on summary-phase entry. The
                              // !isReplay guard above already prevents this
                              // from double-firing on a replayed module.
                              eco.addXP(MODULE_COMPLETE_XP, 'lesson_complete');
                              eco.addCoins(150, 'lesson');
                              // Chest bonus reward on top of the base.
                              eco.addCoins(drop.rewards.coins, 'lesson');
                              eco.addXP(drop.rewards.xp, "chest_reward");
                              if (drop.rewards.gems > 0) eco.addGems(drop.rewards.gems);
                              setFlyingCoins(drop.rewards.coins);
                              setFlyingXp(drop.rewards.xp);
                              setConfettiActive(true);
                              playSound('modal_open_4');
                            }, 700);
                          }
                          // 1.2s: auto-advance to "מודול הושלם". Earlier this was 2s,
                          // which felt like a dead pause between chest-open animation and
                          // the Continue CTA appearing — users tapped repeatedly thinking
                          // the app froze. 1.2s lets the chest open + first coin-fly land,
                          // then immediately surfaces the next-lesson CTA.
                          safeTimeout(() => {
                            setChestClaimed(true);
                            // mod-0-1: clean continue. Suppress SharkLove/DoubleOrNothing/
                            // AdBonus/Bridge/Referral/Cover queue and show a single "המשך"
                            // CTA that drops the user back to the learn map, where the
                            // walkthrough fires 1s later. (2026-05-27 redesign.)
                            if (id === 'mod-0-1') {
                              // Reset replay: a user who already saw the walkthrough whose
                              // progress was wiped lands on mod-0-1 again. Don't re-show the
                              // continue CTA or re-fire the walkthrough — go straight to the
                              // learn map (cursor on mod-0-2).
                              if (useTutorialStore.getState().hasSeenAppWalkthrough) {
                                safeTimeout(() => navigateToNextModuleNormally(), 300);
                                return;
                              }
                              safeTimeout(() => {
                                try { captureEvent('mod01_continue_cta_shown', {}); } catch { /* non-fatal */ }
                                setShowMod01ContinueCTA(true);
                              }, 600);
                              return;
                            }
                            // Shark Love, every 3rd completed module (3, 6, 9...)
                            const totalCompletedNow = (queryClient.getQueryData<import('../../lib/api/progress').ModuleProgressRow[]>(progressQueryKey) ?? [])
                              .filter((m) => m.status === 'completed').length;
                            if (totalCompletedNow > 0 && totalCompletedNow % 3 === 0) {
                              safeTimeout(() => {
                                setShowSharkLove(true);
                                playSound('modal_open_4');
                              }, 500);
                            } else if (shouldTriggerDoNRef.current) {
                              shouldTriggerDoNRef.current = false;
                              safeTimeout(() => {
                                setShowDoubleOrNothing(true);
                                playSound('modal_open_4');
                              }, 500);
                            } else if (!isPro && id !== "mod-0-1") {
                              safeTimeout(() => setShowAdBonus(true), 1000);
                            }
                            // Duolingo A/B: ride the chest-dopamine peak (1.5-2s), not after it fades
                            // Bridge CTA, every 4 completed modules (4, 8, 12...)
                            // Skip for minors (no bridge access) and guests
                            const profile = useAuthStore.getState().profile;
                            const isBridgeEligible = !isGuest && profile?.ageGroup !== "minor";
                            const hasDividend = mod ? moduleHasDividendContent(mod.id, mod.flashcards.map(fc => fc.text)) : false;
                            const willShowReferral = totalCompletedNow > 0 && (totalCompletedNow % 5 === 0 || hasDividend);
                            const willShowBridge = isBridgeEligible && totalCompletedNow > 0 && totalCompletedNow % 4 === 0;

                            // Priority: if both would fire, show only Referral (higher CAC value) to avoid ad fatigue.
                            // Queue rather than fire directly so SharkLove/DoubleOrNothing/AdBonus dismiss first
                            // — see useEffect below that drains pendingPostChestNudge once no modal is blocking.
                            // Defer enqueue by 2000ms so any higher-priority modal
                            // (SharkLove +500ms, AdBonus +1800ms) has fired and updated
                            // the blocker state before the drain useEffect schedules its
                            // 600ms timer — eliminates the chest-claim race.
                            // Chapter 0: Cover CTA after the 2nd module
                            const ch0Done = getCompletedModulesSync('ch-0').length;
                            const willShowCoverCh0 = isBridgeEligible && chapterId === "chapter-0" && ch0Done === 2;
                            // Chapter 1: Cover CTA for first 2 bridge triggers (replaces normal bridge)
                            const willShowCoverCh1 = isBridgeEligible && chapterId !== "chapter-0" && willShowBridge && coverCTAShownCount < 2;

                            if (willShowCoverCh0 || willShowCoverCh1) {
                              setCtaModuleCount(totalCompletedNow);
                              safeTimeout(() => setPendingPostChestNudge('cover'), 2000);
                            } else if (willShowReferral) {
                              setCtaModuleCount(totalCompletedNow);
                              setReferralByDividend(hasDividend);
                              safeTimeout(() => setPendingPostChestNudge('referral'), 2000);
                            } else if (willShowBridge) {
                              setCtaModuleCount(totalCompletedNow);
                              safeTimeout(() => setPendingPostChestNudge('bridge'), 2000);
                            } else if (
                              // Lowest priority: tool-of-the-day discovery on a
                              // module where no bridge/referral/cover is due.
                              // Once/day (useToolNudgeStore) so it never nags;
                              // skip the very first module (too early to upsell tools).
                              // canShow('tools') MUST be checked here too: without it,
                              // during the 48h nudge cooldown SharkToolCTA returns null
                              // yet showToolCTA stays true (blocking PostCelebration's
                              // auto-advance) AND markShown() burns the day + fires a
                              // phantom impression. Gating at the source avoids both.
                              totalCompletedNow > 0 &&
                              id !== "mod-0-1" &&
                              !useToolNudgeStore.getState().isShownToday() &&
                              useNudgeQueueStore.getState().canShow('tools')
                            ) {
                              safeTimeout(() => setPendingPostChestNudge('tools'), 2000);
                            }
                          }, 2000);
                        }
                      }}
                    >
                      <LottieView
                        ref={chestLottieRef}
                        source={require("../../../assets/lottie/3D Treasure Box.json")}
                        style={{ width: 220, height: 220 }}
                        autoPlay={false}
                        loop={false}
                      />
                    </Pressable>
                  </Animated.View>

                  {/* Tap prompt */}
                  {!chestOpened && (
                    <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: "center", marginTop: 8 }}>
                      <Text style={{ color: "#0891b2", fontSize: 18, fontWeight: "900", textShadowColor: "rgba(14,165,233,0.3)", textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 }, writingDirection: "rtl" }}>
                        לחץ לפתיחה!
                      </Text>
                      <Text style={{ color: "#64748b", fontSize: 12, marginTop: 2, writingDirection: "rtl" }}>
                        הרווחת תיבת אוצר
                      </Text>
                    </Animated.View>
                  )}
                </View>
              }
              onContinue={() => {
                // Defensive: ensure the current module is marked complete before
                // navigating. Normally the chest-opening flow does this, but if
                // the chest path is skipped or fails silently, the user would
                // loop back to the same module from goToNextSequentialModule().
                if (mod && !isReplay) {
                  completeModule(mod.id);
                }
                // The legacy "auto inter-module game" modal that used to fire
                // here was replaced by the Pearl bonus node on the learn map
                // (src/features/pearls/). Pearls are opt-in — the user lands
                // back on the map, sees the just-unlocked pearl beside the
                // also-unlocked next module, and picks which one to enter.
                // Special routes inside goToNextSequentialModule (mod-0-3
                // interstitial, mod-0-4 paywall, mod-1-9 tower-defense) still
                // fire — only the "regular next-module" branch was rewired
                // there to land on the map instead of auto-starting.
                if (mod?.interModuleContent && !showInterContent) {
                  // Feed-derived cards (premium-learning, did-you-know,
                  // live-market, live-news) still surface inline since the
                  // Pearl only hosts the mini-games + lifestyle video.
                  setShowInterContent(true);
                } else {
                  goToNextSequentialModule();
                }
              }}
              onBack={() => {
                returnToMap("/(tabs)/index");
              }}
            />
            </ScrollView>

          </Animated.View>
        )}
      </View>

      {/* Inter-module game overlay was REMOVED 2026-05-30 — the same mini-
          games now live inside the Pearl bonus node on the learn map
          (src/features/pearls/). Keeping the imports here for any historical
          tooling that still references them; tree-shaking drops them. */}

      {/* Inter-module CONTENT overlay — still fires inline because Feed-derived
          cards (premium-learning, did-you-know, live-market, live-news) aren't
          part of the Pearl experience. */}
      {showInterContent && mod?.interModuleContent && (
        <Modal
          visible
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => { setShowInterContent(false); goToNextSequentialModule(); }}
          accessibilityViewIsModal
        >
          <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
            <View style={{ flexDirection: "row-reverse", paddingHorizontal: 16, paddingTop: Math.max(safeInsets.top + 12, 50), paddingBottom: 8 }}>
              <Pressable
                onPress={() => { setShowInterContent(false); goToNextSequentialModule(); }}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" }}
                accessibilityRole="button"
                accessibilityLabel="סגור והמשך"
                hitSlop={8}
              >
                <Text style={{ color: "#475569", fontSize: 18, fontWeight: "800", lineHeight: 20 }}>✕</Text>
              </Pressable>
            </View>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: Math.max(safeInsets.bottom + 24, 48), flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
            >
              {(() => {
                // Each card renders with its native Feed-style API (the components
                // were extracted from FinFeed unchanged). The X-close button in
                // the modal header handles dismissal — that's what was hooked into
                // the scroll-snap on the old Feed, now manual in this surface.
                const c = mod.interModuleContent;
                const close = () => { setShowInterContent(false); goToNextSequentialModule(); };
                if (c?.premiumLearning) {
                  const item = PREMIUM_LEARNING_ITEMS.find((i) => i.id === c.premiumLearning);
                  return item ? <PremiumLearningCard item={item} isActive onContinue={close} /> : null;
                }
                // DidYouKnow / LiveMarket / LiveNewsQuiz cards don't expose an
                // onContinue prop (they were lifted from the retired FinFeed
                // surface unchanged). Without one the user has to hunt the
                // tiny ✕ in the modal header to advance — flagged as a
                // missing-route in the QA audit (2026-05-31). Wrap each with
                // an explicit Continue button below the card so dismissal is
                // a single, obvious tap.
                const interContentWrap = (node: React.ReactNode) => (
                  <View>
                    {node}
                    <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 }}>
                      <Pressable
                        onPress={() => { tapHaptic(); close(); }}
                        accessibilityRole="button"
                        accessibilityLabel="המשך"
                        style={{
                          paddingVertical: 14,
                          paddingHorizontal: 22,
                          borderRadius: 16,
                          backgroundColor: '#facc15',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a', writingDirection: 'rtl' }} allowFontScaling={false}>המשך</Text>
                      </Pressable>
                    </View>
                  </View>
                );
                if (c?.didYouKnow) {
                  return interContentWrap(<DidYouKnowCard isActive itemId={c.didYouKnow} />);
                }
                if (c?.liveMarketTicker) {
                  // LiveMarketCard reads its own ticker internally; we just
                  // mount it. (Per-ticker selection lives in liveMarketTypes.)
                  return interContentWrap(<LiveMarketCard />);
                }
                if (c?.liveNewsId) {
                  return interContentWrap(<LiveNewsQuizCard isActive />);
                }
                return null;
              })()}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Double or Nothing modal */}
      <DoubleOrNothingModal
        visible={showDoubleOrNothing}
        rewards={{ coins: pendingMultiplierRewards?.coins ?? 0, xp: 0, gems: 0 }}
        onResolve={handleDoubleOrNothingResolve}
      />

      {/* Ad bonus, double coins by watching ad (non-PRO only) */}
      {showAdBonus && !isProForAds && adLoaded && (
        <PopModal visible onRequestClose={() => setShowAdBonus(false)} backdropColor="rgba(8, 20, 40, 0.75)">
            <View style={{ backgroundColor: "#0f2942", borderRadius: 28, padding: 28, width: "100%", maxWidth: 340, alignItems: "center", borderWidth: 1, borderColor: "rgba(56,189,248,0.15)" }}>
              <ExpoImage source={FINN_HAPPY} accessible={false} style={{ width: 80, height: 80, marginBottom: 12 }} contentFit="contain" />
              <Text style={{ ...RTL_STYLE, fontSize: 20, fontWeight: "900", color: "#ffffff", textAlign: "center", marginBottom: 8 }}>
                רוצה עוד מטבעות?
              </Text>
              <Text style={{ ...RTL_STYLE, fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.6)", textAlign: "center", marginBottom: 24 }}>
                צפה בסרטון קצר וקבל 500 מטבעות בונוס!
              </Text>
              <Pressable
                onPress={() => {
                  tapHaptic();
                  setShowAdBonus(false);
                  showRewardedAd(() => {
                    useEconomyUIStore.getState().addCoins(500);
                    successHaptic();
                    setFlyingCoins(500);
                  });
                }}
                style={{ backgroundColor: "#0284c7", borderRadius: 16, paddingVertical: 16, width: "100%", alignItems: "center", borderBottomWidth: 4, borderBottomColor: "#0369a1" }}
                accessibilityRole="button"
                accessibilityLabel="צפה בסרטון וקבל מטבעות"
              >
                <Text style={{ fontSize: 17, fontWeight: "900", color: "#ffffff" }}>צפה וקבל 🎬</Text>
              </Pressable>
              <Pressable
                onPress={() => { tapHaptic(); setShowAdBonus(false); }}
                style={{ marginTop: 16, paddingVertical: 8 }}
                accessibilityRole="button"
                accessibilityLabel="דלג"
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#64748b" }}>דלג</Text>
              </Pressable>
            </View>
        </PopModal>
      )}

      {/* Full-screen "blue chest" takeover DELETED (ים 2026-07-02): it had been
          dead since the chest moved in-place (<Modal visible={false}> hardcoded),
          but its ~112-View diamond JSX was still re-created on every render of
          this screen. The in-place chest render is untouched. */}

      {/* Energy-loss animation is now global (EnergyAnimationProvider) — fired
          by the useHeart() store signal, no local overlay needed. */}

      {/* AI Lifeline intervention, triggered when concept is consistently failed */}
      <LifelineModal
        visible={lifelineConcept !== null}
        conceptTag={lifelineConcept ?? ""}
        onAccept={() => {
          const tag = lifelineConcept;
          setLifelineConcept(null);
          if (tag) {
            useAdaptiveStore.getState().setActiveLifelineConcept(tag);
            useAdaptiveStore.getState().clearConcept(tag);
            setLifelineChatConcept(tag);
          }
        }}
        onDismiss={() => setLifelineConcept(null)}
      />

      {/* Inline chat overlay, opens ON TOP of quiz, X to close and continue */}
      <LifelineChatOverlay
        visible={lifelineChatConcept !== null}
        conceptTag={lifelineChatConcept ?? ""}
        onClose={() => setLifelineChatConcept(null)}
      />

      {/* Hearts & Paywall modals */}
      <OutOfHeartsModal
        visible={showOutOfHearts}
        onDismiss={() => {
          setShowOutOfHearts(false);
          returnToMap("/(tabs)/index");
        }}
        onHeartsRefilled={() => {
          setShowOutOfHearts(false);
          // המשתמש קיבל לב חזרה — להמשיך לשאלה הבאה בקוויז.
          // לא נעשה כשמדובר בתשובה נכונה (כי המודל לא נפתח אז), רק אחרי
          // handleWrongRevealed שכבר עצר על hearts<=0.
          safeTimeout(() => advanceQuiz(), 150);
        }}
        onUpgrade={() => {
          setShowOutOfHearts(false);
          router.push('/pricing' as never);
        }}
      />

      {/* Chapter completion celebration overlay */}
      {showChapterComplete && (
        <AnimatedPressable
          noScale
          onPress={() => setShowChapterComplete(false)}
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 120,
            paddingBottom: 60,
            zIndex: 100,
          }}
          accessibilityRole="button"
          accessibilityLabel="סגור"
        >
          <ConfettiExplosion />
          <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: "center", gap: 16 }}>
            {/* Trophy Lottie */}
            <View style={{ width: 120, height: 120, overflow: "hidden" }}>
              <LottieView
                source={require("../../../assets/lottie/wired-flat-3263-trophy-circle-hover-roll.json")}
                style={{ width: 120, height: 120 }}
                autoPlay
                loop
              />
            </View>
            <Text
              style={{ ...RTL_STYLE, color: "#4ade80", fontSize: 28, fontWeight: "900" }}
              accessibilityRole="header"
            >
              הפרק הושלם!
            </Text>
            {chapterId === "chapter-5" && (
              <Text
                style={{ ...RTL_STYLE, color: "#facc15", fontSize: 18, fontWeight: "800" }}
              >
                השלמת את כל המסע הפיננסי!
              </Text>
            )}
            <Text style={{ ...RTL_STYLE, color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: "600" }}>
              כל הכבוד! סיימת את כל המודולים בפרק 🏆
            </Text>

            {/* Medals row */}
            <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Text key={i} style={{ fontSize: 28 }}>🥇</Text>
              ))}
            </View>

            {/* Reward badges */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <View style={{ alignItems: "center", backgroundColor: "rgba(14,165,233,0.18)", borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(56,189,248,0.3)" }}>
                <Text style={{ fontSize: 22, fontWeight: "900", color: "#38bdf8" }}>+100</Text>
                <Text style={{ fontSize: 12, color: "#7dd3fc", marginTop: 2 }}>XP</Text>
              </View>
              <View style={{ alignItems: "center", backgroundColor: "rgba(212,160,23,0.22)", borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(250,204,21,0.3)" }}>
                <Text style={{ fontSize: 22, fontWeight: "900", color: "#facc15" }}>+50</Text>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <GoldCoinIcon size={14} />
                  <Text style={{ fontSize: 12, color: "#fde68a" }}>מטבעות</Text>
                </View>
              </View>
              <View style={{ alignItems: "center", backgroundColor: "rgba(59,130,246,0.22)", borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(96,165,250,0.3)" }}>
                <Text style={{ fontSize: 22, fontWeight: "900", color: "#60a5fa" }}>+10</Text>
                <Text style={{ fontSize: 12, color: "#93c5fd", marginTop: 2 }}>💎</Text>
              </View>
            </View>
          </Animated.View>

          {/* Continue button, pinned to bottom */}
          <Animated.View entering={FadeIn.delay(800).duration(400)} style={{ width: "80%", alignItems: "center" }}>
            <View style={{
              width: "100%",
              backgroundColor: unitColors.bg,
              borderRadius: 18,
              paddingVertical: 18,
              alignItems: "center",
              borderBottomWidth: 4,
              borderBottomColor: unitColors.bottom,
              shadowColor: unitColors.glow,
              shadowOpacity: 0.5,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 0 },
              elevation: 8,
            }}>
              <Text style={{ fontSize: 18, fontWeight: "900", color: "#ffffff" }}>המשך</Text>
            </View>
          </Animated.View>
        </AnimatedPressable>
      )}
      {/* Finn bridge nudge, after chapter 0 completion */}
      {showFinnBridgeNudge && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowFinnBridgeNudge(false)}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }} onPress={() => setShowFinnBridgeNudge(false)} accessibilityRole="button" accessibilityLabel="סגור">
            <Pressable style={{ backgroundColor: "#e0f2fe", borderRadius: 24, padding: 24, width: "100%", maxWidth: 340, alignItems: "center" }} onPress={() => {}} accessible={false}>
              <ExpoImage source={FINN_HAPPY} accessible={false} style={{ width: 80, height: 80, marginBottom: 12 }} contentFit="contain" />
              <Text style={{ ...RTL_STYLE, fontSize: 18, fontWeight: "900", color: "#0c4a6e", marginBottom: 10, textAlign: "center" }}>
                התחלת ללמוד אה? 🎉
              </Text>
              <Text style={{ ...RTL_STYLE, fontSize: 15, fontWeight: "600", color: "#334155", lineHeight: 24, textAlign: "center", marginBottom: 20 }}>
                תכף נתחיל להשקיע ביחד באפליקציה, ואז משם נמשיך לעולם האמיתי! תכנס לעמוד הגשר לראות מה מצפה לנו
              </Text>
              <View style={{ width: "100%", borderRadius: 18, shadowColor: "#3b82f6", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 16, elevation: 0 }}>
                <Pressable
                  onPress={() => { tapHaptic(); setShowFinnBridgeNudge(false); router.push("/bridge" as never); }}
                  accessibilityRole="button"
                  accessibilityLabel="קח אותי לגשר"
                >
                  {({ pressed }) => (
                    <View style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      backgroundColor: "#3b82f6",
                      borderRadius: 18,
                      paddingVertical: 16,
                      paddingHorizontal: 24,
                      width: "100%",
                      borderWidth: 2,
                      borderColor: "#2563eb",
                      borderBottomWidth: 5,
                      borderBottomColor: "#1d4ed8",
                      overflow: "hidden",
                      elevation: 12,
                      opacity: pressed ? 0.88 : 1,
                      transform: pressed ? [{ scale: 0.98 }] : undefined,
                    }}>
                      <Text style={{ fontSize: 17, fontWeight: "900", color: "#ffffff", writingDirection: "rtl", textShadowColor: "rgba(0,0,0,0.25)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>קח אותי לגשר</Text>
                      <Text style={{ fontSize: 26, lineHeight: 30 }}>🌉</Text>
                    </View>
                  )}
                </Pressable>
              </View>
              <Pressable
                onPress={() => { tapHaptic(); setShowFinnBridgeNudge(false); }}
                style={{ marginTop: 12, paddingVertical: 8 }}
                accessibilityRole="button"
                accessibilityLabel="אחר כך"
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748b" }}>אחר כך</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Auto-flow chip-completion callout ("עוד X לתיבה", pop+confetti). */}
      <SharkChipCallout seq={calloutSeq} remaining={calloutRemaining} isFirstChest={chestThresholdFor(id ?? '') <= 0.5} />

      {/* Captain Shark compliment when the user continues past the chest (toast). */}
      <SharkChipCallout seq={complimentSeq} remaining={99} isFirstChest={false} message={complimentMsg ?? undefined} />

      {/* Energy intro — one-shot at mod-0-1b's first chip (first encounter with energy). */}
      <PopModal visible={showEnergyIntro} onRequestClose={dismissEnergyIntro} backdropColor="rgba(15, 23, 42, 0.45)">
          <View style={{ backgroundColor: "#f7fbff", borderRadius: 28, paddingVertical: 20, paddingHorizontal: 12, width: "100%", maxWidth: 360, alignItems: "center", borderWidth: 2, borderColor: "#ddd6fe", shadowColor: "#a855f7", shadowOpacity: 0.28, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 14 }}>
            {/* The real, live energy band — Captain Shark + the bar — copied from the
                learn map (EnergyStationCard). Renders null for Pro (infinite energy). */}
            <View style={{ width: "100%" }}>
              <EnergyStationCard />
            </View>
            <Text style={{ ...RTL_STYLE, fontSize: 20, fontWeight: "900", color: "#1e1b4b", textAlign: "center", marginTop: 6, marginBottom: 6, paddingHorizontal: 10 }}>
              זה האנרגיה שלך
            </Text>
            <Text style={{ ...RTL_STYLE, fontSize: 15, fontWeight: "600", color: "#475569", textAlign: "center", marginBottom: 18, lineHeight: 22, paddingHorizontal: 10 }}>
              אתה מבזבז בלמידה, ויכול להרוויח אותה מהתמדה ורצף תשובות נכונות
            </Text>
            <Pressable
              onPress={() => { tapHaptic(); dismissEnergyIntro(); }}
              style={{ backgroundColor: "#7c3aed", borderRadius: 16, paddingVertical: 16, marginHorizontal: 10, alignSelf: "stretch", alignItems: "center", borderBottomWidth: 4, borderBottomColor: "#6d28d9" }}
              accessibilityRole="button"
              accessibilityLabel="המשך"
            >
              <Text style={{ fontSize: 17, fontWeight: "900", color: "#ffffff" }}>המשך</Text>
            </Pressable>
          </View>
      </PopModal>

      {/* Exit interception modal, Duolingo-style */}
      {showExitConfirm && (() => {
        // Minutes remaining = 3 (first third) / 2 (middle) / 1 (last third) of module progress.
        const flashcardsTotal = mod?.flashcards.length ?? 1;
        const quizzesTotal = mod?.quizzes.length ?? 1;
        let fractionDone = 0;
        if (phase === "flashcards") {
          fractionDone = (flashcardIndex / flashcardsTotal) * 0.5;
        } else if (phase === "quizzes") {
          fractionDone = 0.5 + (quizIndex / quizzesTotal) * 0.35;
        } else if (phase === "sim" || (phase as string) === "sim-intro") {
          fractionDone = 0.85;
        } else {
          fractionDone = 1;
        }
        const minutesLeft = fractionDone < 1 / 3 ? 3 : fractionDone < 2 / 3 ? 2 : 1;
        const minutesWord = minutesLeft === 1 ? "עוד דקה" : `עוד ${minutesLeft} דקות`;
        return (
        <PopModal visible onRequestClose={() => setShowExitConfirm(false)} backdropColor="rgba(8, 20, 40, 0.75)">
            <View style={{ backgroundColor: "#0f2942", borderRadius: 28, padding: 28, width: "100%", maxWidth: 340, alignItems: "center", borderWidth: 1, borderColor: "rgba(56,189,248,0.15)" }}>
              <ExpoImage source={FINN_EMPATHIC} accessible={false} style={{ width: 90, height: 90, marginBottom: 16 }} contentFit="contain" />
              <Text style={{ ...RTL_STYLE, fontSize: 20, fontWeight: "900", color: "#ffffff", textAlign: "center", marginBottom: 8 }}>
                חכו, יש רק {minutesWord}{"\n"}לסיום השיעור!
              </Text>
              <Text style={{ ...RTL_STYLE, fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.6)", textAlign: "center", marginBottom: 24 }}>
                כמעט סיימתם, אל תצאו עכשיו
              </Text>
              <Pressable
                onPress={() => { tapHaptic(); setShowExitConfirm(false); }}
                style={{ backgroundColor: "#0284c7", borderRadius: 16, paddingVertical: 16, width: "100%", alignItems: "center", borderBottomWidth: 4, borderBottomColor: "#0369a1" }}
                accessibilityRole="button"
                accessibilityLabel="נמשיך לשחק"
              >
                <Text style={{ fontSize: 17, fontWeight: "900", color: "#ffffff" }}>נמשיך לשחק</Text>
              </Pressable>
              <Pressable
                onPress={forceExit}
                style={{ marginTop: 16, paddingVertical: 8 }}
                accessibilityRole="button"
                accessibilityLabel="צא"
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#ef4444" }}>צא</Text>
              </Pressable>
            </View>
        </PopModal>
        );
      })()}

      {/* Module-first v1: the earned threshold chest, opened at the
          lesson→profiling seam. Every close path continues to onboarding. */}
      {handoffChest && (
        <ChestCelebrationModal
          visible
          xp={handoffChest.xp}
          coins={handoffChest.coins}
          energy={handoffChest.energy}
          rarity={handoffChest.rarity}
          thresholdPct={handoffChest.thresholdPct}
          isFinale={false}
          onContinueModule={closeHandoffChest}
          onAdvanceToNextModule={() => { postChestResumeRef.current = null; closeHandoffChest(); }}
          onDismiss={() => { postChestResumeRef.current = null; closeHandoffChest(); }}
          analyticsModuleId="mod-0-1"
          analyticsSource="inline"
          ahaLine={ahaLineFor('mod-0-1')}
        />
      )}

      {/* Graduate Onboarding: profile question after specific modules */}
      {profileQuestionKind && (
        <InModuleProfileQuestion
          visible={true}
          kind={profileQuestionKind}
          onDone={() => {
            const answeredKind = profileQuestionKind;
            setProfileQuestionKind(null);
            // mod-0-1's inline knowledgeLevel question just resolved (answered
            // OR skipped). Unblock the mod-0-1 70% chest so it appears AFTER
            // this question. Skip-safe: fires on both outcomes (the question's
            // "דלג" doesn't set knowledgeLevel), so the chest is never stuck.
            if (answeredKind === 'knowledgeLevel') {
              try { useTutorialStore.getState().markMod01KnowledgeResolved(); } catch { /* non-fatal */ }
            }
            // Self-declared expert ("כריש מוול סטריט") on the knowledge question
            // → bump straight to chapter 1 instead of grinding the rest of chapter
            // 0. Mark all ch-0 modules complete (server-synced via upsertProgress)
            // and move the learn-map cursor to mod-1-1, then show the celebration.
            // "המשך" drops them on the learn map with ch-1 open.
            if (answeredKind === 'knowledgeLevel' && useAuthStore.getState().profile?.knowledgeLevel === 'expert') {
              // Clear any pending mid-module resume — grade skip supersedes it.
              pendingPostQuestionActionRef.current = null;
              for (const m of chapter0Data.modules) {
                upsertProgress({ moduleId: m.id, status: 'completed', xpEarned: 0 });
              }
              // Durable local record so the skip survives the 404 rollback for guests
              // and cold starts (mirrors completeModule's markCompleted).
              useCompletedModulesStore.getState().markManyCompleted(chapter0Data.modules.map((m) => m.id));
              // Grade-skip compensation — pre-audit the skipper lost ~250 XP and
              // ~150 coins of legitimate chapter-0 yield (all 5 lessons granted
              // upsertProgress with xpEarned:0). The skip is self-aware, not a
              // free ride, so we grant the sum-of-chapter XP equivalent plus a
              // small "expertise bonus" so being honest about the level isn't
              // strictly punished. Matches per-module yield used by mod-0-x
              // completion (~50 XP / lesson + chest coins ~30/lesson).
              const chapter0ModuleCount = chapter0Data.modules.length;
              const PER_MODULE_XP_EQUIV = 50;
              const PER_MODULE_COINS_EQUIV = 30;
              const EXPERT_BONUS_XP = 100;
              try {
                useEconomyUIStore.getState().addXP(
                  chapter0ModuleCount * PER_MODULE_XP_EQUIV + EXPERT_BONUS_XP,
                  'lesson_complete',
                );
                useEconomyUIStore.getState().addCoins(
                  chapter0ModuleCount * PER_MODULE_COINS_EQUIV,
                  'lesson',
                );
              } catch { /* non-fatal */ }
              setCurrentChapter('ch-1');
              setCurrentModule(0);
              try {
                captureEvent('expert_grade_skip', {
                  from_module: id,
                  xp_granted: chapter0ModuleCount * PER_MODULE_XP_EQUIV + EXPERT_BONUS_XP,
                  coins_granted: chapter0ModuleCount * PER_MODULE_COINS_EQUIV,
                });
              } catch { /* non-fatal */ }
              setShowGradeSkipCelebration(true);
              return;
            }
            // Mid-module injection (e.g. mod-0-1 quizzes→sim handoff): resume the
            // queued in-module action instead of navigating to the next module.
            if (pendingPostQuestionActionRef.current) {
              const resume = pendingPostQuestionActionRef.current;
              pendingPostQuestionActionRef.current = null;
              resume();
              return;
            }
            // Re-enter the next-module flow now that profile is populated.
            // pendingProfileQuestionFor will return null this time.
            goToNextSequentialModule();
          }}
        />
      )}

      {/* Expert "grade skip" celebration — Captain Shark bumps the user up to
          chapter 1. Single "המשך" CTA → learn map with mod-1-1 unlocked. */}
      {showGradeSkipCelebration && (
        <Modal visible transparent animationType="fade" onRequestClose={() => {
          setShowGradeSkipCelebration(false);
          returnToMap("/(tabs)/index");
        }}>
          <Pressable
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}
            onPress={() => {}}
            accessible={false}
          >
            <ConfettiExplosion />
            <Pressable style={{ backgroundColor: "#e0f2fe", borderRadius: 24, padding: 24, width: "100%", maxWidth: 340, alignItems: "center" }} onPress={() => {}} accessible={false}>
              <ExpoImage source={FINN_DANCING} accessible={false} style={{ width: 120, height: 120, marginBottom: 12 }} contentFit="contain" />
              <Text style={{ ...RTL_STYLE, fontSize: 20, fontWeight: "900", color: "#0c4a6e", marginBottom: 8, textAlign: "center" }}>
                הקפצנו אותך כיתה!
              </Text>
              <Text style={{ ...RTL_STYLE, fontSize: 15, fontWeight: "600", color: "#334155", lineHeight: 24, textAlign: "center", marginBottom: 20 }}>
                הידע שלך כבר מעבר לבסיס, אז דילגנו על פרק 0. פרק 1 פתוח ומחכה — קדימה לצלול למים העמוקים.
              </Text>
              <AnimatedPressable
                onPress={() => {
                  tapHaptic();
                  try { captureEvent('expert_grade_skip_continue', {}); } catch { /* non-fatal */ }
                  setShowGradeSkipCelebration(false);
                  returnToMap("/(tabs)/index");
                }}
                style={{ backgroundColor: "#0ea5e9", borderRadius: 16, paddingVertical: 16, width: "100%", alignItems: "center", borderBottomWidth: 4, borderBottomColor: "#0284c7", shadowColor: "#0ea5e9", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 }}
                accessibilityRole="button"
                accessibilityLabel="המשך"
              >
                <Text style={{ fontSize: 16, fontWeight: "900", color: "#fff" }}>המשך</Text>
              </AnimatedPressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* mod-0-1 continue CTA: single button that drops to learn map. Tapping it
          (or dismissing via Back/backdrop) opts the user into the walkthrough,
          which then fires on the next frame inside AppWalkthroughOverlay.
          animationType="none" so the walkthrough overlay can take over without
          waiting for a fade-out transition (~300ms perceived delay). */}
      {showMod01ContinueCTA && (
        <Modal visible transparent animationType="none" onRequestClose={() => {
          try { captureEvent('mod01_continue_cta_tapped', { trigger: 'system_back' }); } catch { /* non-fatal */ }
          useTutorialStore.getState().triggerWalkthrough();
          setShowMod01ContinueCTA(false);
          navigateToNextModuleNormally();
        }}>
          <Pressable
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}
            onPress={() => {
              try { captureEvent('mod01_continue_cta_tapped', { trigger: 'backdrop' }); } catch { /* non-fatal */ }
              useTutorialStore.getState().triggerWalkthrough();
              setShowMod01ContinueCTA(false);
              navigateToNextModuleNormally();
            }}
            accessibilityRole="button"
            accessibilityLabel="המשך"
          >
            <Pressable
              style={{ backgroundColor: "#e0f2fe", borderRadius: 24, padding: 24, width: "100%", maxWidth: 340, alignItems: "center" }}
              onPress={() => {}}
              accessible={false}
            >
              <ExpoImage source={FINN_HAPPY} accessible={false} style={{ width: 80, height: 80, marginBottom: 12 }} contentFit="contain" />
              <Text style={{ ...RTL_STYLE, fontSize: 18, fontWeight: "900", color: "#0c4a6e", marginBottom: 8, textAlign: "center" }}>
                כל הכבוד! 🎉
              </Text>
              <Text style={{ ...RTL_STYLE, fontSize: 15, fontWeight: "600", color: "#334155", lineHeight: 22, textAlign: "center", marginBottom: 20 }}>
                סיימת את השיעור הראשון. בואו נכיר את האפליקציה.
              </Text>
              <AnimatedPressable
                onPress={() => {
                  tapHaptic();
                  try { captureEvent('mod01_continue_cta_tapped', { trigger: 'cta' }); } catch { /* non-fatal */ }
                  useTutorialStore.getState().triggerWalkthrough();
                  setShowMod01ContinueCTA(false);
                  navigateToNextModuleNormally();
                }}
                style={{ backgroundColor: "#0ea5e9", borderRadius: 16, paddingVertical: 16, width: "100%", alignItems: "center", borderBottomWidth: 4, borderBottomColor: "#0284c7", shadowColor: "#0ea5e9", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 }}
                accessibilityRole="button"
                accessibilityLabel="המשך"
              >
                <Text style={{ fontSize: 16, fontWeight: "900", color: "#fff" }}>המשך</Text>
              </AnimatedPressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Registration nudge for guests after mod-0-3/4/5 (fires from goToNextSequentialModule) */}
      {showRegisterNudge && (
        <PopModal
          visible
          backdropColor="rgba(0,0,0,0.6)"
          onRequestClose={() => {
            try { captureEvent('register_cta_dismissed', { module_id: id, source: 'lesson', trigger: 'system_back' }); } catch { /* non-fatal */ }
            setShowRegisterNudge(false);
            navigateToNextModuleNormally();
          }}
          onBackdropPress={() => {
            try { captureEvent('register_cta_dismissed', { module_id: id, source: 'lesson', trigger: 'backdrop' }); } catch { /* non-fatal */ }
            setShowRegisterNudge(false);
            navigateToNextModuleNormally();
          }}
        >
            <View style={{ backgroundColor: "#e0f2fe", borderRadius: 24, padding: 24, width: "100%", maxWidth: 340, alignItems: "center" }}>
              <ExpoImage source={FINN_HAPPY} accessible={false} style={{ width: 80, height: 80, marginBottom: 12 }} contentFit="contain" />
              <Text style={{ ...RTL_STYLE, fontSize: 18, fontWeight: "900", color: "#0c4a6e", marginBottom: 10, textAlign: "center" }}>
                כבר למדנו ביחד 💪
              </Text>
              <Text style={{ ...RTL_STYLE, fontSize: 15, fontWeight: "600", color: "#334155", lineHeight: 24, textAlign: "center", marginBottom: 20 }}>
                לא הגיע הזמן להתחייב? הרשמו בחינם ושמרו את כל ההתקדמות שלכם
              </Text>
              <AnimatedPressable
                onPress={() => {
                  tapHaptic();
                  try { captureEvent('register_cta_accepted', { module_id: id, source: 'lesson' }); } catch { /* non-fatal */ }
                  setShowRegisterNudge(false);
                  // After registration, return the user to the next module in
                  // sequence — NOT to /(tabs). Mirrors goToNextSequentialModule
                  // for the post-mod-0-3/4/5 cases.
                  const returnTo = getNextRouteAfterRegister();
                  router.replace(`/(auth)/register?returnTo=${encodeURIComponent(returnTo)}` as never);
                }}
                style={{ backgroundColor: "#0ea5e9", borderRadius: 16, paddingVertical: 16, width: "100%", alignItems: "center", borderBottomWidth: 4, borderBottomColor: "#0284c7", shadowColor: "#0ea5e9", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 }}
                accessibilityRole="button"
                accessibilityLabel="הרשמו בחינם"
              >
                <Text style={{ fontSize: 16, fontWeight: "900", color: "#fff" }}>הרשמו בחינם</Text>
              </AnimatedPressable>
              <Pressable
                onPress={() => {
                  tapHaptic();
                  try { captureEvent('register_cta_dismissed', { module_id: id, source: 'lesson', trigger: 'skip_button' }); } catch { /* non-fatal */ }
                  setShowRegisterNudge(false);
                  navigateToNextModuleNormally();
                }}
                style={{ marginTop: 12, paddingVertical: 8 }}
                accessibilityRole="button"
                accessibilityLabel="המשך"
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748b" }}>המשך</Text>
              </Pressable>
            </View>
        </PopModal>
      )}

      {/* Pizza Index, one-time modal after mod-2-12 summary */}
      <Modal
        visible={showPizzaModal}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          markPizzaSeen();
          setShowPizzaModal(false);
        }}
      >
        <PizzaIndexScreen
          onClose={() => {
            markPizzaSeen();
            setShowPizzaModal(false);
          }}
        />
      </Modal>

      {/* (BullshitSwipe intro modal moved to /interstitial/bullshit-ch0 page —
          shark explanation now appears immediately before the game.) */}

      {/* mod-0-1 barter notif, dancing shark after "מה זה בכלל כסף" */}
      <Modal
        visible={showMod01BarterNotif}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          markMod01BarterNotifSeen();
          setShowMod01BarterNotif(false);
        }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(3,7,18,0.78)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
          <Animated.View entering={FadeInDown.duration(400).springify().damping(14)} style={{ width: "100%", maxWidth: 380, backgroundColor: "#f0fdf4", borderRadius: 24, paddingHorizontal: 22, paddingTop: 28, paddingBottom: 18, borderWidth: 1.5, borderColor: "rgba(34,197,94,0.4)", shadowColor: "#22c55e", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 18, elevation: 14, alignItems: "center" }}>
            <ExpoImage source={FINN_DANCING} accessible={false} style={{ width: 100, height: 100, marginBottom: 12 }} contentFit="contain" />
            <Text style={{ fontSize: 17, fontWeight: "900", color: "#15803d", writingDirection: "rtl", textAlign: "center", marginBottom: 8, lineHeight: 26 }}>
              גם אני מבצע מסחר עם אחי התאום
            </Text>
            <Text style={{ fontSize: 13, color: "#4b5563", writingDirection: "rtl", textAlign: "center", lineHeight: 20, marginBottom: 22 }}>
              אבל אני לפחות לוקח ממנו שקל על הדג 🐟
            </Text>
            <AnimatedPressable
              onPress={() => {
                tapHaptic();
                markMod01BarterNotifSeen();
                setShowMod01BarterNotif(false);
              }}
              accessibilityRole="button"
              accessibilityLabel="המשך"
              style={{
                backgroundColor: "#0ea5e9",
                borderRadius: 16,
                paddingVertical: 16,
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
                borderBottomWidth: 4,
                borderBottomColor: "#0284c7",
                shadowColor: "#0ea5e9",
                shadowOpacity: 0.35,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: "900", color: "#ffffff", writingDirection: "rtl", textAlign: "center", letterSpacing: 0.3 }}>המשך</Text>
            </AnimatedPressable>
          </Animated.View>
        </View>
      </Modal>

      {/* Finn full-screen transition between flashcards */}
      {finnTransitionSource && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[StyleSheet.absoluteFill, { zIndex: 9998, backgroundColor: "#f0f9ff", justifyContent: "center", alignItems: "center" }]}
        >
          <ExpoImage
            source={finnTransitionSource}
            style={{ width: "100%", height: "100%", transform: [{ scale: 0.88 }] }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </Animated.View>
      )}
      {/* Finn tip notification overlay */}
      {finnTipText && (
        <Pressable
          onPress={handleDismissFinnTip}
          style={[StyleSheet.absoluteFill, { zIndex: 9997, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end", paddingBottom: 120, paddingHorizontal: 16 }]}
          accessibilityRole="button"
          accessibilityLabel="סגור טיפ"
        >
          <Animated.View
            entering={FadeInUp.duration(400)}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              padding: 16,
              flexDirection: "row-reverse",
              alignItems: "flex-start",
              gap: 12,
              shadowColor: "#0891b2",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 8,
              borderWidth: 1.5,
              borderColor: "rgba(8,145,178,0.2)",
            }}
          >
            {/* X button */}
            <Pressable
              onPress={handleDismissFinnTip}
              hitSlop={12}
              style={{ position: "absolute", top: 10, right: 10, zIndex: 1 }}
              accessibilityRole="button"
              accessibilityLabel="סגור"
            >
              <Text style={{ fontSize: 18, color: "#64748b", fontWeight: "700" }}>✕</Text>
            </Pressable>
            {/* Finn avatar */}
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: "#f0f9ff", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#0891b2" }}>
              <ExpoImage
                source={(() => {
                  const mood = mod?.flashcards[flashcardIndex]?.finnTipMood;
                  if (mood === 'empathic') return FINN_EMPATHIC;
                  if (mood === 'happy') return FINN_HAPPY;
                  return FINN_STANDARD;
                })()}
                accessible={false}
                style={{ width: 72, height: 72 }}
                contentFit="contain"
              />
            </View>
            {/* Tip text */}
            <View style={{ flex: 1, paddingRight: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: "#0891b2", marginBottom: 4, writingDirection: "rtl", textAlign: "right" }}>
                💡 למשל...
              </Text>
              <Text style={{ fontSize: 14, fontWeight: "500", color: "#1e293b", lineHeight: 22, writingDirection: "rtl", textAlign: "right" }}>
                {renderBoldText(finnTipText, setActiveGlossaryTerm)}
              </Text>
            </View>
          </Animated.View>
        </Pressable>
      )}
      {/* ── Mid-lesson Finn checkpoint ── */}
      {showMidCheckpoint && mod && (
        <Pressable style={[StyleSheet.absoluteFill, { zIndex: 9996, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }]} onPress={() => { setShowMidCheckpoint(false); setFlashcardIndex((prev) => prev + 1); }} accessibilityRole="button" accessibilityLabel="סגור">
          <Animated.View entering={FadeInUp.duration(400)} style={{ backgroundColor: "#f0f9ff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: Math.max(28, safeInsets.bottom + 12), borderWidth: 1.5, borderColor: "#bae6fd", borderBottomWidth: 0, maxHeight: "70%" }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 64, height: 64 }} contentFit="contain" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#0c4a6e", writingDirection: "rtl", textAlign: "right", lineHeight: 24 }}>
                  {"איך הולך?"}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748b", writingDirection: "rtl", textAlign: "right", marginTop: 4 }}>
                  {"רוצים לחזור למשהו שלא הובן?"}
                </Text>
              </View>
            </View>
            {/* Previous card chips */}
            <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {mod.flashcards.slice(0, flashcardIndex).filter(c => !c.isMeme && !c.videoUri).map((card, i) => {
                const raw = card.text.replace(/\[\[([^|\]]+)\|?[^\]]*\]\]/g, '$1');
                const colon = raw.indexOf(':');
                const title = colon > 0 && colon < 40 ? raw.slice(0, colon).trim() : raw.slice(0, 25).trim() + '...';
                return (
                  <Pressable key={card.id} onPress={() => { tapHaptic(); setCheckpointReturnIndex(flashcardIndex); setShowMidCheckpoint(false); setFlashcardIndex(i); }} style={{ backgroundColor: "#e0f2fe", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "#7dd3fc" }} accessibilityRole="button" accessibilityLabel={`חזור ל: ${title}`}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#0369a1", writingDirection: "rtl" }}>{title}</Text>
                  </Pressable>
                );
              })}
            </View>
            {/* Chat button */}
            <AnimatedPressable onPress={() => { setShowMidCheckpoint(false); setShowChatOverlay(true); }} style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#dbeafe", borderRadius: 14, paddingVertical: 12, marginBottom: 10, borderWidth: 1, borderColor: "#93c5fd", borderBottomWidth: 3, borderBottomColor: "#93c5fd" }} accessibilityRole="button" accessibilityLabel="שאלו את שארק">
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#1e40af" }}>{"שאלו את שארק"}</Text>
            </AnimatedPressable>
            {/* Continue button */}
            <AnimatedPressable onPress={() => { setShowMidCheckpoint(false); setFlashcardIndex((prev) => prev + 1); }} style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#38bdf8", borderRadius: 14, paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: "#0284c7" }} accessibilityRole="button" accessibilityLabel="הכל ברור, קדימה">
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#ffffff" }}>{"הכל ברור, קדימה! ✓"}</Text>
            </AnimatedPressable>
          </Animated.View>
        </Pressable>
      )}

      {/* ── Shark Love, "עדיין תאהבו אותי?" every 3rd module ── */}
      {/* R8 pre-release audit (Yoav + ארכיטקט 2026-06-11): inline
          Date.now() in the JSX prop re-ran every parent render while
          the modal was open. Snapshot once via useMemo keyed on the
          visibility flag so the modal shows a stable elapsed value. */}
      {showSharkLove && (
        <SharkLoveModal
          xpEarned={chestRewards?.xp ?? 30}
          coinsEarned={chestRewards?.coins ?? 150}
          elapsedSeconds={sharkLoveElapsedSec}
          onClaim={handleSharkLoveDismiss}
        />
      )}

      {/* ── Bridge CTA, every 4 modules ── */}
      <SharkBridgeCTA
        visible={showBridgeCTA && !showSharkLove && !showDoubleOrNothing && !showPostCelebration && !showPartyInvite}
        onGoBridge={() => { setShowBridgeCTA(false); router.push("/bridge" as never); }}
        onDismiss={() => setShowBridgeCTA(false)}
        moduleCount={ctaModuleCount}
      />

      {/* ── Cover CTA — ch0 module 2 + ch1 first 2 bridge triggers ── */}
      <SharkBridgeCTA
        coverMode
        visible={showCoverCTA && !showSharkLove && !showDoubleOrNothing && !showPostCelebration && !showPartyInvite}
        onGoBridge={() => { setShowCoverCTA(false); router.push("/bridge?tab=insurance" as never); }}
        onDismiss={() => setShowCoverCTA(false)}
        moduleCount={ctaModuleCount}
      />

      {/* ── Referral CTA, every 5 modules + dividend content ── */}
      <SharkReferralCTA
        visible={showReferralCTA && !showSharkLove && !showDoubleOrNothing && !showPostCelebration && !showBridgeCTA && !showPartyInvite}
        onGoReferral={() => { setShowReferralCTA(false); router.push("/referral" as never); }}
        onDismiss={() => setShowReferralCTA(false)}
        moduleCount={ctaModuleCount}
        triggeredByDividend={referralByDividend}
      />

      {/* ── Tool-of-the-day CTA — lowest priority, once/day ── */}
      <SharkToolCTA
        visible={showToolCTA && !showSharkLove && !showDoubleOrNothing && !showPostCelebration && !showBridgeCTA && !showReferralCTA && !showPartyInvite}
        onOpenTool={(route) => { setShowToolCTA(false); router.push(route as never); }}
        onDismiss={() => setShowToolCTA(false)}
      />

      {/* ── Post-module celebration ── */}
      {showPostCelebration && !showBreakMessage && (
        <Pressable style={[StyleSheet.absoluteFill, { zIndex: 9995, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 }]} onPress={() => {}} accessible={false}>
          {mod?.id === 'mod-0-5' && !hasSeenMod05BridgeCTA ? (
            /* Special mod-0-5 variant: hands the user off to the Bridge with
               Altshuler highlighted. Framed as "you unlocked a benefit", not
               as advertising — taps into earned-reward psychology (מוני).
               Gold border + amber CTA visually differentiates from the
               standard green PostCelebration (יפיופי). One-shot per user
               via hasSeenMod05BridgeCTA (דואו: never show twice). */
            <Animated.View entering={FadeInUp.duration(500)} style={{ backgroundColor: "#ffffff", borderRadius: 28, padding: 28, width: "100%", maxWidth: 340, alignItems: "center", borderWidth: 2, borderColor: "#f59e0b" }}>
              <Text style={{ fontSize: 56, marginBottom: 6 }} accessibilityElementsHidden>🔓</Text>
              <Text style={{ fontSize: 22, fontWeight: "900", color: "#0f172a", textAlign: "center", marginBottom: 6, writingDirection: "rtl" }}>{"פתחת הטבה!"}</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#64748b", textAlign: "center", marginBottom: 22, writingDirection: "rtl", lineHeight: 20 }}>
                {"כי סיימת את שיעור ההשקעה — מחכה לך הטבה אמיתית אצל אלטשולר שחם. הטבה רק לחברי FinPlay."}
              </Text>
              <AnimatedPressable
                onPress={() => {
                  try { captureEvent('mod05_bridge_cta_tapped', { partner: 'altshuler', action: 'go' }); } catch { /* non-fatal */ }
                  markMod05BridgeCTASeen();
                  successHaptic();
                  setShowPostCelebration(false);
                  safeTimeout(() => router.push("/bridge?highlight=bridge-invest-altshuler" as never), 80);
                }}
                style={{ width: "100%", backgroundColor: "#f59e0b", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 12, borderBottomWidth: 4, borderBottomColor: "#d97706" }}
                accessibilityRole="button"
                accessibilityLabel="קח את ההטבה ב-Bridge"
              >
                <Text style={{ fontSize: 16, fontWeight: "900", color: "#ffffff", writingDirection: "rtl" }}>{"קח את ההטבה ←"}</Text>
              </AnimatedPressable>
              <Pressable
                onPress={() => {
                  try { captureEvent('mod05_bridge_cta_tapped', { partner: 'altshuler', action: 'later' }); } catch { /* non-fatal */ }
                  markMod05BridgeCTASeen();
                  tapHaptic();
                  setShowPostCelebration(false);
                  safeTimeout(() => goToNextSequentialModule(), 80);
                }}
                hitSlop={12}
                style={{ paddingVertical: 10 }}
                accessibilityRole="button"
                accessibilityLabel="אולי אחר כך"
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#64748b", writingDirection: "rtl" }}>{"אולי אחר כך"}</Text>
              </Pressable>
            </Animated.View>
          ) : (
          <Animated.View entering={FadeInUp.duration(500)} style={{ backgroundColor: "#ffffff", borderRadius: 28, padding: 28, width: "100%", maxWidth: 340, alignItems: "center", borderWidth: 2, borderColor: "#22c55e" }}>
            <ExpoImage
              source={FINN_EMPATHIC}
              accessible={false}
              style={{ width: 140, height: 140, marginBottom: 12 }}
              contentFit="contain"
            />
            <Text style={{ fontSize: 22, fontWeight: "900", color: "#0f172a", textAlign: "center", marginBottom: 6 }}>{"כל הכבוד!"}</Text>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#64748b", textAlign: "center", marginBottom: 24 }}>{"רוצה להמשיך או ללכת לנטפליקס?"}</Text>
            {/* Continue option, with auto-next countdown */}
            <AnimatedPressable
              onPress={() => {
                if (autoNextSeconds !== null) {
                  try { captureEvent('lesson_auto_next_triggered', { lesson_id: mod?.id ?? null, via: 'cta_tap' }); } catch { /* non-fatal */ }
                }
                autoNextCancelledRef.current = true;
                setAutoNextSeconds(null);
                successHaptic();
                setShowPostCelebration(false);
                safeTimeout(() => goToNextSequentialModule(), 80);
              }}
              style={{ width: "100%", backgroundColor: "#22c55e", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 8, borderBottomWidth: 4, borderBottomColor: "#16a34a" }}
              accessibilityRole="button"
              accessibilityLabel="המשך למודול הבא"
            >
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#ffffff" }}>
                {autoNextSeconds !== null ? `השיעור הבא מתחיל בעוד ${autoNextSeconds}...` : "ממשיכים לתרגל ולצמוח! 💪"}
              </Text>
            </AnimatedPressable>
            {/* Cancel countdown — visible only while auto-next is active */}
            {autoNextSeconds !== null && (
              <Pressable
                onPress={() => {
                  try { captureEvent('lesson_auto_next_cancelled', { lesson_id: mod?.id ?? null }); } catch { /* non-fatal */ }
                  autoNextCancelledRef.current = true;
                  setAutoNextSeconds(null);
                }}
                hitSlop={12}
                style={{ paddingVertical: 6, marginBottom: 4 }}
                accessibilityRole="button"
                accessibilityLabel="בטל את הספירה לאחור"
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#94a3b8" }}>{"ביטול ספירה לאחור"}</Text>
              </Pressable>
            )}
            {/* Quit option — surfaced on ~30% of chest reveals (Yoav 2026-06-11) */}
            {showPostQuitOption && (
              <AnimatedPressable onPress={() => { autoNextCancelledRef.current = true; setAutoNextSeconds(null); tapHaptic(); setShowBreakMessage(true); }} style={{ width: "100%", backgroundColor: "#f8fafc", borderRadius: 16, paddingVertical: 14, alignItems: "center", borderWidth: 1.5, borderColor: "#e2e8f0" }} accessibilityRole="button" accessibilityLabel="יציאה">
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#64748b" }}>
                  {postQuitLabel}
                </Text>
              </AnimatedPressable>
            )}
          </Animated.View>
          )}
        </Pressable>
      )}

      {/* ── Break farewell message ── */}
      {showBreakMessage && (
        <Pressable style={[StyleSheet.absoluteFill, { zIndex: 9995, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 }]} onPress={() => { setShowBreakMessage(false); setShowPostCelebration(false); safeTimeout(() => returnToMap("/(tabs)/index"), 80); }} accessibilityRole="button" accessibilityLabel="חזור לתפריט">
          <Animated.View entering={FadeInUp.duration(400)} style={{ backgroundColor: "#ffffff", borderRadius: 28, padding: 28, width: "100%", maxWidth: 340, alignItems: "center" }}>
            <ExpoImage source={FINN_EMPATHIC} accessible={false} style={{ width: 100, height: 100, marginBottom: 16 }} contentFit="contain" />
            <Text style={{ fontSize: 20, fontWeight: "900", color: "#0f172a", textAlign: "center", marginBottom: 8 }}>{"מחר מחכים לך אתגרים חדשים 🔥"}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#64748b", textAlign: "center" }}>{"חזור מחר ושמור על הרצף · לחץ בכל מקום"}</Text>
          </Animated.View>
        </Pressable>
      )}

      {/* ── Shark Party invite ── */}
      {showPartyInvite && !showPartyVideo && (
        <Pressable style={[StyleSheet.absoluteFill, { zIndex: 9994, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 24 }]} onPress={() => { setShowPartyInvite(false); safeTimeout(() => goToNextSequentialModule(), 80); }} accessibilityRole="button" accessibilityLabel="סגור">
          <ConfettiExplosion onComplete={() => {}} />
          <Animated.View entering={FadeInUp.duration(500)} style={{ backgroundColor: "#0f172a", borderRadius: 28, padding: 28, width: "100%", maxWidth: 340, alignItems: "center", borderWidth: 2, borderColor: "#0ea5e9" }}>
            <View style={{ width: 120, height: 120, overflow: "hidden", marginBottom: 16 }} accessible={false}>
              <LottieView
                source={require("../../../assets/lottie/wired-flat-3263-trophy-circle-hover-roll.json")}
                style={{ width: 120, height: 120 }}
                autoPlay loop
              />
            </View>
            <Text style={{ fontSize: 24, fontWeight: "900", color: "#ffffff", textAlign: "center", marginBottom: 8 }}>{"🎉 מסיבת הקפטן!"}</Text>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#64748b", textAlign: "center", marginBottom: 24 }}>{"סיימת 4 מודולים! קפטן שארק מזמין אותך לחגוג"}</Text>
            <Pressable onPress={() => { successHaptic(); setShowPartyVideo(true); }} style={{ width: "100%", backgroundColor: "#0ea5e9", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 12, borderBottomWidth: 4, borderBottomColor: "#0284c7" }} accessibilityRole="button" accessibilityLabel="הצטרפו למסיבה">
              <Text style={{ fontSize: 18, fontWeight: "900", color: "#ffffff" }}>{"הצטרפו למסיבה!"}</Text>
            </Pressable>
            <Pressable onPress={() => { setShowPartyInvite(false); safeTimeout(() => goToNextSequentialModule(), 80); }} style={{ paddingVertical: 10 }} accessibilityRole="button" accessibilityLabel="המשך">
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#64748b" }}>{"ממשיכים ללמוד →"}</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      )}

      {/* ── Shark Party video, full screen ── */}
      {showPartyVideo && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9994, backgroundColor: "#000000" }]}>
          <VideoHookPlayer
            videoUri="https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/video/sharkparty.mp4"
            hookText=""
            onFinish={() => { setShowPartyVideo(false); setShowPartyInvite(false); goToNextSequentialModule(); }}
            unitColors={unitColors}
            fitContain
            trimEnd={2.5}
          />
        </View>
      )}

      {/* ── Lifestyle break invite (every 3 modules, viral-reels vibe) ── */}
      {showLifestyleInvite && lifestyleVideo && !showLifestyleVideo && (
        <Pressable style={[StyleSheet.absoluteFill, { zIndex: 9993, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 24 }]} onPress={() => { setShowLifestyleInvite(false); safeTimeout(() => goToNextSequentialModule(), 80); }} accessibilityRole="button" accessibilityLabel="סגור">
          <ConfettiExplosion onComplete={() => {}} />
          <Animated.View entering={FadeInUp.duration(500)} style={{ backgroundColor: "#0f172a", borderRadius: 28, padding: 28, width: "100%", maxWidth: 340, alignItems: "center", borderWidth: 2, borderColor: "#0ea5e9" }}>
            <View style={{ width: 120, height: 120, overflow: "hidden", marginBottom: 16 }} accessible={false}>
              <LottieView
                source={require("../../../assets/lottie/wired-flat-3263-trophy-circle-hover-roll.json")}
                style={{ width: 120, height: 120 }}
                autoPlay loop
              />
            </View>
            <Text style={{ fontSize: 22, fontWeight: "900", color: "#ffffff", textAlign: "center", marginBottom: 8 }}>{lifestyleVideo.inviteTitle}</Text>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#94a3b8", textAlign: "center", marginBottom: 24 }}>{lifestyleVideo.inviteSubtitle}</Text>
            <Pressable onPress={() => { successHaptic(); markLifestyleSeen(lifestyleVideo.id, lifestyleVideo.oneShot); setShowLifestyleVideo(true); }} style={{ width: "100%", backgroundColor: "#0ea5e9", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 12, borderBottomWidth: 4, borderBottomColor: "#0284c7" }} accessibilityRole="button" accessibilityLabel={lifestyleVideo.ctaLabel}>
              <Text style={{ fontSize: 18, fontWeight: "900", color: "#ffffff" }}>{lifestyleVideo.ctaLabel}</Text>
            </Pressable>
            <Pressable onPress={() => { setShowLifestyleInvite(false); safeTimeout(() => goToNextSequentialModule(), 80); }} style={{ paddingVertical: 10 }} accessibilityRole="button" accessibilityLabel="המשך">
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#64748b" }}>{"ממשיכים ללמוד →"}</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      )}

      {/* ── Lifestyle break video, full screen ── */}
      {showLifestyleVideo && lifestyleVideo && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9993, backgroundColor: "#000000" }]}>
          <VideoHookPlayer
            videoUri={lifestyleVideo.videoUri}
            hookText={lifestyleVideo.caption}
            onFinish={() => { setShowLifestyleVideo(false); setShowLifestyleInvite(false); goToNextSequentialModule(); }}
            unitColors={unitColors}
            fitContain
            trimEnd={lifestyleVideo.trimEnd ?? 0.5}
          />
        </View>
      )}

      {/* Flying rewards, rendered at top level so particles can reach the header */}
      {flyingXp > 0 && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents="none">
          <FlyingRewards type="xp" amount={flyingXp} onComplete={() => setFlyingXp(0)} />
        </View>
      )}
      {flyingCoins > 0 && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents="none">
          <FlyingRewards type="coins" amount={flyingCoins} onComplete={() => setFlyingCoins(0)} />
        </View>
      )}
      {flyingCoinsDown > 0 && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents="none">
          <FlyingRewards type="coins" amount={flyingCoinsDown} direction="down" onComplete={() => setFlyingCoinsDown(0)} />
        </View>
      )}
      {/* Captain Shark chat overlay, opens on top of lesson */}
      <Modal
        visible={showChatOverlay}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          Keyboard.dismiss();
          // requestAnimationFrame מבטיח שה-keyboard מסיים dismiss לפני
          // שה-Modal נסגר ב-iOS — אחרת ה-native focus נשאר על TextInput
          // ויוצר תקיעה של pointer-events על כפתורי המשך בלסון.
          requestAnimationFrame(() => setShowChatOverlay(false));
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }} accessibilityViewIsModal>
          <View style={{ flexDirection: "row-reverse", paddingHorizontal: 16, paddingTop: Math.max(safeInsets.top + 4, 12), paddingBottom: 8 }}>
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                requestAnimationFrame(() => setShowChatOverlay(false));
              }}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}
              accessibilityRole="button"
              accessibilityLabel="סגור"
            >
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>✕</Text>
            </Pressable>
          </View>
          <ChatScreen lessonContext={chatLessonContext} />
        </SafeAreaView>
      </Modal>

      {/* Glossary tooltip */}
      <GlossaryTooltip
        term={activeGlossaryTerm}
        onClose={() => setActiveGlossaryTerm(null)}
      />
    </View>
  );
}
