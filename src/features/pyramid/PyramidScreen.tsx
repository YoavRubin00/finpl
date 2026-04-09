import React, { useCallback, useEffect } from "react";
import { ScrollView, View, Text, Dimensions, Alert, Pressable, StyleSheet } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import Svg, { Line } from 'react-native-svg';
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  FadeInDown,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, CheckCircle2 } from "lucide-react-native";
import { useChapterStore } from "../chapter-1-content/useChapterStore";
import { DailyChallengePrompt } from "./DailyChallengePrompt";
import { DailyIncomeCard } from "../assets/DailyIncomeCard";
import { PostStreakIncomeSplash } from "../assets/PostStreakIncomeSplash";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { GlowCard } from "../../components/ui/GlowCard";
import { ARENAS } from "./arenaConfig";
import { chapter1Data } from "../chapter-1-content/chapter1Data";
import { chapter2Data } from "../chapter-2-content/chapter2Data";
import { chapter3Data } from "../chapter-3-content/chapter3Data";
import { chapter4Data } from "../chapter-4-content/chapter4Data";
import { chapter5Data } from "../chapter-5-content/chapter5Data";
import LottieView from "lottie-react-native";
import { DecorationOverlay } from "../../components/ui/DecorationOverlay";
import type { AnimationObject } from "lottie-react-native";
import type { Module } from "../chapter-1-content/types";
import { useTheme } from "../../hooks/useTheme";

type LottieSource = AnimationObject | { uri: string } | string;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const NODE_SIZE = 68;
const NODE_AREA = SCREEN_WIDTH - 40 - NODE_SIZE; // available horizontal space

// Zigzag offsets as fraction of NODE_AREA (0 = left, 1 = right)
const ZIGZAG = [0.5, 0.28, 0.05, 0.22, 0.5, 0.72, 0.9, 0.68, 0.5];

// Trail geometry — must match nodeWrapper marginBottom (20) + circle (68) + title (~34)
const SLOT_HEIGHT = NODE_SIZE + 54; // ≈ 122 px per node slot
const TRAIL_WIDTH = SCREEN_WIDTH - 40; // full nodesArea width

function nodeCenterX(i: number): number {
  return ZIGZAG[i % ZIGZAG.length] * NODE_AREA + (NODE_SIZE + 60) / 2;
}
function nodeCenterY(i: number): number {
  return i * SLOT_HEIGHT + NODE_SIZE / 2;
}

// Animated Lottie icons per node index (cycles through 9 icons)
const NODE_LOTTIE_SOURCES: LottieSource[] = [
  require('../../../assets/lottie/wired-flat-3140-book-open-hover-pinch.json') as LottieSource,
  require('../../../assets/lottie/wired-flat-967-questionnaire-hover-pinch.json') as LottieSource,
  require('../../../assets/lottie/wired-flat-974-process-flow-game-plan-hover-pinch.json') as LottieSource,
  require('../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json') as LottieSource,
  require('../../../assets/lottie/wired-flat-433-cup-prize-hover-roll.json') as LottieSource,
  require('../../../assets/lottie/wired-flat-36-bulb-hover-blink.json') as LottieSource,
  require('../../../assets/lottie/wired-flat-152-bar-chart-arrow-hover-growth.json') as LottieSource,
  require('../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json') as LottieSource,
  require('../../../assets/lottie/wired-flat-2258-online-learning-hover-pinch.json') as LottieSource,
];

