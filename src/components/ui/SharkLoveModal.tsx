import { useEffect, useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  FadeIn,
  FadeInDown,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Zap, Clock, Coins, Star } from "lucide-react-native";
import { GoldCoinIcon } from "./GoldCoinIcon";
import { FINN_HAPPY } from "../../features/retention-loops/finnMascotConfig";
import { SPRING_BOUNCY, SPRING_SNAPPY } from "../../utils/animations";

const { width: SCREEN_W } = Dimensions.get("window");

interface SharkLoveModalProps {
  xpEarned: number;
  coinsEarned: number;
  elapsedSeconds: number;
  onClaim: () => void;
}

// ── Counting text using requestAnimationFrame for smooth counting ──
function CountingText({
  targetValue,
  suffix,
  color,
  startDelay,
}: {
  targetValue: number;
  suffix?: string;
  color: string;
  startDelay: number;
}) {
  const [display, setDisplay] = useState(0);
  const animVal = useSharedValue(0);
  const counterScale = useSharedValue(1);

  useEffect(() => {
    animVal.value = withDelay(
      startDelay,
      withTiming(targetValue, { duration: 1200, easing: Easing.out(Easing.cubic) }),
    );
    counterScale.value = withDelay(
      startDelay,
      withSequence(
        withSpring(1.15, SPRING_SNAPPY),
        withSpring(1, SPRING_BOUNCY),
      ),
    );
  }, [targetValue, startDelay]);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: counterScale.value }],
  }));

  // Read animated value via reanimated reaction — fires only when the rounded
  // value actually changes (~once per frame during the 1.2s ramp, then stops).
  // Earlier this used a permanent `requestAnimationFrame` loop that called
  // `setDisplay` 60 times/sec forever — three of these in a row (XP/coins/time)
  // pinned the JS thread and made the modal feel stuck.
  useAnimatedReaction(
    () => Math.round(animVal.value),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDisplay)(current);
      }
    },
  );

  const formatted = useMemo(() => {
    if (suffix === "time") {
      const mins = Math.floor(display / 60);
      const secs = display % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    return display.toLocaleString();
  }, [display, suffix]);

  return (
    <Animated.View style={scaleStyle}>
      <Text
        style={{
          fontSize: 28,
          fontWeight: "900",
          color,
          textAlign: "center",
        }}
      >
        {formatted}
      </Text>
    </Animated.View>
  );
}

