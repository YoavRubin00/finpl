/**
 * PizzaIndexScreen — "מדד הפיצות"
 * Humorous financial statistics about the user's progress in pizza/coffee units.
 * US-007 of PRD_FunFeatures.
 */
import React from "react";
import { View, Text, StyleSheet, ScrollView, Share, Image, type ImageSourcePropType } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";
import LottieView from "lottie-react-native";

import { useEconomyStore } from "../economy/useEconomyStore";
import { FINN_HAPPY } from "../retention-loops/finnMascotConfig";
import { GlowCard } from "../../components/ui/GlowCard";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { BackButton } from "../../components/ui/BackButton";
import { SimLottieBackground } from "../../components/ui/SimLottieBackground";
import { SIM_LOTTIE } from "../shared-sim/simLottieMap";
import { tapHaptic, successHaptic } from "../../utils/haptics";
import { RTL, SHADOW_STRONG, SHADOW_LIGHT } from "../shared-sim/simThemeBase";

// ── Theme ──
const STITCH_BLUE = {
  primary: "#0ea5e9",
  glow: "#38bdf8",
  dim: "#f0f9ff",
  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  cardBorder: "#bae6fd",
};

// ── Lottie assets for stat cards ──
const IMAGE_PIZZA = require("../../../assets/IMAGES/fun/pizza_index_stat.png");
const IMAGE_COFFEE = require("../../../assets/IMAGES/fun/coffee_streak_stat.png");
const IMAGE_COMPOUND = require("../../../assets/IMAGES/fun/compound_coins_stat.png");
const IMAGE_RANK = require("../../../assets/IMAGES/fun/podium_rank_stat.png");

// ── Stat card data builder ──
interface StatCard {
  title: string;
  value: string;
  subtitle: string;
  image: ImageSourcePropType;
}

function buildStats(xp: number, coins: number, streak: number): StatCard[] {
  const pizzas = Math.floor(xp / 35);
  const compoundResult = Math.round(coins * Math.pow(1.05, 10));

  // Mock leaderboard rank — fun deterministic formula
  const rank = Math.max(1, 100 - Math.floor(xp / 50) - streak * 2);
  const rankSuffix = rank <= 3 ? "מקום על הפודיום!" : "מתוך 100 שחקנים";

  return [
    {
      title: "כמה פיצות שווה ה-XP שלך",
      value: String(pizzas),
      subtitle: xp + " XP = " + pizzas + " פיצות (35 XP לפיצה)",
      image: IMAGE_PIZZA,
    },
    {
      title: "כמה ימי קפה זה הרצף שלך",
      value: String(streak),
      subtitle: streak > 0 ? streak + " ימים רצופים = " + streak + " כוסות קפה בוקר" : "עדיין אין רצף — בוא נתחיל!",
      image: IMAGE_COFFEE,
    },
    {
      title: "אם היית משקיע את המטבעות שלך בריבית דריבית",
      value: coins > 0 ? String(compoundResult) : "0",
      subtitle: coins > 0 ? coins + " מטבעות x 5% ל-10 שנים = " + compoundResult + " מטבעות" : "צבור מטבעות כדי לראות את הקסם",
      image: IMAGE_COMPOUND,
    },
    {
      title: "הדירוג שלך בין חברי הסקוואד",
      value: "#" + rank,
      subtitle: rankSuffix,
      image: IMAGE_RANK,
    },
  ];
}

// ── Stat Card Component ──
function StatCardView({ card, index }: { card: StatCard; index: number }) {
  return (
    <Animated.View entering={FadeInUp.delay(200 + index * 120).duration(400)}>
      <View style={styles.statCard}>
        {/* Image — full width at top, rounded */}
        <ExpoImage
          source={card.image}
          style={styles.statImage}
          contentFit="cover"
        />
        {/* Text content below image */}
        <View style={styles.statContent}>
          <Text style={[styles.statTitle, RTL]}>{card.title}</Text>
          <View style={{ flexDirection: "row-reverse", alignItems: "baseline", gap: 8 }}>
            <Text style={styles.statValue}>{card.value}</Text>
            <Text style={[styles.statSubtitle, RTL]}>{card.subtitle}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ── Main Screen ──
export function PizzaIndexScreen() {
  const xp = useEconomyStore((s) => s.xp);
  const coins = useEconomyStore((s) => s.coins);
  const streak = useEconomyStore((s) => s.streak);

  const stats = buildStats(xp, coins, streak);

  const handleShare = async () => {
    tapHaptic();
    const pizzas = Math.floor(xp / 35);
    const message = [
      "מדד הפיצות שלי ב-FinPlay:",
      "ה-XP שלי שווה " + pizzas + " פיצות",
      "הרצף שלי: " + streak + " ימים",
      "מטבעות בריבית דריבית: " + Math.round(coins * Math.pow(1.05, 10)),
      "",
      "בואו לשחק! FinPlay — לימוד פיננסי שזה כיף",
    ].join("\n");

    try {
      await Share.share({ message });
      successHaptic();
    } catch {
      // User cancelled — no action needed
    }
  };

  return (
    <SimLottieBackground
      lottieSources={[SIM_LOTTIE.network, SIM_LOTTIE.coins]}
      chapterColors={["#f0f9ff", "#e0f2fe"]}
    >
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Header */}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 }}>
          <BackButton color={STITCH_BLUE.textPrimary} />
          <Text style={[styles.headerTitle, RTL]}>מדד הפיצות</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Stat Cards */}
          {stats.map((card, i) => (
            <StatCardView key={card.title} card={card} index={i} />
          ))}

          {/* Share Button */}
          <Animated.View entering={FadeInUp.delay(700).duration(400)}>
            <AnimatedPressable
              onPress={handleShare}
              style={styles.shareButton}
              accessibilityRole="button"
              accessibilityLabel="שתף עם חברים"
            >
              <LottieView
                source={require("../../../assets/lottie/wired-flat-412-gift-hover-squeeze.json")}
                style={{ width: 28, height: 28 }}
                autoPlay
                loop
              />
              <Text style={styles.shareText}>שתף עם חברים</Text>
            </AnimatedPressable>
          </Animated.View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </SimLottieBackground>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
    position: "relative",
  },
  headerRight: {
    position: "absolute",
    right: 20,
    top: 12,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: STITCH_BLUE.textPrimary,
    marginTop: 4,
  },
  finnWrapper: {
    marginTop: 8,
  },
  finnImage: {
    width: 80,
    height: 80,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  statCard: {
    borderRadius: 22,
    marginBottom: 16,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    shadowColor: "#0c4a6e",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  statImage: {
    width: "100%",
    height: 160,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: "#e0f2fe",
  },
  statContent: {
    padding: 16,
    gap: 4,
  },
  statTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: STITCH_BLUE.textPrimary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "900",
    color: STITCH_BLUE.primary,
  },
  statSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: STITCH_BLUE.textSecondary,
    lineHeight: 18,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: STITCH_BLUE.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
    marginTop: 8,
    ...SHADOW_STRONG,
  },
  shareText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#ffffff",
  },
  bottomSpacer: {
    height: 40,
  },
});
