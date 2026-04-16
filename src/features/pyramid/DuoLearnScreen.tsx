
// PRD 39 — Duolingo-style Learn Screen
// Refactored to match Duolingo visual layout per implementation_plan.md.resolved

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Image as ExpoImage } from "expo-image";
import { ScrollView, View, Text, Pressable, Modal, Image, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeInDown,
  useReducedMotion,
  cancelAnimation,
} from "react-native-reanimated";
import LottieView from "lottie-react-native";
import { LottieIcon } from "../../components/ui/LottieIcon";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Lock, ChevronDown, Home, Shield, Scale, TrendingUp, Crown, FastForward, X } from "lucide-react-native";
import { useEconomyStore } from "../economy/useEconomyStore";
import { useChapterStore } from "../chapter-1-content/useChapterStore";
import { useSubscriptionStore } from "../subscription/useSubscriptionStore";
import { useAuthStore } from "../auth/useAuthStore";
import { getPyramidStatus } from "../../utils/progression";
import { ARENAS, type ArenaConfig } from "./arenaConfig";
import { PRO_LOCKED_SIMS } from "../../constants/proGates";
import { useReferralStore } from "../social/useReferralStore";
// DailyIncomeCard removed from learn screen per user request
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { SwipeableModal } from "../../components/ui/SwipeableModal";
import { NotificationPermissionBanner } from "../../components/ui/NotificationPermissionBanner";
import { NoFreezeUpsellBanner } from "../streak/NoFreezeUpsellBanner";
import { StreakAtRiskBanner } from "../streak/StreakAtRiskBanner";
import { StreakCalendarModal } from "../streak/StreakCalendarModal";
import { CalendarDays } from "lucide-react-native";
import { FINN_STANDARD } from "../retention-loops/finnMascotConfig";
import { FeedNudgeBanner } from "../../components/ui/FeedNudgeBanner";
import { useFeedNudge } from "../../hooks/useFeedNudge";
import { useDailyChallengesStore } from "../daily-challenges/use-daily-challenges-store";
import { chapter0Data } from "../chapter-0-content/chapter0Data";
import { chapter1Data } from "../chapter-1-content/chapter1Data";
import { chapter2Data } from "../chapter-2-content/chapter2Data";
import { chapter3Data } from "../chapter-3-content/chapter3Data";
import { chapter4Data } from "../chapter-4-content/chapter4Data";
import { chapter5Data } from "../chapter-5-content/chapter5Data";
import type { Module } from "../chapter-1-content/types";
import { tapHaptic, successHaptic } from "../../utils/haptics";
import { MindMapViewer } from "../../components/ui/MindMapViewer";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { useFunStore } from "../../stores/useFunStore";
import { FlyingRewards } from "../../components/ui/FlyingRewards";
import { MapEasterEggModal } from "../../components/fun/MapEasterEggModal";
import { useDailyQuestsStore } from "../daily-quests/useDailyQuestsStore";
import { DailyQuestWidget } from "../daily-quests/DailyQuestWidget";
import { DailyQuestsSheet } from "../daily-quests/DailyQuestsSheet";
import { QuestPathNode } from "../daily-quests/QuestPathNode";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width: SCREEN_W } = Dimensions.get("window");
const H_PAD = 20;
const CONTENT_W = SCREEN_W - H_PAD * 2;
const CENTER_X = CONTENT_W / 2;

// Duolingo-style smooth sine-wave curve
const NODE_SIZE = 78;
const CHAR_SIZE = 105;
const ROW_HEIGHT = NODE_SIZE + 36;
const WAVE_AMPLITUDE = 42;
const WAVE_PERIOD = 6; // complete S-curve every 6 nodes

/** Smooth sine offset for node at position i — creates organic Duolingo-style path */
function getNodeOffset(i: number): number {
  return Math.round(Math.sin((i * 2 * Math.PI) / WAVE_PERIOD) * WAVE_AMPLITUDE);
}

// Per-arena lucide icon mapping for banners
const ARENA_ICONS: Record<number, typeof Home> = { 0: Home, 1: Home, 2: Shield, 3: Scale, 4: TrendingUp, 5: Crown };

// Per-arena color palettes
const ARENA_COLORS: Record<number, { bg: string; dim: string; text: string; header: string; glow: string; bottom: string }> = {
  0: { bg: "#3b82f6", dim: "#dbeafe", text: "#ffffff", header: "#60a5fa", glow: "#93c5fd", bottom: "#1d4ed8" },
  1: { bg: "#3b82f6", dim: "#eff6ff", text: "#ffffff", header: "#60a5fa", glow: "#bfdbfe", bottom: "#1e40af" }, // Classic Blue
  2: { bg: "#38bdf8", dim: "#e0f2fe", text: "#ffffff", header: "#7dd3fc", glow: "#7dd3fc", bottom: "#0284c7" },
  3: { bg: "#2563eb", dim: "#dbeafe", text: "#ffffff", header: "#60a5fa", glow: "#93c5fd", bottom: "#1d4ed8" },
  4: { bg: "#4f46e5", dim: "#e0e7ff", text: "#ffffff", header: "#818cf8", glow: "#a5b4fc", bottom: "#4338ca" },
  5: { bg: "#7c3aed", dim: "#ede9fe", text: "#ffffff", header: "#a78bfa", glow: "#c4b5fd", bottom: "#6d28d9" },
};

const ALL_CHAPTERS = [chapter0Data, chapter1Data, chapter2Data, chapter3Data, chapter4Data, chapter5Data];

/* Portrait summary URLs — used for completed module preview */
const BLOB = 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics';
const PORTRAIT_SUMMARY_URLS: Record<string, string> = {
  'mod-0-1': `${BLOB}/mod-0-1/summary-0-1.png`,
  'mod-0-2': `${BLOB}/mod-0-2/summary-0-2.png`,
  'mod-0-3': `${BLOB}/mod-0-3/summary-0-3.png`,
  'mod-0-4': `${BLOB}/mod-0-4/summary-0-4.png`,
  'mod-0-5': `${BLOB}/mod-0-5/summary-0-5.png`,
  'mod-1-1': `${BLOB}/mod-1-1/summary-1-1.png`,
  'mod-1-2': `${BLOB}/mod-1-2/summary-1-2.png`,
  'mod-1-3': `${BLOB}/mod-1-3/summary-1-3.png`,
  'mod-1-4': `${BLOB}/mod-1-4/summary-1-4.png`,
  'mod-1-5': `${BLOB}/mod-1-5/summary-1-5-v2.png`,
  'mod-1-6': `${BLOB}/mod-1-6/summary-1-6.png`,
  'mod-1-7': `${BLOB}/mod-1-7/summary-1-7.png`,
  'mod-1-8': `${BLOB}/mod-1-8/summary-1-8.png`,
  'mod-1-9': `${BLOB}/mod-1-9/summary-1-9.png`,
  'mod-2-10': `${BLOB}/mod-2-10/summary-2-10.png`,
  'mod-2-11': `${BLOB}/mod-2-11/summary-2-11.png`,
  'mod-2-12': `${BLOB}/mod-2-12/summary-2-12.png`,
  'mod-2-13': `${BLOB}/mod-2-13/summary-2-13.png`,
  'mod-2-14': `${BLOB}/mod-2-14/summary-2-14.png`,
  'mod-3-15': `${BLOB}/mod-3-15/summary-3-15.png`,
  'mod-3-16': `${BLOB}/mod-3-16/summary-3-16.png`,
  'mod-3-17': `${BLOB}/mod-3-17/summary-3-17.png`,
  'mod-3-18': `${BLOB}/mod-3-18/summary-3-18.png`,
  'mod-4-19': `${BLOB}/mod-4-19/summary-4-19.png`,
  'mod-4-20': `${BLOB}/mod-4-20/summary-4-20.png`,
  'mod-4-21': `${BLOB}/mod-4-21/summary-4-21.png`,
  'mod-4-22': `${BLOB}/mod-4-22/summary-4-22.png`,
  'mod-4-23': `${BLOB}/mod-4-23/summary-4-23.png`,
  'mod-4-24': `${BLOB}/mod-4-24/summary-4-24.png`,
  'mod-4-25': `${BLOB}/mod-4-25/summary-4-25.png`,
  'mod-4-26': `${BLOB}/mod-4-26/summary-4-26.png`,
  'mod-4-27': `${BLOB}/mod-4-27/summary-4-27.png`,
  'mod-4-28': `${BLOB}/mod-4-28/summary-4-28.png`,
  'mod-4-29': `${BLOB}/mod-4-29/summary-4-29.png`,
  'mod-4-30': `${BLOB}/mod-4-30/summary-4-30.png`,
  'mod-5-25': `${BLOB}/mod-5-25/summary-5-25.png`,
  'mod-5-26': `${BLOB}/mod-5-26/summary-5-26.png`,
  'mod-5-27': `${BLOB}/mod-5-27/summary-5-27.png`,
  'mod-5-28': `${BLOB}/mod-5-28/summary-5-28.png`,
  'mod-5-29': `${BLOB}/mod-5-29/summary-5-29.png`,
  'mod-5-30': `${BLOB}/mod-5-30/summary-5-30.png`,
  'mod-5-31': `${BLOB}/mod-5-31/summary-5-31.png`,
};

