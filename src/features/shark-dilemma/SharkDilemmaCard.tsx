import { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { FINN_DANCING, FINN_EMPATHIC, FINN_STANDARD } from "../retention-loops/finnMascotConfig";
import { tapHaptic, successHaptic } from "../../utils/haptics";
import type { SharkDilemma, DilemmaOption } from "./types";

interface Props {
  dilemma: SharkDilemma;
  onContinue: () => void;
  /** Fired once when the user picks an option. Parent grants any rewards. */
  onChoice?: (option: DilemmaOption) => void;
}

/**
 * "לייעץ לשארק" — end-of-module advisory dilemma. Finn shows a real-life
 * scenario; user picks one of two options. Wise choice → dancing shark +
 * small coin reward. Unwise choice → empathic shark + heart deduction
 * (parent handles rewards/penalties).
 */
export function SharkDilemmaCard({ dilemma, onContinue, onChoice }: Props) {
  const [chosen, setChosen] = useState<DilemmaOption | null>(null);

  const handleChoice = useCallback(
    (option: DilemmaOption) => {
      if (chosen) return;
      tapHaptic();
      setChosen(option);
      onChoice?.(option);
      if (option.isWise) successHaptic();
    },
    [chosen, onChoice],
  );

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(320)} style={styles.titleWrap}>
          <Text style={styles.title} accessibilityRole="header">לייעץ לשארק</Text>
        </Animated.View>

        {/* Finn + speech bubble row */}
        <View style={styles.finnRow}>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{dilemma.scenario}</Text>
          </View>
          <ExpoImage
            source={chosen ? (chosen.isWise ? FINN_DANCING : FINN_EMPATHIC) : FINN_STANDARD}
            style={styles.finn}
            contentFit="contain"
            accessible={false}
          />
        </View>

        {/* Options — 2 blue buttons stacked. Hide after choice. */}
        {!chosen && (
          <Animated.View entering={FadeIn.duration(260)} exiting={FadeOut.duration(180)} style={styles.optionsWrap}>
            {dilemma.options.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => handleChoice(option)}
                style={({ pressed }) => [styles.optionBtn, pressed && styles.optionBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel={option.label}
              >
                <Text style={styles.optionText}>{option.label}</Text>
              </Pressable>
            ))}
          </Animated.View>
        )}

        {/* Feedback + continue */}
        {chosen && (
          <Animated.View entering={FadeIn.duration(320)} style={styles.feedbackWrap}>
            <View
              style={[styles.feedbackCard, chosen.isWise ? styles.feedbackWise : styles.feedbackNotWise]}
              accessible
              accessibilityLiveRegion="polite"
              accessibilityLabel={`${chosen.isWise ? "בחירה חכמה" : "נקודה למחשבה"}. ${chosen.feedback}`}
            >
              <Text style={[styles.feedbackLabel, chosen.isWise ? styles.feedbackLabelWise : styles.feedbackLabelNotWise]}>
                {chosen.isWise ? "✓ בחירה חכמה" : "💭 נקודה למחשבה"}
              </Text>
              <Text style={styles.feedbackText}>{chosen.feedback}</Text>
            </View>

            <Pressable onPress={onContinue} style={styles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך">
              <Text style={styles.continueText}>המשך</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f0f9ff",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 18,
  },
  titleWrap: {
    alignItems: "center",
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0369a1",
    writingDirection: "rtl",
    textAlign: "center",
  },
  finnRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 8,
  },
  finn: {
    width: 110,
    height: 110,
    flexShrink: 0,
  },
  bubble: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(14,165,233,0.35)",
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#0f172a",
    fontWeight: "600",
    textAlign: "right",
    writingDirection: "rtl",
  },
  optionsWrap: {
    gap: 12,
    marginTop: 8,
  },
  optionBtn: {
    backgroundColor: "#1d4ed8",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 4,
    borderBottomColor: "#1e3a8a",
    opacity: 1,
    shadowColor: "#1d4ed8",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  optionBtnPressed: {
    opacity: 0.92,
    transform: [{ translateY: 2 }],
    borderBottomWidth: 2,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ffffff",
    textAlign: "center",
    writingDirection: "rtl",
  },
  feedbackWrap: {
    gap: 14,
    marginTop: 4,
  },
  feedbackCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  feedbackWise: {
    borderColor: "#22c55e",
    backgroundColor: "#f0fdf4",
  },
  feedbackNotWise: {
    borderColor: "#f59e0b",
    backgroundColor: "#fffbeb",
  },
  feedbackLabel: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6,
    textAlign: "right",
    writingDirection: "rtl",
  },
  feedbackLabelWise: { color: "#15803d" },
  feedbackLabelNotWise: { color: "#b45309" },
  feedbackText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#0f172a",
    fontWeight: "500",
    textAlign: "right",
    writingDirection: "rtl",
  },
  continueBtn: {
    backgroundColor: "#1d4ed8",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 4,
    borderBottomColor: "#1e3a8a",
    marginTop: 4,
    opacity: 1,
    shadowColor: "#1d4ed8",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  continueText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#ffffff",
    writingDirection: "rtl",
  },
});