// Background decoration Lotties — larger, faded, behind each node
const BG_DECO_SOURCES: LottieSource[] = [
  require('../../../assets/lottie/wired-flat-291-coin-dollar-hover-pinch.json') as LottieSource,
  require('../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json') as LottieSource,
  require('../../../assets/lottie/wired-flat-804-sun-hover-rays.json') as LottieSource,
  require('../../../assets/lottie/wired-flat-237-star-rating-hover-pinch.json') as LottieSource,
  require('../../../assets/lottie/wired-flat-782-compass-hover-pinch.json') as LottieSource,
  require('../../../assets/lottie/wired-flat-443-tree-hover-pinch.json') as LottieSource,
  require('../../../assets/lottie/wired-flat-36-bulb-hover-blink.json') as LottieSource,
  require('../../../assets/lottie/wired-flat-298-coins-hover-jump.json') as LottieSource,
  require('../../../assets/lottie/wired-flat-161-growth-hover-pinch.json') as LottieSource,
];

// Animated Lottie icons per arena (chapter banner)
const ARENA_LOTTIE_SOURCES: Record<number, LottieSource> = {
  1: require('../../../assets/lottie/wired-flat-412-gift-hover-squeeze.json') as LottieSource,
  2: require('../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json') as LottieSource,
  3: require('../../../assets/lottie/wired-flat-161-growth-hover-pinch.json') as LottieSource,
  4: require('../../../assets/lottie/wired-flat-152-bar-chart-arrow-hover-growth.json') as LottieSource,
  5: require('../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json') as LottieSource,
};

// Chapter data lookup
const CHAPTER_MAP: Record<string, { storeId: string; modules: Module[] }> = {
  "chapter-1": { storeId: "ch-1", modules: chapter1Data.modules },
  "chapter-2": { storeId: "ch-2", modules: chapter2Data.modules },
  "chapter-3": { storeId: "ch-3", modules: chapter3Data.modules },
  "chapter-4": { storeId: "ch-4", modules: chapter4Data.modules },
  "chapter-5": { storeId: "ch-5", modules: chapter5Data.modules },
};

// -------------------------------------------------------------------
// TrailConnector — SVG winding path behind module nodes
// -------------------------------------------------------------------
interface TrailConnectorProps {
  moduleCount: number;
  firstUncompletedIndex: number; // segments before this index are "done"
  arenaColor: string;
}

