import { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, useColorScheme, Modal } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import LottieView from "lottie-react-native";
import { LottieIcon } from "../../components/ui/LottieIcon";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Zap, Star, Target, ChevronRight, Trophy,
  Crown, Swords, Pencil, X,
} from "lucide-react-native";
import { useEconomyStore } from "../economy/useEconomyStore";
import { useDuelsStore } from "../social/useDuelsStore";
import { useAuthStore } from "../auth/useAuthStore";
import { useSubscriptionStore } from "../subscription/useSubscriptionStore";
import { HeartsDisplay } from "../subscription/HeartsUI";
import { getPyramidStatus } from "../../utils/progression";
import { TransitionOverlay } from "../../components/ui/TransitionOverlay";
import {
  useEntranceAnimation,
  fadeInScale,
  fadeInUp,
  slideInLeft,
  slideInRight,
  SPRING_BOUNCY,
} from "../../utils/animations";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { GoldCircleBadge } from "../../components/ui/GoldCircleBadge";
import { useReferralStore } from "../social/useReferralStore";
import { computeReferralTier } from "../social/referralData";
import { getAvatarById, DEFAULT_AVATAR_EMOJI } from "../avatars/avatarData";
import { EditProfileModal } from "./EditProfileModal";
import { ProfilingFlow } from "../onboarding/ProfilingFlow";
import { useTheme } from "../../hooks/useTheme";
import { ProBadge } from "../../components/ui/ProBadge";
import { useStreakCelebration } from "../../hooks/useStreakCelebration";
import { DailyLearningSummary } from "../daily-summary/DailyLearningSummary";
import { useWalkthroughGlowTarget } from "../onboarding/AppWalkthroughOverlay";

const GOAL_LABELS: Record<string, string> = {
  "cash-flow": "💸 תזרים מזומנים",
  "investing": "📈 השקעות",
  "army-release": "🪖 שחרור מצה\"ל",
  "expand-horizons": "🌍 הרחבת אופקים",
  "unsure": "🤷 עוד לא בטוח",
};

const KNOWLEDGE_LABELS: Record<string, string> = {
  none: "🤔 מתחיל לגמרי",
  beginner: "📖 יודע קצת",
  some: "💡 מבין בסיס",
  experienced: "🧠 מנוסה",
  expert: "🐺 זאב וול סטריט",
};

const COMPANION_LABELS: Record<string, string> = {
  "warren-buffett": "🦈 קפטן שארק — חכם",
  "moshe-peled": "🦈 קפטן שארק — תכל'סי",
  "rachel": "🦈 קפטן שארק — חם",
  "robot": "🦈 קפטן שארק — אנליטי",
};

const DAILY_LABELS: Record<number, string> = {
  5: "5 דק׳ ביום",
  10: "10 דק׳ ביום",
  15: "15 דק׳ ביום",
  30: "30 דק׳ ביום",
};

const LAYER_NAMES_HE: Record<number, string> = {
  1: "יסודות",
  2: "ביטחון",
  3: "יציבות",
  4: "צמיחה",
  5: "חופש כלכלי",
};

