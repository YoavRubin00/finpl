import React, { useState, useEffect, useCallback, useRef } from "react";
import { Image as ExpoImage } from "expo-image";
import { View, Text, Image, TextInput, Pressable, ScrollView, Dimensions, StyleSheet, ImageBackground, PanResponder, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { LottieIcon } from "../../components/ui/LottieIcon";
import LottieView from "lottie-react-native";
import { FINN_STANDARD, FINN_HELLO, FINN_HAPPY, FINN_TABLET } from "../retention-loops/finnMascotConfig";
import { useRouter } from "expo-router";
import { Sparkles, TrendingUp, Pencil } from "lucide-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SkiaInteractiveChart } from "../../components/ui/SkiaInteractiveChart";
import type { ChartDataPoint } from "../../components/ui/SkiaInteractiveChart";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
  runOnJS,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import { tapHaptic } from "../../utils/haptics";
import { useEconomyStore } from "../economy/useEconomyStore";
import { useAuthStore } from "../auth/useAuthStore";
import { useGoogleAuth } from "../auth/useGoogleAuth";
import { consumeTermsAcceptedFlag } from "../auth/termsAcceptedFlag";
import { ONBOARDING_XP } from "../../constants/economy";
import { calculateCompoundInterest } from "../simulator/SimulatorScreen";
import { FREE_AVATARS } from "../avatars/avatarData";
import type { AvatarDefinition } from "../avatars/avatarData";
import type {
  FinancialDream,
  FinancialGoal,
  KnowledgeLevel,
  AgeGroup,
  LearningTime,
  LearningStyle,
  DeadlineStress,
  DailyGoalMinutes,
  CompanionId,
} from "../auth/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHAT_BG = { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/HOMEPAGE.png' };
const SLIDE_MS = 300;
const AUTO_ADVANCE_MS = 1150; // 900ms typing + 250ms extra before transition
const TOTAL_STEPS = 8;

const CONFETTI_COLORS = [
  "#0891b2", "#4ade80", "#fbbf24", "#22d3ee",
  "#f472b6", "#60a5fa", "#fb923c", "#22d3ee",
];

// Module-level callback ref, StepShell notifies ProfilingFlow when user taps
// so the persistent Finn overlay can mirror the typing animation.
const finnTriggerRef: { current: (() => void) | null } = { current: null };

const STEPS_WITH_PERSISTENT_FINN = new Set([
  "dream", "goal", "knowledge", "age", "learning-time", "learning-style", "daily-goal",
]);

// Pre-computed so particles are deterministic (no Math.random in render)
const PARTICLE_CONFIGS = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * Math.PI * 2;
  const radius = 140 + (i % 4) * 50;
  return {
    tx: Math.cos(angle) * radius,
    ty: Math.sin(angle) * radius - 50,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 10 + (i % 3) * 5,
    delay: (i % 6) * 30,
  };
});

// ─── Instagram Stories progress bar ──────────────────────────────────────────

function GlowBar({ current }: { current: number }) {
  const pct = Math.min(((current + 1) / TOTAL_STEPS) * 100, 100);
  return (
    <View style={{ flex: 1, transform: [{ scaleX: -1 }] }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: TOTAL_STEPS, now: current + 1 }}>
      <View style={{ height: 14, backgroundColor: '#e5e7eb', borderRadius: 999, overflow: 'hidden', borderWidth: 1.5, borderColor: '#d1d5db', shadowColor: '#22d3ee', shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4 }}>
        <LinearGradient
          colors={['#22d3ee', '#0891b2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: '100%', borderRadius: 999, width: `${pct}%` }}
        >
          <View style={{ position: 'absolute', top: 2, left: 6, right: 6, height: 3, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 999 }} />
        </LinearGradient>
      </View>
    </View>
  );
}

// ─── Animated option card (entrance stagger + tap spring) ────────────────────

interface CardProps {
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
  index: number;
  lottieSource?: number;
}

function AnimatedCard({ label, sublabel, selected, onPress, index, lottieSource }: CardProps) {
  const ty = useSharedValue(48);
  const opacity = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    const d = index * 40;
    ty.value = withDelay(d, withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) }));
    opacity.value = withDelay(d, withTiming(1, { duration: 200 }));
  }, []);

  function handlePress() {
    pressScale.value = withSequence(
      withTiming(0.98, { duration: 60 }),
      withTiming(1, { duration: 120 })
    );
    glowOpacity.value = withSequence(
      withTiming(1, { duration: 80 }),
      withDelay(200, withTiming(0, { duration: 200 }))
    );
    onPress();
  }

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }, { scale: pressScale.value }],
    opacity: opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View style={[styles.cardWrap, wrapStyle]}>
      {/* Neon glow overlay */}
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.cardGlow, glowStyle]} />
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        style={[styles.tapCard, selected && styles.tapCardSelected]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.tapCardLabel, selected && styles.tapCardLabelActive]}>
            {label}
          </Text>
          {sublabel ? (
            <Text style={[styles.tapCardSub, selected && styles.tapCardSubActive]}>
              {sublabel}
            </Text>
          ) : null}
        </View>
        {lottieSource ? (
          <View style={{ width: 36, height: 36, flexShrink: 0, marginLeft: 8 }}>
            <LottieIcon source={lottieSource} size={36} autoPlay loop />
          </View>
        ) : null}
        {selected && <View style={styles.checkDot} />}
      </Pressable>
    </Animated.View>
  );
}

// ─── Grid card (2×2 layouts) ──────────────────────────────────────────────────

interface GridCardProps {
  emoji: string;
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
  index: number;
  lottieSource?: number;
}

function AnimatedGridCard({ emoji, label, sublabel, selected, onPress, index, lottieSource }: GridCardProps) {
  const ty = useSharedValue(24);
  const opacity = useSharedValue(0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    const d = index * 60;
    ty.value = withDelay(d, withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) }));
    opacity.value = withDelay(d, withTiming(1, { duration: 200 }));
  }, []);

  function handlePress() {
    pressScale.value = withSequence(
      withTiming(0.98, { duration: 60 }),
      withTiming(1, { duration: 120 })
    );
    onPress();
  }

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }, { scale: pressScale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.gridCardWrap, wrapStyle]}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        style={[styles.gridCard, selected && styles.tapCardSelected]}
      >
        {lottieSource ? (
          <LottieIcon source={lottieSource} size={60} autoPlay loop />
        ) : (
          <Text style={styles.gridEmoji}>{emoji}</Text>
        )}
        <Text style={[styles.gridLabel, selected && styles.tapCardLabelActive]}>{label}</Text>
        {sublabel ? (
          <Text style={[styles.tapCardSub, selected && styles.tapCardSubActive]}>{sublabel}</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

// ─── Ambient bubble overlay ──────────────────────────────────────────────────

const BUBBLE_CONFIGS = Array.from({ length: 7 }, (_, i) => ({
  left: 10 + (i * 47) % 80,
  size: 8 + (i % 3) * 6,
  delay: i * 400,
  duration: 3000 + (i % 3) * 1200,
  opacity: 0.08 + (i % 3) * 0.04,
}));

function BubbleOverlay() {
  // Lightweight static bubbles, no recursive animations to prevent crashes
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {BUBBLE_CONFIGS.map((cfg, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            bottom: 20 + i * 40,
            left: `${cfg.left}%` as `${number}%`,
            width: cfg.size,
            height: cfg.size,
            borderRadius: 999,
            backgroundColor: "rgba(8,145,178,0.12)",
          }}
        />
      ))}
    </View>
  );
}

// ─── Animated bubble transition (replaces corrupt Lottie files) ───────────────

const TRANSITION_BUBBLES = Array.from({ length: 14 }, (_, i) => ({
  size: 12 + Math.random() * 36,
  left: 5 + Math.random() * 85,
  delay: Math.random() * 200,
  duration: 500 + Math.random() * 400,
}));

function AnimatedBubbleTransition() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {TRANSITION_BUBBLES.map((b, i) => (
        <AnimatedBubble key={i} size={b.size} left={b.left} delay={b.delay} duration={b.duration} />
      ))}
    </View>
  );
}

function AnimatedBubble({ size, left, delay, duration }: { size: number; left: number; delay: number; duration: number }) {
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);

  useEffect(() => {
    ty.value = withDelay(delay, withTiming(-SCREEN_HEIGHT * 0.8, { duration, easing: Easing.out(Easing.quad) }));
    opacity.value = withDelay(delay, withSequence(
      withTiming(0.7, { duration: duration * 0.3 }),
      withTiming(0, { duration: duration * 0.7 }),
    ));
    scale.value = withDelay(delay, withTiming(1, { duration: duration * 0.5 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    position: "absolute" as const,
    bottom: -20,
    left: `${left}%` as `${number}%`,
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: "rgba(8,145,178,0.25)",
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.3)",
    transform: [{ translateY: ty.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={style} />;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;

// ─── Shared step shell ────────────────────────────────────────────────────────

function TypingDots() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 600, easing: Easing.linear }), -1, false);
  }, [t]);
  const dot = (offset: number) =>
    useAnimatedStyle(() => {
      const phase = (t.value + offset) % 1;
      const scale = 0.6 + 0.6 * Math.abs(Math.sin(phase * Math.PI));
      return { opacity: 0.4 + 0.6 * Math.abs(Math.sin(phase * Math.PI)), transform: [{ scale }] };
    });
  return (
    <View style={styles.typingDotsRow}>
      <Animated.View style={[styles.typingDot, dot(0)]} />
      <Animated.View style={[styles.typingDot, dot(0.33)]} />
      <Animated.View style={[styles.typingDot, dot(0.66)]} />
    </View>
  );
}