function TrailConnector({ moduleCount, firstUncompletedIndex, arenaColor }: TrailConnectorProps) {
  const theme = useTheme();
  if (moduleCount < 2) return null;
  const svgHeight = moduleCount * SLOT_HEIGHT;

  const segments: React.JSX.Element[] = [];
  for (let i = 0; i < moduleCount - 1; i++) {
    const x1 = nodeCenterX(i);
    const y1 = nodeCenterY(i);
    const x2 = nodeCenterX(i + 1);
    const y2 = nodeCenterY(i + 1);
    const isDone = i < firstUncompletedIndex;
    const color = isDone ? arenaColor : theme.border;
    const strokeWidth = isDone ? 5 : 4;

    segments.push(
      // Shadow line
      <Line
        key={`shadow-${i}`}
        x1={x1}
        y1={y1 + 3}
        x2={x2}
        y2={y2 + 3}
        stroke={isDone ? arenaColor + "44" : "#00000011"}
        strokeWidth={strokeWidth + 4}
        strokeLinecap="round"
      />,
      // Main line
      <Line
        key={`line-${i}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={isDone ? undefined : "8 6"}
      />,
    );
  }

  return (
    <Svg
      width={TRAIL_WIDTH}
      height={svgHeight}
      style={{ position: "absolute", top: 0, left: 0 }}
      pointerEvents="none"
    >
      {segments}
    </Svg>
  );
}

// -------------------------------------------------------------------
// SectionBanner — colored arena header card
// -------------------------------------------------------------------
interface SectionBannerProps {
  arenaId: number;
  name: string;
  subtitle: string;
  gradientFrom: string;
  gradientTo: string;
  completedCount: number;
  total: number;
  isActive: boolean;
  onPress: () => void;
}

function SectionBanner({
  arenaId,
  name,
  subtitle,
  gradientFrom,
  gradientTo,
  completedCount,
  total,
  isActive,
  onPress,
}: SectionBannerProps) {
  const theme = useTheme();
  const arenaLottie = ARENA_LOTTIE_SOURCES[arenaId];
  return (
    <Pressable onPress={onPress} style={styles.banner}>
      {isActive ? (
        <LinearGradient
          colors={[gradientFrom, gradientTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.bannerGradient}
        >
          <View style={styles.bannerContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerLabel}>זירה {arenaId} · {subtitle}</Text>
              <Text style={styles.bannerTitle}>{name}</Text>
            </View>
            <View style={styles.bannerRight}>
              {arenaLottie && (
                <LottieView source={arenaLottie} style={{ width: 52, height: 52 }} autoPlay loop />
              )}
              <Text style={styles.bannerProgress}>{completedCount}/{total} הושלמו</Text>
            </View>
          </View>
          {/* Shine stripe */}
          <View style={styles.bannerShine} />
        </LinearGradient>
      ) : (
        <View style={[styles.bannerGradient, { backgroundColor: theme.border }]}>
          <View style={styles.bannerContent}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerLabel, { color: theme.textMuted }]}>זירה {arenaId} · נעולה</Text>
              <Text style={[styles.bannerTitle, { color: theme.textMuted }]}>{name}</Text>
            </View>
            <Lock size={24} color={theme.textMuted} />
          </View>
        </View>
      )}
    </Pressable>
  );
}

// -------------------------------------------------------------------
// ModuleNode — single circular lesson button
// -------------------------------------------------------------------
interface ModuleNodeProps {
  mod: Module;
  nodeIndex: number; // position in chapter (for icon + zigzag)
  globalIndex: number; // for entrance animation delay
  isCompleted: boolean;
  isCurrent: boolean;
  isLocked: boolean;
  arenaColor: string; // glow/border color
  gradientFrom: string;
  gradientTo: string;
  onPress: () => void;
  active?: boolean;
}

const ModuleNode = React.memo(function ModuleNode({
  mod,
  nodeIndex,
  globalIndex,
  isCompleted,
  isCurrent,
  isLocked,
  arenaColor,
  gradientFrom,
  gradientTo,
  onPress,
  active = true,
}: ModuleNodeProps) {
  const theme = useTheme();
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (isCurrent) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 900 }),
          withTiming(1.0, { duration: 900 }),
        ),
        -1,
        false,
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 900 }),
          withTiming(0, { duration: 900 }),
        ),
        -1,
        false,
      );
    }
    return () => {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
    };
  }, [isCurrent]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const lottieSrc = NODE_LOTTIE_SOURCES[nodeIndex % NODE_LOTTIE_SOURCES.length];
  const xOffset = ZIGZAG[nodeIndex % ZIGZAG.length] * NODE_AREA;

  const title = mod.title.length > 22 ? mod.title.slice(0, 22) + "…" : mod.title;

  const bgDecoSrc = BG_DECO_SOURCES[nodeIndex % BG_DECO_SOURCES.length];

  return (
    <Animated.View
      entering={FadeInDown.delay(globalIndex * 40).springify().damping(14)}
      style={[styles.nodeWrapper, { marginLeft: xOffset }]}
    >
      {/* Faded background decoration Lottie */}
      {!isLocked && active && (
        <LottieView
          source={bgDecoSrc}
          style={styles.bgDecoLottie}
          autoPlay
          loop
          speed={0.3}
        />
      )}

      <AnimatedPressable onPress={onPress} disabled={false} style={{ alignItems: "center" }}>
        {/* Pulse ring (current only) */}
        {isCurrent && (
          <Animated.View
            style={[
              styles.pulseRing,
              { borderColor: arenaColor },
              pulseStyle,
            ]}
          />
        )}

        {/* Circle with 3D shadow */}
        <View style={styles.node3dShadow}>
          {isCompleted ? (
            <LinearGradient
              colors={[gradientFrom, gradientTo]}
              style={styles.nodeCircle}
            >
              <CheckCircle2 size={28} color="#ffffff" strokeWidth={2.5} />
            </LinearGradient>
          ) : isLocked ? (
            <View style={[styles.nodeCircle, styles.nodeCircleLocked, { backgroundColor: theme.border }]}>
              <LottieView source={lottieSrc} style={{ width: 36, height: 36 }} autoPlay loop />
            </View>
          ) : isCurrent ? (
            <LinearGradient
              colors={[gradientFrom, gradientTo]}
              style={[styles.nodeCircle, { borderWidth: 3, borderColor: "#ffffff" }]}
            >
              <LottieView source={lottieSrc} style={{ width: 36, height: 36 }} autoPlay loop />
            </LinearGradient>
          ) : (
            <LinearGradient
              colors={[gradientFrom, gradientTo]}
              style={styles.nodeCircle}
            >
              <LottieView source={lottieSrc} style={{ width: 36, height: 36 }} autoPlay loop />
            </LinearGradient>
          )}
        </View>

        {/* Title — bigger with text shadow */}
        <Text
          style={[
            styles.nodeTitle,
            { color: theme.text },
            isLocked && { color: theme.textMuted },
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
});

// -------------------------------------------------------------------
// PyramidScreen
// -------------------------------------------------------------------
export function PyramidScreen() {
  const isFocused = useIsFocused();
  const theme = useTheme();
  const router = useRouter();
  const progress = useChapterStore((s) => s.progress);
  const setCurrentChapter = useChapterStore((s) => s.setCurrentChapter);
  const setCurrentModule = useChapterStore((s) => s.setCurrentModule);

  const handleNodePress = useCallback(
    (mod: Module, modIndex: number, storeId: string, chapterId: string, isLocked: boolean) => {
      if (isLocked) {
        Alert.alert(
          "🔒 מודול נעול",
          "השלם את המודולים הקודמים כדי להמשיך. משתמשי PRO נהנים מגישה לכל המודולים!",
          [
            { text: "אשאר בסדר", style: "cancel" },
            {
              text: "🌟 שדרג ל-PRO",
              onPress: () => router.push("/pricing" as never),
            },
          ],
        );
        return;
      }
      setCurrentChapter(storeId);
      setCurrentModule(modIndex);
      router.push(`/lesson/${mod.id}?chapterId=${chapterId}` as never);
    },
    [router, setCurrentChapter, setCurrentModule],
  );

  let globalNodeIndex = 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <DecorationOverlay screenName="PyramidScreen" active={isFocused} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
      >
        <View style={{ paddingHorizontal: 20 }}>
          <DailyIncomeCard />
          <DailyChallengePrompt />
        </View>

        {ARENAS.map((arena, arenaIdx) => {
          const chapterId = arena.chapterRoute.replace("/chapter/", "");
          const chapterEntry = CHAPTER_MAP[chapterId];
          if (!chapterEntry) return null;

          const { storeId, modules } = chapterEntry;
          const completedModules = progress[storeId]?.completedModules ?? [];
          const completedCount = completedModules.length;
          // Active if first arena, or previous arena's chapter is fully completed
          const prevArena = arenaIdx > 0 ? ARENAS[arenaIdx - 1] : null;
          const prevEntry = prevArena ? CHAPTER_MAP[prevArena.chapterRoute.replace("/chapter/", "")] : null;
          const prevCompleted = prevEntry
            ? (progress[prevEntry.storeId]?.completedModules ?? []).length >= prevEntry.modules.length
            : true;
          const isActive = arenaIdx === 0 || prevCompleted;

          const firstUncompletedIndex = modules.findIndex(
            (m) => !completedModules.includes(m.id),
          );

          return (
            <View key={arena.id} style={styles.arenaSection}>
              {/* Section Banner */}
              <SectionBanner
                arenaId={arena.id}
                name={arena.name}
                subtitle={arena.subtitle}
                gradientFrom={arena.gradientFrom}
                gradientTo={arena.gradientTo}
                completedCount={completedCount}
                total={modules.length}
                isActive={isActive}
                onPress={() => router.push(arena.chapterRoute as never)}
              />

              {/* Module Nodes zigzag */}
              <View style={styles.nodesArea}>
                <TrailConnector
                  moduleCount={modules.length}
                  firstUncompletedIndex={firstUncompletedIndex === -1 ? modules.length : firstUncompletedIndex}
                  arenaColor={arena.gradientFrom}
                />
                {modules.map((mod, modIndex) => {
                  const isCompleted = completedModules.includes(mod.id);
                  const isCurrent = modIndex === firstUncompletedIndex;
                  const isLocked = modIndex > firstUncompletedIndex;
                  const gIdx = globalNodeIndex++;

                  return (
                    <ModuleNode
                      key={mod.id}
                      mod={mod}
                      nodeIndex={modIndex}
                      globalIndex={gIdx}
                      isCompleted={isCompleted}
                      isCurrent={isCurrent}
                      isLocked={isLocked}
                      arenaColor={arena.glow}
                      gradientFrom={arena.gradientFrom}
                      gradientTo={arena.gradientTo}
                      active={isFocused}
                      onPress={() =>
                        handleNodePress(mod, modIndex, storeId, chapterId, isLocked)
                      }
                    />
                  );
                })}
              </View>

              {/* Simulator branch after chapter 4 */}
              {arena.id === 4 && (
                <View style={{ alignItems: "center", marginBottom: 8, marginTop: 4 }}>
                  <GlowCard
                    glowColor="#eab308"
                    pressable
                    onPress={() => router.push("/(tabs)/simulator" as never)}
                  >
                    <View
                      style={{
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <LottieView
                        source={require("../../../assets/lottie/Money.json")}
                        style={{ width: 36, height: 36 }}
                        autoPlay
                        loop
                      />
                      <Text style={{ color: "#fef08a", fontWeight: "800", fontSize: 16 }}>
                        סימולטור השקעות
                      </Text>
                    </View>
                  </GlowCard>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      <PostStreakIncomeSplash />
    </View>
  );
}

// -------------------------------------------------------------------
// Styles
// -------------------------------------------------------------------
const styles = StyleSheet.create({
  arenaSection: {
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  banner: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bannerGradient: {
    borderRadius: 16,
    padding: 16,
    position: "relative",
    overflow: "hidden",
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bannerLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    writingDirection: "rtl",
    textAlign: "right",
  },
  bannerTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    writingDirection: "rtl",
    textAlign: "right",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bannerRight: {
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  bannerEmoji: {
    fontSize: 32,
  },
  bannerProgress: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "600",
  },
  bannerShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
  },
  nodesArea: {
    position: "relative",
    paddingBottom: 8,
  },
  nodeWrapper: {
    marginBottom: 20,
    width: NODE_SIZE + 60, // extra width for title
    alignItems: "center",
  },
  pulseRing: {
    position: "absolute",
    width: NODE_SIZE + 16,
    height: NODE_SIZE + 16,
    borderRadius: (NODE_SIZE + 16) / 2,
    borderWidth: 3,
    top: -8,
    left: -8,
  },
  nodeCircle: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  nodeCircleLocked: {
    backgroundColor: "#e5e7eb",
    opacity: 0.7,
  },
  nodeIcon: {
    fontSize: 26,
  },
  nodeTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    writingDirection: "rtl",
    maxWidth: NODE_SIZE + 60,
    lineHeight: 18,
    textShadowColor: "rgba(0,0,0,0.06)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bgDecoLottie: {
    position: "absolute",
    width: 90,
    height: 90,
    top: -12,
    left: -12,
    opacity: 0.08,
  },
  node3dShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderRadius: NODE_SIZE / 2,
  },
});
