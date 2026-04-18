import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Calendar } from "lucide-react-native";
import { heavyHaptic } from "../../utils/haptics";
import { FeedStartButton } from "./minigames/shared/FeedStartButton";
import type { FeedScenario } from "./types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };
const RTL_CENTER = { writingDirection: "rtl" as const, textAlign: "center" as const };

interface Props {
  item: FeedScenario;
  isActive: boolean;
}

const DIFFICULTY_LABELS: Record<1 | 2 | 3, string> = {
  1: "קל",
  2: "בינוני",
  3: "קשה",
};

export const FeedScenarioCard = React.memo(function FeedScenarioCard({ item }: Props) {
  const router = useRouter();
  const scenario = item.scenario;

  // Pull a teaser from briefing — first sentence or first 120 chars
  const teaser = (() => {
    const firstSentence = scenario.briefing.split(/[.?!]/)[0];
    return firstSentence.length > 120 ? firstSentence.slice(0, 117) + "..." : firstSentence;
  })();

  const handlePress = () => {
    heavyHaptic();
    router.push(`/scenario-lab?id=${scenario.id}` as never);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[scenario.color + "22", "#0f172a", "#020617"]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
        <View style={[styles.accentBar, { backgroundColor: scenario.color }]} />

        <Animated.View entering={FadeInUp.delay(80).duration(320)} style={styles.header}>
          <View style={[styles.yearBadge, { borderColor: scenario.color }]}>
            <Calendar size={12} color={scenario.color} strokeWidth={2.5} />
            <Text style={[styles.yearText, { color: scenario.color }]} allowFontScaling={false}>
              {scenario.year}
            </Text>
          </View>
          <Text style={styles.emoji} allowFontScaling={false} accessible={false}>
            {scenario.emoji}
          </Text>
        </Animated.View>

        <Animated.Text
          entering={FadeInUp.delay(140).duration(320)}
          style={[styles.label, RTL_CENTER]}
          allowFontScaling={false}
        >
          תרחיש היסטורי
        </Animated.Text>

        <Animated.Text
          entering={FadeInUp.delay(200).duration(320)}
          style={[styles.title, RTL_CENTER]}
          allowFontScaling={false}
          numberOfLines={2}
        >
          {scenario.title}
        </Animated.Text>

        <Animated.Text
          entering={FadeInUp.delay(260).duration(320)}
          style={[styles.teaser, RTL]}
          allowFontScaling={false}
          numberOfLines={4}
        >
          {teaser}
        </Animated.Text>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel} allowFontScaling={false}>רמה</Text>
            <Text style={styles.metaValue} allowFontScaling={false}>
              {DIFFICULTY_LABELS[scenario.difficulty]}
            </Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel} allowFontScaling={false}>סקטורים</Text>
            <Text style={styles.metaValue} allowFontScaling={false}>
              {scenario.sectors.length}
            </Text>
          </View>
        </View>

        <Animated.View entering={FadeInUp.delay(320).duration(320)} style={{ width: '100%' }}>
          <FeedStartButton
            label="שחקו את התרחיש"
            onPress={handlePress}
            accessibilityLabel={`התחל סימולציה: ${scenario.title}`}
          />
        </Animated.View>
      </Animated.View>
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
    maxWidth: 400,
    backgroundColor: "rgba(15,23,42,0.82)",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(125,211,252,0.2)",
    padding: 24,
    gap: 14,
    overflow: "hidden",
  },
  accentBar: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    height: 4,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  yearBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  yearText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  emoji: {
    fontSize: 54,
    lineHeight: 62,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: "#bae6fd",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#f0f9ff",
    lineHeight: 30,
  },
  teaser: {
    fontSize: 14,
    lineHeight: 22,
    color: "#cbd5e1",
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row-reverse",
    gap: 8,
    justifyContent: "center",
    marginTop: 4,
  },
  metaChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(14,165,233,0.15)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.25)",
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#f0f9ff",
  },
  // CTA was an inline Pressable — now we delegate to the shared <FeedStartButton>
  // so the scenario card matches the "בואו נתחיל" minigame buttons exactly
  // (sky-500 with 3D depth shadow + animated rocket Lottie).
});