export function ProfileScreen() {
  const isFocused = useIsFocused();
  const router = useRouter();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [redoOnboardingVisible, setRedoOnboardingVisible] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<'referral' | null>(null);
  const theme = useTheme();
  const isDark = useColorScheme() === "dark";
  const xp = useEconomyStore((s) => s.xp);
  const coins = useEconomyStore((s) => s.coins);
  const streak = useEconomyStore((s) => s.streak);
  const duelRecord = useDuelsStore((s) => s.record);
  const displayName = useAuthStore((s) => s.displayName);
  const profile = useAuthStore((s) => s.profile);
  const isPro = useSubscriptionStore((s) => s.tier === "pro" && s.status === "active");
  const referredFriends = useReferralStore((s) => s.referredFriends);
  const { showStreakCelebration } = useStreakCelebration();
  const referralTier = computeReferralTier(referredFriends.length);
  const hasGoldFrame = referredFriends.length >= 3;
  const hasWhaleBadge = referredFriends.length >= 5;
  const { level, layer, xpToNextLevel, progressToNextLevel } = getPyramidStatus(xp);
  const [showStagePopup, setShowStagePopup] = useState(false);
  const avatarDef = getAvatarById(profile?.avatarId ?? null);
  const avatarEmoji = avatarDef?.emoji ?? DEFAULT_AVATAR_EMOJI;
  const avatarName = avatarDef?.name ?? null;

  // Entrance animations
  const avatarStyle = useEntranceAnimation(fadeInScale, { delay: 0, spring: SPRING_BOUNCY });
  const streakStyle = useEntranceAnimation(fadeInUp, { delay: 100 });
  const xpCardStyle = useEntranceAnimation(fadeInUp, { delay: 180 });
  const statsLeftStyle = useEntranceAnimation(slideInLeft, { delay: 260 });
  const statsRightStyle = useEntranceAnimation(slideInRight, { delay: 260 });
  const duelCardStyle = useEntranceAnimation(fadeInUp, { delay: 340 });
  const profileInfoStyle = useEntranceAnimation(fadeInUp, { delay: 420 });
  const actionsStyle = useEntranceAnimation(fadeInUp, { delay: 660 });

  // PRO card pulsing gold border
  const proBorderOpacity = useSharedValue(0.4);
  useEffect(() => {
    proBorderOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.4, { duration: 1000 }),
      ),
      -1,
      true,
    );
    return () => { cancelAnimation(proBorderOpacity); };
  }, []);
  const proBorderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(250,204,21,${proBorderOpacity.value})`,
    shadowOpacity: proBorderOpacity.value * 0.5,
  }));

  // ---- Walkthrough: bridge CTA glow ----
  const glowTarget = useWalkthroughGlowTarget();
  const bridgeIsGlowTarget = glowTarget === "bridge-cta";

  const bridgePulse = useSharedValue(0);
  useEffect(() => {
    if (bridgeIsGlowTarget) {
      bridgePulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.3, { duration: 600 }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(bridgePulse);
      bridgePulse.value = 0;
    }
  }, [bridgeIsGlowTarget]);

  const bridgeGlowStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(56, 189, 248, ${bridgePulse.value})`,
    borderWidth: bridgePulse.value > 0.05 ? 2.5 : 1.5,
    shadowColor: "#38bdf8",
    shadowOpacity: bridgePulse.value * 0.6,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: bridgePulse.value > 0.05 ? 10 : 4,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={[]}>
        {/* Sticky close button — always visible */}
        <View style={styles.stickyCloseRow}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as never)} style={[styles.closeBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.85)" }]} accessibilityRole="button" accessibilityLabel="סגור פרופיל" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={20} color={theme.textMuted} />
          </Pressable>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
        >

          {/* Avatar + Name */}
          <Animated.View style={[avatarStyle, styles.avatarSection]}>
            <View>
              <GoldCircleBadge
                size={96}
                glowing
                borderColor={isPro || hasGoldFrame ? "#facc15" : "#d4a017"}
              >
                <View style={[styles.avatarInner, { backgroundColor: theme.surface }]}>
                  <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
                </View>
              </GoldCircleBadge>
              {isPro && (
                <View style={styles.avatarCrown}>
                  <Crown size={18} color="#facc15" fill="#f59e0b" />
                </View>
              )}
            </View>
            {avatarName && (
              <Text style={[styles.avatarNameLabel, { color: theme.textMuted }]}>{avatarName}</Text>
            )}
            {hasGoldFrame && (
              <View style={styles.goldFrameLabel}>
                <Text style={styles.goldFrameLabelText}>
                  {referralTier.badgeEmoji} {referralTier.label}
                </Text>
              </View>
            )}
            <View style={styles.nameRow}>
              <Pressable
                onPress={() => setEditModalVisible(true)}
                style={styles.editBtn}
                accessibilityRole="button"
                accessibilityLabel="ערוך שם תצוגה"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Pencil size={14} color="#a78bfa" />
              </Pressable>
              <Text style={[styles.displayName, { color: isPro ? "#d97706" : theme.text }, isPro && { fontWeight: "900" }]}>
                {displayName ?? "שחקן"}
              </Text>
              {hasWhaleBadge && (
                <View style={styles.whaleBadge}>
                  <Text style={styles.whaleBadgeEmoji}>🐋</Text>
                  <Text style={styles.whaleBadgeText}>WHALE</Text>
                </View>
              )}
              {isPro && <ProBadge size="sm" />}
            </View>
            <View style={styles.levelRow}>
              <Pressable onPress={() => setShowStagePopup(true)} accessibilityRole="button" accessibilityLabel="הצג התקדמות שלב">
                <View style={[styles.levelPill, isDark && { backgroundColor: "rgba(124,58,237,0.15)", borderColor: "rgba(167,139,250,0.3)" }]}>
                  <Star size={12} color="#7c3aed" />
                  <Text style={styles.levelPillText}>
                    שלב {level} · {LAYER_NAMES_HE[layer] ?? ""}
                  </Text>
                </View>
              </Pressable>
              <HeartsDisplay />
            </View>
          </Animated.View>

          {/* Streak strip — compact, tap to show celebration */}
          <Pressable onPress={showStreakCelebration} accessibilityRole="button" accessibilityLabel="הצג חגיגת רצף">
            <Animated.View style={[streakStyle, {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: theme.surface,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: "rgba(234,88,12,0.3)",
              paddingHorizontal: 14,
              paddingVertical: 10,
              marginBottom: 12,
              shadowColor: "#ea580c",
              shadowOpacity: 0.15,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            }]}>
              {/* Left — fire icon */}
              <LottieIcon source={require("../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json")} size={30} autoPlay loop active={isFocused} />
              {/* Right — text */}
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#ea580c", writingDirection: "rtl" }}>רצף יומי</Text>
                <Text style={{ fontSize: 20, fontWeight: "900", color: theme.text }}>{streak}</Text>
                <Text style={{ fontSize: 12, fontWeight: "600", color: theme.textMuted }}>ימים</Text>
              </View>
            </Animated.View>
          </Pressable>

          {/* XP Progress card */}
          <Animated.View style={[xpCardStyle, styles.card, { marginBottom: 12, backgroundColor: theme.surface, borderColor: theme.border, shadowColor: "#0891b2", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 }]}>
            <View style={[styles.cardTopBorder, { backgroundColor: "#0891b2", shadowColor: "#0891b2" }]} />
            <View style={styles.cardBody}>
              <View style={styles.cardRowBetween}>
                <Text style={[styles.cardMuted, { color: theme.textMuted }]}>
                  {xpToNextLevel > 0 ? `${xpToNextLevel} XP לשלב ${level + 1}` : "שלב מקסימלי!"}
                </Text>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
                  <Zap size={14} color="#0891b2" />
                  <Text style={[styles.cardLabel, { color: "#0891b2" }]}>ניסיון</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row-reverse", alignItems: "baseline", gap: 4, marginVertical: 8 }}>
                <Text style={[styles.cardBigValue, { color: theme.text }]}>{xp.toLocaleString('he-IL')}</Text>
                <Text style={[styles.cardUnit, { color: theme.textMuted }]}>XP</Text>
              </View>
              {/* Progress bar removed — stage popup shows progress instead */}
            </View>
          </Animated.View>

          {/* Stats row */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <Animated.View style={[statsLeftStyle, { flex: 1 }]}>
              <View style={[styles.card, { marginBottom: 0, backgroundColor: theme.surface, borderColor: theme.border, shadowColor: "#ca8a04", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 }]}>
                <View style={[styles.cardTopBorder, { backgroundColor: "#ca8a04", shadowColor: "#ca8a04" }]} />
                <View style={styles.cardBody}>
                  <Text style={[styles.cardLabel, { color: theme.textMuted }]}>מטבעות</Text>
                  <Text style={[styles.cardBigValue, { color: theme.text, fontSize: 24 }]}>{coins.toLocaleString('he-IL')}</Text>
                  <Text style={[styles.cardMuted, { color: theme.textMuted }]}>FinCoins</Text>
                </View>
              </View>
            </Animated.View>
            <Animated.View style={[statsRightStyle, { flex: 1 }]}>
              <View style={[styles.card, { marginBottom: 0, backgroundColor: theme.surface, borderColor: theme.border, shadowColor: "#16a34a", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 }]}>
                <View style={[styles.cardTopBorder, { backgroundColor: "#16a34a", shadowColor: "#16a34a" }]} />
                <View style={styles.cardBody}>
                  <Text style={[styles.cardLabel, { color: theme.textMuted }]}>שלב</Text>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 4 }}>
                    <Trophy size={18} color="#16a34a" />
                    <Text style={[styles.cardBigValue, { color: theme.text, fontSize: 24 }]}>{layer}</Text>
                  </View>
                  <Text style={[styles.cardMuted, { color: theme.textMuted }]}>מתוך 5</Text>
                </View>
              </View>
            </Animated.View>
          </View>

          {/* Duel W/L Record */}
          {(duelRecord.wins > 0 || duelRecord.losses > 0 || duelRecord.draws > 0) && (
            <Animated.View style={[duelCardStyle, styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.cardTopBorder, { backgroundColor: "#dc2626" }]} />
              <View style={styles.cardBody}>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <Swords size={16} color="#dc2626" />
                  <Text style={[styles.cardLabel, { color: "#dc2626" }]}>דו-קרב 1v1</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={[styles.duelStat, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                    <Text style={[styles.duelStatValue, { color: "#16a34a" }]}>{duelRecord.wins}</Text>
                    <Text style={[styles.duelStatLabel, { color: theme.textMuted }]}>ניצחונות</Text>
                  </View>
                  <View style={[styles.duelStat, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                    <Text style={[styles.duelStatValue, { color: "#dc2626" }]}>{duelRecord.losses}</Text>
                    <Text style={[styles.duelStatLabel, { color: theme.textMuted }]}>הפסדים</Text>
                  </View>
                  <View style={[styles.duelStat, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                    <Text style={[styles.duelStatValue, { color: "#6b7280" }]}>{duelRecord.draws}</Text>
                    <Text style={[styles.duelStatLabel, { color: theme.textMuted }]}>תיקו</Text>
                  </View>
                </View>
                {(duelRecord.wins + duelRecord.losses) > 0 && (
                  <Text style={[styles.cardMuted, { marginTop: 8, textAlign: "center", color: theme.textMuted }]}>
                    אחוז ניצחון: {Math.round((duelRecord.wins / (duelRecord.wins + duelRecord.losses)) * 100)}%
                  </Text>
                )}
              </View>
            </Animated.View>
          )}

          {/* Daily Learning Summary */}
          <View style={{ marginBottom: 12 }}>
            <DailyLearningSummary />
          </View>

          {/* ── Actions ── */}
          <Animated.View style={[actionsStyle, { gap: 12 }]}>
            {/* Bridge CTA */}
            <AnimatedPressable
              onPress={() => router.push("/bridge")}
              style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              accessibilityRole="button"
              accessibilityLabel="הגשר — המירו מטבעות להטבות אמיתיות"
            >
              <Animated.View style={[styles.actionCardInner, bridgeIsGlowTarget && bridgeGlowStyle, bridgeIsGlowTarget && { borderRadius: 16 }]}>
                <ChevronRight size={20} color={theme.textMuted} style={{ transform: [{ scaleX: -1 }] }} />
                <View style={{ alignItems: "flex-end", flex: 1 }}>
                  <Text style={[styles.actionCardSubtitle, { color: theme.textMuted }]}>הגשר</Text>
                  <Text style={[styles.actionCardTitle, { color: theme.text }]}>המירו מטבעות להטבות אמיתיות</Text>
                </View>
                <View style={[styles.actionIcon, { backgroundColor: isDark ? "rgba(124,58,237,0.15)" : "#f5f3ff", borderColor: isDark ? "rgba(167,139,250,0.3)" : "#ddd6fe" }]} accessible={false}>
                  <LottieIcon source={require("../../../assets/lottie/wired-flat-1925-bridge-hover-pinch.json")} size={28} autoPlay loop active={isFocused} />
                </View>
              </Animated.View>
            </AnimatedPressable>

            {/* Assets CTA */}
            <AnimatedPressable
              onPress={() => router.push("/assets" as never)}
              style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              accessibilityRole="button"
              accessibilityLabel="תיק נכסים — הנכסים שלי"
            >
              <View style={styles.actionCardInner}>
                <ChevronRight size={20} color={theme.textMuted} style={{ transform: [{ scaleX: -1 }] }} />
                <View style={{ alignItems: "flex-end", flex: 1 }}>
                  <Text style={[styles.actionCardSubtitle, { color: theme.textMuted }]}>תיק נכסים</Text>
                  <Text style={[styles.actionCardTitle, { color: theme.text }]}>הנכסים שלי</Text>
                </View>
                <View style={[styles.actionIcon, { backgroundColor: isDark ? "rgba(8,145,178,0.15)" : "rgba(8,145,178,0.08)", borderColor: isDark ? "rgba(8,145,178,0.3)" : "#a5f3fc" }]} accessible={false}>
                  <LottieIcon source={require("../../../assets/lottie/wired-flat-1023-portfolio-hover-pinch.json")} size={28} autoPlay loop active={isFocused} />
                </View>
              </View>
            </AnimatedPressable>

            {/* Invite Friends CTA */}
            <AnimatedPressable
              onPress={() => setTransitionTarget('referral')}
              style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              accessibilityRole="button"
              accessibilityLabel="רשת העושר — הזמן חברים וקבל פרסים"
            >
              <View style={styles.actionCardInner}>
                <ChevronRight size={20} color={theme.textMuted} style={{ transform: [{ scaleX: -1 }] }} />
                <View style={{ alignItems: "flex-end", flex: 1 }}>
                  <Text style={[styles.actionCardSubtitle, { color: theme.textMuted }]}>רשת העושר</Text>
                  <Text style={[styles.actionCardTitle, { color: theme.text }]}>הזמן חברים וקבל פרסים</Text>
                </View>
                <View style={[styles.actionIcon, { backgroundColor: isDark ? "rgba(124,58,237,0.15)" : "#f5f3ff", borderColor: isDark ? "rgba(167,139,250,0.3)" : "#ddd6fe" }]} accessible={false}>
                  <LottieIcon source={require("../../../assets/lottie/wired-flat-412-gift-hover-squeeze.json")} size={28} autoPlay loop active={isFocused} />
                </View>
              </View>
            </AnimatedPressable>

            {/* Profile info — moved below Invite Friends */}
            {profile && (
              <Animated.View style={[profileInfoStyle, styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.cardTopBorder, { backgroundColor: "#f97316" }]} />
                <View style={styles.cardBody}>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    <Target size={16} color="#f97316" />
                    <Text style={[styles.cardLabel, { color: "#f97316" }]}>הפרופיל שלך</Text>
                  </View>
                  <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
                    {[
                      { label: "מטרה", value: GOAL_LABELS[profile.financialGoal] ?? profile.financialGoal },
                      { label: "ידע", value: KNOWLEDGE_LABELS[profile.knowledgeLevel] ?? profile.knowledgeLevel },
                      { label: "יעד יומי", value: DAILY_LABELS[profile.dailyGoalMinutes] ?? `${profile.dailyGoalMinutes} דק׳` },
                      { label: "מלווה", value: COMPANION_LABELS[profile.companionId] ?? profile.companionId },
                    ].map((item) => (
                      <View key={item.label} style={[styles.profileChip, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                        <Text style={[styles.profileChipLabel, { color: theme.textMuted }]}>{item.label}</Text>
                        <Text style={[styles.profileChipValue, { color: theme.text }]}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                  <Pressable
                    onPress={() => setRedoOnboardingVisible(true)}
                    style={{ marginTop: 12, alignSelf: "center", paddingVertical: 8, paddingHorizontal: 20, borderRadius: 12, backgroundColor: "rgba(8,145,178,0.12)", borderWidth: 1, borderColor: "rgba(8,145,178,0.3)" }}
                    accessibilityRole="button"
                    accessibilityLabel="עדכן פרופיל פיננסי"
                  >
                    <Text style={{ color: "#22d3ee", fontSize: 13, fontWeight: "700", writingDirection: "rtl" }}>עדכן פרופיל פיננסי</Text>
                  </Pressable>
                </View>
              </Animated.View>
            )}

            {/* Pro Upgrade CTA — only for free users */}
            {!isPro && (
              <AnimatedPressable
                onPress={() => router.push("/pricing" as never)}
                accessibilityRole="button"
                accessibilityLabel="שדרג ל-PRO"
              >
                <Animated.View style={[styles.proCard, proBorderStyle]}>
                  <LinearGradient
                    colors={["#0a2540", "#164e63", "#0a2540"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ borderRadius: 16, overflow: "hidden" }}
                  >
                    {["✦", "✦", "✦", "✦", "✦"].map((s, i) => (
                      <Text
                        key={i}
                        style={{
                          position: "absolute",
                          color: i % 2 === 0 ? "#facc15" : "#67e8f9",
                          fontSize: i === 2 ? 10 : 7,
                          opacity: 0.6,
                          top: [8, 16, 6, 22, 12][i],
                          left: [12, 60, 130, 200, 260][i],
                        }}
                      >{s}</Text>
                    ))}
                    <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
                      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
                        <View style={{ width: 48, height: 48, overflow: "hidden", borderRadius: 14, backgroundColor: "rgba(14,116,144,0.3)", borderWidth: 1, borderColor: "rgba(103,232,249,0.5)", alignItems: "center", justifyContent: "center" }} accessible={false}>
                          <LottieIcon source={require("../../../assets/lottie/Pro Animation 3rd.json")} size={40} autoPlay loop active={isFocused} />
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 2, color: "#facc15", textTransform: "uppercase" }}>
                            שדרגו ל-PRO
                          </Text>
                          <Text style={{ fontSize: 15, fontWeight: "700", color: "#ffffff", marginTop: 2 }}>
                            לבבות אינסופיים + בוסט XP
                          </Text>
                          <Text style={{ fontSize: 11, color: "rgba(103,232,249,0.8)", marginTop: 2 }}>
                            ✦ ללא הגבלות ✦ בלעדי לחברים ✦
                          </Text>
                        </View>
                      </View>
                      <View style={{ borderRadius: 20, backgroundColor: "rgba(250,204,21,0.15)", borderWidth: 1.5, borderColor: "rgba(250,204,21,0.5)", paddingHorizontal: 12, paddingVertical: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: "900", color: "#facc15" }}>PRO</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </Animated.View>
              </AnimatedPressable>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      <EditProfileModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
      />

      <Modal
        visible={redoOnboardingVisible}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setRedoOnboardingVisible(false)}
      >
        <ProfilingFlow
          mode="redo"
          onRedoComplete={() => setRedoOnboardingVisible(false)}
        />
      </Modal>

      <TransitionOverlay
        visible={transitionTarget === 'referral'}
        message={'כאן תוכל להזמין חברים למשחק, ולצבור דיבידנד יומי על הרווחים שלהם באפליקציה!\n5% על כל הפעילות של החברים'}
        image={{ uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/finn/finn-referral.png' }}
        onDismiss={() => {
          setTransitionTarget(null);
          router.push("/referral" as never);
        }}
      />

      {/* Stage progress popup */}
      <Modal visible={showStagePopup} transparent animationType="fade" onRequestClose={() => setShowStagePopup(false)} accessibilityViewIsModal>
        <Pressable style={stagePopupStyles.backdrop} onPress={() => setShowStagePopup(false)} accessibilityRole="button" accessibilityLabel="סגור חלון התקדמות">
          <Pressable style={stagePopupStyles.card} onPress={() => {}} accessibilityRole="none">
            <Pressable onPress={() => setShowStagePopup(false)} style={stagePopupStyles.closeBtn} accessibilityRole="button" accessibilityLabel="סגור" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color="#94a3b8" />
            </Pressable>
            <Text style={stagePopupStyles.emoji}>
              {LAYER_EMOJIS[layer] ?? "🌱"}
            </Text>
            <Text style={stagePopupStyles.title}>שלב {level} · {LAYER_NAMES_HE[layer] ?? ""}</Text>
            <Text style={stagePopupStyles.subtitle}>
              {layer < 5 ? `עוד ${xpToNextLevel.toLocaleString('he-IL')} XP לשלב הבא` : "הגעת לשלב הגבוה ביותר!"}
            </Text>
            <View style={stagePopupStyles.progressTrack}>
              <View style={[stagePopupStyles.progressFill, { width: `${Math.round(progressToNextLevel * 100)}%` }]} />
            </View>
            <Text style={stagePopupStyles.percent}>{Math.round(progressToNextLevel * 100)}%</Text>
            <View style={stagePopupStyles.stagesRow}>
              {[1, 2, 3, 4, 5].map((l) => (
                <View key={l} style={[stagePopupStyles.stageDot, l <= layer && stagePopupStyles.stageDotActive]}>
                  <Text style={{ fontSize: 16 }}>{LAYER_EMOJIS[l]}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const LAYER_EMOJIS: Record<number, string> = {
  1: "🌱",
  2: "🛡️",
  3: "⚖️",
  4: "📈",
  5: "🏆",
};

const stagePopupStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 24,
    padding: 28,
    width: "85%",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(124,58,237,0.3)",
    gap: 10,
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    left: 12,
    padding: 4,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#f1f5f9",
    writingDirection: "rtl",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94a3b8",
    writingDirection: "rtl",
    textAlign: "center",
  },
  progressTrack: {
    width: "100%",
    height: 10,
    backgroundColor: "rgba(124,58,237,0.15)",
    borderRadius: 5,
    overflow: "hidden",
    marginTop: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#7c3aed",
    borderRadius: 5,
  },
  percent: {
    fontSize: 13,
    fontWeight: "700",
    color: "#a78bfa",
  },
  stagesRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  stageDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(124,58,237,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(124,58,237,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  stageDotActive: {
    backgroundColor: "rgba(124,58,237,0.25)",
    borderColor: "#7c3aed",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  stickyCloseRow: {
    position: "absolute",
    top: 12,
    right: 20,
    zIndex: 100,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  avatarSection: {
    marginBottom: 24,
    alignItems: "center",
  },
  avatarInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: {
    fontSize: 42,
  },
  avatarCrown: {
    position: "absolute",
    top: -4,
    right: -2,
    backgroundColor: "#1a1035",
    borderRadius: 12,
    padding: 3,
    shadowColor: "#f59e0b",
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  avatarNameLabel: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
  },
  goldFrameLabel: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: "rgba(250, 204, 21, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.3)",
  },
  goldFrameLabelText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ca8a04",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  displayName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1f2937",
    writingDirection: "rtl",
  },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(124,58,237,0.08)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  proPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  proPillText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#d97706",
  },
  whaleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: "rgba(124,58,237,0.08)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.2)",
  },
  whaleBadgeEmoji: {
    fontSize: 12,
  },
  whaleBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#7c3aed",
    letterSpacing: 1,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  levelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ddd6fe",
    backgroundColor: "#f5f3ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7c3aed",
    writingDirection: "rtl",
  },
  // Card base
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTopBorder: {
    height: 3,
    width: "100%",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    shadowOpacity: 0.4,
    elevation: 3,
  },
  cardBody: {
    padding: 16,
  },
  cardRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  cardRowBetween: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    writingDirection: "rtl",
  },
  cardMuted: {
    fontSize: 12,
    color: "#9ca3af",
    writingDirection: "rtl",
  },
  cardBigValue: {
    fontSize: 32,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  cardUnit: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9ca3af",
  },
  cardEmoji: {
    fontSize: 32,
  },
  accentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  streakStrip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff7ed",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fed7aa",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  streakText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9a3412",
    writingDirection: "rtl",
  },
  streakValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ea580c",
    fontVariant: ["tabular-nums"],
  },
  streakUnit: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9a3412",
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 999,
    overflow: "hidden",
    transform: [{ scaleX: -1 }],
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  // Duel stats
  duelStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  duelStatValue: {
    fontSize: 22,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  duelStatLabel: {
    fontSize: 10,
    color: "#9ca3af",
    fontWeight: "600",
    writingDirection: "rtl",
  },
  // Profile chips
  profileChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  profileChipLabel: {
    fontSize: 10,
    color: "#9ca3af",
    fontWeight: "600",
    textAlign: "right",
    writingDirection: "rtl",
  },
  profileChipValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "right",
    writingDirection: "rtl",
  },
  // Action cards
  actionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    borderBottomWidth: 3,
    borderBottomColor: "#cbd5e1",
  },
  actionCardInner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    gap: 12,
  },
  actionCardSubtitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "right",
    writingDirection: "rtl",
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // Pro card (stays dark — it's the premium upsell)
  proCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: "#facc15",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    elevation: 8,
    overflow: "hidden",
  },
});
