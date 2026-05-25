import { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useEconomyUIStore } from "../economy/useEconomyUIStore";
import { FinnCoach } from "./FinnCoach";
import { FillBlankCard } from "./FillBlankCard";
import { TimelineOrderCard, type TimelineOrderCardState } from "./TimelineOrderCard";
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
  const addXP = useEconomyUIStore((s) => s.addXP);
  const addCoins = useEconomyUIStore((s) => s.addCoins);

  const recallRef = useRef(recall);
  recallRef.current = recall;

  // CTA state lifted from TimelineOrderCard so the Check/Continue button can
  // live in a sticky footer below the ScrollView. Reset whenever the prompt
  // changes so a stale callback from the previous prompt can't fire.
  const [cardState, setCardState] = useState<TimelineOrderCardState | null>(null);

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

  // Stable references for the per-prompt submit handlers so the card's
  // useEffect-driven onStateChange doesn't fire on every parent render
  // (which would loop: setCardState → re-render → new inline function →
  // new effect deps → setCardState again → "Maximum update depth exceeded").
  const handleSubmitFillBlank = useCallback((slotId: string, choiceId: string) => {
    const r = recallRef.current.attemptFillBlank(slotId, choiceId);
    return { correct: r.correct, finishesSet: r.finishesSet };
  }, []);
  const handleSubmitTimeline = useCallback((order: string[]) => {
    const r = recallRef.current.submitTimelineOrder(order);
    return { correct: r.correct, finishesSet: r.finishesSet };
  }, []);

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
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
              onAttempt={handleSubmitFillBlank}
              onCorrectSettled={handleCorrectSettled}
            />
          ) : (
            <TimelineOrderCard
              prompt={prompt}
              initialOrder={(recall.state.placement[prompt.id] as string[]) ?? []}
              accentColor={unitColors.bg}
              onSubmit={handleSubmitTimeline}
              onCorrectSettled={handleCorrectSettled}
              onStateChange={setCardState}
            />
          )}
        </Animated.View>
      </ScrollView>

      {/* Sticky CTA footer — always rendered for TimelineOrderCard so the
          button is visible from the first frame even before the card's
          useEffect has pushed its state up (which on slow devices could
          leave the user with no visible CTA for a beat). FillBlankCard
          auto-advances and doesn't need a CTA, so skip for that type. */}
      {prompt.type !== "fill-blank" && (
        <View style={styles.stickyFooter}>
          <Pressable
            onPress={() => {
              if (!cardState) return;
              if (cardState.locked) cardState.continue_();
              else cardState.check();
            }}
            disabled={!cardState}
            accessibilityRole="button"
            accessibilityLabel={cardState?.locked ? "המשך" : "בדוק"}
            accessibilityState={{ disabled: !cardState }}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: cardState?.locked ? "#0ea5e9" : unitColors.bg,
                borderBottomColor: cardState?.locked ? "#0284c7" : "#1e293b",
                opacity: pressed ? 0.85 : (cardState ? 1 : 0.7),
              },
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {cardState?.locked ? "המשך" : "בדוק"}
            </Text>
          </Pressable>
        </View>
      )}

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
  },
  contentContainer: {
    flexGrow: 1,
    paddingTop: 4,
    paddingBottom: 12,
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
  stickyFooter: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ffffff",
    writingDirection: "rtl",
  },
});
