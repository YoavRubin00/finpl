import { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Platform, Modal } from "react-native";
import { useRouter } from "expo-router";
import { Flame, Heart, Crown, Plus, Settings, CalendarDays } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  useAnimatedReaction,
  runOnJS,
  Easing,
} from "react-native-reanimated";
const ZERO_SHADOW_OFFSET = { width: 0, height: 0 } as const;
import Svg, { Circle } from "react-native-svg";
import { useEconomyStore } from "../../features/economy/useEconomyStore";
import { useSubscriptionStore } from "../../features/subscription/useSubscriptionStore";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { useFunStore } from "../../stores/useFunStore";
import { FINN_DAD_JOKES, FINN_FUN_FACTS } from "../../features/fun/finnJokesData";
import { FinnMailModal } from "../../features/fun/FinnMailModal";
import { getAvatarById, DEFAULT_AVATAR_EMOJI } from "../../features/avatars/avatarData";
import { getPyramidStatus } from "../../utils/progression";
import { SPRING_SMOOTH } from "../../utils/animations";
import { heavyHaptic, tapHaptic } from "../../utils/haptics";
import { CLASH } from "../../constants/theme";
import LottieView from "lottie-react-native";
import { ConfettiExplosion } from "./ConfettiExplosion";
import { SparkleOverlay } from "./SparkleOverlay";
import { ProBadge } from "./ProBadge";
import { LottieIcon } from "./LottieIcon";
import { GoldCoinIcon } from "./GoldCoinIcon";
import { useWalkthroughGlowTarget } from "../../features/onboarding/AppWalkthroughOverlay";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const MAX_HEARTS = 5;

// ---------------------------------------------------------------------------
// Level ring constants
// ---------------------------------------------------------------------------
const RING_SIZE = 46;
const RING_STROKE = 3.5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// ---------------------------------------------------------------------------
// Animated counter hook — animates number from old → new over ~600ms
// ---------------------------------------------------------------------------

function useAnimatedCounter(value: number) {
  const animated = useSharedValue(value);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      animated.value = value;
      return;
    }
    animated.value = withSpring(value, {
      damping: 20,
      stiffness: 80,
      mass: 1,
    });
  }, [value]);

  return animated;
}

// ---------------------------------------------------------------------------
// AnimatedNumber — renders a number that springs between values
// ---------------------------------------------------------------------------

interface AnimatedNumberProps {
  value: number;
  color?: string;
}

function AnimatedNumber({ value, color }: AnimatedNumberProps) {
  const animatedVal = useAnimatedCounter(value);
  const [display, setDisplay] = useState(value.toLocaleString());

  useAnimatedReaction(
    () => Math.round(animatedVal.value),
    (current, prev) => {
      if (current !== prev) {
        runOnJS(setDisplay)(current.toLocaleString());
      }
    },
    [animatedVal],
  );

  return (
    <Text style={[s.pillText, { color: color ?? "#1e293b" }]}>
      {display}
    </Text>
  );
}

// GoldCoinIcon extracted to shared GoldCoinIcon component

// ---------------------------------------------------------------------------
// ResourcePill — Clash Royale style: icon + number + optional green "+" button
// ---------------------------------------------------------------------------

interface ResourcePillProps {
  icon: React.ReactNode;
  children: React.ReactNode;
  glowColor?: string;
  showPlus?: boolean;
  onPress?: () => void;
  trackedValue?: number;
  accessibilityLabel?: string;
}

