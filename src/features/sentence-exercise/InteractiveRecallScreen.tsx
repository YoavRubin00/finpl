import { useCallback, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useEconomyStore } from "../economy/useEconomyStore";
import { FinnCoach } from "./FinnCoach";
import { FillBlankCard } from "./FillBlankCard";
import { TimelineOrderCard } from "./TimelineOrderCard";
import { getRecallSet } from "./sentenceData";
import { useInteractiveRecall } from "./useInteractiveRecall";

interface UnitColors {
  bg: string;
  dim: string;
  glow: string;
  bottom: string;
}

interface InteractiveRecallScreenProps {
  moduleId: string;
  unitColors: UnitColors;
  onComplete: (summary: { totalXp: number; totalCoins: number }) => void;
}

export function InteractiveRecallScreen({
  moduleId,
  unitColors,
  onComplete,
}: InteractiveRecallScreenProps) {
  const set = getRecallSet(moduleId);
  const recall = useInteractiveRecall(set);
  const addXP = useEconomyStore((s) => s.addXP);
  const addCoins = useEconomyStore((s) => s.addCoins);

  const recallRef = useRef(recall);
  recallRef.current = recall;

  const handleCorrectSettled = useCallback(() => {
    const { state, advance } = recallRef.current;
    const total = set?.prompts.length ?? 0;
    if (state.currentIndex >= total - 1) {
      const { totalXp, totalCoins } = state;
      if (totalXp > 0) addXP(totalXp, "challenge_complete");
      if (totalCoins > 0) addCoins(totalCoins);
      onComplete({ totalXp, totalCoins });
    } else {
      advance();
    }
  }, [set?.prompts.length, addXP, addCoins, onComplete]);

  if (!set || !recall.current) {
    return (
      <View style={styles.empty} accessibilityRole="alert" accessibilityLabel="אין תרגילים זמינים">
        <Text style={styles.emptyText}>אין תרגילים זמינים כרגע.</Text>
      </View>
    );
  }

  const prompt = recall.current;
  const finnMood = recall.state.finnMood;
  const finnMessage = recall.state.finnMessage;

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Animated.View
          key={prompt.id}
          entering={FadeIn.duration(240)}
          exiting={FadeOut.duration(160)}
        >
          {prompt.type === "fill-blank" ? (
            <FillBlankCard
              prompt={prompt}
              placement={
                (recall.state.placement[prompt.id] as Record<string, string | null>) ?? {}
              }
              accentColor={unitColors.bg}
              onAttempt={(slotId, choiceId) => {
                const r = recall.attemptFillBlank(slotId, choiceId);
                return { correct: r.correct, finishesSet: r.finishesSet };
              }}
              onCorrectSettled={handleCorrectSettled}
            />
          ) : (
            <TimelineOrderCard
              prompt={prompt}
              initialOrder={(recall.state.placement[prompt.id] as string[]) ?? []}
              accentColor={unitColors.bg}
              onSubmit={(order) => {
                const r = recall.submitTimelineOrder(order);
                return { correct: r.correct, finishesSet: r.finishesSet };
              }}
              onCorrectSettled={handleCorrectSettled}
            />
          )}
        </Animated.View>
      </View>

      <FinnCoach
        mood={finnMood}
        message={finnMessage}
        accentColor={unitColors.bg}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f0f4ff",
  },
  content: {
    flex: 1,
    paddingTop: 4,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    writingDirection: "rtl",
  },
});
