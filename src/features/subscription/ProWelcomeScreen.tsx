import { useCallback } from "react";
import { Image as ExpoImage } from "expo-image";
import { View, Text, Image, StyleSheet, Dimensions, ImageBackground, Pressable } from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { FINN_STANDARD } from "../retention-loops/finnMascotConfig";
import {
  Heart,
  Zap,
  Brain,
  Shield,
  Sparkles,
} from "lucide-react-native";
import { ProBadge } from "../../components/ui/ProBadge";
import { useSubscriptionStore } from "./useSubscriptionStore";
import { heavyHaptic } from "../../utils/haptics";

const { width: SCREEN_W } = Dimensions.get("window");
const OCEAN_BG = { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/HOMEPAGE.png' };

const BENEFITS = [
  { icon: Heart, color: "#ef4444", label: "לבבות אינסופיים" },
  { icon: Zap, color: "#f59e0b", label: "בוסט XP x1.5" },
  { icon: Brain, color: "#8b5cf6", label: "AI מתקדם ללא הגבלה" },
  { icon: Shield, color: "#22c55e", label: "סימולציות פרימיום" },
  { icon: Sparkles, color: "#3b82f6", label: "תוכן בלעדי + אווטרים" },
];

export function ProWelcomeScreen() {
  const router = useRouter();
  const markSeen = useSubscriptionStore((s) => s.markProWelcomeSeen);

  const handleContinue = useCallback(() => {
    heavyHaptic();
    markSeen();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)" as never);
    }
  }, [markSeen, router]);

  return (
    <ImageBackground source={OCEAN_BG} style={styles.root} resizeMode="cover">
      {/* Dark overlay for readability */}
      <View style={styles.overlay} />

      {/* Ambient sea creatures — ocean theme */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ position: "absolute", top: "6%", left: "3%", opacity: 0.35 }}>
          <LottieView
            source={require("../../../assets/lottie/sea/wired-flat-522-fish-hover-pinch.json")}
            style={{ width: 60, height: 60 }}
            autoPlay
            loop
            speed={0.4}
          />
        </View>
        <View style={{ position: "absolute", top: "4%", right: "8%", opacity: 0.3 }}>
          <LottieView
            source={require("../../../assets/lottie/sea/wired-flat-1175-dolphin-hover-pinch.json")}
            style={{ width: 70, height: 70 }}
            autoPlay
            loop
            speed={0.35}
          />
        </View>
        <View style={{ position: "absolute", bottom: "6%", left: "6%", opacity: 0.3 }}>
          <LottieView
            source={require("../../../assets/lottie/sea/wired-flat-1168-star-fish-hover-pinch.json")}
            style={{ width: 50, height: 50 }}
            autoPlay
            loop
            speed={0.3}
          />
        </View>
        <View style={{ position: "absolute", bottom: "10%", right: "4%", opacity: 0.25 }}>
          <LottieView
            source={require("../../../assets/lottie/sea/wired-flat-1166-seahorse-hover-pinch.json")}
            style={{ width: 55, height: 55 }}
            autoPlay
            loop
            speed={0.35}
          />
        </View>
      </View>

      {/* Confetti layers — play once on mount */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LottieView
          source={require("../../../assets/lottie/Confetti Effects Lottie Animation.json")}
          style={{ width: SCREEN_W, height: SCREEN_W * 1.4, alignSelf: "center" }}
          autoPlay
          loop={false}
          speed={0.8}
        />
      </View>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LottieView
          source={require("../../../assets/lottie/Confetti.json")}
          style={{ width: SCREEN_W * 0.8, height: SCREEN_W * 0.8, alignSelf: "center", marginTop: "15%" }}
          autoPlay
          loop={false}
          speed={1}
        />
      </View>

      {/* Crown + Finn mascot */}
      <Animated.View entering={ZoomIn.duration(500).delay(200)} style={styles.finnWrap}>
        <LottieView
          source={require("../../../assets/lottie/Crown.json")}
          style={styles.crownLottie}
          autoPlay
          loop
        />
        <ExpoImage source={FINN_STANDARD} accessible={false}
          style={styles.finnLottie}
         
         
          contentFit="contain"
        />
      </Animated.View>

      {/* Title */}
      <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.titleSection}>
        <ProBadge size="lg" />
        <Text style={styles.title}>ברוכים הבאים למועדון</Text>
        <Text style={styles.titleGold}>PRO</Text>
      </Animated.View>

      {/* Benefits list */}
      <View style={styles.benefitsList}>
        {BENEFITS.map((b, i) => {
          const Icon = b.icon;
          return (
            <Animated.View
              key={b.label}
              entering={FadeInDown.duration(300).delay(600 + i * 120)}
              style={styles.benefitRow}
            >
              <View style={[styles.benefitIcon, { backgroundColor: `${b.color}20` }]}>
                <Icon size={20} color={b.color} />
              </View>
              <Text style={styles.benefitLabel}>{b.label}</Text>
            </Animated.View>
          );
        })}
      </View>

      {/* CTA */}
      <Animated.View entering={FadeInDown.duration(400).delay(1300)} style={styles.ctaWrap}>
        <Pressable onPress={handleContinue} style={styles.ctaBtn}>
          <Text style={styles.ctaText}>בואו נתחיל!</Text>
        </Pressable>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 20, 40, 0.55)",
  },
  finnWrap: {
    alignItems: "center",
    marginBottom: 12,
  },
  crownLottie: {
    width: 56,
    height: 56,
    marginBottom: -10,
  },
  finnLottie: {
    width: 240,
    height: 240,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: 24,
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f0fdfa",
    textAlign: "center",
    writingDirection: "rtl",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  titleGold: {
    fontSize: 44,
    fontWeight: "900",
    color: "#facc15",
    letterSpacing: 8,
    textShadowColor: "rgba(250,204,21,0.55)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  benefitsList: {
    width: "100%",
    gap: 10,
    marginBottom: 28,
  },
  benefitRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(8,145,178,0.3)",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#f0fdfa",
    textAlign: "right",
    writingDirection: "rtl",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  ctaWrap: {
    width: "100%",
    paddingHorizontal: 16,
  },
  ctaBtn: {
    backgroundColor: "#0891b2",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 4,
    borderBottomColor: "#0e7490",
    shadowColor: "#22d3ee",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  ctaText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffff",
    writingDirection: "rtl",
  },
});