/* Mind map data — pre-generated by NotebookLM */
const MIND_MAP_DATA: Record<number, ReturnType<typeof require>> = {
  0: require('../../../assets/mindmaps/chapter-0.json'),
  1: require('../../../assets/mindmaps/chapter-1.json'),
  2: require('../../../assets/mindmaps/chapter-2.json'),
  3: require('../../../assets/mindmaps/chapter-3.json'),
  4: require('../../../assets/mindmaps/chapter-4.json'),
  5: require('../../../assets/mindmaps/chapter-5.json'),
};

/** Map chapter data id → store key (e.g. "chapter-1" → "ch-1") */
function storeKey(chapterId: string): string {
  return `ch-${chapterId.split("-")[1]}`;
}

// Finn speech bubble phrases (cycles by modIndex, first is personalized)
const FINN_PHRASES_STATIC = [
  "בואו נלמד!",
  "השלב הבא!",
  "מאמין בכם!",
  "מוכנים?",
];

function getFinnPhrase(index: number, displayName: string): string {
  const total = FINN_PHRASES_STATIC.length + 1;
  const slot = index % total;
  if (slot === 0) return `יאללה ${displayName || "חברים"}!`;
  return FINN_PHRASES_STATIC[slot - 1];
}

// Time-based Hebrew greeting
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "לילה טוב";
  if (hour < 12) return "בוקר טוב";
  if (hour < 18) return "צהריים טובים";
  return "ערב טוב";
}

// Arena decoration sources removed — clean background

const DECO_SIZE = 36;

// ---------------------------------------------------------------------------
// Node type → icon mapping (Duolingo-style icons)
// ---------------------------------------------------------------------------

type NodeType = "lesson" | "review" | "chest" | "practice";

function getNodeType(moduleIndex: number, totalModules: number): NodeType {
  if (moduleIndex === Math.floor(totalModules / 2)) return "chest";
  if (moduleIndex % 4 === 3) return "review";
  if (moduleIndex % 4 === 1) return "practice";
  return "lesson";
}

function getNodeIcon(_type: NodeType, title: string, _state: "completed" | "active" | "locked"): string {
  // All nodes get topic-relevant emoji (no generic headphones/blue circles)
  if (title.includes("כסף")) return "💵";
  if (title.includes("מושגי יסוד")) return "🧩";
  if (title.includes("כמה נכנס") || title.includes("הכנסות והוצאות")) return "⚖️";
  if (title.includes("תזרים") || title.includes("תקציב")) return "💸";
  if (title.includes("אשראי") || title.includes("כרטיס")) return "💳";
  if (title.includes("ריבית") || title.includes("ריבית דריבית")) return "📈";
  if (title.includes("הלוואה") || title.includes("מלכודת המינוס")) return "⚠️";
  if (title.includes("מלכודות") || title.includes("שיווק")) return "🛒";
  if (title.includes("ביטוח")) return "🛡️";
  if (title.includes("קרן חירום")) return "🚨";
  if (title.includes("אינפלציה")) return "📉";
  if (title.includes("פסיכולוגיה")) return "🧠";
  if (title.includes("קופת גמל")) return "🏦";
  if (title.includes("מסלולי השקעה")) return "🛤️";
  if (title.includes("שוק ההון")) return "🏛️";
  if (title.includes("מדד")) return "📊";
  if (title.includes("לנצח את המדד")) return "🏆";
  if (title.includes("סוגי מניות")) return "🎯";
  if (title.includes("מניות") || title.includes("בורסה")) return "📊";
  if (title.includes("מיסים") || title.includes("מס") || title.includes("נקודות זיכוי")) return "📋";
  if (title.includes("דיבידנד")) return "🌳";
  if (title.includes("ETF") || title.includes("קרן סל") || title.includes("תעודות סל")) return "📦";
  if (title.includes("פקודות מסחר")) return "⚡";
  if (title.includes("פלטפורמות")) return "🖥️";
  if (title.includes("גרפים") || title.includes("ניתוח")) return "📐";
  if (title.includes("דוחות כספיים")) return "📑";
  if (title.includes("פיזור") || title.includes("סיכונים")) return "🎲";
  if (title.includes("תגובות") || title.includes("אירועים") || title.includes("משבר")) return "🌊";
  if (title.includes("חיסכון") || title.includes("השתלמות")) return "🐷";
  if (title.includes("פנסיה") || title.includes("פרישה")) return "🏖️";
  if (title.includes("נדל")) return "🏠";
  if (title.includes("REIT") || title.includes("בשלט רחוק")) return "🏢";
  if (title.includes("העברה") || title.includes("בין דורית") || title.includes("ירושה")) return "👨‍👩‍👧";
  if (title.includes("חופש כלכלי") || title.includes("FIRE")) return "🔥";
  if (title.includes("קריפטו")) return "₿";
  if (title.includes("IRA")) return "📜";
  if (title.includes("גרהם") || title.includes("גראהם")) return "📚";
  if (title.includes("מרווח ביטחון")) return "🛡️";
  if (title.includes("מחיר") && title.includes("ערך")) return "⚖️";
  if (title.includes("ציר הזמן")) return "⏰";
  if (title.includes("למה להשקיע")) return "🚀";
  if (title.includes("דירוג אשראי")) return "⭐";
  return "📖";
}

// ---------------------------------------------------------------------------
// Path connector between nodes
// ---------------------------------------------------------------------------