function ResourcePill({ icon, children, glowColor, showPlus, onPress, trackedValue, accessibilityLabel }: ResourcePillProps) {
  const scale = useSharedValue(1);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (trackedValue === undefined) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    scale.value = withSequence(
      withSpring(1.18, { damping: 12, stiffness: 300 }),
      withSpring(1, { damping: 14, stiffness: 200 }),
    );
  }, [trackedValue]);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 200 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  }, [scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={() => {
        tapHaptic();
        onPress?.();
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[s.resourcePill, animStyle]}>
        <View
          style={[
            s.iconFrame,
            glowColor
              ? { shadowColor: glowColor, shadowOpacity: 0.7, shadowRadius: 6, shadowOffset: ZERO_SHADOW_OFFSET, elevation: 5 }
              : undefined,
          ]}
        >
          {icon}
        </View>
        {children}
        {showPlus && (
          <View style={s.plusBtn}>
            <Plus size={11} color="#fff" strokeWidth={3.5} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// GlobalWealthHeader
// ---------------------------------------------------------------------------

interface GlobalWealthHeaderProps {
  /** When true, hides profile row + settings — shows only resources + progress bar */
  compact?: boolean;
}

export function GlobalWealthHeader({ compact = false }: GlobalWealthHeaderProps) {
  const router = useRouter();
  const xp = useEconomyStore((st) => st.xp);
  const coins = useEconomyStore((st) => st.coins);
  const gems = useEconomyStore((st) => st.gems);
  const isPro = useSubscriptionStore((st) => st.tier === "pro" && st.status === "active");
  const avatarId = useAuthStore((st) => st.profile?.avatarId ?? null);
  const avatarDef = getAvatarById(avatarId);
  const avatarEmoji = avatarDef?.emoji ?? DEFAULT_AVATAR_EMOJI;

  // ---- Fun store: mail icon ----
  const hasUnreadMail = useFunStore((st) => st.hasUnreadMail);
  const [showMailModal, setShowMailModal] = useState(false);

  // Trigger refill check once on mount
  useEffect(() => {
    useSubscriptionStore.getState().refillHearts();
    useFunStore.getState().refreshMail(FINN_DAD_JOKES, FINN_FUN_FACTS);
  }, []);

  const { level, layer, layerName, progressToNextLevel, xpToNextLevel } = getPyramidStatus(xp);
  const [showLevelPopup, setShowLevelPopup] = useState(false);

  const navigateToShop = useCallback(() => {
    tapHaptic();
    router.push("/(tabs)/shop" as never);
  }, [router]);

  // ---- Animated progress bar width ----
  const progressAnim = useSharedValue(progressToNextLevel);
  const isFirstProgress = useRef(true);

  useEffect(() => {
    if (isFirstProgress.current) {
      isFirstProgress.current = false;
      progressAnim.value = progressToNextLevel;
      return;
    }
    progressAnim.value = withSpring(progressToNextLevel, SPRING_SMOOTH);
  }, [progressToNextLevel]);

  // ---- Level ring animated props ----
  const ringAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progressAnim.value),
  }));

  // ---- Level-up flash + confetti ----
  const prevLevel = useRef(level);
  const flashOpacity = useSharedValue(0);
  const [showLevelUpConfetti, setShowLevelUpConfetti] = useState(false);

  useEffect(() => {
    if (prevLevel.current !== level && prevLevel.current < level) {
      // Delay level-up flash to avoid overlapping chest/DoN animations
      const timer = setTimeout(() => {
        flashOpacity.value = withSequence(
          withTiming(0.6, { duration: 150 }),
          withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }),
        );
        heavyHaptic();
        setShowLevelUpConfetti(true);
      }, 3000);
      prevLevel.current = level;
      return () => clearTimeout(timer);
    }
    prevLevel.current = level;
  }, [level]);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  // ---- Profile banner pulsing gold glow ----
  const profileGlow = useSharedValue(0.15);

  useEffect(() => {
    profileGlow.value = withSequence(
      withTiming(0.7, { duration: 1000 }),
      withTiming(0.15, { duration: 1000 }),
    );
    const interval = setInterval(() => {
      profileGlow.value = withSequence(
        withTiming(0.7, { duration: 1000 }),
        withTiming(0.15, { duration: 1000 }),
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const profileGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: profileGlow.value,
    shadowColor: "#facc15",
    shadowRadius: 14,
    shadowOffset: ZERO_SHADOW_OFFSET,
    borderColor: `rgba(250,204,21,${0.3 + profileGlow.value * 0.7})`,
  }));

  // ---- Walkthrough glow ----
  const glowTarget = useWalkthroughGlowTarget();
  const walkthroughActive = glowTarget !== "none";
  const profileIsGlowTarget = glowTarget === "profile-avatar";

  const walkthroughProfilePulse = useSharedValue(0);
  useEffect(() => {
    if (profileIsGlowTarget) {
      walkthroughProfilePulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.3, { duration: 600 }),
        ),
        -1,
        true,
      );
    } else {
      walkthroughProfilePulse.value = 0;
    }
  }, [profileIsGlowTarget]);

  const walkthroughProfileStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(56, 189, 248, ${walkthroughProfilePulse.value})`,
    borderWidth: walkthroughProfilePulse.value > 0.05 ? 2.5 : 1.5,
    shadowColor: "#38bdf8",
    shadowOpacity: walkthroughProfilePulse.value * 0.6,
    shadowRadius: 14,
    shadowOffset: ZERO_SHADOW_OFFSET,
    elevation: walkthroughProfilePulse.value > 0.05 ? 10 : 2,
  }));

  // ---- Mail icon pulse animation ----
  const mailPulse = useSharedValue(1);
  useEffect(() => {
    if (hasUnreadMail) {
      mailPulse.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
    } else {
      mailPulse.value = 1;
    }
  }, [hasUnreadMail]);

  const mailPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mailPulse.value }],
  }));

  return (
    <View style={s.container}>
      {/* Level-up flash overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          flashStyle,
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: CLASH.goldLight,
            zIndex: 10,
          },
        ]}
      />

      {/* Level-up confetti */}
      {showLevelUpConfetti && (
        <ConfettiExplosion onComplete={() => setShowLevelUpConfetti(false)} />
      )}

      {/* Subtle ambient sparkle to draw attention */}
      <SparkleOverlay color="#67e8f9" density="low" />

      {/* Token row — Single compact header */}
      <View style={[s.tokenRow, compact && { justifyContent: "center" }]}>

        {!compact && (
          <View style={[s.shortcutIcons, walkthroughActive && { opacity: 0.3 }]}>
            <Pressable
              onPress={walkthroughActive ? undefined : () => { tapHaptic(); router.push("/(tabs)/more" as never); }}
              style={s.shortcutBtnCompact}
              accessibilityRole="button"
              accessibilityLabel="הגדרות"
            >
              <Settings size={18} color="#64748b" />
            </Pressable>
            {/* Mail moved to feed WelcomeCard */}
          </View>
        )}

        {/* Coins pill */}
        <View style={walkthroughActive ? { opacity: 0.3 } : undefined} pointerEvents={walkthroughActive ? "none" : "auto"}>
        <ResourcePill
          icon={<GoldCoinIcon size={18} />}
          glowColor={CLASH.goldLight}
          onPress={walkthroughActive ? undefined : navigateToShop}
          trackedValue={coins}
          accessibilityLabel={`${coins} מטבעות`}
        >
          <AnimatedNumber value={coins} color={CLASH.goldLight} />
        </ResourcePill>
        </View>

        {/* Gems pill */}
        <View style={walkthroughActive ? { opacity: 0.3 } : undefined} pointerEvents={walkthroughActive ? "none" : "auto"}>
        <ResourcePill
          icon={<LottieIcon source={require("../../../assets/lottie/Diamond.json") as number} size={28} autoPlay loop />}
          glowColor="#67e8f9"
          onPress={walkthroughActive ? undefined : navigateToShop}
          trackedValue={gems}
          accessibilityLabel={`${gems} יהלומים`}
        >
          <AnimatedNumber value={gems} color="#67e8f9" />
        </ResourcePill>
        </View>



        {/* Level badge with XP progress ring */}
        <Pressable
          onPress={() => {
            tapHaptic();
            setShowLevelPopup(true);
          }}
          style={s.levelRingWrapper}
          accessibilityRole="button"
          accessibilityLabel={`רמה ${level}`}
          accessibilityHint="הצג התקדמות רמה"
        >
          <Svg width={RING_SIZE} height={RING_SIZE} style={s.ringSvg}>
            {/* Background track */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke="rgba(14,165,233,0.15)"
              strokeWidth={RING_STROKE}
              fill="none"
            />
            {/* Animated progress arc */}
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke="#38bdf8"
              strokeWidth={RING_STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              animatedProps={ringAnimatedProps}
              rotation="-90"
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
          <View style={s.levelBadgeInner}>
            <Crown size={11} color="#38bdf8" fill="#38bdf8" />
            <Text style={s.levelText}>{layer}</Text>
          </View>
        </Pressable>

        {!compact && (
          <Pressable
            onPress={() => { tapHaptic(); router.push("/(tabs)/profile" as never); }}
            accessibilityRole="button"
            accessibilityLabel="פרופיל"
            accessibilityHint="עבור לעמוד הפרופיל"
          >
            <Animated.View style={[
                s.profileBannerCompact,
                profileIsGlowTarget ? walkthroughProfileStyle : profileGlowStyle,
                isPro && { elevation: 3 },
              ]}>
              <View style={[s.profileAvatarCompact, isPro && { borderColor: "#facc15" }]}>
                <Text style={s.profileAvatarEmojiCompact}>{avatarEmoji}</Text>
                {isPro && (
                  <View style={s.profileCrownCompact}>
                    <Crown size={8} color="#facc15" fill="#f59e0b" />
                  </View>
                )}
                {/* Floating confetti particles */}
                <View style={{ position: "absolute", top: -14, left: -14, right: -14, bottom: -14, pointerEvents: "none" }}>
                  <LottieView
                    source={require("../../../assets/lottie/Confetti Effects Lottie Animation.json")}
                    style={{ width: 56, height: 56 }}
                    autoPlay
                    loop
                    speed={0.3}
                   />
                </View>
              </View>
              <Text style={[s.profileNameCompact, isPro && { color: "#d97706" }]} numberOfLines={1}>
                {useAuthStore.getState().displayName ?? "שחקן"}
              </Text>
            </Animated.View>
          </Pressable>
        )}

      </View>

      {/* Captain Shark mail modal */}
      {/* FinnMailModal moved to feed */}

      {/* Level progress popup */}
      <LevelProgressPopup
        visible={showLevelPopup}
        onClose={() => setShowLevelPopup(false)}
        level={level}
        layer={layer}
        layerName={layerName}
        progress={progressToNextLevel}
        xpToNext={xpToNextLevel}
        xp={xp}
      />

    </View>
  );
}

// ---------------------------------------------------------------------------
// Layer names in Hebrew for the popup
// ---------------------------------------------------------------------------
const LAYER_NAMES_HE: Record<number, string> = {
  1: "שרידות ושליטה",
  2: "ביטחון והגנה",
  3: "יציבות והרגלים",
  4: "צמיחה",
  5: "חופש כלכלי",
};

const LAYER_LOTTIES: Record<number, number> = {
  1: require("../../../assets/lottie/wired-flat-63-home-hover-3d-roll.json"),
  2: require("../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json"),
  3: require("../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json"),
  4: require("../../../assets/lottie/wired-flat-161-growth-hover-pinch.json"),
  5: require("../../../assets/lottie/wired-flat-407-crown-king-lord-hover-roll.json"),
};

function LevelProgressPopup({
  visible,
  onClose,
  level: _level,
  layer,
  layerName: _layerName,
  progress,
  xpToNext,
  xp,
}: {
  visible: boolean;
  onClose: () => void;
  level: number;
  layer: number;
  layerName: string;
  progress: number;
  xpToNext: number;
  xp: number;
}) {
  const hebrewLayerName = LAYER_NAMES_HE[layer] ?? _layerName;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose} accessibilityViewIsModal={true} accessibilityLabel="התקדמות רמה">
      <Pressable style={popupStyles.overlay} onPress={onClose} accessibilityRole="button" accessibilityLabel="סגור">
        <Pressable style={popupStyles.card} onPress={() => {}}>
          {/* Level circle */}
          <View style={popupStyles.levelCircle}>
            <Crown size={18} color="#38bdf8" fill="#38bdf8" />
            <Text style={popupStyles.levelNumber}>{layer}</Text>
          </View>

          {/* Layer name */}
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, justifyContent: "center" }}>
            <View><LottieIcon source={LAYER_LOTTIES[layer]} size={28} /></View>
            <Text style={popupStyles.layerName}>
              רמה {layer}: {hebrewLayerName}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={popupStyles.progressTrack}>
            <View style={[popupStyles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={popupStyles.xpText}>
            {xpToNext > 0 ? `עוד ${xpToNext} XP לרמה הבאה` : "השגת את הרמה הגבוהה ביותר!"}
          </Text>
          <Text style={popupStyles.xpTotal}>{xp} XP סה״כ</Text>

          {/* Layer roadmap */}
          <View style={popupStyles.roadmap}>
            {[1, 2, 3, 4, 5].map((l) => {
              const reached = layer >= l;
              const isCurrent = layer === l;
              return (
                <View key={l} style={[popupStyles.roadmapRow, isCurrent && popupStyles.roadmapRowCurrent]}>
                  <View style={[!reached && { opacity: 0.3 }]}>
                    <LottieIcon source={LAYER_LOTTIES[l]} size={24} />
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={[popupStyles.roadmapLabel, reached && { color: "#0ea5e9" }, isCurrent && { fontWeight: "900" }]}>
                      רמה {l}: {LAYER_NAMES_HE[l]}
                    </Text>
                  </View>
                  {reached && <Text style={popupStyles.checkmark}>✓</Text>}
                </View>
              );
            })}
          </View>

          <Pressable onPress={onClose} style={popupStyles.closeBtn} accessibilityRole="button" accessibilityLabel="סגור">
            <Text style={popupStyles.closeBtnText}>סגור</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const popupStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#f0f9ff",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginHorizontal: 28,
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: "rgba(14,165,233,0.3)",
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    width: "85%",
  },
  levelCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f0f9ff",
    borderWidth: 3,
    borderColor: "#38bdf8",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#38bdf8",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  levelNumber: {
    color: "#38bdf8",
    fontWeight: "900",
    fontSize: 20,
    marginTop: -2,
  },
  layerName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0c4a6e",
    textAlign: "center",
    writingDirection: "rtl",
  },
  progressTrack: {
    width: "100%",
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(14,165,233,0.12)",
    overflow: "hidden",
    transform: [{ scaleX: -1 }],
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#38bdf8",
  },
  xpText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0369a1",
    writingDirection: "rtl",
  },
  xpTotal: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  roadmap: {
    width: "100%",
    gap: 6,
    marginTop: 8,
  },
  roadmapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  roadmapRowCurrent: {
    backgroundColor: "rgba(14,165,233,0.1)",
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.2)",
  },
  roadmapEmoji: {
    fontSize: 18,
  },
  roadmapLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    textAlign: "right",
    writingDirection: "rtl",
  },
  checkmark: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0ea5e9",
  },
  closeBtn: {
    backgroundColor: "#0ea5e9",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 32,
    marginTop: 4,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
});

const s = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tokenRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    flexWrap: "nowrap",
  },
  levelRingWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  ringSvg: {
    position: "absolute",
  },
  levelBadgeInner: {
    width: RING_SIZE - RING_STROKE * 2 - 4,
    height: RING_SIZE - RING_STROKE * 2 - 4,
    borderRadius: (RING_SIZE - RING_STROKE * 2 - 4) / 2,
    backgroundColor: "#f0f9ff",
    borderWidth: 2,
    borderColor: "#38bdf8",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#38bdf8",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: ZERO_SHADOW_OFFSET,
    elevation: 3,
  },
  levelText: {
    color: "#38bdf8",
    fontWeight: "900",
    fontSize: 11,
    marginTop: -1,
  },
  profileBannerCompact: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingRight: 6,
    paddingLeft: 12,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  profileAvatarCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(148,163,184,0.3)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    overflow: "hidden",
  },
  profileAvatarEmojiCompact: {
    fontSize: 22,
  },
  profileNameCompact: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
    writingDirection: "rtl",
  },
  profileCrownCompact: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    padding: 1,
  },
  shortcutBtnCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  resourcePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#bae6fd",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconFrame: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
  },
  pillText: {
    color: "#1e293b",
    fontWeight: "900",
    fontSize: 14,
  },
  plusBtn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#58cc02",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 2,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    borderWidth: 1.5,
    borderColor: "#4ab800",
  },
  heartsRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  infinityTextPro: {
    color: "#f59e0b",
    fontWeight: "900",
    fontSize: 14,
  },
  // ── Row 2: Profile + Shortcuts ──
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 2,
  },
  profileBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  profileAvatarEmoji: {
    fontSize: 20,
  },
  profileCrown: {
    position: "absolute",
    top: -6,
    right: -4,
    backgroundColor: "#1a1035",
    borderRadius: 8,
    padding: 2,
  },
  profileInfo: {
    alignItems: "flex-end",
    gap: 2,
  },
  profileName: {
    fontSize: 13,
    fontWeight: "800",
    maxWidth: 90,
    writingDirection: "rtl",
    color: "#1f2937",
  },
  shortcutIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shortcutBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
});