// ── Stat card with icon, label, and animated value ──
function StatCard({
  label,
  icon,
  value,
  suffix,
  bgColor,
  borderColor,
  textColor,
  delay,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  suffix?: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  delay: number;
}) {
  const cardScale = useSharedValue(0);

  useEffect(() => {
    cardScale.value = withDelay(delay, withSpring(1, SPRING_BOUNCY));
  }, [delay]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  // Gentle wobble after appearing
  const wobble = useSharedValue(0);
  useEffect(() => {
    wobble.value = withDelay(
      delay + 400,
      withRepeat(
        withSequence(
          withTiming(-2, { duration: 80 }),
          withTiming(2, { duration: 80 }),
          withTiming(-1, { duration: 60 }),
          withTiming(0, { duration: 60 }),
        ),
        2,
        false,
      ),
    );
  }, [delay]);

  const wobbleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wobble.value}deg` }],
  }));

  return (
    <Animated.View style={[cardStyle, { flex: 1 }]}>
      <Animated.View
        style={[
          wobbleStyle,
          {
            backgroundColor: bgColor,
            borderRadius: 16,
            borderWidth: 2.5,
            borderColor,
            paddingVertical: 14,
            paddingHorizontal: 8,
            alignItems: "center",
            gap: 6,
            borderBottomWidth: 4,
          },
        ]}
      >
        {/* Label badge */}
        <View
          style={{
            backgroundColor: borderColor,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 3,
            marginBottom: 2,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "900",
              color: "#ffffff",
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            {label}
          </Text>
        </View>

        {/* Icon + Value */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {icon}
          <CountingText
            targetValue={value}
            suffix={suffix}
            color={textColor}
            startDelay={delay + 200}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ── Pre-computed particle positions (avoid random in render) ──
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  w: 3 + (((i * 7 + 13) % 11) / 11) * 3,
  top: `${((i * 17 + 5) % 100)}%` as const,
  left: `${((i * 31 + 11) % 100)}%` as const,
  opacity: 0.1 + (((i * 13 + 3) % 10) / 10) * 0.15,
}));

export function SharkLoveModal({
  xpEarned,
  coinsEarned,
  elapsedSeconds,
  onClaim,
}: SharkLoveModalProps) {
  // Finn bounce animation
  const finnBounce = useSharedValue(0);
  const finnRotate = useSharedValue(0);

  useEffect(() => {
    finnBounce.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    finnRotate.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(4, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);

  const finnStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: finnBounce.value },
      { rotate: `${finnRotate.value}deg` },
    ],
  }));

  // Button pulse
  const btnGlow = useSharedValue(0);
  useEffect(() => {
    btnGlow.value = withDelay(
      1800,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0, { duration: 800 }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const btnStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.3 + btnGlow.value * 0.4,
    transform: [{ scale: 1 + btnGlow.value * 0.02 }],
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9997 }]}>
      {/* Deep blue gradient background */}
      <LinearGradient
        colors={["#0a1628", "#0c2a4a", "#0e3460", "#0c2a4a", "#0a1628"]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle particle dots */}
      <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]} pointerEvents="none">
        {PARTICLES.map((p, i) => (
          <View
            key={`p-${i}`}
            style={{
              position: "absolute",
              width: p.w,
              height: p.w,
              borderRadius: 3,
              backgroundColor: `rgba(56,189,248,${p.opacity})`,
              top: p.top,
              left: p.left,
            }}
          />
        ))}
      </View>

      <View style={styles.content}>
        {/* Finn character — bouncing + tilting */}
        <Animated.View
          entering={FadeInDown.duration(600).springify().damping(14)}
          style={[finnStyle, styles.finnContainer]}
        >
          <ExpoImage
            source={FINN_HAPPY}
            style={styles.finnImage}
            contentFit="contain"
            accessible={false}
          />
        </Animated.View>

        {/* Blue teardrops around Finn */}
        <Animated.View
          entering={FadeIn.delay(300).duration(400)}
          style={{ position: "absolute", top: "22%", left: SCREEN_W * 0.18 }}
        >
          <Text style={{ fontSize: 22, opacity: 0.7 }}>💧</Text>
        </Animated.View>
        <Animated.View
          entering={FadeIn.delay(500).duration(400)}
          style={{ position: "absolute", top: "28%", right: SCREEN_W * 0.15 }}
        >
          <Text style={{ fontSize: 18, opacity: 0.7 }}>💧</Text>
        </Animated.View>

        {/* Main text */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(500)}
          style={{ alignItems: "center", marginTop: 8 }}
        >
          <Text style={styles.titleText}>עדיין תאהבו אותי?</Text>
          <Text style={styles.subtitleText}>
            שתסיימו את כל הפרקי למידה שלי?
          </Text>
        </Animated.View>

        {/* Stats row */}
        <Animated.View
          entering={FadeInDown.delay(700).duration(500)}
          style={styles.statsRow}
        >
          {/* XP card — Blue */}
          <StatCard
            label="נק׳ ניסיון"
            icon={<Star size={22} color="#0284c7" fill="#38bdf8" />}
            value={xpEarned}
            bgColor="rgba(14,165,233,0.12)"
            borderColor="#0284c7"
            textColor="#38bdf8"
            delay={800}
          />

          {/* Coins card — Gold */}
          <StatCard
            label="מטבעות"
            icon={<GoldCoinIcon size={26} />}
            value={coinsEarned}
            bgColor="rgba(245,158,11,0.12)"
            borderColor="#d97706"
            textColor="#f59e0b"
            delay={1000}
          />

          {/* Time card — Yellow */}
          <StatCard
            label="זמן"
            icon={<Clock size={22} color="#ca8a04" />}
            value={elapsedSeconds}
            suffix="time"
            bgColor="rgba(250,204,21,0.12)"
            borderColor="#ca8a04"
            textColor="#facc15"
            delay={1200}
          />
        </Animated.View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Claim button */}
        <Animated.View
          entering={FadeInDown.delay(1500).duration(400)}
          style={{ width: "100%", paddingHorizontal: 24, paddingBottom: 40 }}
        >
          <Pressable onPress={onClaim}>
            <Animated.View
              style={[
                styles.claimButton,
                btnStyle,
              ]}
            >
              <Text style={styles.claimText}>קיבלתי!</Text>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    paddingTop: 80,
  },
  finnContainer: {
    width: 160,
    height: 160,
    marginBottom: 16,
  },
  finnImage: {
    width: 160,
    height: 160,
  },
  titleText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#facc15",
    textAlign: "center",
    writingDirection: "rtl",
    textShadowColor: "rgba(250,204,21,0.3)",
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#cbd5e1",
    textAlign: "center",
    writingDirection: "rtl",
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 32,
    width: "100%",
  },
  claimButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: "center",
    borderBottomWidth: 5,
    borderBottomColor: "#0284c7",
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 8,
  },
  claimText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
});
