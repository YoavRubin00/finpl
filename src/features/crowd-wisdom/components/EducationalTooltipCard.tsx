import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Lightbulb } from "lucide-react-native";
import Animated, { FadeIn } from "react-native-reanimated";

interface EducationalTooltipCardProps {
  title: string;
  body: string;
  example?: string;
}

/**
 * Soft yellow card that surfaces a financial concept tied to the current
 * question (P/E ratio, sentiment, inflation direction, etc.).
 */
export function EducationalTooltipCard({
  title,
  body,
  example,
}: EducationalTooltipCardProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(280)}
      style={styles.card}
      accessibilityRole="text"
      accessibilityLabel={`טיפ: ${title}. ${body}`}
    >
      <View style={styles.header}>
        <Lightbulb size={18} color="#a16207" strokeWidth={2.4} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.body}>{body}</Text>
      {example ? (
        <View style={styles.exampleChip}>
          <Text style={styles.exampleText}>דוגמה: {example}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fef9c3",
    borderRadius: 18,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "900",
    color: "#78350f",
    writingDirection: "rtl",
    textAlign: "right",
    flex: 1,
  },
  body: {
    fontSize: 12,
    fontWeight: "500",
    color: "#78350f",
    lineHeight: 18,
    writingDirection: "rtl",
    textAlign: "right",
  },
  exampleChip: {
    alignSelf: "flex-start",
    backgroundColor: "#fcd34d",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  exampleText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#78350f",
    writingDirection: "rtl",
  },
});