const PathConnector = React.memo(function PathConnector({
  fromOffsetX,
  toOffsetX,
  done,
}: {
  fromOffsetX: number;
  toOffsetX: number;
  done: boolean;
  color: string; // kept for API compat, overridden internally
}) {
  const NUM_DOTS = 16;
  const CONNECTOR_H = 66;
  // Warm golden-brown trail when completed — like a legend's path
  const dotColor = done ? "#f59e0b" : "#d1d5db";
  const trailColor = done ? "#fde68a" : "#e5e7eb";
  const glowColor = "#fde68a";

  // Interpolation helper
  const interp = (t: number) => {
    const smooth = 0.5 - 0.5 * Math.cos(t * Math.PI);
    return CENTER_X + fromOffsetX + (toOffsetX - fromOffsetX) * smooth;
  };

  return (
    <View style={{ height: CONNECTOR_H, width: "100%", position: "relative", marginTop: -16, marginBottom: -4 }}>
      {/* Layer 0: Outer glow halo (done only) — widest, faintest */}
      {done && Array.from({ length: 80 }).map((_, i) => {
        const t = i / 79;
        const cx = interp(t);
        const cy = t * CONNECTOR_H;
        return (
          <View
            key={`glow-${i}`}
            style={{
              position: "absolute",
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: glowColor,
              left: cx - 7,
              top: cy,
              opacity: 0.18,
            }}
          />
        );
      })}
      {/* Layer 1: Continuous trail (background fill) */}
      {Array.from({ length: NUM_DOTS * 4 }).map((_, i) => {
        const t = i / (NUM_DOTS * 4 - 1);
        const cx = interp(t);
        const cy = t * CONNECTOR_H;
        const sz = done ? 10 : 6;
        return (
          <View
            key={`trail-${i}`}
            style={{
              position: "absolute",
              width: sz,
              height: sz,
              borderRadius: sz / 2,
              backgroundColor: trailColor,
              left: cx - sz / 2,
              top: cy,
              opacity: done ? 0.5 : 0.25,
            }}
          />
        );
      })}
      {/* Layer 2: Main dots (prominent) */}
      {Array.from({ length: NUM_DOTS }).map((_, i) => {
        const t = i / (NUM_DOTS - 1);
        const dotCenterX = interp(t);
        const dotY = t * (CONNECTOR_H - 4);
        const dotSize = done
          ? 10 + Math.sin(t * Math.PI) * 3
          : 7 + Math.sin(t * Math.PI) * 2;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: dotColor,
              left: dotCenterX - dotSize / 2,
              top: dotY,
              opacity: done ? 1 : 0.5,
              ...(done && {
                borderWidth: 1.5,
                borderColor: "#fffbeb",
                shadowColor: "#f59e0b",
                shadowOpacity: 0.6,
                shadowRadius: 4,
                elevation: 3,
              }),
            }}
          />
        );
      })}
    </View>
  );
});

// ---------------------------------------------------------------------------
// ArenaHeaderBanner — Duolingo "SECTION X, UNIT Y" style
// ---------------------------------------------------------------------------

