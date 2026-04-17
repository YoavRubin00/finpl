import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { Image as ExpoImage } from "expo-image";
import { View, Text, SafeAreaView, ScrollView, Image, StyleSheet, Modal, Pressable, Dimensions, ActivityIndicator } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { useVideoPlayer, VideoView } from "expo-video";
import { Audio } from "expo-av";
import { useAudioStore } from "../../stores/useAudioStore";
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
import { useLessonMusic } from "../../hooks/useLessonMusic";
import { chapter0Data } from "../chapter-0-content/chapter0Data";
import { chapter1Data } from "./chapter1Data";
import { chapter2Data } from "../chapter-2-content/chapter2Data";
import { chapter3Data } from "../chapter-3-content/chapter3Data";
import { chapter4Data } from "../chapter-4-content/chapter4Data";
import { chapter5Data } from "../chapter-5-content/chapter5Data";
import { useChapterStore } from "./useChapterStore";
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
import { useEconomyStore } from "../economy/useEconomyStore";
import { useWisdomStore } from "../wisdom-flashes/useWisdomStore";
import { useSubscriptionStore } from "../subscription/useSubscriptionStore";
import { useUpgradeModalStore } from "../../stores/useUpgradeModalStore";
import { PRO_LOCKED_SIMS } from "../../constants/proGates";
import { OutOfHeartsModal } from "../subscription/HeartsUI";
import { GlobalWealthHeader } from "../../components/ui/GlobalWealthHeader";
import { ConfettiExplosion } from "../../components/ui/ConfettiExplosion";
import { DoubleOrNothingModal } from "../../components/ui/DoubleOrNothingModal";
import { SharkLoveModal } from "../../components/ui/SharkLoveModal";
import { SharkBridgeCTA, SharkReferralCTA, moduleHasDividendContent } from "../../components/ui/SharkCTAModals";
import { InvestmentCard } from "../daily-challenges/InvestmentCard";
import { CrashGameCard } from "../daily-challenges/CrashGameCard";
import { MythFeedCard } from "../myth-or-tachles/MythFeedCard";
import { DilemmaCard } from "../daily-challenges/DilemmaCard";
import { MacroEventCard } from "../macro-events/MacroEventCard";
import { macroEventsData } from "../macro-events/macroEventsData";
import { TA125WarRecoveryChart } from "../chapter-4-content/components/TA125WarRecoveryChart";
import { FlyingRewards } from "../../components/ui/FlyingRewards";
import { GoldCoinIcon } from "../../components/ui/GoldCoinIcon";
import { useAuthStore } from "../auth/useAuthStore";
import { useRewardedAd } from "../../hooks/useRewardedAd";
import { DecorationOverlay } from "../../components/ui/DecorationOverlay";
import { generateChestDrop } from "../retention-loops/chestDrops";
import { useRetentionStore } from "../retention-loops/useRetentionStore";
import type { ChestRarity, ChestReward } from "../retention-loops/types";
import type { Module, Flashcard, QuizQuestion } from "./types";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import { useAdaptiveStore } from "../social/useAdaptiveStore";
import { useSavedItemsStore } from "../saved-items/useSavedItemsStore";
import { LifelineModal } from "../social/LifelineModal";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { PizzaIndexScreen } from "../fun/PizzaIndexScreen";
import { LifelineChatOverlay } from "../social/LifelineChatOverlay";
import { ProBadge } from "../../components/ui/ProBadge";
import LottieView from "lottie-react-native";
import { FINN_LOTTIE_SOURCE, FINN_HELLO, FINN_STANDARD, FINN_HAPPY, FINN_EMPATHIC, getFinnSource, getFinnImage } from "../retention-loops/finnMascotConfig";
import { FINN_MEME_REACTIONS } from "../fun/finnJokesData";
import type { FinnAnimationState } from "../retention-loops/finnMascotConfig";
import { FlashcardInfographic, FINN_MAP } from "./FlashcardInfographic";
import { GlossaryTooltip } from "../../components/ui/GlossaryTooltip";
import { ChatScreen } from "../chat/ChatScreen";

type FlowPhase = "hero" | "intro" | "flashcards" | "quizzes" | "sim-intro" | "sim" | "module-infographic" | "summary" | "video";

/** Full-screen character art shown when first opening a module */
const MODULE_HERO_MAP: Record<string, { uri: string } | number> = {
  "mod-4-19": require("../../../assets/IMAGES/finn/finn-splash.png") as number,
  "mod-5-25": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/finn-freedom.png' },
};

/** Modules that have a playable simulation game */
const MODULES_WITH_SIM = new Set(["mod-0-1", "mod-0-3", "mod-0-4", "mod-1-1", "mod-1-2", "mod-1-3", "mod-1-4", "mod-1-5", "mod-1-7", "mod-1-8", "mod-1-9", "mod-2-10", "mod-2-11", "mod-2-12", "mod-2-13", "mod-2-14", "mod-3-15", "mod-3-16", "mod-3-17", "mod-3-18", "mod-4-19", "mod-4-20", "mod-4-21", "mod-4-22", "mod-4-23", "mod-4-24", "mod-5-25", "mod-5-26", "mod-5-27", "mod-5-28", "mod-5-29", "mod-4-25", "mod-4-26", "mod-4-27", "mod-4-28", "mod-4-29", "mod-4-30", "mod-5-30", "mod-5-31", "mod-4-b1", "mod-4-b2", "mod-4-b3", "mod-4-b4"]);

/** Modules where sim comes BEFORE flashcards (intro → sim → flashcards → quizzes → summary) */
const SIM_FIRST_MODULES = new Set(["mod-0-1", "mod-1-1", "mod-2-12", "mod-2-13", "mod-3-18", "mod-4-20", "mod-4-22", "mod-4-23", "mod-4-27", "mod-4-b4"]);

/** Modules with a NotebookLM-generated infographic shown before the summary/chest */
const MODULE_INFOGRAPHIC_MAP: Record<string, { uri: string }> = {
  "mod-0-1": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/ch0-upgrade/mod-0-1-upgrade.png' },
  "mod-0-2": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/ch0-upgrade/mod-0-2-upgrade.png' },
  "mod-0-3": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/ch0-upgrade/mod-0-3-upgrade.png' },
  "mod-0-4": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/ch0-upgrade/mod-0-4-upgrade.png' },
  "mod-0-5": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/ch0-upgrade/mod-0-5-upgrade.png' },
};

/** Cards that use infographic-top layout: big image at top, text hidden, Finn at bottom */
const INFOGRAPHIC_TOP_CARDS = new Set([
  "fc-1-5-1", "fc-1-5-2", "fc-1-5-3", "fc-1-5-4", "fc-1-5-5", "fc-1-5-6",
  "fc-1-6-1", "fc-1-6-2", "fc-1-6-3", "fc-1-6-4", "fc-1-6-5", "fc-1-6-6",
  // Graham bonus modules — infographic at top with Finn explanation at bottom
  "fc-4-b1-1", "fc-4-b1-2", "fc-4-b1-2b", "fc-4-b1-3",
  "fc-4-b2-1", "fc-4-b2-2",
  "fc-4-b3-1", "fc-4-b3-2",
  // fc-4-b4-1, fc-4-b4-2 — use default layout (text + image) so text is visible
]);

const RTL_STYLE = { writingDirection: "rtl" as const, textAlign: "right" as const };

/** Summary infographic map — maps summary card IDs to portrait PNGs */
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
  "fc-1-5-payslip": require("../../../assets/IMAGES/SACHAR.jpg") as number,
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
  "fc-5-31-summary": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-5-31/summary-5-31.png' },

  // Graham bonus modules — feed infographics
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
/*  renderBoldText — bolds English terms and parenthetical content     */
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
      result.push(
        <Text key={key++} style={{ fontWeight: "900", color: "#d97706" }}>
          {token}
        </Text>
      );
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

/* ------------------------------------------------------------------ */
/*  VideoHookPlayer — full-screen video hook with title overlay         */
/* ------------------------------------------------------------------ */

