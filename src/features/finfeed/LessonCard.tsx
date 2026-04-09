import { useEffect } from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Sparkles,
  Star,
  ChevronRight,
} from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  interpolate,
} from "react-native-reanimated";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import type { FeedLesson, LessonCategory } from "./types";

const SCREEN_HEIGHT = Dimensions.get("window").height;

// ── Category theming ──────────────────────────────────────────────────

interface CategoryTheme {
  gradient: readonly [string, string, string];
  accent: string;
  glow: string;
  badgeBg: string;
  label: string;
}

const CATEGORY_THEMES: Record<LessonCategory, CategoryTheme> = {
  Budgeting: {
    gradient: ["#1a0a2e", "#0f0a1e", "#09090b"],
    accent: "#a78bfa",
    glow: "#7c3aed",
    badgeBg: "rgba(167, 139, 250, 0.15)",
    label: "תקצוב",
  },
  Saving: {
    gradient: ["#071a0f", "#0a1a12", "#09090b"],
    accent: "#4ade80",
    glow: "#22c55e",
    badgeBg: "rgba(74, 222, 128, 0.15)",
    label: "חיסכון",
  },
  Debt: {
    gradient: ["#1a0707", "#1a0a0a", "#09090b"],
    accent: "#f87171",
    glow: "#ef4444",
    badgeBg: "rgba(248, 113, 113, 0.15)",
    label: "חוב",
  },
  Investing: {
    gradient: ["#1a1207", "#1a150a", "#09090b"],
    accent: "#facc15",
    glow: "#eab308",
    badgeBg: "rgba(250, 204, 21, 0.15)",
    label: "השקעות",
  },
  Taxes: {
    gradient: ["#07101a", "#0a121a", "#09090b"],
    accent: "#60a5fa",
    glow: "#3b82f6",
    badgeBg: "rgba(96, 165, 250, 0.15)",
    label: "מיסים",
  },
  Insurance: {
    gradient: ["#07161a", "#0a181a", "#09090b"],
    accent: "#22d3ee",
    glow: "#06b6d4",
    badgeBg: "rgba(34, 211, 238, 0.15)",
    label: "ביטוח",
  },
};

// ── Difficulty stars ──────────────────────────────────────────────────

function DifficultyStars({ difficulty }: { difficulty: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star
        key={i}
        size={14}
        color={i <= difficulty ? "#facc15" : "#3f3f46"}
        fill={i <= difficulty ? "#facc15" : "transparent"}
      />
    );
  }
  return <View style={localStyles.starsRow}>{stars}</View>;
}

// ── Pulsing CTA button ───────────────────────────────────────────────

function PulsingCTA({
  accentColor,
  onPress,
}: {
  accentColor: string;
  onPress: () => void;
}) {
  const pulseProgress = useSharedValue(0);

  useEffect(() => {
    pulseProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(0, { duration: 1200 })
      ),
      -1,
      false
    );
    return () => cancelAnimation(pulseProgress);
  }, [pulseProgress]);

  const glowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(
      pulseProgress.value,
      [0, 1],
      [0.4, 0.9]
    );
    const shadowRadius = interpolate(
      pulseProgress.value,
      [0, 1],
      [8, 20]
    );
    return {
      shadowColor: accentColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity,
      shadowRadius,
      elevation: interpolate(pulseProgress.value, [0, 1], [4, 12]),
    };
  });

  return (
    <AnimatedPressable onPress={onPress}>
      <Animated.View
        style={[
          localStyles.ctaButton,
          { backgroundColor: accentColor },
          glowStyle,
        ]}
      >
        <Text style={localStyles.ctaText}>Start Lesson</Text>
        <ChevronRight size={16} color="#000" />
      </Animated.View>
    </AnimatedPressable>
  );
}

// ── Main LessonCard ──────────────────────────────────────────────────

interface LessonCardProps {
  lesson: FeedLesson;
  isActive: boolean;
}

export function LessonCard({ lesson, isActive }: LessonCardProps) {
  const router = useRouter();
  const theme = CATEGORY_THEMES[lesson.category];

  function handlePress() {
    router.push(`/lesson/${lesson.id}`);
  }

  return (
    <View
      style={{ height: SCREEN_HEIGHT }}
      className="items-center justify-center bg-zinc-950 px-5"
    >
      {/* Full-screen gradient background layer */}
      <LinearGradient
        colors={theme.gradient as [string, string, string]}
        style={[
          localStyles.gradientBg,
          { opacity: isActive ? 1 : 0.4 },
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View
        style={[
          localStyles.card,
          {
            borderColor: theme.accent + "30",
            opacity: isActive ? 1 : 0.55,
            shadowColor: theme.glow,
          },
        ]}
      >
        {/* Category badge with glow */}
        <View style={localStyles.badgeRow}>
          <View
            style={[
              localStyles.categoryBadge,
              {
                backgroundColor: theme.badgeBg,
                borderColor: theme.accent + "44",
                shadowColor: theme.glow,
              },
            ]}
          >
            <Text
              style={[localStyles.categoryBadgeText, { color: theme.accent }]}
            >
              {theme.label} · LAYER {lesson.pyramidLayer}
            </Text>
          </View>
        </View>

        {/* Title with text shadow */}
        <Text
          style={[
            localStyles.title,
            {
              textShadowColor: theme.glow + "66",
            },
          ]}
        >
          {lesson.title}
        </Text>

        {/* Description */}
        <Text style={localStyles.description}>{lesson.description}</Text>

        {/* XP reward badge — golden pill */}
        <View style={localStyles.xpBadge}>
          <Sparkles size={14} color="#facc15" />
          <Text style={localStyles.xpText}>+{lesson.xpReward} XP</Text>
        </View>

        {/* Difficulty stars */}
        <DifficultyStars difficulty={lesson.difficulty} />

        {/* Divider */}
        <View
          style={[localStyles.divider, { backgroundColor: theme.accent + "18" }]}
        />

        {/* Bottom: duration + CTA */}
        <View style={localStyles.footer}>
          <Text style={localStyles.durationText}>
            {lesson.durationMinutes} min
          </Text>
          <PulsingCTA accentColor={theme.accent} onPress={handlePress} />
        </View>
      </View>

      {isActive && (
        <Text className="mt-4 text-xs text-zinc-600">
          Swipe up to explore more
        </Text>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const localStyles = StyleSheet.create({
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  card: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    backgroundColor: "rgba(9, 9, 11, 0.85)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  categoryBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#ffffff",
    lineHeight: 34,
    marginBottom: 12,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#a1a1aa",
    marginBottom: 20,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.3)",
    backgroundColor: "rgba(250, 204, 21, 0.08)",
    marginBottom: 14,
    shadowColor: "#facc15",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  xpText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#facc15",
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    width: "100%",
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  durationText: {
    fontSize: 13,
    color: "#71717a",
    fontWeight: "500",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  ctaText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "800",
  },
});
