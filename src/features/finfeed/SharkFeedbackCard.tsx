import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { FINN_STANDARD, FINN_HAPPY } from "../retention-loops/finnMascotConfig";
import { tapHaptic, successHaptic } from "../../utils/haptics";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import { FlyingRewards } from "../../components/ui/FlyingRewards";
import { useEconomyStore } from "../economy/useEconomyStore";

const FEEDBACK_COIN_REWARD = 50;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RTL_CENTER = { writingDirection: "rtl" as const, textAlign: "center" as const };
const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };

const OPTIONS: { id: string; label: string; emoji: string }[] = [
  { id: "swipe", label: "משחקי גלילה הקצרים", emoji: "🎮" },
  { id: "modules", label: "מודולות הלמידה", emoji: "📚" },
  { id: "videos", label: "הסרטונים", emoji: "🎬" },
  { id: "sims", label: "הסימולטור השקעות", emoji: "📈" },
];

export const SharkFeedbackCard = React.memo(function SharkFeedbackCard() {
  const [choice, setChoice] = useState<string | null>(null);
  const [showFlying, setShowFlying] = useState(false);
  const { playSound } = useSoundEffect();
  const addCoins = useEconomyStore((s) => s.addCoins);

  const handleSelect = (id: string) => {
    if (choice) return;
    tapHaptic();
    playSound('btn_click_soft_2');
    setChoice(id);
    addCoins(FEEDBACK_COIN_REWARD);
    setShowFlying(true);
    setTimeout(() => successHaptic(), 150);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0c4a6e", "#0369a1", "#075985"]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View entering={FadeIn.duration(400)} style={styles.card}>
        <ExpoImage
          source={choice ? FINN_HAPPY : FINN_STANDARD}
          style={styles.finn}
          contentFit="contain"
          accessible={false}
        />

        <Text style={[styles.title, RTL_CENTER]}>מה הכי אהבתם באפליקציה?</Text>
        <Text style={[styles.subtitle, RTL_CENTER]}>
          קפטן שארק רוצה לדעת — התשובה שלכם עוזרת לנו להשתפר
        </Text>

        <View style={styles.optionsCol}>
          {OPTIONS.map((opt, idx) => {
            const selected = choice === opt.id;
            const dimmed = choice && !selected;
            return (
              <Animated.View
                key={opt.id}
                entering={FadeInUp.delay(150 + idx * 80).duration(320)}
              >
                <Pressable
                  onPress={() => handleSelect(opt.id)}
                  disabled={!!choice}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ selected, disabled: !!choice }}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={[
                    styles.option,
                    selected && styles.optionSelected,
                    dimmed && styles.optionDimmed,
                  ]}
                >
                  <Text style={styles.optionEmoji} accessible={false}>{opt.emoji}</Text>
                  <Text style={[styles.optionLabel, RTL]}>{opt.label}</Text>
                  {selected && <Text style={styles.checkmark} accessible={false}>✓</Text>}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {choice && (
          <Animated.View entering={FadeIn.duration(320)}>
            <Text style={[styles.thanks, RTL_CENTER]}>
              תודה! בזכותך נשפר 🙏  ·  +{FEEDBACK_COIN_REWARD} 🪙
            </Text>
          </Animated.View>
        )}
      </Animated.View>

      {showFlying && (
        <FlyingRewards
          type="coins"
          amount={FEEDBACK_COIN_REWARD}
          onComplete={() => setShowFlying(false)}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: "rgba(56, 189, 248, 0.35)",
    alignItems: "center",
    gap: 10,
  },
  finn: { width: 96, height: 96 },
  title: {
    color: "#f0f9ff",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
  },
  subtitle: {
    color: "#bae6fd",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    lineHeight: 20,
  },
  optionsCol: {
    width: "100%",
    gap: 10,
  },
  option: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(14, 165, 233, 0.18)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "rgba(56, 189, 248, 0.35)",
  },
  optionSelected: {
    backgroundColor: "rgba(34, 197, 94, 0.25)",
    borderColor: "#22c55e",
  },
  optionDimmed: {
    opacity: 0.45,
  },
  optionEmoji: { fontSize: 22 },
  optionLabel: {
    color: "#f0f9ff",
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  checkmark: {
    color: "#22c55e",
    fontSize: 20,
    fontWeight: "900",
  },
  thanks: {
    color: "#7dd3fc",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 12,
  },
});