function VideoHookPlayer({ videoUri, hookText, onFinish, unitColors, fitContain, trimEnd = 0.5 }: {
  videoUri: string;
  hookText: string;
  onFinish: () => void;
  unitColors: { bg: string; dim: string; glow: string; bottom: string };
  fitContain?: boolean;
  trimEnd?: number;
}) {
  const videoRef = useRef<VideoView>(null);
  const [isFastMode, setIsFastMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const finishedRef = useRef(false);
  const insets = useSafeAreaInsets();

  const safeFinish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  }, [onFinish]);

  let player: ReturnType<typeof useVideoPlayer>;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    player = useVideoPlayer(videoUri, (p) => {
      p.loop = false;
      p.play();
    });
  } catch {
    // If player creation fails, skip video entirely
    useEffect(() => { safeFinish(); }, [safeFinish]);
    return <View style={{ flex: 1, backgroundColor: "#0a1628" }} />;
  }

  useEffect(() => {
    const subs: { remove: () => void }[] = [];

    // Track playback end
    subs.push(player.addListener('playingChange', (e: { isPlaying: boolean }) => {
      if (e.isPlaying) {
        setIsLoading(false);
      }
      if (!e.isPlaying && player.duration > 0 && player.currentTime >= player.duration - trimEnd) {
        setTimeout(safeFinish, 500);
      }
    }));

    // Track errors — skip video on failure
    subs.push(player.addListener('statusChange', (e: { status: string; error?: unknown }) => {
      if (e.status === 'error') {
        safeFinish();
      }
      if (e.status === 'readyToPlay') {
        setIsLoading(false);
      }
    }));

    // Safety timeout — if video doesn't play within 10s, skip
    const timeout = setTimeout(() => {
      if (isLoading) safeFinish();
    }, 10000);

    return () => {
      subs.forEach((s) => s.remove());
      clearTimeout(timeout);
    };
  }, [player, safeFinish, isLoading]);

  return (
    <View style={{ flex: 1, backgroundColor: "#0a1628" }}>
      <Pressable
        style={{ flex: 1 }}
        accessibilityRole="button"
        accessibilityLabel="סרטון — לחיצה ארוכה להאצה"
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
      {/* Loading indicator */}
      {isLoading && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center" }} pointerEvents="none">
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#64748b", marginTop: 12 }}>טוען סרטון...</Text>
        </View>
      )}
      {/* Fast mode indicator */}
      {isFastMode && (
        <View style={{ position: "absolute", top: "45%", alignSelf: "center", backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8 }} pointerEvents="none">
          <Text style={{ fontSize: 16, fontWeight: "900", color: "#ffffff" }}>⚡ x1.8</Text>
        </View>
      )}
      {/* Safe area top overlay — only for full-screen video hooks (not flashcard videos) */}
      {hookText ? (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, backgroundColor: "rgba(0,0,0,0.6)" }} pointerEvents="none" />
      ) : null}
      {/* Hook text overlay — bottom */}
      {hookText ? (
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: Math.max(40, insets.bottom + 16), paddingTop: 60 }} pointerEvents="none">
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.85)"]} style={StyleSheet.absoluteFill} />
          <Text style={{ fontSize: 22, fontWeight: "900", color: "#ffffff", writingDirection: "rtl", textAlign: "right", lineHeight: 32, textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 8, textShadowOffset: { width: 0, height: 2 } }}>
            {hookText}
          </Text>
        </View>
      ) : null}
      {/* Skip button — right side for RTL */}
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
/*  FlashcardCard — mounts with a slide-in animation per card          */
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

  // Audio Playback
  useEffect(() => {
    let soundObj: Audio.Sound | null = null;
    let isActive = true;

    async function loadAndPlay() {
      if (card.topAudio?.uri) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: card.topAudio.uri },
            { shouldPlay: true }
          );
          if (isActive) {
            soundObj = sound;
          } else {
            sound.unloadAsync();
          }
        } catch (e) {
          console.log('Failed to play flashcard top audio:', e);
        }
      }
    }

    loadAndPlay();
    return () => {
      isActive = false;
      if (soundObj) {
        soundObj.unloadAsync();
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
    playSound('btn_click_soft_2');
    if (isDiveMode && diveStep < totalDiveSteps - 1) {
      setDiveStep(d => d + 1);
    } else {
      runOnJS(onNext)();
    }
  }, [isDiveMode, diveStep, totalDiveSteps, playSound, onNext]);

  const handlePrevBtn = useCallback(() => {
    playSound('btn_click_soft_2');
    if (isDiveMode && diveStep > 0) {
      setDiveStep(d => d - 1);
    } else {
      runOnJS(onPrev)();
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
      {/* Finn help popup notification — bottom of card, after 3s */}
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
            <Pressable
              onPress={() => onOpenChat?.()}
              style={{ flexDirection: "row-reverse", alignItems: "center", gap: 4, marginTop: 6, alignSelf: "flex-end", backgroundColor: "#0ea5e9", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}
              accessibilityRole="button"
              accessibilityLabel="שאלו את הקפטן"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "800" }}>שאלו את הקפטן</Text>
            </Pressable>
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
        <VideoHookPlayer videoUri={card.videoUri} hookText="" onFinish={handleNextBtn} unitColors={unitColors} />
      ) : card.isMeme ? (
        /* ── Meme break card — humor pause, no XP ── */
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: "#1e293b", borderRadius: 20, overflow: "hidden", position: "relative" }}>
            {card.memeImage ? (
              <Animated.Image source={card.memeImage} style={{ width: "100%", height: "100%", position: "absolute" }} resizeMode="cover" />
            ) : null}
            
            <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: card.memeImage ? "rgba(15, 23, 42, 0.85)" : "transparent" }}>
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
                <ExpoImage source={FINN_HAPPY} accessible={false} style={{ width: 64, height: 64 }} contentFit="contain" />
                <View style={{ flex: 1, backgroundColor: "#334155", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#475569" }}>
                  <Text style={{ writingDirection: "rtl", textAlign: "right", fontSize: 16, color: "#f8fafc", fontWeight: "700", lineHeight: 24 }}>
                    {card.text || FINN_MEME_REACTIONS[Math.floor(Math.random() * FINN_MEME_REACTIONS.length)]}
                  </Text>
                </View>
              </View>
            </View>
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
                <Animated.Image
                  source={SUMMARY_MAP[card.id]!}
                  style={[{ width: "100%", height: "100%", position: "absolute" }, comicZoomStyle]}
                  resizeMode="contain"
                  accessible={false}
                />
                {["fc-1-5-summary", "fc-1-6-summary", "fc-1-7-summary", "fc-4-19-summary", "fc-4-20-summary", "fc-4-21-summary", "fc-4-22-summary", "fc-4-23-summary", "fc-4-24-summary", "fc-5-25-summary", "fc-5-26-summary", "fc-5-27-summary", "fc-5-28-summary", "fc-5-29-summary"].includes(card.id) && card.text && (
                  <View style={{ padding: 24, paddingTop: 48, flex: 1 }}>
                     <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                        <Text style={{ ...RTL_STYLE, fontSize: 24, color: "#0c4a6e", fontWeight: "800", marginBottom: 12, backgroundColor: "rgba(255,255,255,0.85)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" }}>
                          {renderBoldText(card.text.split('\n')[0], onTermPress)}
                        </Text>
                        <Text style={{ ...RTL_STYLE, fontSize: 18, color: "#1e293b", lineHeight: 28, fontWeight: "600", backgroundColor: "rgba(255,255,255,0.85)", padding: 12, borderRadius: 12 }}>
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
              <Text style={{ ...RTL_STYLE, fontSize: 14, color: "#1e3a8a", fontWeight: "600", flex: 1 }}>{card.finnExplanations[diveStep]}</Text>
            </Animated.View>
          )}

          {/* Bottom navigation bar for comics */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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
              <Text style={{ ...RTL_STYLE, fontSize: 14, color: "#1e3a8a", fontWeight: "600", flex: 1 }}>{card.finnExplanations[diveStep]}</Text>
            </Animated.View>
          ) : (
            <View style={{ height: 10 }} />
          )}

          {/* Bottom navigation bar */}
          <View style={{ paddingHorizontal: 8, paddingVertical: 8, paddingBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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
                // Strip intro phrase (before ':') — it's now shown in the title row
                const colonIdx = card.text.indexOf(":");
                const bodyText = (colonIdx > 0 && colonIdx < 80)
                  ? card.text.substring(colonIdx + 1).trim()
                  : card.text;
                if (!bodyText || (isDiveMode && diveStep > 0 && card.hideTextOnDive)) return null;
                return (
                  <Text style={{ ...RTL_STYLE, fontSize: bodyText.length > 100 ? 17 : 21, lineHeight: bodyText.length > 100 ? 28 : 34, color: "#1c1917", fontWeight: "600", marginBottom: 16 }}>
                    {renderBoldText(bodyText, onTermPress)}
                  </Text>
                );
              })()}
              <FlashcardInfographic cardId={card.id} diveStep={diveStep} zoomRegions={card.zoomRegions} />

              {/* Dive mode: Finn's explanation bubble at the bottom */}
              {isDiveMode && card.finnExplanations && card.finnExplanations[diveStep] && (
                <Animated.View entering={FadeInUp.duration(300)} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, marginTop: 12, backgroundColor: "#eff6ff", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#bfdbfe" }}>
                  <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 44, height: 44, flexShrink: 0 }} contentFit="contain" />
                  <Text style={{ ...RTL_STYLE, fontSize: 14, color: "#1e3a8a", fontWeight: "600", flex: 1 }}>{card.finnExplanations[diveStep]}</Text>
                </Animated.View>
              )}

              {/* Paradigm footnote — only on fc-1-1-1 */}
              {card.id === "fc-1-1-1" && (!isDiveMode || diveStep === 0) && (
                <Text style={{ ...RTL_STYLE, fontSize: 13, color: "#64748b", fontWeight: "600", marginTop: 10, lineHeight: 20 }}>
                  💡 פרדיגמה = דרך חשיבה, מסגרת מנטלית שדרכה אנחנו מפרשים את המציאות.
                </Text>
              )}

              {/* Finn tip removed — shown as popup notification instead */}
            </ScrollView>
          </View>

          {/* Bottom navigation bar — back + continue */}
          <View style={{ paddingHorizontal: 8, paddingVertical: 8, paddingBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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
/*  QuizCard — shows question + option buttons with feedback           */
/* ------------------------------------------------------------------ */

interface AnswerState {
  selectedIndex: number;
  isCorrect: boolean;
  revealed: boolean;
}

/** Seeded shuffle — deterministic per quiz ID so answer order stays stable across re-renders */
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
  // Shuffle options deterministically per quiz — correct answer changes position each quiz
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
  const { playSound } = useSoundEffect();
  const [finnState, setFinnState] = useState<FinnAnimationState>("thinking");
  const finnSource = getFinnSource(finnState);

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
        setTimeout(() => { playSound('modal_open_2'); }, 100);
        autoTimerRef.current = setTimeout(() => onCorrectAnswer(), 3400);
      } else {
        // Wrong answer — give up to 3 chances
        shakeX.value = 0;
        errorHaptic();
        onWrongImmediate(); // Heart drops immediately
        setFinnState("empathy");
        setTimeout(() => { playSound('modal_open_3'); }, 100);
        const newWrong = new Set(wrongAttempts);
        newWrong.add(idx);
        setWrongAttempts(newWrong);

        if (newWrong.size >= 3) {
          // 3rd wrong — auto-select correct answer, show feedback
          setAnswerState({ selectedIndex: quiz.correctAnswer, isCorrect: false, revealed: true });
          autoTimerRef.current = setTimeout(() => onWrongRevealed(), 3600);
        }
        // 1st/2nd wrong — option greyed out, user can try remaining options
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

      <View style={{ flex: 1 }}>
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
                  לא נכון, נסה שוב! 💪 ({wrongAttempts.size}/3)
                </Text>
              </Animated.View>
            )}
        </View>

        {/* ── Feedback — inline below question card ── */}
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
      </View>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  SummaryScreen — module/quiz completion screen                      */
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
  const summaryFinnSource = getFinnSource(summaryFinnState);

  // Haptic feedback based on quiz performance
  useEffect(() => {
    if (correctCount === totalCount && totalCount > 0) {
      doubleHeavyHaptic(); // Perfect score — major win
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
    "מצוין! אתה ממש מקצוען פיננסי",
    "מושלם! קפטן שארק מתרשם מאוד",
  ];

  const completionMessagesGood = [
    "כל הכבוד! סיימת את המודול",
    "יופי! עשית צעד גדול קדימה",
    "עבודה מעולה! אתה בדרך הנכונה",
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
          : "סיימת! נסה שוב כדי לשפר";

  const progressLabel =
    isChapterComplete
      ? ""
      : `עוד ${chapterModules.length - completedInChapter} מודולים לסיום הפרק`;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ alignItems: "center", paddingTop: 20, gap: 16, paddingHorizontal: 16 }}>

        {/* Finn mascot — free-floating with soft glow */}
        <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: "center" }}>
          <View style={{
            shadowColor: "#0ea5e9",
            shadowOpacity: 0.3,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 0 },
            elevation: 8,
          }}>
            <ExpoImage
              source={getFinnImage(summaryFinnState)}
              style={{ width: 150, height: 150 }}
              contentFit="contain"
              />
          </View>
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

            {/* 5 medal Lotties */}
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 4, marginTop: 14 }}>
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
          </View>
        )}

        {/* Chest Element rendered perfectly centered in the remaining bottom space */}
        {!chestClaimed && chestElement && (
          <View style={{ flex: 1, justifyContent: "center", width: "100%", paddingBottom: 20 }}>
            {chestElement}
          </View>
        )}

        {/* UP NEXT — Wisdom Flash (deep ocean blue) */}
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

        {/* CONTINUE button — hidden until chest is claimed */}
        {chestClaimed !== false && (
          <Animated.View entering={FadeIn.duration(300)} style={{ width: "100%", marginBottom: 16 }}>
            <AnimatedPressable
              onPress={onContinue}
              style={{
                width: "100%",
                backgroundColor: unitColors.bg,
                borderRadius: 18,
                paddingVertical: 22,
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
              accessibilityLabel="הבא"
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
                <Text style={{ color: "#ffffff", fontSize: 19, fontWeight: "900", letterSpacing: 1 }}>המשך</Text>
              </View>
            </AnimatedPressable>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  HeartBreakOverlay — dramatic heart-loss animation                  */
/* ------------------------------------------------------------------ */

function HeartBreakOverlay({
  visible,
  onFinish,
  originY = 120,
  originX = undefined,
  isLastHeart = false,
}: {
  visible: boolean;
  onFinish: () => void;
  originY?: number;
  originX?: number;
  isLastHeart?: boolean;
}) {
  const flashOpacity = useSharedValue(0);
  const heartDropY = useSharedValue(0);
  const heartScale = useSharedValue(0);
  const heartRotate = useSharedValue(0);
  const leftTranslateX = useSharedValue(0);
  const rightTranslateX = useSharedValue(0);
  const minusOpacity = useSharedValue(0);
  const minusTranslateY = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const { width: screenWidth } = Dimensions.get("window");
  const startX = originX ?? screenWidth / 2;

  useEffect(() => {
    if (!visible) return;

    // Reset values
    flashOpacity.value = 0;
    heartDropY.value = 0;
    heartScale.value = 0.8; 
    heartRotate.value = 0;
    leftTranslateX.value = 0;
    rightTranslateX.value = 0;
    minusOpacity.value = 0;
    minusTranslateY.value = 0;
    heartOpacity.value = 1;

    // Fade in flash
    flashOpacity.value = withSequence(
      withTiming(0.2, { duration: 150 }),
      withTiming(0, { duration: 600 }),
    );

    let finishTimeout = 1800;

    if (isLastHeart) {
      // Phase 1: Pop out from origin
      heartScale.value = withSpring(1.2, { damping: 12, stiffness: 90 }); 
      heartDropY.value = withSequence(
        withSpring(-30, { damping: 14, stiffness: 180 }),
        withSpring(20, { damping: 10, stiffness: 70 })
      );

      // Phase 2: Heart breaks mid-air
      setTimeout(() => {
        heavyHaptic();
        leftTranslateX.value = withSpring(-20, { damping: 14, stiffness: 90 });
        rightTranslateX.value = withSpring(20, { damping: 14, stiffness: 90 });
        heartRotate.value = withSpring(-10, { damping: 14, stiffness: 90 });
          
        minusOpacity.value = withTiming(1, { duration: 300 });
        minusTranslateY.value = withSpring(-50, { damping: 15, stiffness: 100 });
      }, 500);
      
      finishTimeout = 1800;
    } else {
      // Simple smooth float up and disappear
      heartScale.value = withSpring(1.2, { damping: 15, stiffness: 100 });
      heartDropY.value = withTiming(-150, { duration: 1000 });
      
      setTimeout(() => {
        minusOpacity.value = withTiming(1, { duration: 300 });
        minusTranslateY.value = withTiming(-30, { duration: 800 });
      }, 100);

      setTimeout(() => {
        heartOpacity.value = withTiming(0, { duration: 500 });
      }, 600);
      
      finishTimeout = 1000;
    }

    // Phase 4: Fade everything out and notify complete
    const finishTimer = setTimeout(() => {
      if (isLastHeart) heartOpacity.value = withTiming(0, { duration: 400 });
      setTimeout(() => onFinish(), 400);
    }, finishTimeout);

    return () => {
      clearTimeout(finishTimer);
    };
  }, [visible, isLastHeart]);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const heartAnimsStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [
      { translateY: heartDropY.value },
      { scale: heartScale.value },
      { rotate: `${heartRotate.value}deg` },
    ],
  }));

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftTranslateX.value }],
  }));

  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightTranslateX.value }],
  }));

  const minusStyle = useAnimatedStyle(() => ({
    opacity: minusOpacity.value,
    transform: [{ translateY: minusTranslateY.value }],
  }));

  if (!visible) return null;

  return (
    <View style={[heartBreakStyles.overlay, { paddingTop: originY }]} pointerEvents="none">
      {/* Red flash vignette */}
      <Animated.View style={[heartBreakStyles.flash, flashStyle]} />

      {/* Heart halves container */}
      <Animated.View style={[heartBreakStyles.heartContainer, heartAnimsStyle, originX !== undefined && { left: startX - (screenWidth / 2) }]}>
        {isLastHeart ? (
          <>
            {/* Left half */}
            <Animated.View style={[heartBreakStyles.halfWrap, leftStyle]}>
              <Text style={[heartBreakStyles.heartEmoji, { marginRight: -24 }]}>💔</Text>
            </Animated.View>

            {/* Right half */}
            <Animated.View style={[heartBreakStyles.halfWrap, rightStyle]}>
              <Text style={[heartBreakStyles.heartEmoji, { marginLeft: -24 }]}>❤️‍🩹</Text>
            </Animated.View>
          </>
        ) : (
          <Text style={heartBreakStyles.heartEmoji}>❤️</Text>
        )}

        {/* "-1" floating text attached to heart */}
        <Animated.Text style={[heartBreakStyles.minusText, minusStyle, { position: 'absolute', top: -40, width: 100, textAlign: 'center' }]}>
          -1
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const heartBreakStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-start",
    zIndex: 90,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(239, 68, 68, 0.5)",
  },
  heartContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  halfWrap: {
    overflow: "hidden",
    width: 48,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  heartEmoji: {
    fontSize: 72,
  },
  minusText: {
    position: "absolute",
    fontSize: 28,
    fontWeight: "900",
    color: "#ef4444",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});

