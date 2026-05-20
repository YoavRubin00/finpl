/**
 * PizzaIndexScreen, "מדד הפיצות"
 * Humorous financial statistics about the user's progress in pizza/coffee units.
 * US-007 of PRD_FunFeatures.
 */
import React from "react";
import { View, Text, StyleSheet, ScrollView, Share, Pressable, type ImageSourcePropType } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeInUp } from "react-native-reanimated";
import { X } from "lucide-react-native";

import { LinearGradient } from "expo-linear-gradient";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { BackButton } from "../../components/ui/BackButton";
import { tapHaptic, successHaptic, heavyHaptic } from "../../utils/haptics";
import { RTL, SHADOW_STRONG } from "../shared-sim/simThemeBase";

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

// ── Real financial pizza data ──
const PIZZA_PRICE_2015 = 42;
const PIZZA_PRICE_2026 = 58;
function buildStats(): StatCard[] {
  // Card 1: Pizza inflation, how prices changed
  const inflationPct = Math.round(((PIZZA_PRICE_2026 - PIZZA_PRICE_2015) / PIZZA_PRICE_2015) * 100);

  // Card 2: Purchasing power, how many pizzas ₪1,000 buys today vs 10 years ago
  const pizzas2015 = Math.floor(1000 / PIZZA_PRICE_2015);
  const pizzas2026 = Math.floor(1000 / PIZZA_PRICE_2026);

  // Card 3: Compound interest, if you saved ₪50/month (a pizza a week) for 10 years at 5%
  const monthlyPizza = 50;
  const years = 10;
  const rate = 0.05;
  const months = years * 12;
  const futureValue = Math.round(
    monthlyPizza * ((Math.pow(1 + rate / 12, months) - 1) / (rate / 12))
  );
  const totalDeposited = monthlyPizza * months;

  // Card 4: Minimum wage, how many minutes of work to buy a pizza
  const minWagePerHour = 32.3; // ₪ Israel 2026
  const minutesPerPizza = Math.round((PIZZA_PRICE_2026 / minWagePerHour) * 60);

  return [
    {
      title: "אינפלציה של פיצה",
      value: "₪" + PIZZA_PRICE_2026,
      subtitle: "ב-2015 פיצה עלתה ₪" + PIZZA_PRICE_2015 + ". היום ₪" + PIZZA_PRICE_2026 + ", עלייה של " + inflationPct + "% בעשור",
      image: IMAGE_PIZZA,
    },
    {
      title: "כוח הקנייה שלך נשחק",
      value: pizzas2026 + " פיצות",
      subtitle: "ב-₪1,000 היום תקנה " + pizzas2026 + " פיצות. לפני עשור היית קונה " + pizzas2015 + ", הפסדת " + (pizzas2015 - pizzas2026) + " פיצות",
      image: IMAGE_COFFEE,
    },
    {
      title: "ויתרת על פיצה בשבוע? הנה מה שקיבלת",
      value: "₪" + futureValue.toLocaleString(),
      subtitle: "₪" + monthlyPizza + " בחודש x " + years + " שנים ב-5% = ₪" + futureValue.toLocaleString() + " (הפקדת רק ₪" + totalDeposited.toLocaleString() + ")",
      image: IMAGE_COMPOUND,
    },
    {
      title: "כמה דקות עבודה שווה פיצה?",
      value: minutesPerPizza + " דק׳",
      subtitle: "בשכר מינימום (₪" + minWagePerHour + "/שעה) צריך לעבוד " + minutesPerPizza + " דקות בשביל משולש פיצה אחד",
      image: IMAGE_RANK,
    },
  ];
}

// ── Stat Card Component ──
function StatCardView({ card, index }: { card: StatCard; index: number }) {
  return (
    <Animated.View entering={FadeInUp.delay(200 + index * 120).duration(400)}>
      <View style={styles.statCard}>
        {/* Image, full width at top, rounded, on a saturated blue backdrop */}
        <View style={styles.statImageWrap}>
          <ExpoImage
            source={card.image}
            style={[styles.statImage, { backgroundColor: "#7dd3fc" }]}
            contentFit="contain"
          />
        </View>
        {/* Text content below image */}
        <View style={styles.statContent}>
          <Text style={[styles.statTitle, RTL]}>{card.title}</Text>
          <Text style={styles.statValue}>{card.value}</Text>
          <Text style={[styles.statSubtitle, RTL]}>{card.subtitle}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ── Main Screen ──
interface PizzaIndexScreenProps {
  /** When provided, renders as modal content: X close button + sticky "המשך" CTA. */
  onClose?: () => void;
}

export function PizzaIndexScreen({ onClose }: PizzaIndexScreenProps = {}) {
  const stats = buildStats();
  const isModal = typeof onClose === "function";
  // SafeAreaView's bottom inset doesn't always reach absolute-positioned children
  // on Android with gesture nav, so we apply the inset explicitly to the sticky bar.
  const insets = useSafeAreaInsets();

  const handleShare = async () => {
    tapHaptic();
    const message = [
      "מדד הפיצות של FinPlay:",
      "פיצה ב-2015: ₪" + PIZZA_PRICE_2015 + " → היום: ₪" + PIZZA_PRICE_2026,
      "אם מוותרים על פיצה בשבוע ומשקיעים, אחרי 10 שנים יש ₪7,764!",
      "",
      "בואו ללמוד פיננסים! FinPlay, לימוד פיננסי שזה כיף",
    ].join("\n");

    try {
      await Share.share({ message });
      successHaptic();
    } catch {
      // User cancelled, no action needed
    }
  };

  const handleContinue = () => {
    heavyHaptic();
    onClose?.();
  };

  return (
    <LinearGradient colors={["#f0f9ff", "#e0f2fe"]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 }}>
          {isModal ? (
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="סגור"
              hitSlop={10}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(14,165,233,0.12)", alignItems: "center", justifyContent: "center" }}
            >
              <X size={18} color={STITCH_BLUE.textPrimary} />
            </Pressable>
          ) : (
            <BackButton color={STITCH_BLUE.textPrimary} />
          )}
          <Text style={[styles.headerTitle, RTL]}>מדד הפיצות</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, isModal && { paddingBottom: 140 }]}
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
              <Text style={styles.shareText}>שתף עם חברים</Text>
            </AnimatedPressable>
          </Animated.View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Sticky "המשך" CTA, modal mode only */}
        {isModal && (
          <View style={[styles.stickyContinueBar, { paddingBottom: 14 + insets.bottom }]}>
            <View style={styles.continueDepth} pointerEvents="none" />
            <Pressable
              onPress={handleContinue}
              accessibilityRole="button"
              accessibilityLabel="המשך"
              style={({ pressed }) => [
                styles.continueBtn,
                pressed && { transform: [{ translateY: 2 }] },
              ]}
            >
              <Text style={styles.continueBtnText}>המשך</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
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
  statImageWrap: {
    width: "100%",
    height: 160,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: "#7dd3fc",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  statImage: {
    width: "100%",
    height: "100%",
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
    height: 16,
  },

  /* Sticky "המשך" CTA (modal mode) */
  stickyContinueBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 20,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderTopWidth: 1,
    borderTopColor: "rgba(14,165,233,0.25)",
  },
  continueDepth: {
    position: "absolute",
    top: 18,
    left: 16,
    right: 16,
    bottom: 10,
    borderRadius: 16,
    backgroundColor: "#0369a1",
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#0ea5e9",
    paddingVertical: 16,
    shadowColor: "#0284c7",
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  continueBtnText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ffffff",
    writingDirection: "rtl",
    textAlign: "center",
    letterSpacing: 0.3,
  },
});