function StepShell({
  stepIndex,
  question,
  hint,
  children,
}: {
  stepIndex: number;
  question: string;
  hint?: string;
  children: React.ReactNode;
  finnState?: "idle" | "celebrate" | "empathy" | "thinking" | "tablet";
  compact?: boolean;
}) {
  const headerTy = useSharedValue(-20);
  const headerOpacity = useSharedValue(0);
  const sharkWobble = useSharedValue(0);

  const [isTyping, setIsTyping] = useState(false);
  const typingResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    headerTy.value = withSpring(0, { damping: 14, stiffness: 120 });
    headerOpacity.value = withTiming(1, { duration: 300 });
  }, [stepIndex]);

  // Stop typing animation when the question changes (we've advanced).
  useEffect(() => {
    setIsTyping(false);
    if (typingResetRef.current) clearTimeout(typingResetRef.current);
  }, [question]);

  // Wobble shark + tablet while "typing"; settle when idle.
  useEffect(() => {
    if (isTyping) {
      sharkWobble.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 130, easing: Easing.inOut(Easing.quad) }),
          withTiming(-1, { duration: 130, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
    } else {
      sharkWobble.value = withTiming(0, { duration: 200 });
    }
  }, [isTyping, sharkWobble]);

  useEffect(() => () => {
    if (typingResetRef.current) clearTimeout(typingResetRef.current);
  }, []);

  const trigger = useCallback(() => {
    setIsTyping(true);
    finnTriggerRef.current?.();
    if (typingResetRef.current) clearTimeout(typingResetRef.current);
    typingResetRef.current = setTimeout(() => setIsTyping(false), AUTO_ADVANCE_MS + 400);
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTy.value }],
    opacity: headerOpacity.value,
  }));

  const sharkAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${sharkWobble.value * 4}deg` },
      { scale: 1 + Math.abs(sharkWobble.value) * 0.04 },
    ],
  }));

  return (
    <ImageBackground source={CHAT_BG} style={{ flex: 1 }} resizeMode="cover">
      <BubbleOverlay />
      <SafeAreaView style={styles.shell} edges={["top", "bottom"]}>
        {/* Progress bar */}
        <View style={styles.topRow}>
          <GlowBar current={stepIndex} />
        </View>

        {/* Finn (tablet) + question bubble */}
        <Animated.View style={[styles.questionBlock, headerStyle]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 }}>
            {/* Invisible placeholder, real Finn rendered by persistent overlay in ProfilingFlow */}
            <View style={{ width: 110, height: 110 }} />
            <View style={[styles.chatBubble, { flexShrink: 1, minWidth: 0 }]}>
              <Text style={styles.questionBubble}>{question}</Text>
              {hint ? <Text style={styles.hintBubble}>{hint}</Text> : null}
            </View>
          </View>
        </Animated.View>

        {/* Options, touch anywhere here triggers the shark typing animation */}
        <View
          style={[styles.optionsArea, { marginTop: 12 }]}
          onTouchStart={trigger}
        >
          {children}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

// ─── Confetti particle ────────────────────────────────────────────────────────

function ConfettiParticle({ tx, ty: targetY, color, size, delay: d }: typeof PARTICLE_CONFIGS[0]) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(d, withSpring(1, { damping: 6, stiffness: 200 }));
    opacity.value = withDelay(d, withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(500, withTiming(0, { duration: 400 }))
    ));
    x.value = withDelay(d, withTiming(tx, { duration: 900, easing: Easing.out(Easing.quad) }));
    y.value = withDelay(d, withTiming(targetY, { duration: 900, easing: Easing.out(Easing.quad) }));
    rotate.value = withDelay(d, withTiming(tx > 0 ? 360 : -360, { duration: 900 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confettiDot,
        { backgroundColor: color, width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    />
  );
}

// ─── Profile summary screen ───────────────────────────────────────────────────

type EditableStep = 'dream' | 'goal' | 'knowledge' | 'daily-goal';

function ProfileSummaryScreen({ collected, onDone, onEditStep }: { collected: Collected; onDone: () => void; onEditStep?: (step: EditableStep) => void }) {
  const ctaScale = useSharedValue(0);
  useEffect(() => {
    ctaScale.value = withDelay(350, withSpring(1, { damping: 14, stiffness: 120 }));
  }, []);
  const ctaStyle = useAnimatedStyle(() => ({ transform: [{ scale: ctaScale.value }] }));

  const dreamLabel = collected.financialDream ? DREAMS.find((d) => d.id === collected.financialDream)?.label : null;
  const goalLabel = collected.financialGoal ? GOALS.find((g) => g.id === collected.financialGoal)?.label : null;
  const knowledgeLabel = collected.knowledgeLevel ? KNOWLEDGE_LABELS[collected.knowledgeLevel] : null;

  const rows = [
    dreamLabel ? { icon: '🎯', label: 'החלום שלך', value: dreamLabel, step: 'dream' as EditableStep } : null,
    goalLabel ? { icon: '📌', label: 'המטרה שלך', value: goalLabel, step: 'goal' as EditableStep } : null,
    knowledgeLabel ? { icon: '🧠', label: 'רמת ידע', value: knowledgeLabel, step: 'knowledge' as EditableStep } : null,
    collected.dailyGoalMinutes ? { icon: '⏰', label: 'יעד יומי', value: `${collected.dailyGoalMinutes} דקות`, step: 'daily-goal' as EditableStep } : null,
  ].filter((r): r is { icon: string; label: string; value: string; step: EditableStep } => r !== null);

  return (
    <SafeAreaView style={[styles.shell, { justifyContent: 'center', paddingHorizontal: 28 }]} edges={["top", "bottom"]}>
      <Animated.View entering={FadeIn.duration(300)} style={{ alignItems: 'center', marginBottom: 20 }}>
        <ExpoImage source={FINN_HAPPY} style={{ width: 96, height: 96 }} contentFit="contain" accessible={false} />
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(350).delay(100)} style={{ marginBottom: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a', writingDirection: 'rtl', textAlign: 'center', marginBottom: 6 }}>
          הנה מה שאני אכין עבורך
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280', writingDirection: 'rtl', textAlign: 'center' }}>
          לחצו על כל שורה לעריכה
        </Text>
      </Animated.View>
      <Animated.View entering={FadeInUp.duration(350).delay(200)} style={{ width: '100%', gap: 10, marginBottom: 32 }}>
        {rows.map((row, i) => (
          <Pressable
            key={i}
            onPress={() => onEditStep?.(row.step)}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`ערוך ${row.label}: ${row.value}`}
            style={({ pressed }) => ({
              width: '100%',
              backgroundColor: pressed ? '#f0f9ff' : '#ffffff', borderRadius: 14,
              paddingVertical: 12, paddingHorizontal: 16,
              borderWidth: 1.5, borderColor: pressed ? '#7dd3fc' : '#e2e8f0',
              shadowColor: '#0891b2', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
            })}
          >
            {/* Row 1: pencil + emoji + label — all same height */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pencil size={14} color="#64748b" strokeWidth={2.2} />
              <Text style={{ fontSize: 20, includeFontPadding: false, marginBottom: Platform.OS === 'ios' ? 2 : 0 }} accessible={false}>{row.icon}</Text>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: '#0f172a', textAlign: 'right', writingDirection: 'rtl', includeFontPadding: false }}>{row.label}</Text>
            </View>
            {/* Row 2: value below, right-aligned */}
            <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '900', color: '#0369a1', textAlign: 'right', writingDirection: 'rtl', marginTop: 4 }}>{row.value}</Text>
          </Pressable>
        ))}
      </Animated.View>
      <Animated.View style={[ctaStyle, { width: '100%', alignItems: 'center' }]}>
        <Pressable
          onPress={onDone}
          style={[styles.celebCTA, { width: '100%', alignItems: 'center' }]}
          accessibilityRole="button"
          accessibilityLabel="אשר ותמשיך לחגיגה"
        >
          <Text style={styles.celebCTAText}>נראה מצוין!</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── Celebration screen ───────────────────────────────────────────────────────

function CelebrationScreen({ onDone }: { onDone: () => void }) {
  const badgeScale = useSharedValue(0.2);
  const badgeRotate = useSharedValue(-15);
  const xpScale = useSharedValue(0);
  const ctaScale = useSharedValue(0);

  useEffect(() => {
    badgeScale.value = withSequence(
      withSpring(1.05, { damping: 14, stiffness: 120 }),
      withSpring(1, { damping: 14 })
    );
    badgeRotate.value = withSpring(0, { damping: 14, stiffness: 100 });
    xpScale.value = withDelay(350, withSpring(1, { damping: 14, stiffness: 120 }));
    ctaScale.value = withDelay(700, withSpring(1, { damping: 14, stiffness: 110 }));
  }, []);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }, { rotate: `${badgeRotate.value}deg` }],
  }));
  const xpStyle = useAnimatedStyle(() => ({ transform: [{ scale: xpScale.value }] }));
  const ctaStyle = useAnimatedStyle(() => ({ transform: [{ scale: ctaScale.value }] }));

  return (
    <ImageBackground source={CHAT_BG} style={{ flex: 1 }} resizeMode="cover">
      <BubbleOverlay />
      <SafeAreaView style={styles.celebShell} edges={["top", "bottom"]}>
        {/* Confetti burst */}
        <View style={styles.confettiOrigin} pointerEvents="none">
          {PARTICLE_CONFIGS.map((p, i) => (
            <ConfettiParticle key={i} {...p} />
          ))}
        </View>

        {/* Finn celebrating */}
        <Animated.View style={[styles.celebBadge, badgeStyle]}>
          <ExpoImage
            source={FINN_HAPPY}
            style={{ width: 120, height: 120 }}
            contentFit="contain"
            accessible={false}
          />
        </Animated.View>

        {/* Confetti */}
        <View style={{ position: 'absolute', top: '30%', alignSelf: 'center' }} pointerEvents="none">
          <LottieIcon
            source={require("../../../assets/lottie/Confetti.json") as number}
            size={200}
            autoPlay
            loop={false}
          />
        </View>

        {/* XP + Coins */}
        <Animated.View style={[styles.celebRewards, xpStyle]}>
          <View style={styles.rewardPill}>
            <Text style={styles.rewardXP}>+{ONBOARDING_XP} XP</Text>
          </View>
          <View style={[styles.rewardPill, styles.rewardPillGold]}>
            <Text style={styles.rewardCoins}>+50 מטבעות</Text>
          </View>
        </Animated.View>

        <Text style={styles.celebTitle}>הפרופיל שלך מוכן!</Text>
        <Text style={styles.celebSub}>
          הכנו את הפיד שלך.{"\n"}הגיע הזמן להפוך ידע לכסף. 💰
        </Text>

        {/* CTA */}
        <Animated.View style={ctaStyle}>
          <Pressable onPress={onDone} style={styles.celebCTA} accessibilityRole="button" accessibilityLabel="בואו נתחיל">
            <Text style={styles.celebCTAText}>בואו נתחיל</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </ImageBackground>
  );
}

// ─── Step: Q0 Dream (Duolingo-style "pick your dream") ─────────────────────

const DREAM_LOTTIES: Record<FinancialDream, number> = {
  trip: require("../../../assets/lottie/wired-flat-804-sun-hover-rays.json") as number,
  car: require("../../../assets/lottie/wired-flat-504-school-bus-hover-pinch.json") as number,
  apartment: require("../../../assets/lottie/wired-flat-3302-house-sold-hover-pinch.json") as number,
  freedom: require("../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json") as number,
};

const DREAMS: { id: FinancialDream; emoji: string; label: string; sub: string }[] = [
  { id: "trip", emoji: "", label: "טיול גדול", sub: "30,000 ₪" },
  { id: "car", emoji: "", label: "רכב ראשון", sub: "50,000 ₪" },
  { id: "apartment", emoji: "", label: "משכנתא לדירה", sub: "300,000 ₪" },
  { id: "freedom", emoji: "", label: "חופש כלכלי", sub: "הכל אפשרי" },
];

function DreamStep({ onNext }: { onNext: (v: FinancialDream) => void }) {
  const [sel, setSel] = useState<FinancialDream | null>(null);
  const tap = useCallback((id: FinancialDream) => {
    setSel(id);
    setTimeout(() => onNext(id), AUTO_ADVANCE_MS);
  }, [onNext]);

  return (
    <StepShell stepIndex={0} question="מה החלום הפיננסי שלך?" hint="נתחיל מהמטרה, והדרך תתגלה" finnState={sel ? "tablet" : "thinking"}>
      <View style={styles.grid}>
        {DREAMS.map((d, i) => (
          <AnimatedGridCard
            key={d.id}
            index={i}
            emoji={d.emoji}
            label={d.label}
            sublabel={d.sub}
            selected={sel === d.id}
            onPress={() => tap(d.id)}
            lottieSource={DREAM_LOTTIES[d.id]}
          />
        ))}
      </View>
    </StepShell>
  );
}

// ─── Step: Compound Aha Moment ────────────────────────────────────────────────


// ─── Lottie mappings for question steps ───────────────────────────────────────

const GOAL_LOTTIES: Record<FinancialGoal, number> = {
  "cash-flow": require("../../../assets/lottie/wired-flat-298-coins-hover-jump.json") as number,
  "investing": require("../../../assets/lottie/wired-flat-947-investment-hover-pinch.json") as number,
  "army-release": require("../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json") as number,
  "expand-horizons": require("../../../assets/lottie/wired-flat-161-growth-hover-pinch.json") as number,
  "unsure": require("../../../assets/lottie/wired-flat-424-question-bubble-hover-wiggle.json") as number,
};

const KNOWLEDGE_LOTTIES: Record<KnowledgeLevel, number> = {
  "none": require("../../../assets/lottie/wired-flat-424-question-bubble-hover-wiggle.json") as number,
  "beginner": require("../../../assets/lottie/wired-flat-779-books-hover-hit.json") as number,
  "some": require("../../../assets/lottie/wired-flat-36-bulb-hover-blink.json") as number,
  "experienced": require("../../../assets/lottie/wired-flat-426-brain-hover-pinch.json") as number,
  "expert": require("../../../assets/lottie/wired-flat-1173-shark-hover-pinch.json") as number,
};

const AGE_LOTTIES: Record<number, number> = {
  0: require("../../../assets/lottie/wired-flat-486-school-hover-pinch.json") as number,
  1: require("../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json") as number,
  2: require("../../../assets/lottie/wired-flat-1846-employee-working-hover-working.json") as number,
  3: require("../../../assets/lottie/wired-flat-433-cup-prize-hover-roll.json") as number,
};

const TIME_LOTTIES: Record<LearningTime, number> = {
  "morning": require("../../../assets/lottie/wired-flat-804-sun-hover-rays.json") as number,
  "evening": require("../../../assets/lottie/wired-flat-3003-clock-new-year-24-hr-hover-pinch.json") as number,
  "during-day": require("../../../assets/lottie/wired-flat-721-hand-with-phone-hover-scroll.json") as number,
};

const STYLE_LOTTIES: Record<LearningStyle, number> = {
  "theory-first": require("../../../assets/lottie/wired-flat-779-books-hover-hit.json") as number,
  "practice-along": require("../../../assets/lottie/gaming.json") as number,
  "no-preference": require("../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json") as number,
};

const DEADLINE_LOTTIES: Record<DeadlineStress, number> = {
  "no-stress": require("../../../assets/lottie/wired-flat-804-sun-hover-rays.json") as number,
  "maybe": require("../../../assets/lottie/wired-flat-424-question-bubble-hover-wiggle.json") as number,
  "high-stress": require("../../../assets/lottie/wired-flat-2534-work-life-balance-hover-pinch.json") as number,
};

// ─── Step: Q1 Goal ────────────────────────────────────────────────────────────

const GOALS: { id: FinancialGoal; label: string; sub: string }[] = [
  { id: "cash-flow", label: "הכסף בורח לי מהידיים", sub: "תזרים ותקציב" },
  { id: "investing", label: "אני רוצה שהכסף יעבוד", sub: "השקעות" },
  { id: "army-release", label: "אני משתחרר/ת", sub: "שחרור מהצבא" },
  { id: "expand-horizons", label: "הרחבת אופקים", sub: "להבין את העולם" },
  { id: "unsure", label: "לא בטוח/ה", sub: "סתם מסתכל/ת" },
];

const DREAM_REACTIONS: Record<FinancialDream, string> = {
  trip: "טיול גדול זה יעד מדהים! בוא נראה מאיפה מתחילים.",
  car: "רכב ראשון? לגמרי אפשרי לפצח את זה.",
  apartment: "דירה זה פרויקט רציני, טוב שאתה פה!",
  freedom: "חופש מוחלט. זו המטרה של כולנו.",
};

function GoalStep({ dream, onNext }: { dream: FinancialDream | null; onNext: (v: FinancialGoal) => void }) {
  const [sel, setSel] = useState<FinancialGoal | null>(null);
  const tap = useCallback((id: FinancialGoal) => {
    setSel(id);
    setTimeout(() => onNext(id), AUTO_ADVANCE_MS);
  }, [onNext]);

  const dynamicHint = dream ? DREAM_REACTIONS[dream] : "זה יעצב את הפיד שלך";

  return (
    <StepShell stepIndex={1} question="למה אתה פה?" hint={dynamicHint} finnState={sel ? "tablet" : "idle"}>
      <View>
        {GOALS.map((g, i) => (
          <AnimatedCard key={g.id} index={i} label={g.label} sublabel={g.sub}
            selected={sel === g.id} onPress={() => tap(g.id)}
            lottieSource={GOAL_LOTTIES[g.id]} />
        ))}
      </View>
    </StepShell>
  );
}

// ─── Step: Q2 Knowledge ───────────────────────────────────────────────────────

const LEVELS: { id: KnowledgeLevel; label: string; sub: string }[] = [
  { id: "none", label: "כלום ושום דבר", sub: "מאפס מוחלט" },
  { id: "beginner", label: "יודע/ת קצת", sub: "שמעתי על זה" },
  { id: "some", label: "ממוצע", sub: "הבסיס מוכר לי" },
  { id: "experienced", label: "מתקדם/ת", sub: "יודע, אבל עדיין יש מה ללמוד" },
  { id: "expert", label: "כריש מוול סטריט", sub: "שוחה בעולם הפיננסי" },
];

const GOAL_REACTIONS: Record<FinancialGoal, string> = {
  "cash-flow": "כדי לסדר תזרים לא צריך להיות פרופסור. כמה אתה יודע עכשיו?",
  "investing": "השקעות דורשות ידע. כמה אתה מבין בזה היום?",
  "army-release": "שחרור מהצבא זה שלב גדול! כמה אתה מכיר את עולם הכסף?",
  "expand-horizons": "להרחיב אופקים זה תמיד רעיון טוב. מאיפה מתחילים?",
  "unsure": "תהיה כנה, נתחיל בדיוק מהמקום הנכון לך.",
};

function KnowledgeStep({ goal, onNext }: { goal: FinancialGoal | null; onNext: (v: KnowledgeLevel) => void }) {
  const [sel, setSel] = useState<KnowledgeLevel | null>(null);
  const tap = useCallback((id: KnowledgeLevel) => {
    setSel(id);
    setTimeout(() => onNext(id), AUTO_ADVANCE_MS);
  }, [onNext]);

  const dynamicHint = goal ? GOAL_REACTIONS[goal] : "תהיה כנה, נתחיל בדיוק מהמקום הנכון";

  return (
    <StepShell stepIndex={3} question="כמה אתה מבין בכסף?" hint={dynamicHint} finnState={sel ? (sel === "none" ? "empathy" : "tablet") : "thinking"} compact>
      {LEVELS.map((l, i) => (
        <AnimatedCard key={l.id} index={i} label={l.label} sublabel={l.sub}
          selected={sel === l.id} onPress={() => tap(l.id)}
          lottieSource={KNOWLEDGE_LOTTIES[l.id]} />
      ))}
    </StepShell>
  );
}

// ─── Step: Q3 Age ────────────────────────────────────────────────────────────

const CY = new Date().getFullYear();
const AGE_GROUPS: { label: string; sub: string; ageGroup: AgeGroup; birthYear: number }[] = [
  { label: "16–17", sub: "מתחיל מוקדם!", ageGroup: "minor", birthYear: CY - 16 },
  { label: "18–23", sub: "טרי/ה מהצבא", ageGroup: "adult", birthYear: CY - 21 },
  { label: "24–29", sub: "מתחיל/ה לחשוב", ageGroup: "adult", birthYear: CY - 26 },
  { label: "30+", sub: "מאוחר? אף פעם לא", ageGroup: "adult", birthYear: CY - 33 },
];

const KNOWLEDGE_REACTIONS: Record<string, string> = {
  none: "מתחילים מאפס זה יתרון - אין הרגלים רעים לשנות!",
  beginner: "שמעת על קצת מושגים, עכשיו ניתן להם סדר.",
  some: "בסיס חזק זה חשוב. בוא ניקח אותך לשלב הבא.",
  experienced: "משקיע פעיל! נאגר פה ידע להעצים אותך.",
  expert: "זאב מוול סטריט אה? מצוין, נראה כמה אתה באמת יודע.",
};

function AgeStep({ knowledge, onNext }: { knowledge: KnowledgeLevel | null; onNext: (ag: AgeGroup, by: number) => void }) {
  const [sel, setSel] = useState<number | null>(null);
  const tap = useCallback((i: number) => {
    setSel(i);
    const { ageGroup, birthYear } = AGE_GROUPS[i];
    setTimeout(() => onNext(ageGroup, birthYear), AUTO_ADVANCE_MS);
  }, [onNext]);

  const dynamicHint = knowledge ? KNOWLEDGE_REACTIONS[knowledge] : "רק בשביל להתאים את ההמלצות";

  return (
    <StepShell stepIndex={4} question="בן כמה את/ה?" hint={dynamicHint} finnState={sel !== null ? "tablet" : "idle"}>
      {AGE_GROUPS.map((g, i) => (
        <AnimatedCard key={g.label} index={i} label={g.label} sublabel={g.sub}
          selected={sel === i} onPress={() => tap(i)}
          lottieSource={AGE_LOTTIES[i]} />
      ))}
    </StepShell>
  );
}

// ─── Step: Q4 Learning time ───────────────────────────────────────────────────

const TIMES: { id: LearningTime; label: string; sub: string }[] = [
  { id: "morning", label: "בוקר עם הקפה", sub: "מתחיל/ה את היום חכם/ה" },
  { id: "evening", label: "לפני השינה", sub: "מסיים/ת ב-level up" },
  { id: "during-day", label: "כשיש זמן", sub: "5 דקות בכל מקום" },
];

function LearningTimeStep({ onNext }: { onNext: (v: LearningTime) => void }) {
  const [sel, setSel] = useState<LearningTime | null>(null);
  const tap = useCallback((id: LearningTime) => {
    setSel(id);
    setTimeout(() => onNext(id), AUTO_ADVANCE_MS);
  }, [onNext]);

  return (
    <StepShell stepIndex={5} question="מתי אתה לומד/ת הכי טוב?" finnState={sel ? "tablet" : "thinking"}>
      {TIMES.map((t, i) => (
        <AnimatedCard key={t.id} index={i} label={t.label} sublabel={t.sub}
          selected={sel === t.id} onPress={() => tap(t.id)}
          lottieSource={TIME_LOTTIES[t.id]} />
      ))}
      <View style={{ alignItems: "center", marginTop: 12 }}>
        <LottieIcon
          source={require("../../../assets/lottie/Appointment booking with smartphone.json") as number}
          size={120}
          autoPlay
          loop
        />
      </View>
    </StepShell>
  );
}

// ─── Step: Q5 Learning style ──────────────────────────────────────────────────

const LEARN_STYLES: { id: LearningStyle; label: string; sub: string }[] = [
  { id: "theory-first", label: "קודם תיאוריה", sub: "להבין לפני שמתרגלים" },
  { id: "practice-along", label: "לתרגל תוך כדי", sub: "learning by doing" },
  { id: "no-preference", label: "לא משנה לי", sub: "תפתיע אותי" },
];

function LearningStyleStep({ ageGroup, birthYear, onNext }: { ageGroup: AgeGroup | null; birthYear: number | null; onNext: (v: LearningStyle) => void }) {
  const [sel, setSel] = useState<LearningStyle | null>(null);
  const tap = useCallback((id: LearningStyle) => {
    setSel(id);
    setTimeout(() => onNext(id), AUTO_ADVANCE_MS);
  }, [onNext]);

  const age = birthYear ? new Date().getFullYear() - birthYear : null;
  const dynamicHint = ageGroup === "minor"
    ? "בגילך לקלוט חומר חדש זה משחק ילדים. איך את/ה מעדיף/ה ללמוד?"
    : age !== null && age >= 30
      ? "אף פעם לא מאוחר ללמוד טריקים חדשים! אז איך את/ה מעדיף/ה ללמוד?"
      : undefined;

  return (
    <StepShell stepIndex={6} question="איך אתה אוהב/ת ללמוד?" hint={dynamicHint} finnState={sel ? "tablet" : "idle"}>
      {LEARN_STYLES.map((s, i) => (
        <AnimatedCard key={s.id} index={i} label={s.label} sublabel={s.sub}
          selected={sel === s.id} onPress={() => tap(s.id)}
          lottieSource={STYLE_LOTTIES[s.id]} />
      ))}
    </StepShell>
  );
}

// ─── Step: Q6 Deadline stress (Instagram poll) ────────────────────────────────

const DEADLINE_OPTS: { id: DeadlineStress; label: string }[] = [
  { id: "no-stress", label: "בכלל לא" },
  { id: "maybe", label: "אולי" },
  { id: "high-stress", label: "ממש!" },
];

function DeadlineStep({ onNext }: { onNext: (v: DeadlineStress) => void }) {
  const [sel, setSel] = useState<DeadlineStress | null>(null);

  const wrapTy = useSharedValue(30);
  const wrapOpacity = useSharedValue(0);
  useEffect(() => {
    wrapTy.value = withDelay(200, withSpring(0, { damping: 13 }));
    wrapOpacity.value = withDelay(200, withTiming(1, { duration: 250 }));
  }, []);
  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: wrapTy.value }],
    opacity: wrapOpacity.value,
  }));

  function tap(id: DeadlineStress) {
    setSel(id);
    setTimeout(() => onNext(id), AUTO_ADVANCE_MS);
  }

  return (
    <StepShell stepIndex={7} question="דדליינים גורמים לך ללחץ?" hint="משפיע על ה-Streak שלך" finnState={sel ? (sel === "high-stress" ? "empathy" : "tablet") : "thinking"}>
      <Animated.View style={[styles.pollRow, wrapStyle]}>
        {DEADLINE_OPTS.map((d) => (
          <Pressable
            key={d.id}
            onPress={() => tap(d.id)}
            accessibilityRole="button"
            accessibilityLabel={d.label}
            accessibilityState={{ selected: sel === d.id }}
            style={[styles.pollBtn, sel === d.id && styles.pollBtnSelected]}
          >
            <View style={{ width: 36, height: 36 }}>
              <LottieIcon source={DEADLINE_LOTTIES[d.id]} size={36} autoPlay loop />
            </View>
            <Text style={[styles.pollLabel, sel === d.id && styles.pollLabelSelected]}>
              {d.label}
            </Text>
          </Pressable>
        ))}
      </Animated.View>
    </StepShell>
  );
}

// ─── Step: Q7 Daily goal (2×2 grid) ──────────────────────────────────────────

const DAILY_LOTTIES: Record<number, number> = {
  5: require("../../../assets/lottie/wired-flat-45-clock-time-hover-pinch.json") as number,
  10: require("../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json") as number,
  15: require("../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json") as number,
  30: require("../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json") as number,
};

const DAILY_OPTS: { id: DailyGoalMinutes; emoji: string; label: string; sub: string }[] = [
  { id: 5, emoji: "", label: "5 דקות", sub: "על הדרך" },
  { id: 10, emoji: "", label: "10 דקות", sub: "רגיל" },
  { id: 15, emoji: "", label: "15 דקות", sub: "רציני" },
  { id: 30, emoji: "", label: "30 דקות", sub: "נחוש" },
];

function DailyGoalStep({ onNext }: { onNext: (v: DailyGoalMinutes) => void }) {
  const [sel, setSel] = useState<DailyGoalMinutes | null>(null);
  const tap = useCallback((id: DailyGoalMinutes) => {
    setSel(id);
    const delay = (id === 15 || id === 30) ? 1400 : AUTO_ADVANCE_MS;
    setTimeout(() => onNext(id), delay);
  }, [onNext]);

  return (
    <StepShell
      stepIndex={7}
      question="כמה תרצה/י ללמוד ביום?"
      hint="יעד שאפשר לעמוד בו יעזור לך להתעשר לאט ובטוח. יצרנו עבורך רצף (Streak) פיננסי. 🔥"
      finnState={sel ? "tablet" : "thinking"}>
      <View style={styles.grid}>
        {DAILY_OPTS.map((g, i) => (
          <AnimatedGridCard key={g.id} index={i} emoji={g.emoji} label={g.label}
            sublabel={g.sub} selected={sel === g.id} onPress={() => tap(g.id)}
            lottieSource={DAILY_LOTTIES[g.id]} />
        ))}
      </View>

      {/* Full-screen commitment notification */}
      {(sel === 15 || sel === 30) && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,8,20,0.85)',
            zIndex: 100, alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Animated.View
            entering={FadeInUp.delay(150).springify().damping(12)}
            style={{ alignItems: 'center', paddingHorizontal: 32 }}
          >
            <ExpoImage
              source={FINN_HAPPY}
              style={{ width: 160, height: 160, marginBottom: 16 }}
              contentFit="contain"
              accessible={false}
            />
            <LottieIcon source={require("../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json") as number} size={80} autoPlay loop={false} />
            <Text style={{
              textAlign: 'center', color: '#ffffff', fontSize: 22, fontWeight: '900',
              marginTop: 12, lineHeight: 32, writingDirection: 'rtl',
              textShadowColor: 'rgba(14,165,233,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
            }}>
              {"וואו, זו התחייבות רצינית.\nמתחילים פה דרך!"}
            </Text>
          </Animated.View>
        </Animated.View>
      )}
    </StepShell>
  );
}

// ─── Step: Q8 Companion (2×2 grid with Lottie) ───────────────────────────────

const COMPANION_LOTTIE: Record<CompanionId, number> = {
  "warren-buffett": require("../../../assets/lottie/wired-flat-688-speaker-lecturer-male-hover-pinch.json") as number,
  "moshe-peled": require("../../../assets/lottie/wired-flat-694-intern-male-hover-pinch.json") as number,
  "rachel": require("../../../assets/lottie/wired-flat-695-woman-style-19-hover-pinch.json") as number,
  "robot": require("../../../assets/lottie/wired-flat-746-technology-integrated-circuits-hover-pinch.json") as number,
};

const COMPANIONS: { id: CompanionId; label: string; sub: string }[] = [
  { id: "warren-buffett", label: "קפטן שארק", sub: "חכם וסבלני" },
  { id: "moshe-peled", label: "קפטן שארק", sub: "ישראלי ותכל'סי" },
  { id: "rachel", label: "קפטן שארק", sub: "חם ומעודד" },
  { id: "robot", label: "קפטן שארק", sub: "אנליטי ומדויק" },
];

const DREAM_LABELS: Record<FinancialDream, string> = {
  trip: "טיול",
  car: "רכב",
  apartment: "דירה",
  freedom: "חופש כלכלי",
};

const KNOWLEDGE_LABELS: Record<KnowledgeLevel, string> = {
  none: "אפס ידע",
  beginner: "ידע בסיסי",
  some: "ידע ממוצע",
  experienced: "ידע מתקדם",
  expert: "ידע ברמת כריש",
};

function CompanionStep({ dream, knowledge, onNext }: { dream: FinancialDream | null; knowledge: KnowledgeLevel | null; onNext: (v: CompanionId) => void }) {
  const [sel, setSel] = useState<CompanionId | null>(null);
  const tap = useCallback((id: CompanionId) => {
    setSel(id);
    setTimeout(() => onNext(id), AUTO_ADVANCE_MS);
  }, [onNext]);

  const dreamLabel = dream ? DREAM_LABELS[dream] : null;
  const knowledgeLabel = knowledge ? KNOWLEDGE_LABELS[knowledge] : null;
  const dynamicHint = dreamLabel && knowledgeLabel
    ? `אוקיי, הבנתי. אתה רוצה ${dreamLabel} ויש לך ${knowledgeLabel}. בוא נראה מי הכי מתאים ללוות אותך...`
    : "הדמות תאמן ומעודד/ת אותך";

  return (
    <StepShell stepIndex={9} question="מי ילווה אותך?" hint={dynamicHint} finnState={sel ? "tablet" : "idle"}>
      <View style={styles.grid}>
        {COMPANIONS.map((c, i) => (
          <AnimatedGridCard
            key={c.id}
            index={i}
            emoji=""
            label={c.label}
            sublabel={c.sub}
            selected={sel === c.id}
            onPress={() => tap(c.id)}
            lottieSource={COMPANION_LOTTIE[c.id]}
          />
        ))}
      </View>
    </StepShell>
  );
}

// ─── Step: Q9 Avatar picker ──────────────────────────────────────────────────

function AvatarPickerStep({ onNext }: { onNext: (avatarId: string) => void }) {
  const [sel, setSel] = useState<string | null>(null);

  const ctaOpacity = useSharedValue(0);
  const ctaScale = useSharedValue(0.8);

  function handleSelect(id: string) {
    setSel(id);
    ctaOpacity.value = withTiming(1, { duration: 200 });
    ctaScale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
  }

  function handleContinue() {
    if (sel) onNext(sel);
  }

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ scale: ctaScale.value }],
  }));

  return (
    <StepShell stepIndex={0} question="בחר/י את האווטאר שלך" hint="הדמות שתלווה אותך באפליקציה">
      <View style={styles.avatarGrid}>
        {FREE_AVATARS.map((avatar: AvatarDefinition, i: number) => (
          <AvatarGridItem
            key={avatar.id}
            avatar={avatar}
            selected={sel === avatar.id}
            onPress={() => handleSelect(avatar.id)}
            index={i}
          />
        ))}
      </View>

      <Animated.View style={[styles.avatarCtaWrap, ctaStyle]}>
        <Pressable
          onPress={handleContinue}
          accessibilityRole="button"
          accessibilityLabel="בואו נמשיך"
          style={styles.avatarCta}
        >
          <Text style={styles.avatarCtaText}>בואו נמשיך</Text>
        </Pressable>
      </Animated.View>
    </StepShell>
  );
}

function AvatarGridItem({
  avatar,
  selected,
  onPress,
  index,
}: {
  avatar: AvatarDefinition;
  selected: boolean;
  onPress: () => void;
  index: number;
}) {
  const ty = useSharedValue(40);
  const opacity = useSharedValue(0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    const d = index * 60;
    ty.value = withDelay(d, withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) }));
    opacity.value = withDelay(d, withTiming(1, { duration: 200 }));
  }, []);

  useEffect(() => {
    if (selected) {
      pressScale.value = withSequence(
        withTiming(0.98, { duration: 60 }),
        withTiming(1, { duration: 120 })
      );
    }
  }, [selected]);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }, { scale: pressScale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.avatarItemWrap, wrapStyle]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={avatar.name}
        accessibilityState={{ selected }}
        style={[styles.avatarItem, selected && styles.avatarItemSelected]}
      >
        <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
        <Text style={[styles.avatarName, selected && styles.avatarNameActive]}>
          {avatar.name}
        </Text>
      </Pressable>
    </Animated.View>
  );
}


// ─── Custom slider for onboarding sim ──────────────────────────────────────

function OnboardingSlider({
  label, value, min, max, step, onChange, emoji, prefix = "", suffix = "",
  accentColor = "#0891b2", trackBg = "#cffafe", onInteract, showFingerHint = false,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; emoji: string; prefix?: string; suffix?: string;
  accentColor?: string; trackBg?: string; onInteract?: () => void; showFingerHint?: boolean;
}) {
  const trackRef = useRef<View>(null);
  const layoutRef = useRef({ x: 0, width: 0 });
  const propsRef = useRef({ min, max, step, onChange, onInteract });
  propsRef.current = { min, max, step, onChange, onInteract };
  const interactedRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        if (!interactedRef.current) { interactedRef.current = true; propsRef.current.onInteract?.(); }
        // Re-measure on touch start, iOS measureInWindow from onLayout can be stale in nested ScrollViews
        const pageX = evt.nativeEvent.pageX;
        trackRef.current?.measureInWindow((x: number, _y: number, width: number) => {
          layoutRef.current = { x, width };
          updateVal(pageX);
        });
      },
      onPanResponderMove: (evt) => updateVal(evt.nativeEvent.pageX),
    })
  ).current;

  function updateVal(pageX: number) {
    const { x, width } = layoutRef.current;
    if (width <= 0) return;
    const localX = Math.max(0, Math.min(pageX - x, width));
    // RTL: right = max, left = min
    const pct = 1 - (localX / width);
    const { min: mn, max: mx, step: st, onChange: cb } = propsRef.current;
    let v = mn + pct * (mx - mn);
    v = Math.round(v / st) * st;
    cb(Math.max(mn, Math.min(mx, v)));
  }

  const pct = (value - min) / (max - min);

  return (
    <View style={{ marginBottom: 18, overflow: "visible", zIndex: showFingerHint ? 100 : 1 }}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: `${prefix}${value.toLocaleString()}${suffix}` }}
    >
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 16 }}>{emoji}</Text>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#6b7280", writingDirection: "rtl" }}>{label}</Text>
        </View>
        <View style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: trackBg }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: accentColor }}>{prefix}{value.toLocaleString()}{suffix}</Text>
        </View>
      </View>
      <View
        ref={trackRef}
        style={{ height: 10, width: "100%", justifyContent: "center", borderRadius: 999, backgroundColor: trackBg, overflow: "visible", zIndex: 50 }}
        onLayout={(e) => {
          const { width } = e.nativeEvent.layout;
          trackRef.current?.measureInWindow((x: number) => { layoutRef.current = { x, width }; });
        }}
        {...panResponder.panHandlers}
      >
        {/* RTL fill, anchored to right */}
        <View style={{ position: "absolute", right: 0, height: "100%", borderRadius: 999, width: `${pct * 100}%`, backgroundColor: accentColor + "60" }} />
        <View style={{
          position: "absolute", right: `${pct * 100}%`, transform: [{ translateX: 16 }],
          height: 32, width: 32, borderRadius: 16, backgroundColor: accentColor,
          borderWidth: 3, borderColor: "#ffffff", alignItems: "center", justifyContent: "center",
          shadowColor: accentColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
          overflow: "visible", zIndex: 999,
        }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#ffffff" }} />
          {/* Finger hint, moves with thumb, always on top */}
          {showFingerHint && (
            <Animated.Text
              pointerEvents="none"
              entering={FadeIn.duration(400)}
              style={{ position: "absolute", top: 24, fontSize: 28, zIndex: 9999, elevation: 9999 }}
            >👆</Animated.Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Step: "לשחק עם מספרים" Simulator during onboarding ────────────────────

function SimOnboardingStep({ onNext }: { onNext: () => void }) {
  const [monthly, setMonthly] = useState(500);
  const [years, setYears] = useState(10);
  const [subStep, setSubStep] = useState<"play" | "summary">("play");
  const [hasInteracted, setHasInteracted] = useState(false);
  const autoSlideRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  // Auto-slide monthly from ₪500 to ₪5,000 over 3s, runs once on mount
  useEffect(() => {
    startTimeRef.current = Date.now();
    autoSlideRef.current = setInterval(() => {
      const t = Math.min((Date.now() - startTimeRef.current) / 3000, 1);
      const eased = t * t; // simple ease-in for natural feel
      const val = Math.round((500 + eased * 4500) / 50) * 50;
      setMonthly(val);
      if (t >= 1) {
        if (autoSlideRef.current) clearInterval(autoSlideRef.current);
        setHasInteracted(true);
      }
    }, 80);
    return () => { if (autoSlideRef.current) clearInterval(autoSlideRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps, run exactly once

  // Stop auto-slide when user interacts manually
  useEffect(() => {
    if (hasInteracted && autoSlideRef.current) {
      clearInterval(autoSlideRef.current);
      autoSlideRef.current = null;
    }
  }, [hasInteracted]);

  const finalAmount = calculateCompoundInterest(monthly, years, 0.10);
  const totalInvested = monthly * 12 * years;
  const totalGrowth = finalAmount - totalInvested;
  const growthPct = totalInvested > 0 ? ((totalGrowth / totalInvested) * 100).toFixed(0) : "0";

  const chartData: ChartDataPoint[] = [];
  const CHART_STEPS = Math.max(years * 4, 40);
  for (let s = 0; s <= CHART_STEPS; s++) {
    const t = s / CHART_STEPS;
    const yr = t * years;
    const val = calculateCompoundInterest(monthly, yr, 0.10);
    chartData.push({ x: t, y: finalAmount > 0 ? val / finalAmount : 0, label: `שנה ${Math.round(yr)}` });
  }

  const chartWidth = SCREEN_WIDTH - 80;

  // ── Screen 2: Summary ──
  if (subStep === "summary") {
    return (
      <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 24 }} edges={["top", "bottom"]}>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 16 }}>
            <ExpoImage source={FINN_HAPPY} style={{ width: 100, height: 100 }} contentFit="contain" />
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#64748b", textAlign: "center", writingDirection: "rtl" }}>
              הכסף שלך בעוד {years} שנים
            </Text>
            <Text style={{ fontSize: 38, fontWeight: "900", color: "#0891b2", textAlign: "center" }}>
              ₪{finalAmount.toLocaleString()}
            </Text>

            {/* Stats row */}
            <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
              <View style={simStyles.statCard}>
                <Text style={simStyles.statLabel}>סה"כ הושקע</Text>
                <Text style={simStyles.statValue}>₪{totalInvested.toLocaleString()}</Text>
              </View>
              <View style={[simStyles.statCard, { borderColor: "#bbf7d0", backgroundColor: "rgba(240,253,244,0.92)" }]}>
                <Text style={[simStyles.statLabel, { color: "#15803d" }]}>רווח מריבית דריבית</Text>
                <Text style={[simStyles.statValue, { color: "#16a34a" }]}>+₪{totalGrowth.toLocaleString()}</Text>
              </View>
            </View>

            {/* Growth badge */}
            <View style={simStyles.growthBadge}>
              <TrendingUp size={16} color="#16a34a" />
              <Text style={simStyles.growthText}>תשואה של {growthPct}%</Text>
            </View>

            {/* Finn encouragement */}
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, backgroundColor: "rgba(8,145,178,0.06)", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "rgba(8,145,178,0.12)", width: "100%" }}>
              <ExpoImage source={FINN_STANDARD} style={{ width: 36, height: 36 }} contentFit="contain" />
              <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: "#475569", writingDirection: "rtl", textAlign: "right", lineHeight: 19 }}>
                גם אם עכשיו לא מבינים, אנחנו נלמד הכל יחד!
              </Text>
            </View>
          </View>

          {/* Continue button */}
          <Pressable onPress={onNext} style={simStyles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך">
            <Text style={simStyles.continueBtnText}>המשך</Text>
          </Pressable>
          <View style={{ height: 16 }} />
        </SafeAreaView>
      </View>
    );
  }

  // ── Screen 1: Play with numbers ──
  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        {/* Progress bar */}
        <View style={[styles.topRow, { paddingHorizontal: 20, backgroundColor: "rgba(240,249,255,0.85)" }]}>
          <GlowBar current={2} />
        </View>

        <View style={{ flex: 1, paddingHorizontal: 20, justifyContent: "space-between" }}>
          {/* Finn + Title */}
          <View style={{ alignItems: "center", marginTop: 4, marginBottom: 6 }}>
            <ExpoImage source={FINN_STANDARD} style={{ width: 70, height: 70 }} contentFit="contain" />
            <Text style={{ fontSize: 18, fontWeight: "900", color: "#0c4a6e", textAlign: "center", writingDirection: "rtl", marginTop: 4 }}>
              לשחק עם המספרים
            </Text>
          </View>

          {/* Hero card, future value + chart (compact) */}
          <Animated.View entering={FadeInUp.delay(200).springify()} style={simStyles.heroCard}>
            <Text style={simStyles.heroLabel}>הכסף שלך בעוד {years} שנים</Text>
            <Text style={simStyles.heroValue}>₪{finalAmount.toLocaleString()}</Text>
            <GestureHandlerRootView style={{ marginTop: 6 }}>
              <SkiaInteractiveChart
                data={chartData}
                width={chartWidth - 32}
                height={100}
                lineColor="#0891b2"
                glowColor="#22d3ee"
                gradientColors={["rgba(34,211,238,0.18)", "rgba(34,211,238,0)"]}
                onScrub={() => { }}
                hapticMilestone={5}
              />
            </GestureHandlerRootView>
          </Animated.View>

          {/* Sliders */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={[simStyles.slidersCard, { position: "relative" }]}>
            <OnboardingSlider
              label="השקעה חודשית" value={monthly} min={50} max={20000} step={50}
              prefix="₪" emoji="💰" accentColor="#0891b2" trackBg="#cffafe" onChange={setMonthly}
              onInteract={() => setHasInteracted(true)}
              showFingerHint={!hasInteracted}
            />
            <OnboardingSlider
              label="טווח זמן" value={years} min={1} max={40} step={1}
              suffix=" שנים" emoji="📅" accentColor="#60a5fa" trackBg="#dbeafe" onChange={setYears}
              onInteract={() => setHasInteracted(true)}
            />
          </Animated.View>

          {/* Next button */}
          <Pressable onPress={() => setSubStep("summary")} style={simStyles.continueBtn} accessibilityRole="button" accessibilityLabel="הבא">
            <Text style={simStyles.continueBtnText}>הבא</Text>
          </Pressable>
          <View style={{ height: 8 }} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const simStyles = StyleSheet.create({
  // STITCH Premium, 3D glow hero card
  heroCard: {
    borderRadius: 24, borderWidth: 1, borderColor: "rgba(14,165,233,0.15)",
    padding: 20, paddingBottom: 10, marginBottom: 14, overflow: "hidden",
    backgroundColor: "#ffffff",
    shadowColor: "#0ea5e9", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 6,
  },
  heroLabel: {
    fontSize: 13, fontWeight: "700", color: "#64748b", textAlign: "center", writingDirection: "rtl", marginBottom: 4,
  },
  heroValue: {
    fontSize: 38, fontWeight: "900", color: "#0369a1", textAlign: "center", letterSpacing: -1,
    textShadowColor: "rgba(14,165,233,0.2)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },
  scrubBadge: {
    alignSelf: "center", backgroundColor: "#f0f9ff", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 5, marginTop: 6, borderWidth: 1, borderColor: "#bae6fd",
  },
  scrubText: { fontSize: 12, fontWeight: "700", color: "#0284c7" },
  // STITCH Premium, sliders card with soft depth
  slidersCard: {
    backgroundColor: "#ffffff", borderRadius: 22, borderWidth: 1,
    borderColor: "rgba(186,230,253,0.5)", padding: 20, marginBottom: 14,
    shadowColor: "#0c4a6e", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
  },
  // Stats cards, clean with subtle glow
  statCard: {
    flex: 1, backgroundColor: "#f8fafc", borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: "rgba(186,230,253,0.4)", alignItems: "center",
    shadowColor: "#0ea5e9", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statLabel: { fontSize: 11, fontWeight: "700", color: "#64748b", textAlign: "center", writingDirection: "rtl", marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  // Growth badge, green glow
  growthBadge: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#f0fdf4", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: "rgba(34,197,94,0.2)", marginBottom: 12,
    shadowColor: "#22c55e", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  growthText: { fontSize: 14, fontWeight: "800", color: "#16a34a", textAlign: "center", writingDirection: "rtl" },
  // STITCH Premium, big 3D CTA button
  continueBtn: {
    width: "100%", backgroundColor: "#0891b2", borderRadius: 18, paddingVertical: 20,
    alignItems: "center", borderBottomWidth: 4, borderBottomColor: "#0e7490",
    shadowColor: "#0891b2", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
  },
  continueBtnText: { fontSize: 18, fontWeight: "900", color: "#ffffff" },
});
// ─── Intro (personalisation splash) ──────────────────────────────────────────

interface IntroStepProps {
  onRegister: () => void;
  onGuest: () => void;
  onLoginSuccess: () => void;
}

function IntroStep({ onRegister, onGuest, onLoginSuccess }: IntroStepProps) {
  const [subStep, setSubStep] = useState<"welcome" | "choice" | "login">("welcome");
  const signIn = useAuthStore((s) => s.signIn);
  const { promptGoogleSignIn, isReady: googleReady } = useGoogleAuth();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const introRouter = useRouter();

  // Auto-check terms when returning from terms page after pressing "קראתי"
  useEffect(() => {
    if (subStep !== "choice") return;
    const id = setInterval(() => {
      if (consumeTermsAcceptedFlag()) setTermsAccepted(true);
    }, 300);
    return () => clearInterval(id);
  }, [subStep]);

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isLoginValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length > 0;

  // Entrance animations
  const finnScale = useSharedValue(0.8);
  const finnOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTy = useSharedValue(24);
  const ctaScale = useSharedValue(0);

  useEffect(() => {
    finnOpacity.value = withTiming(1, { duration: 400 });
    finnScale.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) });
    textOpacity.value = withDelay(300, withTiming(1, { duration: 300 }));
    textTy.value = withDelay(300, withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }));
    ctaScale.value = withDelay(600, withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) }));
  }, []);

  // Re-trigger content animation on sub-step change
  useEffect(() => {
    textOpacity.value = 0;
    textTy.value = 24;
    ctaScale.value = 0;
    textOpacity.value = withTiming(1, { duration: 250 });
    textTy.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) });
    ctaScale.value = withDelay(150, withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }));
  }, [subStep]);

  const finnStyle = useAnimatedStyle(() => ({
    opacity: finnOpacity.value,
    transform: [{ scale: finnScale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTy.value }],
  }));
  const ctaAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: ctaScale.value }] }));

  const inputStyle = {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: "#1e293b",
    writingDirection: "rtl" as const,
    textAlign: "right" as const,
  };

  // ── Welcome sub-state ──
  if (subStep === "welcome") {
    return (
      <SafeAreaView style={introStyles.shell} edges={["top", "bottom"]}>
        <Animated.View style={[introStyles.finnWrap, finnStyle]}>
          <LinearGradient colors={["#ecfeff", "#f0fdfa"]} style={introStyles.finnBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <ExpoImage source={FINN_HELLO} style={{ width: 160, height: 160 }} contentFit="contain" accessibilityLabel="פין הכריש מנופף שלום" />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[introStyles.textBlock, textStyle]}>
          <Text style={introStyles.title}>
            {"ברוך הבא ל-"}
            <Text style={introStyles.titleAccent}>{"FinPlay"}</Text>
            {"!"}
          </Text>
          <Text style={introStyles.subtitle}>
            {"בוא נהפוך את הכסף שלך למשחק מהנה."}
          </Text>
        </Animated.View>

        <View style={{ alignItems: "center", gap: 16 }}>
          <Pressable onPress={() => setSubStep("choice")} style={introStyles.cta} accessibilityRole="button" accessibilityLabel="בואו נתחיל">
            <Text style={introStyles.ctaText}>בואו נתחיל</Text>
          </Pressable>
          <Pressable onPress={() => setSubStep("login")} accessibilityRole="link" accessibilityLabel="כבר יש לך חשבון? התחבר כאן">
            <Text style={introStyles.loginLink}>
              {"כבר יש לך חשבון? "}
              <Text style={introStyles.loginLinkAccent}>{"התחבר כאן"}</Text>
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Choice sub-state ──
  if (subStep === "choice") {
    return (
      <SafeAreaView style={introStyles.shell} edges={["top", "bottom"]}>
        <Animated.View style={[introStyles.finnWrap, finnStyle]}>
          <LinearGradient colors={["#ecfeff", "#f0fdfa"]} style={introStyles.finnBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <ExpoImage source={FINN_STANDARD} style={{ width: 140, height: 140 }} contentFit="contain" />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[introStyles.textBlock, textStyle]}>
          <Text style={introStyles.title}>{"איך נתחיל?"}</Text>
        </Animated.View>

        <Animated.View style={[ctaAnimStyle, { alignItems: "center", gap: 10, width: "100%" }]}>
          {/* Terms checkbox, must accept before guest path */}
          <Pressable
            onPress={() => setTermsAccepted((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityLabel="אני מסכים לתנאי השימוש ומדיניות הפרטיות"
            accessibilityState={{ checked: termsAccepted }}
            style={{ flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 8, marginTop: 4 }}
          >
            <View
              style={{
                height: 20, width: 20, alignItems: "center", justifyContent: "center",
                borderRadius: 4, borderWidth: 1.5,
                borderColor: termsAccepted ? "#0891b2" : "#cbd5e1",
                backgroundColor: termsAccepted ? "#0891b2" : "#f8fafc",
              }}
            >
              {termsAccepted && (
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#ffffff" }}>✓</Text>
              )}
            </View>
            <Text
              style={{ marginRight: 8, flex: 1, fontSize: 12, color: "#64748b", writingDirection: "rtl", textAlign: "right" }}
            >
              {"אני מסכים/ה ל"}
              <Text
                style={{ color: "#0891b2", textDecorationLine: "underline" }}
                accessibilityRole="link"
                accessibilityLabel="תנאי השימוש ומדיניות הפרטיות"
                onPress={(e) => { e.stopPropagation(); introRouter.push("/(auth)/terms" as never); }}
              >
                תנאי השימוש ומדיניות הפרטיות
              </Text>
            </Text>
          </Pressable>

          <Pressable
            onPress={() => { if (termsAccepted) onRegister(); }}
            style={[introStyles.cta, { width: "100%", alignItems: "center", paddingHorizontal: 0, opacity: termsAccepted ? 1 : 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel="הרשם"
            accessibilityState={{ disabled: !termsAccepted }}
          >
            <Text style={introStyles.ctaText}>הרשם</Text>
          </Pressable>

          <Pressable
            onPress={() => { if (termsAccepted) onGuest(); }}
            accessibilityRole="button"
            accessibilityLabel="התחל ללא הרשמה"
            accessibilityState={{ disabled: !termsAccepted }}
            style={[introStyles.ctaOutline, { opacity: termsAccepted ? 1 : 0.5, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
          >
            <ExpoImage
              source={FINN_HELLO}
              style={{ width: 28, height: 28 }}
              contentFit="contain"
              accessible={false}
            />
            <Text style={introStyles.ctaOutlineText}>התחל ללא הרשמה</Text>
          </Pressable>

          <Pressable onPress={() => setSubStep("welcome")} style={{ marginTop: 2 }} accessibilityRole="button" accessibilityLabel="חזרה" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={introStyles.loginLink}>{"חזרה"}</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── Login sub-state ──
  return (
    <SafeAreaView style={introStyles.shell} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1, width: "100%", alignItems: "center", justifyContent: "center" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Animated.View style={[introStyles.finnWrap, finnStyle]}>
          <LinearGradient colors={["#ecfeff", "#f0fdfa"]} style={introStyles.finnBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <ExpoImage source={FINN_STANDARD} style={{ width: 120, height: 120 }} contentFit="contain" />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[introStyles.textBlock, textStyle, { marginBottom: 24 }]}>
          <Text style={introStyles.title}>{"התחברות"}</Text>
        </Animated.View>

        <Animated.View style={[ctaAnimStyle, { width: "100%", gap: 10 }]}>
          {/* Google Sign-In */}
          <Pressable
            disabled={!googleReady}
            onPress={() => promptGoogleSignIn()}
            accessibilityRole="button"
            accessibilityLabel="התחבר עם Google"
            style={introStyles.googleBtn}
          >
            <Text style={{ fontSize: 18, marginRight: 8, color: "#1e293b" }}>G</Text>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#1e293b" }}>התחבר עם Google</Text>
          </Pressable>

          {/* Divider */}
          <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 6 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
            <Text style={{ marginHorizontal: 12, fontSize: 13, color: "#64748b" }}>או</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
          </View>

          {/* Email */}
          <TextInput
            style={inputStyle}
            placeholder="אימייל"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="אימייל" />

          {/* Password */}
          <View>
            <TextInput
              style={{ ...inputStyle, paddingLeft: 48 }}
              placeholder="סיסמה"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="סיסמה" />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ position: "absolute", left: 14, top: 0, bottom: 0, justifyContent: "center" }}
            >
              <Text style={{ fontSize: 13, color: "#0891b2", fontWeight: "600" }}>
                {showPassword ? "הסתר" : "הצג"}
              </Text>
            </Pressable>
          </View>

          {/* Login button */}
          <Pressable
            disabled={!isLoginValid}
            onPress={() => {
              if (isLoginValid) {
                signIn("", email.trim());
                onLoginSuccess();
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="התחבר"
            accessibilityState={{ disabled: !isLoginValid }}
            style={[introStyles.cta, { paddingHorizontal: 0, width: "100%", alignItems: "center", opacity: isLoginValid ? 1 : 0.5 }]}
          >
            <Text style={introStyles.ctaText}>התחבר</Text>
          </Pressable>

          <Pressable onPress={() => setSubStep("welcome")} style={{ alignSelf: "center", marginTop: 8 }} accessibilityRole="button" accessibilityLabel="חזרה" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={introStyles.loginLink}>{"חזרה"}</Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── BuildItem ────────────────────────────────────────────────────────────────

const BUILD_ITEMS = [
  { text: "מנתח את הפרופיל שלך...", icon: "🧠" },
  { text: "מתאים תכנים לרמת הידע שלך...", icon: "📚" },
  { text: "בונה מסלול למידה מותאם...", icon: "🗺️" },
  { text: "מגדיר יעדים כלכליים...", icon: "🎯" },
  { text: "הכל מוכן! 🎉", icon: "✅" },
];

function BuildItem({ text, icon, visible, isLast }: { text: string; icon: string; visible: boolean; isLast: boolean }) {
  const opacity = useSharedValue(0);
  const tx = useSharedValue(18);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 280 });
      tx.value = withSpring(0, { damping: 14, stiffness: 120 });
    }
  }, [visible]);

  const s = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }],
  }));

  return (
    <Animated.View style={[buildStyles.item, s]}>
      <View style={[buildStyles.iconCircle, isLast && buildStyles.iconCircleGold]}>
        <Text style={{ fontSize: 14 }}>{icon}</Text>
      </View>
      <Text style={[buildStyles.itemText, isLast && buildStyles.itemTextLast]}>{text}</Text>
    </Animated.View>
  );
}

// ─── Building Profile Screen ──────────────────────────────────────────────────

function BuildingProfileScreen({ onDone }: { onDone: () => void }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const progress = useSharedValue(0);
  const finnOpacity = useSharedValue(0);

  useEffect(() => {
    finnOpacity.value = withTiming(1, { duration: 400 });
    progress.value = withTiming(1, {
      duration: BUILD_ITEMS.length * 620,
      easing: Easing.out(Easing.quad),
    });

    BUILD_ITEMS.forEach((_, i) => {
      const delay = 300 + i * 620;
      const timer = setTimeout(() => setVisibleCount(i + 1), delay);
      return timer;
    });

    const doneTimer = setTimeout(onDone, 300 + BUILD_ITEMS.length * 620 + 500);
    return () => clearTimeout(doneTimer);
  }, []);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as `${number}%`,
  }));
  const finnStyle = useAnimatedStyle(() => ({ opacity: finnOpacity.value }));

  return (
    <ImageBackground source={CHAT_BG} style={{ flex: 1 }} resizeMode="cover">
      <BubbleOverlay />
      <SafeAreaView style={buildStyles.shell} edges={["top", "bottom"]}>
        <Animated.View style={[buildStyles.finnWrap, finnStyle]}>
          <ExpoImage source={FINN_STANDARD} style={{ width: 110, height: 110 }} contentFit="contain" />
        </Animated.View>

        <Text style={buildStyles.title}>בונים את הפרופיל שלך...</Text>

        <View style={buildStyles.progressBg}>
          <Animated.View style={[buildStyles.progressFill, progressStyle]}>
            <LinearGradient
              colors={["#22d3ee", "#0891b2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
        </View>

        <View style={buildStyles.itemsWrap}>
          {BUILD_ITEMS.map((item, i) => (
            <BuildItem
              key={i}
              text={item.text}
              icon={item.icon}
              visible={i < visibleCount}
              isLast={i === BUILD_ITEMS.length - 1}
            />
          ))}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

type FlowStep =
  | "intro" | "dream" | "first-sim" | "goal" | "knowledge" | "age" | "learning-time"
  | "learning-style" | "deadline" | "daily-goal" | "companion" | "finance-experts"
  | "avatar" | "building-profile" | "profile-summary" | "celebration";

interface Collected {
  financialDream: FinancialDream | null;
  financialGoal: FinancialGoal | null;
  knowledgeLevel: KnowledgeLevel | null;
  ageGroup: AgeGroup | null;
  birthYear: number | null;
  learningTime: LearningTime | null;
  learningStyle: LearningStyle | null;
  deadlineStress: DeadlineStress | null;
  dailyGoalMinutes: DailyGoalMinutes | null;
  companionId: CompanionId | null;
  financeExperts: string[];
  avatarId: string | null;
}

interface ProfilingFlowProps {
  mode?: "onboarding" | "redo";
  onRedoComplete?: () => void;
}

export function ProfilingFlow({ mode = "onboarding", onRedoComplete }: ProfilingFlowProps = {}) {
  const router = useRouter();
  const addXP = useEconomyStore((s) => s.addXP);
  const addCoins = useEconomyStore((s) => s.addCoins);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const enterGuestMode = useAuthStore((s) => s.enterGuestMode);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const devResetProgress = useAuthStore((s) => s.devResetProgress);
  const existingProfile = useAuthStore((s) => s.profile);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isGuest = useAuthStore((s) => s.isGuest);
  const displayName = useAuthStore((s) => s.displayName) ?? "You";
  const { playSound } = useSoundEffect();

  const isRedo = mode === "redo";
  // Skip intro if user already registered/signed-in or is guest (came back from register screen)
  const [step, setStep] = useState<FlowStep>(isRedo || isAuthenticated || isGuest ? "dream" : "intro");
  const [returnToSummary, setReturnToSummary] = useState(false);
  const [collected, setCollected] = useState<Collected>(() => {
    if (isRedo && existingProfile) {
      return {
        financialDream: existingProfile.financialDream ?? null,
        financialGoal: existingProfile.financialGoal ?? null,
        knowledgeLevel: existingProfile.knowledgeLevel ?? null,
        ageGroup: existingProfile.ageGroup ?? null,
        birthYear: existingProfile.birthYear ?? null,
        learningTime: existingProfile.learningTime ?? null,
        learningStyle: existingProfile.learningStyle ?? null,
        deadlineStress: existingProfile.deadlineStress ?? null,
        dailyGoalMinutes: existingProfile.dailyGoalMinutes ?? null,
        companionId: existingProfile.companionId ?? null,
        financeExperts: [],
        avatarId: existingProfile.avatarId ?? null,
      };
    }
    return {
      financialDream: null, financialGoal: null, knowledgeLevel: null, ageGroup: null,
      birthYear: null, learningTime: null, learningStyle: null,
      deadlineStress: null, dailyGoalMinutes: null, companionId: null, financeExperts: [], avatarId: null,
    };
  });

  const screenOpacity = useSharedValue(1);
  const screenScale = useSharedValue(1);
  const screenTy = useSharedValue(0);
  const slideStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ scale: screenScale.value }, { translateY: screenTy.value }],
  }));
  const [showBubbles, setShowBubbles] = useState(false);
  const bubbleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persistent Finn overlay state, mirrors StepShell's isTyping via finnTriggerRef
  const [isGlobalTyping, setIsGlobalTyping] = useState(false);
  const globalTypingResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    finnTriggerRef.current = () => {
      setIsGlobalTyping(true);
      if (globalTypingResetRef.current) clearTimeout(globalTypingResetRef.current);
      globalTypingResetRef.current = setTimeout(() => setIsGlobalTyping(false), AUTO_ADVANCE_MS + 400);
    };
    return () => {
      finnTriggerRef.current = null;
      if (globalTypingResetRef.current) clearTimeout(globalTypingResetRef.current);
    };
  }, []);

  function slide(nextStep: FlowStep, patch: Partial<Collected>) {
    setIsGlobalTyping(false);
    if (globalTypingResetRef.current) clearTimeout(globalTypingResetRef.current);
    tapHaptic();
    setShowBubbles(true);
    playSound('bubble_transition');
    if (bubbleTimeout.current) clearTimeout(bubbleTimeout.current);
    bubbleTimeout.current = setTimeout(() => setShowBubbles(false), 900);

    function doUpdate() {
      setCollected((prev) => ({ ...prev, ...patch }));
      setStep(nextStep);
      // Bloom in, fade + spring scale/Y from slightly below
      screenOpacity.value = 0;
      screenScale.value = 0.94;
      screenTy.value = 18;
      screenOpacity.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) });
      screenScale.value = withSpring(1, { damping: 22, stiffness: 280, mass: 0.8 });
      screenTy.value = withSpring(0, { damping: 22, stiffness: 280, mass: 0.8 });
    }
    // Soft fade-out, slides up and fades
    screenOpacity.value = withTiming(0, { duration: 260, easing: Easing.inOut(Easing.quad) }, () => {
      "worklet";
      runOnJS(doUpdate)();
    });
    screenScale.value = withTiming(0.95, { duration: 260, easing: Easing.inOut(Easing.quad) });
    screenTy.value = withTiming(-10, { duration: 260, easing: Easing.in(Easing.cubic) });
  }

  function handleDone() {
    if (isRedo) {
      // Reset all progress (XP, coins, chapters, etc.), user starts fresh
      devResetProgress();
      updateProfile({
        financialDream: collected.financialDream ?? undefined,
        financialGoal: collected.financialGoal ?? undefined,
        knowledgeLevel: collected.knowledgeLevel ?? undefined,
        ageGroup: collected.ageGroup ?? undefined,
        birthYear: collected.birthYear ?? undefined,
        learningTime: collected.learningTime ?? undefined,
        learningStyle: collected.learningStyle ?? undefined,
        deadlineStress: collected.deadlineStress ?? undefined,
        dailyGoalMinutes: collected.dailyGoalMinutes ?? undefined,
        companionId: collected.companionId ?? undefined,
        avatarId: collected.avatarId ?? undefined,
      });
      onRedoComplete?.();
      return;
    }
    addXP(ONBOARDING_XP, "onboarding");
    addCoins(50);
    completeOnboarding({
      displayName,
      financialDream: collected.financialDream ?? null,
      financialGoal: collected.financialGoal ?? "unsure",
      knowledgeLevel: collected.knowledgeLevel ?? "beginner",
      ageGroup: collected.ageGroup ?? "adult",
      birthYear: collected.birthYear ?? (CY - 22),
      learningTime: collected.learningTime ?? "during-day",
      learningStyle: collected.learningStyle ?? "no-preference",
      deadlineStress: collected.deadlineStress ?? "maybe",
      dailyGoalMinutes: collected.dailyGoalMinutes ?? 10,
      companionId: collected.companionId ?? "warren-buffett",
      avatarId: collected.avatarId ?? null,
      ownedAvatars: [],
    });
  }

  function editSummaryStep(target: EditableStep) {
    setReturnToSummary(true);
    slide(target as FlowStep, {});
  }

  if (step === "celebration") return <CelebrationScreen onDone={handleDone} />;
  if (step === "profile-summary") return <ProfileSummaryScreen collected={collected} onDone={() => setStep("building-profile")} onEditStep={editSummaryStep} />;
  if (step === "building-profile") return <BuildingProfileScreen onDone={isRedo ? handleDone : () => setStep("celebration")} />;
  if (!isRedo && step === "intro") return (
    <IntroStep
      onRegister={() => router.push("/register" as never)}
      onGuest={() => {
        enterGuestMode();
        slide("dream", {});
      }}
      onLoginSuccess={() => router.replace("/" as never)}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff", overflow: "hidden" }}>
      <Animated.View style={[{ flex: 1 }, slideStyle]}>
        {step === "dream" && <DreamStep onNext={(v) => {
          if (returnToSummary) { setReturnToSummary(false); slide("profile-summary", { financialDream: v }); }
          else { slide("goal", { financialDream: v }); }
        }} />}
        {step === "goal" && <GoalStep dream={collected.financialDream} onNext={(v) => {
          if (returnToSummary) { setReturnToSummary(false); slide("profile-summary", { financialGoal: v }); }
          else { slide("first-sim", { financialGoal: v }); }
        }} />}
        {step === "first-sim" && (
          <SimOnboardingStep onNext={() => slide("knowledge", {})} />
        )}
        {step === "knowledge" && <KnowledgeStep goal={collected.financialGoal} onNext={(v) => {
          if (returnToSummary) { setReturnToSummary(false); slide("profile-summary", { knowledgeLevel: v }); }
          else { slide("age", { knowledgeLevel: v }); }
        }} />}
        {step === "age" && <AgeStep knowledge={collected.knowledgeLevel} onNext={(ag, by) => slide("learning-time", { ageGroup: ag, birthYear: by })} />}
        {step === "learning-time" && <LearningTimeStep onNext={(v) => slide("learning-style", { learningTime: v })} />}
        {step === "learning-style" && <LearningStyleStep ageGroup={collected.ageGroup} birthYear={collected.birthYear} onNext={(v) => slide("daily-goal", { learningStyle: v })} />}
        {step === "daily-goal" && <DailyGoalStep onNext={(v) => {
          if (returnToSummary) { setReturnToSummary(false); slide("profile-summary", { dailyGoalMinutes: v }); }
          else { slide("profile-summary", { dailyGoalMinutes: v }); }
        }} />}
      </Animated.View>

      {/* Persistent Finn, outside slideStyle so he stays fixed during transitions */}
      {STEPS_WITH_PERSISTENT_FINN.has(step) && (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <SafeAreaView style={{ paddingHorizontal: 20 }} edges={["top"]}>
            {/* Match StepShell topRow: paddingTop:12 + GlowBar height:14 = 26 */}
            <View style={{ height: 26 }} />
            {/* Match StepShell questionBlock paddingTop:12 */}
            <View style={{ height: 12 }} />
            {/* Finn on the right, same flexDirection as StepShell's questionBlock row */}
            <View style={{ flexDirection: 'row-reverse' }}>
              <View style={{ width: 110, height: 110 }}>
                <ExpoImage
                  key={isGlobalTyping ? 'playing' : 'idle'}
                  source={FINN_TABLET}
                  style={{ width: 110, height: 110, backgroundColor: '#ffffff' }}
                  contentFit="contain"
                  autoplay={isGlobalTyping}
                  accessible={false}
                />
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 14, backgroundColor: '#ffffff' }} />
              </View>
            </View>
          </SafeAreaView>
        </View>
      )}

      {/* Bubble transition overlay */}
      {showBubbles && (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          {/* Main central burst */}
          <LottieView
            source={require("../../../assets/lottie/Bubbles.json")}
            style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.6, position: "absolute", top: "5%", alignSelf: "center" }}
            autoPlay
            loop={false}
            speed={1.2}
            renderMode="SOFTWARE"
          />
          {/* Bottom-left cluster */}
          <LottieView
            source={require("../../../assets/lottie/jumping blue bubbles.json")}
            style={{ width: SCREEN_WIDTH * 0.65, height: SCREEN_WIDTH * 0.65, position: "absolute", bottom: "8%", left: "0%" }}
            autoPlay
            loop={false}
            speed={1.1}
            renderMode="SOFTWARE"
          />
          {/* Top-right cluster, delayed via slower speed for stagger feel */}
          <LottieView
            source={require("../../../assets/lottie/jumping blue bubbles.json")}
            style={{ width: SCREEN_WIDTH * 0.5, height: SCREEN_WIDTH * 0.5, position: "absolute", top: "2%", right: "-5%" }}
            autoPlay
            loop={false}
            speed={0.9}
            renderMode="SOFTWARE"
          />
          {/* Mid-screen accent */}
          <LottieView
            source={require("../../../assets/lottie/Bubbles.json")}
            style={{ width: SCREEN_WIDTH * 0.7, height: SCREEN_WIDTH * 0.7, position: "absolute", top: "35%", left: "-10%" }}
            autoPlay
            loop={false}
            speed={1.5}
            renderMode="SOFTWARE"
          />
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
  },
  topRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingTop: 12,
  },
  storyBarWrap: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
  },
  storySegmentBg: {
    flex: 1,
    height: 4,
    borderRadius: 99,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  storySegmentFill: {
    flex: 1,
    borderRadius: 99,
  },
  stepCounter: {
    fontSize: 12,
    fontWeight: "700",
    color: "#52525b",
    letterSpacing: 0.8,
  },
  questionBlock: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  questionRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  mascotEmoji: {
    fontSize: 60,
    marginBottom: 14,
  },
  question: {
    fontSize: 24,
    fontWeight: "900",
    color: "#18181b",
    lineHeight: 32,
    marginBottom: 4,
    writingDirection: "rtl",
    textAlign: "right",
  },
  hint: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
    writingDirection: "rtl",
    textAlign: "right",
  },
  optionsArea: {
    flex: 1,
  },
  chatBubble: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 18,
    borderRadius: 18,
    borderTopRightRadius: 4,
    borderWidth: 1.5,
    borderColor: "rgba(34,211,238,0.3)",
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  finnTabletWrap: {
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "rgba(34,211,238,0.45)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  typingDotsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    alignSelf: "flex-end",
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#0891b2",
  },
  questionBubble: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
    writingDirection: "rtl",
    textAlign: "right",
  },
  hintBubble: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0ea5e9",
    marginTop: 4,
    writingDirection: "rtl",
    textAlign: "right",
    paddingRight: 16,
    marginRight: 8,
  },
  // Cards
  cardWrap: {
    marginBottom: 10,
  },
  cardGlow: {
    borderRadius: 18,
    backgroundColor: "#0891b2",
    opacity: 0,
  },
  tapCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  tapCardSelected: {
    borderColor: "#0891b2",
    backgroundColor: "rgba(8,145,178,0.08)",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  tapCardLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4b5563",
    writingDirection: "rtl",
    textAlign: "right",
    lineHeight: 24,
  },
  tapCardLabelActive: {
    color: "#0891b2",
  },
  tapCardSub: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 6,
    fontWeight: "500",
    writingDirection: "rtl",
    textAlign: "right",
    lineHeight: 18,
  },
  tapCardSubActive: {
    color: "#0891b2",
  },
  checkDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0891b2",
    marginRight: 10,
  },
  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  gridCardWrap: {
    width: "48%",
    flexShrink: 0,
  },
  gridCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  gridEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4b5563",
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 22,
  },
  // Poll (Q6)
  pollRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  pollBtn: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    paddingVertical: 22,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pollBtnSelected: {
    borderColor: "#0891b2",
    backgroundColor: "rgba(8,145,178,0.08)",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  pollEmoji: {
    fontSize: 28,
  },
  pollLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
    writingDirection: "rtl",
    textAlign: "center",
  },
  pollLabelSelected: {
    color: "#0891b2",
  },
  // Confetti
  confettiOrigin: {
    position: "absolute",
    alignSelf: "center",
    top: "40%",
  },
  confettiDot: {
    position: "absolute",
  },
  // Celebration
  celebShell: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  celebBadge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#ecfeff",
    borderWidth: 2,
    borderColor: "#0891b2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 18,
  },
  celebEmoji: {
    fontSize: 56,
  },
  celebRewards: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  rewardPill: {
    backgroundColor: "#ecfeff",
    borderWidth: 1,
    borderColor: "#0891b2",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  rewardPillGold: {
    backgroundColor: "#fffbeb",
    borderColor: "#f59e0b",
  },
  rewardXP: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0891b2",
  },
  rewardCoins: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fbbf24",
  },
  celebTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#18181b",
    textAlign: "center",
    writingDirection: "rtl",
    marginBottom: 10,
  },
  celebSub: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 23,
    marginBottom: 36,
  },
  celebCTA: {
    backgroundColor: "#0891b2",
    borderRadius: 999,
    paddingHorizontal: 52,
    paddingVertical: 17,
    borderBottomWidth: 4,
    borderBottomColor: "#0e7490",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  celebCTAText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  // Avatar picker
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  avatarItemWrap: {
    width: "31%",
  },
  avatarItem: {
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 110,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarItemSelected: {
    borderColor: "#d4a017",
    backgroundColor: "rgba(212, 160, 23, 0.1)",
    shadowColor: "#d4a017",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  avatarEmoji: {
    fontSize: 42,
    marginBottom: 8,
  },
  avatarName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4b5563",
    textAlign: "center",
    writingDirection: "rtl",
  },
  avatarNameActive: {
    color: "#fbbf24",
  },
  avatarCtaWrap: {
    marginTop: 24,
    alignItems: "center",
  },
  avatarCta: {
    backgroundColor: "#0891b2",
    borderRadius: 999,
    paddingHorizontal: 52,
    paddingVertical: 16,
    borderBottomWidth: 4,
    borderBottomColor: "#0e7490",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarCtaText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
});



// ─── Intro splash styles ───────────────────────────────────────────────────────

const introStyles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  finnWrap: {
    marginBottom: 28,
  },
  finnBg: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#18181b",
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 36,
    marginBottom: 14,
  },
  titleAccent: {
    color: "#0891b2",
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 24,
  },
  cta: {
    backgroundColor: "#0891b2",
    borderRadius: 999,
    paddingHorizontal: 60,
    paddingVertical: 17,
    borderBottomWidth: 4,
    borderBottomColor: "#0e7490",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  ctaText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  loginLink: {
    fontSize: 14,
    color: "#6b7280",
    writingDirection: "rtl",
  },
  loginLinkAccent: {
    color: "#0891b2",
    fontWeight: "700",
  },
  ctaOutline: {
    borderRadius: 999,
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    width: "100%",
    alignItems: "center",
  },
  ctaOutlineText: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "700",
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    paddingVertical: 14,
    width: "100%",
  },
});

// ─── Building profile styles ───────────────────────────────────────────────────

const buildStyles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  finnWrap: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#18181b",
    writingDirection: "rtl",
    marginBottom: 24,
    textAlign: "center",
  },
  progressBg: {
    width: "100%",
    height: 14,
    backgroundColor: "#e5e7eb",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 36,
    borderWidth: 1,
    borderColor: "#d1d5db",
    transform: [{ scaleX: -1 }],
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  itemsWrap: {
    width: "100%",
    gap: 16,
  },
  item: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ecfeff",
    borderWidth: 1.5,
    borderColor: "#0891b2",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleGold: {
    backgroundColor: "#fffbeb",
    borderColor: "#f59e0b",
  },
  itemText: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "600",
    writingDirection: "rtl",
    flex: 1,
    textAlign: "right",
  },
  itemTextLast: {
    color: "#0891b2",
    fontWeight: "900",
  },
});