/* ------------------------------------------------------------------ */
/*  ChestFlyToSlot — chest icon flies from center to inventory         */
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

  const chestIcon = rarity === "epic" ? "💎" : rarity === "rare" ? "🏆" : "📦";

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
/*  SlotsFullModal — prompt when all 4 chest slots are occupied         */
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
  const gems = useEconomyStore((s) => s.gems);
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
            accessibilityLabel={`פתח תיבה — ${INSTANT_OPEN_GEM_COST} ג׳מים`}
            accessibilityState={{ disabled: !canAfford }}
          >
            <Text style={slotsFullStyles.gemButtonText}>
              💎 פתח תיבה — {INSTANT_OPEN_GEM_COST} ג׳מים
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
/*  SimIntroOverlay — 6-second intro before simulation starts           */
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
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onStart();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onStart]);

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
            textAlign: "right", writingDirection: "rtl", lineHeight: 24,
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

      <Text style={{ marginTop: 6, fontSize: 10, color: "#64748b" }}>
        {countdown}s
      </Text>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  LessonFlowScreen                                                   */
/* ------------------------------------------------------------------ */

const CHAPTER_DATA_MAP: Record<string, typeof chapter1Data> = {
  "chapter-0": chapter0Data as unknown as typeof chapter1Data,
  "chapter-1": chapter1Data,
  "chapter-2": chapter2Data,
  "chapter-3": chapter3Data,
  "chapter-4": chapter4Data,
  "chapter-5": chapter5Data,
};

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
  const { id, chapterId, replay } = useLocalSearchParams<{ id: string; chapterId?: string; replay?: string }>();
  const isReplay = replay === '1';
  const router = useRouter();
  /** Safe back: go back if possible, otherwise fall back to tabs home */
  function safeGoBack() {
    // Intercept exit during active lesson phases
    if (phase === "flashcards" || phase === "quizzes" || phase === "sim") {
      setShowExitConfirm(true);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)" as never);
    }
  }

  function forceExit() {
    setShowExitConfirm(false);
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)" as never);
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

  const unitColors = LESSON_COLORS[chapterId ?? ""] ?? DEFAULT_UNIT_COLORS;

  const isPro = useSubscriptionStore((s) => s.tier === "pro" && s.status === "active");
  const heartsCount = useSubscriptionStore((s) => s.getHearts());
  const recordQuizAnswer = useChapterStore((s) => s.recordQuizAnswer);
  const completeModule = useChapterStore((s) => s.completeModule);
  const progress = useChapterStore(useShallow((s) => s.progress));
  const setCurrentChapter = useChapterStore((s) => s.setCurrentChapter);
  const setCurrentModule = useChapterStore((s) => s.setCurrentModule);
  const quizResults = useChapterStore(
    (s) => s.progress[s.currentChapterId]?.quizResults ?? {},
  );

  const { isMuted, toggleMute } = useLessonMusic();

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
  const ALL_CHAPTERS_ORDERED = [chapter0Data as unknown as typeof chapter1Data, chapter1Data, chapter2Data, chapter3Data, chapter4Data, chapter5Data];
  const isModuleAccessible = useMemo(() => {
    if (isPro) return true;
    if (!chapterId) return true; // no chapter context, allow
    const chapterIdx = ALL_CHAPTERS_ORDERED.findIndex((c) => c.id === chapterId);
    if (chapterIdx < 0) return true;
    for (let ci = 0; ci < chapterIdx; ci++) {
      const prev = ALL_CHAPTERS_ORDERED[ci];
      const prevCompleted = progress[chapterStoreKey(prev.id)]?.completedModules ?? [];
      if (!prev.modules.every((m) => m.comingSoon || PRO_LOCKED_SIMS.has(m.id) || prevCompleted.includes(m.id))) return false;
    }
    const chapter = ALL_CHAPTERS_ORDERED[chapterIdx];
    const modIdx = chapter.modules.findIndex((m) => m.id === id);
    if (modIdx < 0) return true;
    const completed = progress[chapterStoreKey(chapter.id)]?.completedModules ?? [];
    for (let mi = 0; mi < modIdx; mi++) {
      if (chapter.modules[mi].comingSoon) continue;
      if (PRO_LOCKED_SIMS.has(chapter.modules[mi].id)) continue;
      if (!completed.includes(chapter.modules[mi].id)) return false;
    }
    return true;
  }, [isPro, chapterId, id, progress]);

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

  /** Navigate to user's next sequential module */
  function goToNextSequentialModule() {
    // After completing the first module (mod-0-1), go to the general
    // learning page so the user sees the unlocked next module on the map.
    if (id === 'mod-0-1') {
      if (isGuest) {
        setShowRegisterNudge(true); // Guest → register nudge first
      } else {
        router.replace("/pricing" as never); // Registered → Pro upsell
      }
      return;
    }
    // After completing the Emergency Fund module, route to the Tower Defense boss.
    if (id === 'mod-1-9') {
      router.replace("/tower-defense-boss" as never);
      return;
    }
    // After mod-0-3, drop into the BullshitSwipe interstitial (critical-thinking
    // warm-up) before continuing to mod-0-4. Shark delivers the "this is why
    // I'm here" line after the mini-game finishes.
    if (id === 'mod-0-3') {
      router.replace("/interstitial/bullshit-ch0" as never);
      return;
    }
    for (const ch of ALL_CHAPTERS_ORDERED) {
      const completed = progress[chapterStoreKey(ch.id)]?.completedModules ?? [];
      const nextIdx = ch.modules.findIndex((m) => !m.comingSoon && (isPro || !PRO_LOCKED_SIMS.has(m.id)) && !completed.includes(m.id));
      if (nextIdx >= 0) {
        const nextMod = ch.modules[nextIdx];
        setCurrentChapter(chapterStoreKey(ch.id));
        setCurrentModule(nextIdx);
        router.replace(`/lesson/${nextMod.id}?chapterId=${ch.id}` as never);
        return;
      }
    }
    router.replace("/(tabs)" as never);
  }

  const [phase, setPhase] = useState<FlowPhase>(() => {
    if (mod?.videoHookAsset) return "video";
    if (mod?.id && MODULE_HERO_MAP[mod.id]) return "hero";
    return "intro";
  });
  const setVideoPlaying = useAudioStore((s) => s.setVideoPlaying);

  useEffect(() => {
    setVideoPlaying(phase === "video");
  }, [phase]);

  // Show Pro gate for locked modules — but only after video finishes
  useEffect(() => {
    if (mod && !isModuleAccessible && phase !== "video") {
      setShowProGate(true);
    }
  }, [mod, isModuleAccessible, phase]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [finnTransitionSource, setFinnTransitionSource] = useState<{ uri: string } | null>(null);
  const [finnTipText, setFinnTipText] = useState<string | null>(null);
  // Mid-lesson Finn checkpoint
  const [showMidCheckpoint, setShowMidCheckpoint] = useState(false);
  const [checkpointReturnIndex, setCheckpointReturnIndex] = useState<number | null>(null);
  const checkpointIndex = useMemo(() =>
    mod && mod.flashcards.length >= 5 ? (2 + Math.round(Math.random())) : -1,
    [mod?.id],
  );
  // Post-module celebration
  const [showPostCelebration, setShowPostCelebration] = useState(false);
  const [showBreakMessage, setShowBreakMessage] = useState(false);
  // Shark Love — every 3rd module completion
  const [showSharkLove, setShowSharkLove] = useState(false);
  const moduleStartTimeRef = useRef(Date.now());
  // Shark CTA notifications — Bridge (every 4) + Referral (every 5 + dividend content)
  const [showBridgeCTA, setShowBridgeCTA] = useState(false);
  const [showReferralCTA, setShowReferralCTA] = useState(false);
  // Triggering metadata for copy variant rotation (Duolingo A/B: +8-12% CTR)
  const [ctaModuleCount, setCtaModuleCount] = useState(0);
  const [referralByDividend, setReferralByDividend] = useState(false);
  // Shark Party — every 2 consecutive or 4 total completed modules
  const [showPartyInvite, setShowPartyInvite] = useState(false);
  const [showPartyVideo, setShowPartyVideo] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [showStreakPopup, setShowStreakPopup] = useState(false);
  const [showQuizIntro, setShowQuizIntro] = useState(false);
  const [showWisdom, setShowWisdom] = useState(false);
  const [showInterGame, setShowInterGame] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [showXpReward, setShowXpReward] = useState(false);
  const [showCoinsReward, setShowCoinsReward] = useState(false);
  const [showOutOfHearts, setShowOutOfHearts] = useState(false);
  const [showHeartBreak, setShowHeartBreak] = useState(false);
  const heartsRowY = useRef(140);
  const heartsRowX = useRef(200);
  const [lifelineConcept, setLifelineConcept] = useState<string | null>(null);
  const { showAd: showRewardedAd, isLoaded: adLoaded, isPro: isProForAds } = useRewardedAd();
  const [lifelineChatConcept, setLifelineChatConcept] = useState<string | null>(null);
  const [showChapterComplete, setShowChapterComplete] = useState(false);
  const [showFinnBridgeNudge, setShowFinnBridgeNudge] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showRegisterNudge, setShowRegisterNudge] = useState(false);
  const [showPizzaModal, setShowPizzaModal] = useState(false);
  const [showCh0BullshitIntro, setShowCh0BullshitIntro] = useState(false);
  const hasSeenPizza = useTutorialStore((s) => s.hasSeenPizzaIndexModal);
  const markPizzaSeen = useTutorialStore((s) => s.markPizzaIndexSeen);
  const hasSeenCh0Bullshit = useTutorialStore((s) => s.hasSeenCh0BullshitInterstitial);
  const markCh0BullshitSeen = useTutorialStore((s) => s.markCh0BullshitInterstitialSeen);
  const isGuest = useAuthStore((s) => s.isGuest);
  const [chestFullScreen, setChestFullScreen] = useState(false);
  const [chestClaimed, setChestClaimed] = useState(false);
  const [chestRewards, setChestRewards] = useState<ChestReward | null>(null);
  const [flyingXp, setFlyingXp] = useState(0);
  const [flyingCoins, setFlyingCoins] = useState(0);
  const streak = useEconomyStore((s) => s.streak);

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


  // Reset all state when navigating to a different module (same route, different id)
  const prevIdRef = useRef(id);
  useEffect(() => {
    if (prevIdRef.current === id) return;
    prevIdRef.current = id;
    setPhase(mod?.videoHookAsset ? "video" : (mod?.id && MODULE_HERO_MAP[mod.id]) ? "hero" : "intro");
    setFlashcardIndex(0);
    setQuizIndex(0);
    setConsecutiveCorrect(0);
    setShowStreakPopup(false);
    setShowQuizIntro(false);
    setShowWisdom(false);
    setConfettiActive(false);
    setShowXpReward(false);
    setShowCoinsReward(false);
    setShowOutOfHearts(false);
    setShowHeartBreak(false);
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
    moduleStartTimeRef.current = Date.now();
    shouldTriggerDoNRef.current = false;
    completedRef.current = false;
    chestAnimationStartedRef.current = false;
    pendingChestDropRef.current = null;
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
    // Economy + visuals are triggered from the chest onPress setTimeout — NOT here
  }, []);

  const handleDoubleOrNothingResolve = useCallback((multiplier: number) => {
    setShowDoubleOrNothing(false);
    const rewards = pendingMultiplierRewards;
    if (rewards) {
      const eco = useEconomyStore.getState();
      if (multiplier === 2) {
        // Correct! Double coins only (XP is not at risk)
        eco.addCoins(rewards.coins);
        // Fly bonus coins UP
        setTimeout(() => {
          setFlyingCoins(rewards.coins);
        }, 400);
      } else if (multiplier === 0) {
        // Wrong! Lose the original 1x that was already granted
        eco.spendCoins(rewards.coins);
        // Fly coins back DOWN
        setTimeout(() => {
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
      setTimeout(() => {
        useWisdomStore.getState().showRandomWisdom();
        setShowWisdom(true);
      }, 1400);
    }
    // Offer ad bonus to non-PRO users after DoN resolves
    if (!isPro) {
      setTimeout(() => setShowAdBonus(true), 1800);
    }
  }, [pendingMultiplierRewards, chapterId, id, isPro]);

  // Shark Love dismiss — chain into DoN or wisdom
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
      setTimeout(() => {
        setShowDoubleOrNothing(true);
        playSound('modal_open_4');
      }, 500);
    } else if (!isLast) {
      // Otherwise show wisdom flash
      setTimeout(() => {
        useWisdomStore.getState().showRandomWisdom();
        setShowWisdom(true);
      }, 800);
    }
  }, [chapterId, id, playSound]);

  // Chapter context for progress display
  const chapterData = chapterId ? CHAPTER_DATA_MAP[chapterId] : undefined;
  const chapterModules = chapterData?.modules ?? [];
  const currentModIdx = chapterModules.findIndex((m) => m.id === id);
  const chapterStoreId = chapterId ? `ch-${chapterId.split("-")[1]}` : "";
  const chapterProg = useChapterStore((s) => s.progress[chapterStoreId]);
  const completedSet = chapterProg?.completedModules ?? [];
  const currentAlreadyCounted = id ? completedSet.includes(id) : false;
  const completedInChapter = completedSet.length + (phase === "summary" && !currentAlreadyCounted ? 1 : 0);
  const isLastModule = currentModIdx === chapterModules.length - 1;
  const nextModule = !isLastModule ? chapterModules[currentModIdx + 1] : undefined;

  // Pizza index modal — one-time popup after completing mod-2-12 (ch 2 mid-point)
  useEffect(() => {
    if (!mod) return;
    if (phase === "summary" && mod.id === "mod-2-12" && !hasSeenPizza) {
      setShowPizzaModal(true);
    }
  }, [phase, mod, hasSeenPizza]);

  // Chapter 0 bullshit interstitial — one-time shark notification after mod-0-3,
  // framing the BullshitSwipe game the user will soon encounter in the feed.
  useEffect(() => {
    if (!mod) return;
    if (phase === "summary" && mod.id === "mod-0-3" && !hasSeenCh0Bullshit) {
      setShowCh0BullshitIntro(true);
    }
  }, [phase, mod, hasSeenCh0Bullshit]);

  // Complete module and show rewards when entering summary phase
  useEffect(() => {
    if (!mod) return;
    if (phase === "summary" && !completedRef.current) {
      completedRef.current = true;
      // Module completion rewards delayed — granted when chest is opened (or claimed)
      successHaptic();
      playSound('modal_open_1');

      // Practice-to-Refill (US-006): if this replay was started from OutOfHeartsModal, grant +1 heart
      if (isReplay) {
        useSubscriptionStore.getState().grantPracticeHeart();
      }

      // Generate chest drop: premium for arena/chapter completion, regular for module
      // Skip rewards on replay
      if (!isReplay) {
        const dropType = isLastModule ? "premium" : "regular";
        const currentStreak = useEconomyStore.getState().streak;
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
        setTimeout(() => {
          setShowChapterComplete(true);
          playSound('btn_click_heavy');
          doubleHeavyHaptic();
        }, 4500);
        setTimeout(() => setShowChapterComplete(false), 7500);
        // Show Finn bridge nudge after chapter 0 completion (skip for minors — no bridge access)
        if (chapterId === "chapter-0" && !isGuest && useAuthStore.getState().profile?.ageGroup !== "minor") {
          setTimeout(() => setShowFinnBridgeNudge(true), 8000);
        }
      }
    }
    return () => {
      cancelAnimation(chestGlowScale);
      cancelAnimation(chestGlowOpacity);
      cancelAnimation(chestBodyScale);
    };
  }, [phase, mod?.id, completeModule, mod, isLastModule, playSound]);

  // Post-module celebration — only after wisdom + DoN + SharkLove are done, every other module
  useEffect(() => {
    if (!chestClaimed || showDoubleOrNothing || showSharkLove || showPostCelebration || showBreakMessage) return;
    // Show every other module (0, 2, 4... = yes, 1, 3, 5... = no)
    if (currentModIdx % 2 !== 0) return;
    // Wait 2s after chest claim + wisdom/DoN resolution
    const timer = setTimeout(() => setShowPostCelebration(true), 2000);
    return () => clearTimeout(timer);
  }, [chestClaimed, showDoubleOrNothing, showSharkLove, currentModIdx, showPostCelebration, showBreakMessage]);

  // Shark Party — trigger after every 4 total completed modules
  useEffect(() => {
    if (!chestClaimed || showDoubleOrNothing || showSharkLove || showPostCelebration || showPartyInvite || showPartyVideo) return;
    // Count total completed modules across all chapters
    const totalCompleted = Object.values(progress).reduce(
      (sum, ch) => sum + (ch?.completedModules?.length ?? 0), 0
    );
    // Show party every 4 completed modules (4, 8, 12, 16...)
    if (totalCompleted > 0 && totalCompleted % 4 === 0) {
      const timer = setTimeout(() => setShowPartyInvite(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [chestClaimed, showDoubleOrNothing, showPostCelebration, showPartyInvite, showPartyVideo, progress]);

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

  const advanceQuiz = useCallback(() => {
    if (!mod) return;
    if (quizIndex < mod.quizzes.length - 1) {
      setQuizIndex((prev) => prev + 1);
      tapHaptic();
    } else if (MODULES_WITH_SIM.has(mod.id) && !SIM_FIRST_MODULES.has(mod.id)) {
      // Normal flow: quizzes → sim (skip for sim-first modules — sim already done)
      if (PRO_LOCKED_SIMS.has(mod.id) && !useSubscriptionStore.getState().canUse("simulator")) {
        useUpgradeModalStore.getState().show("simulator");
        return;
      }
      setPhase("sim-intro");
      mediumHaptic();
    } else {
      setPhase(mod.id && MODULE_INFOGRAPHIC_MAP[mod.id] ? "module-infographic" : "summary");
    }
  }, [mod, quizIndex]);

  const handleCorrectAnswer = useCallback(() => {
    if (!mod) return;
    const quiz = mod.quizzes[quizIndex];
    recordQuizAnswer(mod.id, quiz.id, true, quiz.conceptTag);
    const newStreak = consecutiveCorrect + 1;
    setConsecutiveCorrect(newStreak);
    if (newStreak === 3 || newStreak === 5 || newStreak === 7) {
      if (newStreak >= 7) { doubleHeavyHaptic(); playSound('btn_click_heavy'); }
      else if (newStreak >= 5) { successHaptic(); playSound('btn_click_heavy'); }
      else { playSound('modal_open_4'); }
      setShowStreakPopup(true);
      setTimeout(() => setShowStreakPopup(false), 2000);
    }
    advanceQuiz();
  }, [mod, quizIndex, recordQuizAnswer, advanceQuiz, consecutiveCorrect, playSound]);

  // Immediate heart drop — called right when wrong answer is selected
  const handleWrongImmediate = useCallback(() => {
    if (!mod) return;
    setConsecutiveCorrect(0); // Reset streak on ANY wrong answer
    const quiz = mod.quizzes[quizIndex];
    const heartUsed = useSubscriptionStore.getState().useHeart();
    if (heartUsed) {
      setShowHeartBreak(true);
      heavyHaptic();
      if (quiz.conceptTag) {
        const isStruggling = useAdaptiveStore.getState().isConceptStruggledWith(quiz.conceptTag);
        if (isStruggling) {
          setTimeout(() => setLifelineConcept(quiz.conceptTag), 1600);
        }
      }
    } else {
      setShowOutOfHearts(true);
    }
  }, [mod, quizIndex]);

  // Deferred — advances quiz after feedback shown (stops if no hearts left)
  const handleWrongRevealed = useCallback(() => {
    if (!mod) return;
    const quiz = mod.quizzes[quizIndex];
    recordQuizAnswer(mod.id, quiz.id, false, quiz.conceptTag);
    setConsecutiveCorrect(0);
    // If hearts ran out — stop playing, show out-of-hearts
    const currentHearts = useSubscriptionStore.getState().getHearts();
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
    // Sim-first modules: sim → flashcards (instead of summary)
    if (mod && SIM_FIRST_MODULES.has(mod.id)) {
      setPhase("flashcards");
    } else {
      setPhase(mod && MODULE_INFOGRAPHIC_MAP[mod.id] ? "module-infographic" : "summary");
    }
  }, [mod]);

  const handleFlashcardNext = useCallback(() => {
    if (!mod) return;
    playSound('btn_click_soft_1');

    // Return from checkpoint review → jump back to where we were
    if (checkpointReturnIndex !== null) {
      setFlashcardIndex(checkpointReturnIndex);
      setCheckpointReturnIndex(null);
      return;
    }

    // Check if current card has a finnTip to show before advancing
    const currentCard = mod.flashcards[flashcardIndex];
    if (currentCard?.finnTip && !finnTipText) {
      setFinnTipText(currentCard.finnTip);
      return;
    }

    // Mid-lesson Finn checkpoint — show once at random position (card 3 or 4)
    if (flashcardIndex === checkpointIndex && !showMidCheckpoint && checkpointReturnIndex === null) {
      mediumHaptic();
      setShowMidCheckpoint(true);
      return;
    }

    if (flashcardIndex < mod.flashcards.length - 1) {
      const nextCardId = mod.flashcards[flashcardIndex + 1]?.id;
      const finnSource = nextCardId ? FINN_MAP[nextCardId] : undefined;
      if (finnSource) {
        setFinnTransitionSource(finnSource as { uri: string });
        setTimeout(() => {
          setFinnTransitionSource(null);
          setFlashcardIndex((prev) => prev + 1);
        }, 1500);
      } else {
        setFlashcardIndex((prev) => prev + 1);
      }
    } else {
      mediumHaptic();
      setPhase("quizzes");
      setTimeout(() => setShowQuizIntro(true), 50);
    }
  }, [mod, flashcardIndex, finnTipText, checkpointIndex, showMidCheckpoint, checkpointReturnIndex]);

  const handleDismissFinnTip = useCallback(() => {
    setFinnTipText(null);
    // Advance to next card after dismissing
    if (!mod) return;
    if (flashcardIndex < mod.flashcards.length - 1) {
      const nextCardId = mod.flashcards[flashcardIndex + 1]?.id;
      const finnSource = nextCardId ? FINN_MAP[nextCardId] : undefined;
      if (finnSource) {
        setFinnTransitionSource(finnSource as { uri: string });
        setTimeout(() => {
          setFinnTransitionSource(null);
          setFlashcardIndex((prev) => prev + 1);
        }, 1500);
      } else {
        setFlashcardIndex((prev) => prev + 1);
      }
    } else {
      mediumHaptic();
      setPhase("quizzes");
      setTimeout(() => setShowQuizIntro(true), 50);
    }
  }, [mod, flashcardIndex]);

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
          <Pressable onPress={() => { setShowProGate(false); safeGoBack(); }} accessibilityRole="button" accessibilityLabel="חזור">
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#64748b", writingDirection: "rtl" }}>חזור</Text>
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

  // Video hook phase — full-screen video with hook text overlay
  if (phase === "video" && mod?.videoHookAsset) {
    return (
      <VideoHookPlayer
        videoUri={(mod.videoHookAsset as { uri: string }).uri}
        hookText={mod.videoHook ?? ""}
        onFinish={advanceFromVideo}
        unitColors={unitColors}
      />
    );
  }
  if (phase === "video") {
    advanceFromVideo();
    return <View style={{ flex: 1, backgroundColor: "#f8fafc" }} />;
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

        {/* Streak text — fire lottie + label, absolute so it doesn't push content down */}
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
              {consecutiveCorrect >= 7 ? "גאון פיננסי!" : consecutiveCorrect >= 5 ? "מושלם!" : "רצף!"}
            </Text>
          </Animated.View>
        )}

        <Animated.View style={titleStyle}>
          {/* Title row — hidden during intro, quizzes, sim, sim-intro, and comic flashcards */}
          {!(phase === "flashcards" && (mod.flashcards[flashcardIndex]?.isComic || mod.flashcards[flashcardIndex]?.isMeme || mod.flashcards[flashcardIndex]?.videoUri)) && phase !== "intro" && phase !== "quizzes" && phase !== "sim" && (phase as string) !== "sim-intro" && (() => {
            let titleText = mod.title;
            if (phase === "flashcards") {
              const cardText = mod.flashcards[flashcardIndex]?.text ?? "";
              const colonIdx = cardText.indexOf(":");
              if (colonIdx > 0 && colonIdx < 80) {
                titleText = cardText.substring(0, colonIdx)
                  .replace(/\[\[([^|\]]+)\|?[^\]]*\]\]/g, "$1")
                  .replace(/\s*\([A-Za-z][A-Za-z\s&/.,'%\-–—:;$#0-9]*\)\s*/g, " ")
                  .trim();
              }
            }
            return (
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 6 }}>
                <Text
                  style={[RTL_STYLE, { color: '#1f2937', fontSize: 18, fontWeight: '900' }]}
                  numberOfLines={2}
                  accessibilityRole="header"
                >
                  {titleText}
                </Text>
              </View>
            );
          })()}

          {/* Progress bar — hidden during sim-intro */}
          {(phase as string) !== "sim-intro" && (() => {
            const hasSim = MODULES_WITH_SIM.has(mod.id);
            const isSimFirst = SIM_FIRST_MODULES.has(mod.id);
            const totalSteps = 1 + mod.flashcards.length + mod.quizzes.length + (hasSim ? 1 : 0) + 1;
            const currentStep = isSimFirst
              ? (phase === "hero" || phase === "intro" ? 0
                : phase === "sim-intro" || phase === "sim" ? 1
                : phase === "flashcards" ? 2 + flashcardIndex
                : phase === "quizzes" ? 2 + mod.flashcards.length + quizIndex
                : totalSteps)
              : (phase === "hero" || phase === "intro" ? 0
                : phase === "flashcards" ? 1 + flashcardIndex
                : phase === "quizzes" ? 1 + mod.flashcards.length + quizIndex
                : phase === "sim-intro" || phase === "sim" ? 1 + mod.flashcards.length + mod.quizzes.length
                : totalSteps);
            const pct = Math.min((currentStep / totalSteps) * 100, 100);
            const isOnFire = consecutiveCorrect >= 3;
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
                    {/* Shine effect — brighter on fire */}
                    <View style={{ position: 'absolute', top: 2, left: 6, right: 6, height: isOnFire ? 4 : 3, backgroundColor: isOnFire ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.35)', borderRadius: 999 }} />
                  </LinearGradient>
                </View>
              </View>
            );
          })()}
        </Animated.View>

        {/* ── Hero phase — full-screen character art ── */}
        {phase === "hero" && MODULE_HERO_MAP[mod.id] && (
          <Animated.View entering={FadeIn.duration(600)} style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f0f7ff" }}>
            <Pressable
              onPress={() => { tapHaptic(); setPhase("intro"); }}
              style={{ flex: 1, width: "100%", justifyContent: "center", alignItems: "center" }}
              accessibilityRole="button"
              accessibilityLabel="לחץ להתחיל"
            >
              <Image
                source={MODULE_HERO_MAP[mod.id]}
                style={{ width: "90%", height: "75%", borderRadius: 24 }}
                resizeMode="contain"
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
            <InteractiveIntroCard
              introText={mod.interactiveIntro}
              audioUri={mod.introAudio?.uri}
              introImageUri={mod.introImage?.uri}
              onStart={() => {
                if (SIM_FIRST_MODULES.has(mod.id) && MODULES_WITH_SIM.has(mod.id)) {
                  setPhase("sim"); // Skip sim-intro for sim-first modules — go straight to sim
                } else {
                  setPhase("flashcards");
                }
              }}
              unitColors={unitColors}
            />
          </Animated.View>
        )}

        {/* ── Flashcards phase ── */}
        {phase === "flashcards" && (
          <Animated.View style={[contentStyle, { flex: 1 }]}>
            <FlashcardCard
              key={mod.flashcards[flashcardIndex].id}
              card={mod.flashcards[flashcardIndex]}
              index={flashcardIndex}
              total={mod.flashcards.length}
              onNext={handleFlashcardNext}
              onPrev={handleFlashcardPrev}
              onClose={() => router.replace("/(tabs)" as never)}
              onSkipAll={() => { mediumHaptic(); setFlashcardIndex(mod.flashcards.length - 1); }}
              unitColors={unitColors}
              onTermPress={setActiveGlossaryTerm}
              onOpenChat={() => setShowChatOverlay(true)}
              showFinnTip={mod.id === "mod-0-1"}
            />
          </Animated.View>
        )}

        {/* ── Quizzes phase ── */}
        {phase === "quizzes" && (
          <Animated.View style={[contentStyle, { flex: 1 }]}>
            {/* Hearts display */}
            <View
              onLayout={(e) => {
                const { width: screenWidth } = Dimensions.get("window");
                // heartsRowY is relative to parent, adding offset for screen-level paddingTop
                heartsRowY.current = e.nativeEvent.layout.y + 110; 
                
                // Calculate center X of the hearts bar (centered in screen)
                const barCenter = screenWidth / 2;
                // Offset towards the leftmost FULL heart (indices 0=right, 4=left)
                const heartIdx = isPro ? 2 : Math.max(0, (heartsCount || 1) - 1);
                const heartXOffset = (2 - heartIdx) * 20; 
                
                heartsRowX.current = barCenter + heartXOffset;
              }}
              style={{ flexDirection: "row-reverse", justifyContent: "center", gap: 4, marginBottom: 6 }}
            >
              {isPro ? (
                <Text style={{ fontSize: 14, color: "#ef4444", fontWeight: "700" }}>♥ ∞</Text>
              ) : (
                Array.from({ length: 5 }).map((_, i) => (
                  <Text key={i} style={{ fontSize: 16, opacity: i < heartsCount ? 1 : 0.2 }}>
                    {i < heartsCount ? "❤️" : "🤍"}
                  </Text>
                ))
              )}
            </View>
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

        {/* ── Sim intro phase ── */}
        {phase === "sim-intro" && (
          <SimIntroOverlay
            title={mod.simConcept.title}
            description={mod.simConcept.description}
            onStart={() => { playSound('modal_open_4'); setPhase("sim"); }}
            unitColors={unitColors}
          />
        )}

        {/* ── Sim phase ── */}
        {phase === "sim" && (
          <Animated.View style={[contentStyle, { flex: 1, marginHorizontal: -16 }]}>
            <SimulatorLoader moduleId={mod.id} onComplete={handleSimComplete} />
            {/* Skip button removed — users complete sims naturally */}
          </Animated.View>
        )}

        {/* ── Module infographic phase (before chest) ── */}
        {phase === "module-infographic" && mod && MODULE_INFOGRAPHIC_MAP[mod.id] && (
          <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }}>
            <View style={{ borderRadius: 18, overflow: "hidden", shadowColor: "#0ea5e9", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 6, backgroundColor: "#fff" }}>
              <Image
                source={MODULE_INFOGRAPHIC_MAP[mod.id]}
                style={{ width: Dimensions.get("window").width - 56, height: (Dimensions.get("window").width - 56) * 1.5, borderRadius: 18 }}
                resizeMode="contain"
              />
            </View>
            <Pressable
              onPress={() => { tapHaptic(); setPhase("summary"); }}
              style={{ marginTop: 14, backgroundColor: "#0ea5e9", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, borderBottomWidth: 4, borderBottomColor: "#0369a1" }}
              accessibilityRole="button"
              accessibilityLabel="המשך"
            >
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff" }}>המשך</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* ── Summary phase ── */}
        {phase === "summary" && (
          <Animated.View style={[contentStyle, { flex: 1, marginHorizontal: -16 }]}>
            {/* Full-screen confetti overlay — only rendered while active */}
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
                            if (chapterId !== "chapter-0" && Math.random() < 0.15) {
                              shouldTriggerDoNRef.current = true;
                              setPendingMultiplierRewards(drop.rewards);
                            }
                            // 700ms: chest rewards + flying animation (after chest Lottie opens)
                            setTimeout(() => {
                              if (!isReplay) {
                                completeModule(mod.id);
                                useEconomyStore.getState().completeDailyTask();
                              }
                              const eco = useEconomyStore.getState();
                              eco.addCoins(drop.rewards.coins);
                              eco.addXP(drop.rewards.xp, "chest_reward");
                              if (drop.rewards.gems > 0) eco.addGems(drop.rewards.gems);
                              setFlyingCoins(drop.rewards.coins);
                              setFlyingXp(drop.rewards.xp);
                              setConfettiActive(true);
                              playSound('modal_open_4');
                            }, 700);
                          }
                          // 2s: auto-advance to "מודול הושלם"
                          setTimeout(() => {
                            setChestClaimed(true);
                            // Shark Love — every 3rd completed module (3, 6, 9...)
                            const totalCompletedNow = Object.values(progress).reduce(
                              (sum, ch) => sum + (ch?.completedModules?.length ?? 0), 0
                            );
                            if (totalCompletedNow > 0 && totalCompletedNow % 3 === 0) {
                              setTimeout(() => {
                                setShowSharkLove(true);
                                playSound('modal_open_4');
                              }, 500);
                            } else if (shouldTriggerDoNRef.current) {
                              shouldTriggerDoNRef.current = false;
                              setTimeout(() => {
                                setShowDoubleOrNothing(true);
                                playSound('modal_open_4');
                              }, 500);
                            }
                            // Duolingo A/B: ride the chest-dopamine peak (1.5-2s), not after it fades
                            // Bridge CTA — every 4 completed modules (4, 8, 12...)
                            // Skip for minors (no bridge access) and guests
                            const profile = useAuthStore.getState().profile;
                            const isBridgeEligible = !isGuest && profile?.ageGroup !== "minor";
                            const hasDividend = mod ? moduleHasDividendContent(mod.id, mod.flashcards.map(fc => fc.text)) : false;
                            const willShowReferral = totalCompletedNow > 0 && (totalCompletedNow % 5 === 0 || hasDividend);
                            const willShowBridge = isBridgeEligible && totalCompletedNow > 0 && totalCompletedNow % 4 === 0;

                            // Priority: if both would fire, show only Referral (higher CAC value) to avoid ad fatigue
                            if (willShowReferral) {
                              setCtaModuleCount(totalCompletedNow);
                              setReferralByDividend(hasDividend);
                              setTimeout(() => setShowReferralCTA(true), 1500);
                            } else if (willShowBridge) {
                              setCtaModuleCount(totalCompletedNow);
                              setTimeout(() => setShowBridgeCTA(true), 1500);
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
                if (mod?.interModuleGame && !showInterGame) {
                  setShowInterGame(true);
                } else {
                  goToNextSequentialModule();
                }
              }}
              onBack={() => {
                router.replace("/(tabs)" as never);
              }}
            />
            </ScrollView>

          </Animated.View>
        )}
      </View>

      {/* Inter-module game overlay */}
      {showInterGame && mod?.interModuleGame && (
        <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={() => { setShowInterGame(false); goToNextSequentialModule(); }} accessibilityViewIsModal>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#f8fafc" }} accessibilityViewIsModal>
            <View style={{ flexDirection: "row-reverse", paddingHorizontal: 16, paddingTop: 50, paddingBottom: 8 }}>
              <Pressable
                onPress={() => { setShowInterGame(false); goToNextSequentialModule(); }}
                style={{ paddingHorizontal: 14, paddingVertical: 6, backgroundColor: "rgba(0,0,0,0.06)", borderRadius: 16 }}
                accessibilityRole="button"
                accessibilityLabel="דלג"
              >
                <Text style={{ color: "#64748b", fontSize: 13, fontWeight: "700" }}>דלג ←</Text>
              </Pressable>
            </View>
            {mod.interModuleGame === 'investment' && <InvestmentCard isActive />}
            {mod.interModuleGame === 'crash' && <CrashGameCard isActive />}
            {mod.interModuleGame === 'myth' && <MythFeedCard isInterModule onSkip={() => { setShowInterGame(false); goToNextSequentialModule(); }} />}
            {mod.interModuleGame === 'dilemma' && <DilemmaCard isActive />}
            {mod.interModuleGame === 'macro-event' && mod.interModuleMacroEventId && (() => {
              const event = macroEventsData.find((e) => e.id === mod.interModuleMacroEventId);
              if (!event) return null;
              return (
                <MacroEventCard
                  item={{ id: event.id, type: 'macro-event', event }}
                  isActive
                />
              );
            })()}
          </GestureHandlerRootView>
        </Modal>
      )}

      {/* Double or Nothing modal */}
      <DoubleOrNothingModal
        visible={showDoubleOrNothing}
        rewards={{ coins: pendingMultiplierRewards?.coins ?? 0, xp: 0, gems: 0 }}
        onResolve={handleDoubleOrNothingResolve}
      />

      {/* Ad bonus — double coins by watching ad (non-PRO only) */}
      {showAdBonus && !isProForAds && adLoaded && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowAdBonus(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(8, 20, 40, 0.75)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 }}>
            <View style={{ backgroundColor: "#0f2942", borderRadius: 28, padding: 28, width: "100%", maxWidth: 340, alignItems: "center", borderWidth: 1, borderColor: "rgba(56,189,248,0.15)" }}>
              <ExpoImage source={FINN_HAPPY} accessible={false} style={{ width: 80, height: 80, marginBottom: 12 }} contentFit="contain" />
              <Text style={{ ...RTL_STYLE, fontSize: 20, fontWeight: "900", color: "#ffffff", textAlign: "center", marginBottom: 8 }}>
                רוצה עוד מטבעות?
              </Text>
              <Text style={{ ...RTL_STYLE, fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.6)", textAlign: "center", marginBottom: 24 }}>
                צפה בסרטון קצר וקבל 200 מטבעות בונוס!
              </Text>
              <Pressable
                onPress={() => {
                  tapHaptic();
                  setShowAdBonus(false);
                  showRewardedAd(() => {
                    useEconomyStore.getState().addCoins(200);
                    successHaptic();
                    setFlyingCoins(200);
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
          </View>
        </Modal>
      )}

      {/* Full-screen chest reward takeover */}
      {/* Blue chest modal removed — chest opens in-place */}
      <Modal visible={false} transparent={false} animationType="fade" statusBarTranslucent accessibilityViewIsModal>
        <Pressable
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="סגור"
          onPress={() => {
            setChestFullScreen(false);
            setChestClaimed(true);
            // Trigger flying rewards AFTER modal closes so they're visible
            const rewards = chestRewards;
            if (rewards) {
              setTimeout(() => {
                if (rewards.xp > 0) setFlyingXp(rewards.xp);
                if (rewards.coins > 0) setFlyingCoins(rewards.coins);
              }, 300);
            }
            // After coins land: show DoN (if triggered) or wisdom
            if (shouldTriggerDoNRef.current) {
              shouldTriggerDoNRef.current = false;
              setTimeout(() => {
                setShowDoubleOrNothing(true);
                playSound('modal_open_4');
              }, 1500);
            } else if (!isLastModule) {
              setTimeout(() => {
                useWisdomStore.getState().showRandomWisdom();
                setShowWisdom(true);
              }, 1800);
            }
          }}
        >
          {/* Blue gradient background */}
          <LinearGradient
            colors={['#1e3a5f', '#1e5a8a', '#1e3a5f']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Diamond overlay pattern (like shop) */}
          <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
            {Array.from({ length: 14 }).map((_, row) =>
              Array.from({ length: 8 }).map((_, col) => (
                <View
                  key={`d-${row}-${col}`}
                  style={{
                    position: 'absolute',
                    width: 44,
                    height: 44,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.06)',
                    transform: [{ rotate: '45deg' }],
                    top: row * 52 - 10,
                    left: col * 52 + (row % 2 === 0 ? 0 : 26) - 10,
                  }}
                />
              ))
            )}
          </View>
          <View style={{ width: 280, height: 280, overflow: "hidden", zIndex: 2 }}>
            <LottieView
              source={require("../../../assets/lottie/3D Treasure Box.json")}
              style={{ width: 280, height: 280 }}
              autoPlay
              loop={false}
            />
          </View>
          {chestRewards && (
            <Animated.View entering={FadeInDown.delay(700).springify()} style={{ flexDirection: 'row', gap: 16, marginTop: 28, zIndex: 2 }}>
              <View style={{ alignItems: 'center', backgroundColor: 'rgba(212,160,23,0.22)', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(250,204,21,0.3)' }}>
                <LottieView source={require("../../../assets/lottie/wired-flat-291-coin-dollar-hover-pinch.json")} style={{ width: 36, height: 36, marginBottom: 4 }} autoPlay loop />
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#facc15' }}>+{chestRewards.coins}</Text>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <GoldCoinIcon size={14} />
                  <Text style={{ fontSize: 12, color: '#fde68a' }}>מטבעות</Text>
                </View>
              </View>
              {chestRewards.xp > 0 && (
                <View style={{ alignItems: 'center', backgroundColor: 'rgba(14,165,233,0.18)', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(56,189,248,0.3)' }}>
                  <LottieView source={require("../../../assets/lottie/wired-flat-2431-number-5-hover-pinch.json")} style={{ width: 36, height: 36, marginBottom: 4 }} autoPlay loop />
                  <Text style={{ fontSize: 22, fontWeight: '900', color: '#38bdf8' }}>+{chestRewards.xp}</Text>
                  <Text style={{ fontSize: 12, color: '#7dd3fc', marginTop: 2 }}>XP</Text>
                </View>
              )}
              {chestRewards.gems > 0 && (
                <View style={{ alignItems: 'center', backgroundColor: 'rgba(59,130,246,0.22)', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)' }}>
                  <LottieView source={require("../../../assets/lottie/Diamond.json")} style={{ width: 36, height: 36, marginBottom: 4 }} autoPlay loop />
                  <Text style={{ fontSize: 22, fontWeight: '900', color: '#60a5fa' }}>+{chestRewards.gems}</Text>
                  <Text style={{ fontSize: 12, color: '#93c5fd', marginTop: 2 }}>💎</Text>
                </View>
              )}
            </Animated.View>
          )}
          <Animated.Text
            entering={FadeInDown.delay(1200)}
            style={{ color: 'rgba(255,255,255,0.5)', marginTop: 44, fontSize: 14, zIndex: 2 }}
          >
            לחץ בכל מקום לסגור
          </Animated.Text>
        </Pressable>
      </Modal>

      {/* Heart break animation overlay */}
      <HeartBreakOverlay
        visible={showHeartBreak}
        isLastHeart={!isPro && heartsCount === 0}
        onFinish={() => setShowHeartBreak(false)}
        originY={heartsRowY.current}
        originX={heartsRowX.current}
      />

      {/* AI Lifeline intervention — triggered when concept is consistently failed */}
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

      {/* Inline chat overlay — opens ON TOP of quiz, X to close and continue */}
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
          router.replace("/(tabs)" as never);
        }}
        onHeartsRefilled={() => {
          setShowOutOfHearts(false);
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

          {/* Continue button — pinned to bottom */}
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
      {/* Finn bridge nudge — after chapter 0 completion */}
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
              <Pressable
                onPress={() => { tapHaptic(); setShowFinnBridgeNudge(false); router.push("/bridge" as never); }}
                style={{ backgroundColor: "#0ea5e9", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, width: "100%", alignItems: "center", borderBottomWidth: 4, borderBottomColor: "#0369a1" }}
                accessibilityRole="button"
                accessibilityLabel="קח אותי לגשר"
              >
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff" }}>קח אותי לגשר 🌉</Text>
              </Pressable>
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

      {/* Exit interception modal — Duolingo-style */}
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
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowExitConfirm(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(8, 20, 40, 0.75)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 }}>
            <View style={{ backgroundColor: "#0f2942", borderRadius: 28, padding: 28, width: "100%", maxWidth: 340, alignItems: "center", borderWidth: 1, borderColor: "rgba(56,189,248,0.15)" }}>
              <ExpoImage source={FINN_EMPATHIC} accessible={false} style={{ width: 90, height: 90, marginBottom: 16 }} contentFit="contain" />
              <Text style={{ ...RTL_STYLE, fontSize: 20, fontWeight: "900", color: "#ffffff", textAlign: "center", marginBottom: 8 }}>
                חכו, יש רק {minutesWord}{"\n"}לסיום המודולה!
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
          </View>
        </Modal>
        );
      })()}

      {/* Registration nudge for guests after mod-0-1 */}
      {showRegisterNudge && (
        <Modal visible transparent animationType="fade" onRequestClose={() => { setShowRegisterNudge(false); router.replace("/pricing" as never); }}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }} onPress={() => { setShowRegisterNudge(false); router.replace("/pricing" as never); }} accessibilityRole="button" accessibilityLabel="סגור">
            <Pressable style={{ backgroundColor: "#e0f2fe", borderRadius: 24, padding: 24, width: "100%", maxWidth: 340, alignItems: "center" }} onPress={() => {}} accessible={false}>
              <ExpoImage source={FINN_HAPPY} accessible={false} style={{ width: 80, height: 80, marginBottom: 12 }} contentFit="contain" />
              <Text style={{ ...RTL_STYLE, fontSize: 18, fontWeight: "900", color: "#0c4a6e", marginBottom: 10, textAlign: "center" }}>
                רוצה לשמור את ההתקדמות?
              </Text>
              <Text style={{ ...RTL_STYLE, fontSize: 15, fontWeight: "600", color: "#334155", lineHeight: 24, textAlign: "center", marginBottom: 20 }}>
                הירשם בחינם כדי שהנתונים שלך לא יאבדו ותוכל להמשיך מאיפה שהפסקת
              </Text>
              <Pressable
                onPress={() => { tapHaptic(); setShowRegisterNudge(false); router.push("/(auth)/register" as never); }}
                style={{ backgroundColor: "#0ea5e9", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, width: "100%", alignItems: "center", borderBottomWidth: 4, borderBottomColor: "#0369a1" }}
                accessibilityRole="button"
                accessibilityLabel="הרשם"
              >
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff" }}>הרשם</Text>
              </Pressable>
              <Pressable
                onPress={() => { tapHaptic(); setShowRegisterNudge(false); router.replace("/pricing" as never); }}
                style={{ marginTop: 12, paddingVertical: 8 }}
                accessibilityRole="button"
                accessibilityLabel="המשך"
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748b" }}>המשך</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Pizza Index — one-time modal after mod-2-12 summary */}
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

      {/* Chapter 0 bullshit interstitial — shark message before mod-0-4 */}
      <Modal
        visible={showCh0BullshitIntro}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          markCh0BullshitSeen();
          setShowCh0BullshitIntro(false);
        }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(3,7,18,0.78)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
          <View style={{ width: "100%", maxWidth: 380, backgroundColor: "#f0f9ff", borderRadius: 24, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 16, borderWidth: 1.5, borderColor: "rgba(14,165,233,0.45)", shadowColor: "#0ea5e9", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 14 }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 54, height: 54 }} contentFit="contain" />
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#0369a1", writingDirection: "rtl", textAlign: "right" }}>קפטן שארק</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#0c4a6e", lineHeight: 24, writingDirection: "rtl", textAlign: "right", marginBottom: 16 }}>
              זו הסיבה שאני כאן. ללמד וללמוד ביחד איתך ולא למכור לך סיפורים.
            </Text>
            <Text style={{ fontSize: 13, color: "#64748b", writingDirection: "rtl", textAlign: "right", lineHeight: 20, marginBottom: 18 }}>
              בפיד שלך תמצא את משחק "סוויפ הבולשיט" — תרגול זיהוי של פרסומות מטעות. בוא נלמד ביחד.
            </Text>
            <Pressable
              onPress={() => {
                tapHaptic();
                markCh0BullshitSeen();
                setShowCh0BullshitIntro(false);
              }}
              accessibilityRole="button"
              accessibilityLabel="המשך"
              style={({ pressed }) => ({
                backgroundColor: "#0ea5e9",
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                borderBottomWidth: 4,
                borderBottomColor: "#0369a1",
                opacity: pressed ? 0.92 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#ffffff", writingDirection: "rtl" }}>המשך</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Finn full-screen transition between flashcards */}
      {finnTransitionSource && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[StyleSheet.absoluteFill, { zIndex: 9998, backgroundColor: "#f0f9ff", justifyContent: "center", alignItems: "center" }]}
        >
          <Image
            source={finnTransitionSource}
            style={{ width: "100%", height: "100%", transform: [{ scale: 0.88 }] }}
            resizeMode="cover"
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
            <Pressable onPress={() => { setShowMidCheckpoint(false); setShowChatOverlay(true); }} style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#dbeafe", borderRadius: 14, paddingVertical: 12, marginBottom: 10, borderWidth: 1, borderColor: "#93c5fd" }} accessibilityRole="button" accessibilityLabel="שאלו את שארק">
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#1e40af" }}>{"שאלו את שארק"}</Text>
            </Pressable>
            {/* Continue button */}
            <Pressable onPress={() => { setShowMidCheckpoint(false); setFlashcardIndex((prev) => prev + 1); }} style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#38bdf8", borderRadius: 14, paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: "#0284c7" }} accessibilityRole="button" accessibilityLabel="הכל ברור, קדימה">
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#ffffff" }}>{"הכל ברור, קדימה! ✓"}</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      )}

      {/* ── Shark Love — "עדיין תאהבו אותי?" every 3rd module ── */}
      {showSharkLove && (
        <SharkLoveModal
          xpEarned={chestRewards?.xp ?? 30}
          coinsEarned={chestRewards?.coins ?? 150}
          elapsedSeconds={Math.round((Date.now() - moduleStartTimeRef.current) / 1000)}
          onClaim={handleSharkLoveDismiss}
        />
      )}

      {/* ── Bridge CTA — every 4 modules ── */}
      <SharkBridgeCTA
        visible={showBridgeCTA && !showSharkLove && !showDoubleOrNothing && !showPostCelebration && !showPartyInvite}
        onGoBridge={() => { setShowBridgeCTA(false); router.push("/bridge" as never); }}
        onDismiss={() => setShowBridgeCTA(false)}
        moduleCount={ctaModuleCount}
      />

      {/* ── Referral CTA — every 5 modules + dividend content ── */}
      <SharkReferralCTA
        visible={showReferralCTA && !showSharkLove && !showDoubleOrNothing && !showPostCelebration && !showBridgeCTA && !showPartyInvite}
        onGoReferral={() => { setShowReferralCTA(false); router.push("/referral" as never); }}
        onDismiss={() => setShowReferralCTA(false)}
        moduleCount={ctaModuleCount}
        triggeredByDividend={referralByDividend}
      />

      {/* ── Post-module celebration ── */}
      {showPostCelebration && !showBreakMessage && (
        <Pressable style={[StyleSheet.absoluteFill, { zIndex: 9995, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 }]} onPress={() => {}} accessible={false}>
          <Animated.View entering={FadeInUp.duration(500)} style={{ backgroundColor: "#ffffff", borderRadius: 28, padding: 28, width: "100%", maxWidth: 340, alignItems: "center", borderWidth: 2, borderColor: "#22c55e" }}>
            <ExpoImage
              source={FINN_EMPATHIC}
              accessible={false}
              style={{ width: 140, height: 140, marginBottom: 12 }}
              contentFit="contain"
            />
            <Text style={{ fontSize: 22, fontWeight: "900", color: "#0f172a", textAlign: "center", marginBottom: 6 }}>{"כל הכבוד!"}</Text>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#64748b", textAlign: "center", marginBottom: 24 }}>{"רוצה להמשיך או ללכת לנטפליקס?"}</Text>
            {/* Continue option */}
            <Pressable onPress={() => { successHaptic(); setShowPostCelebration(false); goToNextSequentialModule(); }} style={{ width: "100%", backgroundColor: "#22c55e", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 12, borderBottomWidth: 4, borderBottomColor: "#16a34a" }} accessibilityRole="button" accessibilityLabel="המשך למודול הבא">
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#ffffff" }}>{"ממשיכים לתרגל ולצמוח! 💪"}</Text>
            </Pressable>
            {/* Quit option */}
            <Pressable onPress={() => { tapHaptic(); setShowBreakMessage(true); }} style={{ width: "100%", backgroundColor: "#f8fafc", borderRadius: 16, paddingVertical: 14, alignItems: "center", borderWidth: 1.5, borderColor: "#e2e8f0" }} accessibilityRole="button" accessibilityLabel="יציאה">
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#64748b" }}>
                {["עפתי לנטפליקס 📺", "עפתי לאינסטגרם 📱", "עפתי לטיקטוק 🎵", "אני הולך לישון 😴", "יש לי שווארמה שמחכה 🌯", "יש לי פיצה שמתקררת 🍕"][Math.floor(Math.random() * 6)]}
              </Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      )}

      {/* ── Break farewell message ── */}
      {showBreakMessage && (
        <Pressable style={[StyleSheet.absoluteFill, { zIndex: 9995, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 }]} onPress={() => { setShowBreakMessage(false); setShowPostCelebration(false); router.replace("/(tabs)" as never); }} accessibilityRole="button" accessibilityLabel="חזור לתפריט">
          <Animated.View entering={FadeInUp.duration(400)} style={{ backgroundColor: "#ffffff", borderRadius: 28, padding: 28, width: "100%", maxWidth: 340, alignItems: "center" }}>
            <ExpoImage source={FINN_EMPATHIC} accessible={false} style={{ width: 100, height: 100, marginBottom: 16 }} contentFit="contain" />
            <Text style={{ fontSize: 20, fontWeight: "900", color: "#0f172a", textAlign: "center", marginBottom: 8 }}>{"מצפה לראותך פה מחר! ❤️"}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#64748b", textAlign: "center" }}>{"לחץ בכל מקום כדי לחזור"}</Text>
          </Animated.View>
        </Pressable>
      )}

      {/* ── Shark Party invite ── */}
      {showPartyInvite && !showPartyVideo && (
        <Pressable style={[StyleSheet.absoluteFill, { zIndex: 9994, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 24 }]} onPress={() => { setShowPartyInvite(false); goToNextSequentialModule(); }} accessibilityRole="button" accessibilityLabel="סגור">
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
            <Pressable onPress={() => { setShowPartyInvite(false); goToNextSequentialModule(); }} style={{ paddingVertical: 10 }} accessibilityRole="button" accessibilityLabel="המשך">
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#64748b" }}>{"ממשיכים ללמוד →"}</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      )}

      {/* ── Shark Party video — full screen ── */}
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

      {/* Flying rewards — rendered at top level so particles can reach the header */}
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
      {/* Captain Shark chat overlay — opens on top of lesson */}
      <Modal
        visible={showChatOverlay}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowChatOverlay(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }} accessibilityViewIsModal>
          <View style={{ flexDirection: "row-reverse", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
            <Pressable
              onPress={() => setShowChatOverlay(false)}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}
              accessibilityRole="button"
              accessibilityLabel="סגור"
            >
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>✕</Text>
            </Pressable>
          </View>
          <ChatScreen />
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