function ArenaHeaderBanner({
  arena,
  sectionIndex,
  isLocked,
  onPress,
  onMindMap,
}: {
  arena: ArenaConfig;
  sectionIndex: number;
  isLocked: boolean;
  onPress?: () => void;
  onMindMap?: () => void;
}) {
  const colors = ARENA_COLORS[arena.id];
  return (
    <>
      <Pressable
        onPress={onPress}
        style={[
          styles.bannerCard,
          {
            backgroundColor: isLocked ? "#e5e7eb" : colors.bg,
            borderColor: isLocked ? "#d1d5db" : colors.bottom,
            opacity: isLocked ? 0.8 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`פרק ${sectionIndex} — ${arena.name}`}
        accessibilityState={{ disabled: isLocked }}
      >
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text style={[styles.bannerSection, { color: isLocked ? "#64748b" : "rgba(255,255,255,0.85)" }]}>
            פרק {sectionIndex}
          </Text>
          <Text style={[styles.bannerTitle, { color: isLocked ? "#6b7280" : "#ffffff" }]}>
            {arena.name}
          </Text>
          <Text style={[styles.bannerSubtitle, { color: isLocked ? "#64748b" : "rgba(255,255,255,0.85)" }]}>
            {arena.subtitle}
          </Text>
        </View>
        {(() => {
          if (isLocked) return <Lock size={26} color="#64748b" style={{ marginLeft: 14 }} />;
          const Icon = ARENA_ICONS[arena.id];
          if (Icon) return <Icon size={26} color="rgba(255,255,255,0.85)" style={{ marginLeft: 14 }} />;
          return null;
        })()}
      </Pressable>
      {!isLocked && onMindMap && (
        <Pressable
          onPress={onMindMap}
          style={{ alignSelf: 'flex-start', backgroundColor: '#e0f2fe', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginTop: 6, marginLeft: H_PAD, flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#bae6fd' }}
          accessibilityRole="button"
          accessibilityLabel="מפת הלמידה"
        >
          <Text style={{ color: '#0369a1', fontSize: 12, fontWeight: '700' }}>🗺 מפת הלמידה</Text>
        </Pressable>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Pulsing glow behind active node
// ---------------------------------------------------------------------------

function PulsingGlow({ color }: { color: string }) {
  const opacity = useSharedValue(0.35);
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 0.5;
      scale.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withSequence(withTiming(0.6, { duration: 1200 }), withTiming(0.3, { duration: 1200 })),
      -1,
      true,
    );
    scale.value = withRepeat(
      withSequence(withTiming(1.12, { duration: 1200 }), withTiming(1.0, { duration: 1200 })),
      -1,
      true,
    );
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, [opacity, scale, reducedMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
        { borderRadius: NODE_SIZE / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// ModuleNode — with 3D depth effect
// ---------------------------------------------------------------------------

function ModuleNode({
  module,
  state,
  offsetX,
  arenaId,
  showCharacter,
  nodeType,
  modIndex,
  isProLocked,
  isComingSoon,
  isLastModule,
  displayName,
  friendEmojis,
  hasEasterEgg,
  onClaimEasterEgg,
  onPress,
}: {
  module: Module;
  state: "completed" | "active" | "locked";
  offsetX: number;
  arenaId: number;
  showCharacter: boolean;
  nodeType: NodeType;
  modIndex: number;
  isProLocked: boolean;
  isComingSoon: boolean;
  isLastModule: boolean;
  displayName: string;
  friendEmojis?: string[];
  hasEasterEgg?: boolean;
  onClaimEasterEgg?: () => void;
  onPress: () => void;
}) {
  const colors = ARENA_COLORS[arenaId];

  // Completed + active → arena color; locked → gray
  const bgColor = state === "locked" ? "#e5e7eb" : colors.bg;
  // 3D bottom border (darker shade of bg)
  const bottomBorderColor = state === "locked" ? "#c7cdd4" : colors.bottom;

  const icon = getNodeIcon(nodeType, module.title, state);
  const nodeCenter = CENTER_X + offsetX;
  // Finn toward EDGE (same side as offset) — OPPOSITE side from label so they never overlap
  const finnGoesRight = offsetX >= 0;
  const charLeft = finnGoesRight
    ? Math.min(nodeCenter + NODE_SIZE / 2 + 6, CONTENT_W - CHAR_SIZE)
    : Math.max(nodeCenter - NODE_SIZE / 2 - CHAR_SIZE - 6, 0);

  return (
    <View style={[styles.nodeRow, { height: ROW_HEIGHT }]}>
      {/* Finn mascot beside active node */}
      {showCharacter && (
        <>
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            style={[styles.characterWrapper, { left: charLeft }]}
          >
            <View style={{ width: CHAR_SIZE, height: CHAR_SIZE, overflow: "hidden" }}>
              <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: CHAR_SIZE, height: CHAR_SIZE }} contentFit="contain" />
            </View>
          </Animated.View>
          {/* Speech bubble directly above Finn */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            style={[styles.speechBubbleBelow, {
              left: Math.max(0, Math.min(charLeft + CHAR_SIZE / 2 - 70, CONTENT_W - 140)),
              top: 10 - 32,
            }]}
          >
            <View style={styles.speechArrow} />
            <Text style={styles.speechText} numberOfLines={2}>
              {getFinnPhrase(modIndex, displayName)}
            </Text>
          </Animated.View>
        </>
      )}

      {/* Node + 3D depth shadow */}
      <View style={[styles.nodeCol, { left: CENTER_X - NODE_SIZE / 2 + offsetX }]}>
        {/* 3D bottom border (depth effect) */}
        <View
          style={[
            styles.nodeDepth,
            {
              backgroundColor: bottomBorderColor,
              opacity: state === "locked" ? 0.65 : 1,
            },
          ]}
        />
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={module.title}
          accessibilityState={{ disabled: state === "locked" }}
          style={[
            styles.nodeCircle,
            {
              backgroundColor: bgColor,
              borderColor: bottomBorderColor,
              shadowColor: state === "active" ? colors.glow : "transparent",
              opacity: state === "locked" ? 0.7 : 1,
            },
          ]}
        >
          {state === "active" && <PulsingGlow color={colors.bg} />}
          <Text style={[styles.nodeIcon, { opacity: state === "locked" ? 0.8 : 1 }]}>
              {icon}
            </Text>
        </Pressable>

        {/* PRO lock badge — GO PRO Lottie */}
        {isProLocked && !isComingSoon && state !== "completed" && (
          <View style={styles.proBadge} accessible={false}>
            <LottieView
              source={require("../../../assets/lottie/Pro Animation 3rd.json")}
              style={styles.proLottie}
              autoPlay
              loop
            />
          </View>
        )}

        {/* Coming soon badge */}
        {isComingSoon && (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>בפיתוח 🔧</Text>
          </View>
        )}

        {/* Easter egg coin — bouncing gold coin above completed node */}
        {hasEasterEgg && (
          <Pressable
            onPress={() => onClaimEasterEgg?.()}
            accessibilityRole="button"
            accessibilityLabel="מטבע הפתעה! לחץ לאסוף"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              position: "absolute",
              top: -28,
              alignSelf: "center",
              zIndex: 10,
            }}
          >
            <Animated.View
              entering={FadeInDown.duration(400)}
              style={{
                width: 28,
                height: 28,
              }}
            >
              <LottieView
                source={require("../../../assets/lottie/wired-flat-298-coins-hover-jump.json")}
                style={{ width: 28, height: 28 }}
                autoPlay
                loop
              />
            </Animated.View>
          </Pressable>
        )}
      </View>

      {/* Friend avatars — tiny circles on same side as Finn (edge side) */}
      {friendEmojis && friendEmojis.length > 0 && (
        <View
          style={[
            styles.friendAvatarRow,
            offsetX >= 0
              ? { left: nodeCenter + NODE_SIZE / 2 + 4 }
              : { left: nodeCenter - NODE_SIZE / 2 - 4 - friendEmojis.length * 18 },
          ]}
        >
          {friendEmojis.slice(0, 3).map((emoji, ei) => (
            <View key={ei} style={styles.friendAvatarDot}>
              <Text style={styles.friendAvatarEmoji}>{emoji}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Label — always toward CENTER (opposite side from Finn / edge) */}
      <View
        style={[
          styles.nodeLabelSide,
          offsetX < 0
            ? { left: CENTER_X + offsetX + NODE_SIZE / 2 + 6, alignItems: "flex-start" }
            : { right: CONTENT_W - (CENTER_X + offsetX - NODE_SIZE / 2) + 6 },
        ]}
      >
        <View style={styles.nodeLabelPill}>
          <Text style={styles.nodeLabelText} numberOfLines={2}>
            {module.title}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// PRO upgrade modal (locked module tap)
// ---------------------------------------------------------------------------

function LockedModuleModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  return (
    <SwipeableModal visible={visible} onClose={onClose}>
      <Pressable style={styles.modalSheet} onPress={() => { }} accessibilityLabel="תוכן חלון שדרוג">
        <View style={styles.modalHandle} />
        <View accessible={false}>
          <LottieView
            source={require("../../../assets/lottie/Crown.json")}
            style={{ width: 80, height: 80, marginBottom: 4 }}
            autoPlay
            loop
          />
        </View>
        <Text style={styles.modalTitle}>מודול נעול 🔒</Text>
        <Text style={styles.modalBody}>
          השלם את המודולים הקודמים כדי לפתוח את הבא בתור, או שדרג ל-PRO לגישה מיידית.
        </Text>
        <AnimatedPressable
          onPress={() => {
            onClose();
            router.push("/pricing" as never);
          }}
          style={styles.modalCTA}
          accessibilityRole="button"
          accessibilityLabel="שדרג ל-PRO"
        >
          <LinearGradient
            colors={["#0a2540", "#164e63", "#0a2540"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalCTAGradient}
          >
            <View style={{ width: 22, height: 22, overflow: "hidden" }} accessible={false}>
              <LottieView
                source={require("../../../assets/lottie/Pro Animation 3rd.json")}
                style={{ width: 22, height: 22 }}
                autoPlay
                loop
              />
            </View>
            <Text style={styles.modalCTAText}>שדרג ל-PRO</Text>
          </LinearGradient>
        </AnimatedPressable>
        <Pressable onPress={onClose} style={{ paddingVertical: 10 }} accessibilityRole="button" accessibilityLabel="חזרה">
          <Text style={{ color: "#71717a", fontSize: 14 }}>החלק מטה או הקש כאן</Text>
        </Pressable>
      </Pressable>
    </SwipeableModal>
  );
}

// ---------------------------------------------------------------------------
// Chapter section
// ---------------------------------------------------------------------------

const ChapterSection = React.memo(function ChapterSection({
  arena,
  chapter,
  completedModules,
  isUnlocked,
  isPro,
  sectionIndex,
  displayName,
  onModulePress,
  onLockedPress,
  friendsOnModule,
  onSkipIntro,
  onChapterPress,
  onMindMap,
  easterEggNodeId,
  onClaimEasterEgg,
  questPathNodeProps,
}: {
  arena: ArenaConfig;
  chapter: typeof chapter1Data;
  completedModules: string[];
  isUnlocked: boolean;
  isPro: boolean;
  sectionIndex: number;
  displayName: string;
  onModulePress: (moduleId: string, chapterId: string, moduleIndex: number) => void;
  onLockedPress: () => void;
  friendsOnModule: Record<string, string[]>;
  onSkipIntro?: () => void;
  onChapterPress?: () => void;
  onMindMap?: () => void;
  easterEggNodeId?: string | null;
  onClaimEasterEgg?: () => void;
  questPathNodeProps?: {
    completedCount: number;
    totalQuests: number;
    allCompleted: boolean;
    rewardClaimed: boolean;
    onPress: () => void;
  };
}) {
  const firstIncompleteIndex = chapter.modules.findIndex(
    (m) => !completedModules.includes(m.id) && !m.comingSoon && (isPro || !PRO_LOCKED_SIMS.has(m.id)),
  );
  const activeIndex = isUnlocked
    ? firstIncompleteIndex === -1 ? chapter.modules.length : firstIncompleteIndex
    : -1;

  return (
    <Animated.View entering={FadeInDown.delay(sectionIndex * 80).duration(350)}>
      <ArenaHeaderBanner arena={arena} sectionIndex={sectionIndex} isLocked={!isUnlocked} onPress={onChapterPress} onMindMap={onMindMap} />

      {sectionIndex === 0 && completedModules.length < chapter.modules.length && onSkipIntro && (
        <AnimatedPressable
          onPress={onSkipIntro}
          style={{
            alignSelf: 'center',
            marginTop: 20,
            paddingHorizontal: 20,
            paddingVertical: 10,
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderRadius: 28,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 10,
            shadowColor: '#1d4ed8',
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 4
          }}
          accessibilityRole="button"
          accessibilityLabel="כבר יש לי בסיס, דלג לפרק 1"
        >
          <View style={{ width: 36, height: 36, overflow: 'hidden' }} accessible={false}>
            <LottieView
              source={require('../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json')}
              style={{ width: 36, height: 36 }}
              autoPlay loop speed={0.8}
            />
          </View>
          <Text style={{ fontFamily: 'Heebo_500Medium', color: '#1d4ed8', fontSize: 15 }}>כבר יש לי בסיס, דלג לפרק 1</Text>
          <FastForward size={16} color="#1d4ed8" />
        </AnimatedPressable>
      )}

      <View style={{ marginTop: 16, marginBottom: 28, position: "relative" }}>
        {/* Path decorations disabled temporarily */}

        {chapter.modules.map((module, i) => {
          const isActive = isUnlocked && i === activeIndex;

          // Coming-soon modules are always locked regardless of user state
          const isModuleComingSoon = !!module.comingSoon;

          // State is determined by POSITION, not stored data alone.
          // This prevents stale completions from coloring modules out of order.
          // PRO users see all modules as "active" (unlocked) — not locked visually.
          const state: "completed" | "active" | "locked" =
            isModuleComingSoon ? "locked" :
              isActive ? "active" :
                (isUnlocked && i < activeIndex && completedModules.includes(module.id)) ? "completed" :
                  (isPro && isUnlocked) ? "active" :
                    "locked";

          // Interaction: PRO can access all modules in unlocked chapters
          const isLocked = isModuleComingSoon || !isUnlocked || (!isPro && state === "locked");

          const hasNext = i < chapter.modules.length - 1;
          const colors = ARENA_COLORS[arena.id];
          const nodeType = getNodeType(i, chapter.modules.length);
          // Trail is golden only up to the active module
          const trailDone = isUnlocked && i < activeIndex;

          const showQuestBox = !!questPathNodeProps && hasNext && (i + 1) % 3 === 0;
          const questOffsetX = -getNodeOffset(i);

          return (
            <View key={module.id}>
              <ModuleNode
                module={module}
                state={state}
                offsetX={getNodeOffset(i)}
                arenaId={arena.id}
                showCharacter={isActive}
                nodeType={nodeType}
                modIndex={i}
                isProLocked={!isPro && PRO_LOCKED_SIMS.has(module.id)}
                isComingSoon={!!module.comingSoon}
                isLastModule={i === chapter.modules.length - 1}
                displayName={displayName}
                friendEmojis={friendsOnModule[module.id]}
                hasEasterEgg={easterEggNodeId === module.id}
                onClaimEasterEgg={onClaimEasterEgg}
                onPress={() => {
                  if (isLocked) {
                    onLockedPress();
                  } else {
                    onModulePress(module.id, chapter.id, i);
                  }
                }}
              />
              {showQuestBox && questPathNodeProps && (
                <>
                  <PathConnector
                    fromOffsetX={getNodeOffset(i)}
                    toOffsetX={questOffsetX}
                    done={trailDone}
                    color={colors.glow}
                  />
                  <QuestPathNode
                    offsetX={questOffsetX}
                    completedCount={questPathNodeProps.completedCount}
                    totalQuests={questPathNodeProps.totalQuests}
                    allCompleted={questPathNodeProps.allCompleted}
                    rewardClaimed={questPathNodeProps.rewardClaimed}
                    onPress={questPathNodeProps.onPress}
                  />
                  <PathConnector
                    fromOffsetX={questOffsetX}
                    toOffsetX={getNodeOffset(i + 1)}
                    done={trailDone && questPathNodeProps.rewardClaimed}
                    color={colors.glow}
                  />
                </>
              )}
              {hasNext && !showQuestBox && (
                <PathConnector
                  fromOffsetX={getNodeOffset(i)}
                  toOffsetX={getNodeOffset(i + 1)}
                  done={trailDone}
                  color={colors.glow}
                />
              )}
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
});

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function DuoLearnScreen() {
  const router = useRouter();
  const isWalkthroughActive = !useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const walkthroughScreen = useTutorialStore((s) => s.walkthroughActiveScreen);
  const xp = useEconomyStore((s) => s.xp);
  const streak = useEconomyStore((s) => s.streak);
  const progress = useChapterStore((s) => s.progress);
  const isPro = useSubscriptionStore((s) => s.tier === "pro" && s.status === "active");
  const displayName = useAuthStore((s) => s.displayName) ?? "";
  const { layer } = getPyramidStatus(xp);
  const [lockedModalVisible, setLockedModalVisible] = useState(false);
  const [showStreakCalendar, setShowStreakCalendar] = useState(false);
  const [roadmapVisible, setRoadmapVisible] = useState(false);
  const [mindMapChapter, setMindMapChapter] = useState<number | null>(null);
  const [replayModule, setReplayModule] = useState<{ moduleId: string; chapterId: string; moduleIndex: number } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const isFirstMount = useRef(true);

  const setCurrentChapter = useChapterStore((s) => s.setCurrentChapter);
  const setCurrentModule = useChapterStore((s) => s.setCurrentModule);
  const skipIntroChapter = useChapterStore((s) => s.skipIntroChapter);
  const { nudge, dismiss: dismissNudge } = useFeedNudge();
  const dilemmaAnswered = useDailyChallengesStore((s) => s.hasDilemmaAnsweredToday());
  const [questSheetVisible, setQuestSheetVisible] = useState(false);
  const refreshQuests = useDailyQuestsStore((s) => s.refreshQuests);
  const syncQuestCompletions = useDailyQuestsStore((s) => s.syncCompletions);
  const questCompletedCount = useDailyQuestsStore((s) => s.completedCount());
  const questTotalCount = useDailyQuestsStore((s) => s.quests.length);
  const questAllCompleted = useDailyQuestsStore((s) => s.allCompleted());
  const questRewardClaimed = useDailyQuestsStore((s) => s.rewardClaimed);

  useEffect(() => {
    refreshQuests();
  }, [refreshQuests]);

  useFocusEffect(
    useCallback(() => {
      syncQuestCompletions();
    }, [syncQuestCompletions]),
  );

  // Build moduleId → friend emojis map for showing friend avatars on nodes
  const referredFriends = useReferralStore((s) => s.referredFriends);
  const friendsOnModule = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const f of referredFriends) {
      if (f.currentModuleId) {
        if (!map[f.currentModuleId]) map[f.currentModuleId] = [];
        map[f.currentModuleId].push(f.avatarEmoji);
      }
    }
    return map;
  }, [referredFriends]);

  // Easter egg coin state
  const easterEggNodeId = useFunStore((s) => s.easterEggNodeId);
  const rollEasterEgg = useFunStore((s) => s.rollEasterEgg);
  const claimEasterEgg = useFunStore((s) => s.claimEasterEgg);
  const addCoins = useEconomyStore((s) => s.addCoins);
  const [showEasterEggReward, setShowEasterEggReward] = useState<"xp" | "coins" | null>(null);

  // Roll Easter egg on screen focus (20% chance to place coin on a completed node)
  useFocusEffect(
    useCallback(() => {
      const allCompleted: string[] = [];
      for (const ch of ALL_CHAPTERS) {
        const done = progress[storeKey(ch.id)]?.completedModules ?? [];
        allCompleted.push(...done);
      }
      if (allCompleted.length > 0) {
        rollEasterEgg(allCompleted);
      }
    }, [progress, rollEasterEgg])
  );

  const [showScratchModal, setShowScratchModal] = useState(false);

  const handleClaimEasterEgg = useCallback(() => {
    claimEasterEgg();
    setShowScratchModal(true);
  }, [claimEasterEgg]);

  const handleScratchComplete = useCallback(() => {
    setShowScratchModal(false);
    addCoins(50);
    successHaptic();
    setShowEasterEggReward("coins");
  }, [addCoins]);

  // Scroll to top + refresh content on every tab focus
  useFocusEffect(
    useCallback(() => {
      // refreshQuests(); syncQuestCompletions(); — disabled temporarily
      if (isFirstMount.current) {
        isFirstMount.current = false;
        return;
      }
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      setRefreshKey((k) => k + 1);
    }, [])
  );

  // Auto-scroll to the active module (Finn position) on mount
  useEffect(() => {
    let y = 150; // approximate greeting + DailyIncomeCard + top padding
    for (let chIdx = 0; chIdx < ALL_CHAPTERS.length; chIdx++) {
      const ch = ALL_CHAPTERS[chIdx];
      const done = progress[storeKey(ch.id)]?.completedModules ?? [];

      let unlocked = isPro || chIdx === 0;
      if (!isPro && chIdx > 0) {
        const prev = ALL_CHAPTERS[chIdx - 1];
        const prevDone = progress[storeKey(prev.id)]?.completedModules ?? [];
        unlocked = prev.modules.every((m) => m.comingSoon || (!isPro && PRO_LOCKED_SIMS.has(m.id)) || prevDone.includes(m.id));
      }
      if (!unlocked) break;

      const activeIdx = ch.modules.findIndex((m) => !done.includes(m.id) && !m.comingSoon && (isPro || !PRO_LOCKED_SIMS.has(m.id)));
      if (activeIdx >= 0) {
        y += 80; // banner height
        y += 16; // marginTop
        y += activeIdx * 160; // approximate row + connector per module
        break;
      }
      // Entire chapter completed — add its total height
      y += 80 + 44; // banner + container margins
      y += ch.modules.length * 160;
    }

    if (y > 300) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: y - 80, animated: false });
      }, 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open roadmap modal during walkthrough lesson-preview step
  useEffect(() => {
    if (walkthroughScreen === 'lesson-preview') {
      setRoadmapVisible(true);
    }
  }, [walkthroughScreen]);

  // Slow auto-scroll during walkthrough learn step so user sees there's more content
  useEffect(() => {
    if (walkthroughScreen !== 'learn') return;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    let y = 0;
    let interval: ReturnType<typeof setInterval> | null = null;
    const delay = setTimeout(() => {
      interval = setInterval(() => {
        y += 80;
        scrollRef.current?.scrollTo({ y, animated: true });
        if (y >= 800 && interval) clearInterval(interval);
      }, 1500);
    }, 1000);
    return () => {
      clearTimeout(delay);
      if (interval) clearInterval(interval);
    };
  }, [walkthroughScreen]);

  const handleModulePress = useCallback(
    (moduleId: string, chapterId: string, moduleIndex: number) => {
      // Check if module is already completed — show summary preview first
      const chKey = storeKey(chapterId);
      const done = progress[chKey]?.completedModules ?? [];
      if (done.includes(moduleId)) {
        setReplayModule({ moduleId, chapterId, moduleIndex });
        return;
      }
      setCurrentChapter(chKey);
      setCurrentModule(moduleIndex);
      router.push(`/lesson/${moduleId}?chapterId=${chapterId}` as never);
    },
    [router, setCurrentChapter, setCurrentModule, progress],
  );

  const handleReplay = useCallback(() => {
    if (!replayModule) return;
    setCurrentChapter(storeKey(replayModule.chapterId));
    setCurrentModule(replayModule.moduleIndex);
    router.push(`/lesson/${replayModule.moduleId}?chapterId=${replayModule.chapterId}&replay=1` as never);
    setReplayModule(null);
  }, [replayModule, router, setCurrentChapter, setCurrentModule]);

  const handleSkipIntro = useCallback(() => {
    skipIntroChapter(chapter0Data.modules.map(m => m.id));
    setTimeout(() => {
      // scroll down to let the user see chapter 1 unlocked
      scrollRef.current?.scrollTo({ y: 800, animated: true });
    }, 300);
  }, [skipIntroChapter]);

  // Stable callbacks for ChapterSection (avoids inline arrow re-creation per render)
  const handleLockedPress = useCallback(() => setLockedModalVisible(true), []);
  const handleRoadmapPress = useCallback(() => setRoadmapVisible(true), []);
  const handleQuestPress = useCallback(() => setQuestSheetVisible(true), []);
  const handleMindMap = useCallback((idx: number) => { tapHaptic(); setMindMapChapter(idx); }, []);

  return (
    <View style={styles.root}>
      {!isWalkthroughActive && <NotificationPermissionBanner />}
      {!isWalkthroughActive && <StreakAtRiskBanner />}
      {!isWalkthroughActive && <NoFreezeUpsellBanner />}
      <StreakCalendarModal visible={showStreakCalendar} onClose={() => setShowStreakCalendar(false)} />
      <SafeAreaView style={{ flex: 1 }} edges={["left", "right"]}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >

          {/* Header Row: Greeting+Finn (Right) | Streak (Left) */}
          <View style={[styles.greetingRow, { justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 }]}>
            {/* Right side: Greeting + Finn */}
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
              <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 56, height: 56 }} contentFit="contain" />
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.greetingText, { fontSize: 15, color: "#64748b" }]}>
                  {getGreeting()}
                </Text>
                <Text style={[styles.greetingText, { fontSize: 20, color: "#0f172a" }]}>
                  {displayName || "אורח"}
                </Text>
              </View>
            </View>

            {/* Left side: Quest Widget + Streak Flame + Calendar */}
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
              {questTotalCount > 0 && (
                <DailyQuestWidget
                  completedCount={questCompletedCount}
                  totalQuests={questTotalCount}
                  onPress={handleQuestPress}
                />
              )}
            <Pressable
              onPress={() => { tapHaptic(); setShowStreakCalendar(true); }}
              style={{ alignItems: "center", flexDirection: "row-reverse", gap: 4 }}
              accessibilityRole="button"
              accessibilityLabel={`רצף ${streak} ימים — פתח לוח שנה`}
            >
              <View style={{ width: 36, height: 36 }} accessible={false}>
                <LottieView
                  source={require("../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json")}
                  style={{ width: 36, height: 36 }}
                  autoPlay
                  loop
                  colorFilters={[{ keypath: "**", color: streak >= 8 ? "#a855f7" : streak >= 4 ? "#3b82f6" : "#f97316" }]}
                />
              </View>
              <Text style={{ fontSize: 18, fontWeight: "900", color: streak >= 8 ? "#a855f7" : streak >= 4 ? "#3b82f6" : "#f97316" }}>
                {streak}
              </Text>
              <CalendarDays size={16} color={streak >= 8 ? "#a855f7" : streak >= 4 ? "#3b82f6" : "#f97316"} style={{ opacity: 0.7 }} />
            </Pressable>
            </View>
          </View>

          {/* Chapter sections */}
          {ARENAS.map((arena, idx) => {
            const chapter = ALL_CHAPTERS[idx];
            const completedModules = progress[storeKey(chapter.id)]?.completedModules ?? [];

            // PRO: everything open. Free: unit unlocks only after ALL modules of previous unit completed.
            // Unit 1 is always unlocked.
            let isUnlocked = isPro || idx === 0;
            if (!isPro && idx > 0) {
              const prevChapter = ALL_CHAPTERS[idx - 1];
              const prevCompleted = progress[storeKey(prevChapter.id)]?.completedModules ?? [];
              isUnlocked = prevChapter.modules.every((m) => m.comingSoon || (!isPro && PRO_LOCKED_SIMS.has(m.id)) || prevCompleted.includes(m.id));
            }

            // Show quest widget on the chapter that has the active (first incomplete) module
            const hasActiveModule = isUnlocked && chapter.modules.some(
              (m, i) => !completedModules.includes(m.id) && !m.comingSoon && (isPro || !PRO_LOCKED_SIMS.has(m.id))
            );

            const chapterView = (
              <ChapterSection
                key={arena.id}
                arena={arena}
                chapter={chapter}
                completedModules={completedModules}
                isUnlocked={isUnlocked}
                isPro={isPro}
                sectionIndex={idx}
                displayName={displayName}
                onModulePress={handleModulePress}
                onLockedPress={handleLockedPress}
                friendsOnModule={friendsOnModule}
                easterEggNodeId={easterEggNodeId}
                onClaimEasterEgg={handleClaimEasterEgg}
                onSkipIntro={idx === 0 ? handleSkipIntro : undefined}
                onChapterPress={handleRoadmapPress}
                onMindMap={() => handleMindMap(idx)}
                questPathNodeProps={hasActiveModule ? {
                  completedCount: questCompletedCount,
                  totalQuests: questTotalCount,
                  allCompleted: questAllCompleted,
                  rewardClaimed: questRewardClaimed,
                  onPress: handleQuestPress,
                } : undefined}
              />
            );

            if (idx === 5) {
              return (
                <View key={arena.id} style={{ position: 'relative', zIndex: 1 }}>
                  {/* Organic Ocean Depth - Fades in seamlessly from white to bright ocean at the bottom */}
                  <View pointerEvents="none" style={{ position: 'absolute', top: -500, bottom: -240, left: -H_PAD, width: SCREEN_W, zIndex: -1 }}>
                    
                    {/* The Image feeling of depth. It's brighter as requested (0.65 opacity) */}
                    <Image
                      source={{ uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/LEARNPAGE.png' }}
                      style={{ width: '100%', height: '100%', opacity: 0.65 }}
                      resizeMode="cover"
                      accessible={false}
                    />

                    {/* Top Mask: Fades perfectly from solid white (matching screen bg) to transparent. 
                        This completely eliminates any hard horizontal line cut at the top. 
                        It reveals the image gradually so the depth appears specifically around the middle of Chapter 5. */}
                    <LinearGradient
                      colors={['#ffffff', 'rgba(255,255,255,0.95)', 'rgba(255,255,255,0.5)', 'transparent']}
                      locations={[0, 0.4, 0.75, 1]}
                      style={{ position: 'absolute', top: -2, width: '100%', height: 1100 }}
                    />

                    {/* Bottom Mask: Fuses the image bottom into a smooth, bright cyan/ocean color so it ends smoothly */}
                    <LinearGradient
                      colors={['transparent', 'rgba(14,165,233,0.3)', '#0284c7']}
                      locations={[0, 0.6, 1]}
                      style={{ position: 'absolute', bottom: -2, width: '100%', height: 600 }}
                    />
                  </View>
                  {chapterView}
                </View>
              );
            }

            return <View key={arena.id} style={{ zIndex: 2 }}>{chapterView}</View>;
          })}


        </ScrollView>

        {/* Floating scroll-to-bottom button */}
        <AnimatedPressable
          style={styles.scrollFAB}
          onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
          accessibilityRole="button"
          accessibilityLabel="גלול לסוף"
        >
          <ChevronDown size={22} color="#1d4ed8" strokeWidth={2.5} />
        </AnimatedPressable>

        <LockedModuleModal
          visible={lockedModalVisible}
          onClose={() => setLockedModalVisible(false)}
        />

        <MapEasterEggModal
          visible={showScratchModal}
          onClose={() => setShowScratchModal(false)}
          onClaim={handleScratchComplete}
        />

        {/* Mind Map Viewer */}
        {mindMapChapter !== null && (
          <MindMapViewer
            visible
            onClose={() => setMindMapChapter(null)}
            data={MIND_MAP_DATA[mindMapChapter]}
            chapterTitle={ARENAS[mindMapChapter]?.name ?? ''}
            accentColor={ARENA_COLORS[mindMapChapter]?.bg ?? '#3b82f6'}
          />
        )}

        {/* Completed module replay modal — shows summary infographic */}
        {replayModule && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setReplayModule(null)} accessibilityViewIsModal>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f9ff' }} edges={["top", "bottom"]}>
              {/* Header with close button */}
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 8 }}>
                <AnimatedPressable
                  onPress={() => setReplayModule(null)}
                  style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={20} color="#64748b" />
                </AnimatedPressable>
              </View>

              {/* Summary infographic */}
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
                {PORTRAIT_SUMMARY_URLS[replayModule.moduleId] ? (
                  <Image
                    source={{ uri: PORTRAIT_SUMMARY_URLS[replayModule.moduleId] }}
                    style={{ width: '95%', height: '85%', borderRadius: 16 }}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a', writingDirection: 'rtl' }}>מודולה הושלמה!</Text>
                  </View>
                )}
              </View>

              {/* Replay button */}
              <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
                <AnimatedPressable
                  onPress={handleReplay}
                  style={{
                    backgroundColor: '#3b82f6',
                    borderRadius: 16,
                    paddingVertical: 18,
                    alignItems: 'center',
                    borderBottomWidth: 4,
                    borderBottomColor: '#1d4ed8',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '900' }}>לבצע שוב</Text>
                </AnimatedPressable>
              </View>
            </SafeAreaView>
          </Modal>
        )}

        <DailyQuestsSheet visible={questSheetVisible} onClose={() => setQuestSheetVisible(false)} />

        {/* Learning Roadmap Modal */}
        <Modal visible={roadmapVisible} transparent animationType="fade" onRequestClose={() => setRoadmapVisible(false)} accessibilityViewIsModal>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 }} onPress={() => setRoadmapVisible(false)} accessibilityRole="button" accessibilityLabel="סגור מסלול הלמידה">
            <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: 380, backgroundColor: "#ffffff", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 }} accessibilityLabel="תוכן מסלול הלמידה">
              {/* Title */}
              <Text style={{ fontSize: 20, fontFamily: "Heebo_700Bold", color: "#0f172a", textAlign: "center", marginBottom: 6, writingDirection: "rtl" }}>
                מסלול הלמידה שלך
              </Text>
              <Text style={{ fontSize: 13, fontFamily: "Heebo_400Regular", color: "#64748b", textAlign: "center", marginBottom: 20, writingDirection: "rtl" }}>
                6 פרקים מהבסיס ועד חופש כלכלי
              </Text>

              {/* Chapters list */}
              {ARENAS.map((arena, idx) => {
                const ch = ALL_CHAPTERS[idx];
                const done = progress[storeKey(ch.id)]?.completedModules ?? [];
                const totalModules = ch.modules.filter(m => !m.comingSoon).length;
                const completedCount = done.length;
                const isComplete = completedCount >= totalModules;

                let chapterUnlocked = isPro || idx === 0;
                if (!isPro && idx > 0) {
                  const prev = ALL_CHAPTERS[idx - 1];
                  const prevDone = progress[storeKey(prev.id)]?.completedModules ?? [];
                  chapterUnlocked = prev.modules.every((m) => m.comingSoon || (!isPro && PRO_LOCKED_SIMS.has(m.id)) || prevDone.includes(m.id));
                }

                const colors = ARENA_COLORS[arena.id];
                const isCurrent = chapterUnlocked && !isComplete;

                return (
                  <View key={arena.id} style={{ flexDirection: "row-reverse", alignItems: "center", marginBottom: idx < ARENAS.length - 1 ? 0 : 0 }}>
                    {/* Timeline dot + line */}
                    <View style={{ alignItems: "center", width: 32 }}>
                      <View style={{
                        width: isCurrent ? 20 : 14,
                        height: isCurrent ? 20 : 14,
                        borderRadius: isCurrent ? 10 : 7,
                        backgroundColor: isComplete ? "#22c55e" : isCurrent ? colors.bg : "#e2e8f0",
                        borderWidth: isCurrent ? 3 : 0,
                        borderColor: isCurrent ? `${colors.bg}40` : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        {isComplete && <Text style={{ fontSize: 8, color: "#fff" }}>✓</Text>}
                      </View>
                      {idx < ARENAS.length - 1 && (
                        <View style={{ width: 2, height: 36, backgroundColor: isComplete ? "#bbf7d0" : "#e2e8f0", marginVertical: 2 }} />
                      )}
                    </View>

                    {/* Chapter info card */}
                    <View style={{
                      flex: 1,
                      backgroundColor: isCurrent ? `${colors.bg}10` : "#fafafa",
                      borderRadius: 14,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      marginRight: 8,
                      borderWidth: isCurrent ? 1.5 : 1,
                      borderColor: isCurrent ? `${colors.bg}30` : "#f1f5f9",
                    }}>
                      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                        <Text style={{ fontSize: 20 }}>{arena.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            fontSize: 15,
                            fontFamily: isCurrent ? "Heebo_700Bold" : "Heebo_500Medium",
                            color: chapterUnlocked ? "#0f172a" : "#64748b",
                            writingDirection: "rtl",
                            textAlign: "right",
                          }}>
                            {arena.name}
                          </Text>
                          <Text style={{
                            fontSize: 12,
                            fontFamily: "Heebo_400Regular",
                            color: chapterUnlocked ? "#64748b" : "#94a3b8",
                            writingDirection: "rtl",
                            textAlign: "right",
                          }}>
                            {arena.subtitle}
                          </Text>
                        </View>
                        {!chapterUnlocked && <Lock size={14} color="#94a3b8" />}
                      </View>

                      {/* Progress bar for current/completed */}
                      {chapterUnlocked && (
                        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6, marginTop: 6 }}>
                          <View style={{ flex: 1, height: 4, backgroundColor: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                            <View style={{
                              width: `${totalModules > 0 ? (completedCount / totalModules) * 100 : 0}%`,
                              height: "100%",
                              backgroundColor: isComplete ? "#22c55e" : colors.bg,
                              borderRadius: 2,
                            }} />
                          </View>
                          <Text style={{ fontSize: 11, fontFamily: "Heebo_400Regular", color: "#64748b" }}>
                            {completedCount}/{totalModules}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}

              {/* Close button */}
              <Pressable onPress={() => setRoadmapVisible(false)} style={{ marginTop: 18, alignSelf: "center", paddingHorizontal: 32, paddingVertical: 10, backgroundColor: "#f0f9ff", borderRadius: 20, borderWidth: 1, borderColor: "#bae6fd" }} accessibilityRole="button" accessibilityLabel="סגור">
                <Text style={{ fontSize: 14, fontFamily: "Heebo_500Medium", color: "#0284c7" }}>סגור</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Easter egg claim flying rewards */}
        {showEasterEggReward === "coins" && (
          <FlyingRewards type="coins" amount={50} onComplete={() => setShowEasterEggReward(null)} />
        )}

        {/* Feed engagement nudge — hidden during walkthrough */}
        <FeedNudgeBanner
          message={nudge?.message ?? ""}
          visible={!!nudge && !isWalkthroughActive}
          onPress={() => {
            if (nudge) router.push(nudge.route as never);
            dismissNudge();
          }}
          onDismiss={dismissNudge}
        />
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingBottom: 120,
    paddingTop: 4,
  },
  greetingRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  greetingText: {
    fontSize: 19,
    fontWeight: "700",
    color: "#0ea5e9",
    writingDirection: "rtl",
    textAlign: "center",
    textShadowColor: "transparent",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },

  // Section banner
  bannerCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  bannerSection: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 3,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 3,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  bannerSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bannerNotebook: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },

  // Node row
  nodeRow: {
    width: "100%",
    position: "relative",
    marginBottom: 4,
    overflow: "visible",
  },
  nodeCol: {
    position: "absolute",
    top: 0,
    alignItems: "center",
  },

  // 3D depth block behind node
  nodeDepth: {
    width: NODE_SIZE,
    height: NODE_SIZE + 5,
    borderRadius: NODE_SIZE / 2,
    position: "absolute",
    top: 5, // slightly below the circle to create depth
  },

  nodeCircle: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  nodeIcon: {
    fontSize: 28,
    textAlign: "center",
    includeFontPadding: false,
  },
  proBadge: {
    position: "absolute",
    top: -14,
    right: -14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  proLottie: {
    width: 44,
    height: 44,
    zIndex: 20,
    borderWidth: 1.5,
    borderColor: "#eab308",
  },
  proBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#1a1035",
  },
  comingSoonBadge: {
    position: "absolute",
    bottom: -8,
    alignSelf: "center",
    backgroundColor: "#6b7280",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 20,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
  },
  nodeLabelSide: {
    position: "absolute",
    top: NODE_SIZE / 2 - 10,
    alignItems: "flex-end",
  },
  nodeLabelPill: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: "#e0e7ff",
    maxWidth: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
  },
  nodeLabelText: {
    fontSize: 13,
    color: "#374151",
    textAlign: "center",
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.18)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Finn mascot
  characterWrapper: {
    position: "absolute",
    top: 10,
    zIndex: 20,
    alignItems: "center",
  },
  speechBubbleBelow: {
    position: "absolute",
    zIndex: 21,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: "#bae6fd",
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    width: 140,
  },
  speechText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0369a1",
    writingDirection: "rtl",
    textAlign: "center",
    lineHeight: 15,
  },
  speechArrow: {
    position: "absolute",
    bottom: -7,
    alignSelf: "center",
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#ffffff",
  },

  // Floating scroll-to-bottom button
  scrollFAB: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderColor: "#e5e7eb",
    padding: 28,
    paddingBottom: 48,
    alignItems: "center",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d1d5db",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1f2937",
    marginBottom: 10,
    textAlign: "center",
  },
  modalBody: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalCTA: {
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 12,
    width: "100%",
    shadowColor: "#0a2540",
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  modalCTAGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  modalCTAText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#facc15",
    writingDirection: "rtl",
  },
  friendAvatarRow: {
    position: "absolute",
    top: 38,
    flexDirection: "row",
    gap: 2,
  },
  friendAvatarDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.85)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.3)",
  },
  friendAvatarEmoji: {
    fontSize: 11,
  },
});
