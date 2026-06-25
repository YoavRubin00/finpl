import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useEconomyUIStore } from "../economy/useEconomyUIStore";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import { FinnCoach } from "./FinnCoach";
import { FillBlankCard } from "./FillBlankCard";
import { TimelineOrderCard, type TimelineOrderCardState } from "./TimelineOrderCard";
import { getRecallSet } from "./sentenceData";
import { useInteractiveRecall } from "./useInteractiveRecall";
import { isEnergyEnabledForModule } from "../subscription/useHeartsStore";

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
  /** Yoav 2026-06-11: surface (current, total) so the outer progress
   *  bar fills as each prompt is solved (default was a flat 0 until the
   *  whole recall set finished — felt broken). */
  onProgress?: (current: number, total: number) => void;
}

export function InteractiveRecallScreen({
  moduleId,
  unitColors,
  onComplete,
  onProgress,
}: InteractiveRecallScreenProps) {
  const set = getRecallSet(moduleId);
  const recall = useInteractiveRecall(set, isEnergyEnabledForModule(moduleId));
  const addXP = useEconomyUIStore((s) => s.addXP);
  const addCoins = useEconomyUIStore((s) => s.addCoins);
  const { playSound } = useSoundEffect();
  const total = set?.prompts.length ?? 0;
  useEffect(() => {
    onProgress?.(recall.state.currentIndex, total);
  }, [recall.state.currentIndex, total, onProgress]);

  const recallRef = useRef(recall);
  recallRef.current = recall;

  // CTA state lifted from TimelineOrderCard so the Check/Continue button can
  // live in a sticky footer below the ScrollView. The card pushes its state
  // via onStateChange tagged with `promptId`; the parent ignores any state
  // whose promptId doesn't match the current prompt to avoid stale handlers
  // firing during the one-frame transition window when the card remounts.
  //
  // Do NOT add a `setCardState(null)` reset on prompt change here — React
  // fires child effects before parent effects, so the reset would clobber
  // the freshly-mounted card's pushed state and leave the "בדוק" button
  // permanently disabled. The promptId guard below makes the reset
  // unnecessary.
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

  // Self-heal: if the lesson entered this phase but no recall set exists for
  // the module (gate/data drift), advance straight to the next phase instead
  // of trapping the user on a dead-end empty state with no button. Fires once
  // on mount; the lesson treats it as a zero-reward completion.
  const missingSet = !set || !recall.current;
  useEffect(() => {
    if (missingSet) {
      onComplete({ totalXp: 0, totalCoins: 0 });
    }
  }, [missingSet, onComplete]);

  if (missingSet) return null;

  const prompt = recall.current;
  // Belt-and-suspenders: missingSet already gates on !recall.current, but TS
  // can't narrow across the assignment and recall.current could theoretically
  // be undefined on the boundary tick where currentIndex === total. Bail
  // before accessing prompt.id so the JSX below never explodes.
  if (!prompt) return null;

  // Only honor cardState if it was pushed by THIS prompt's card. After a
  // prompt change, there's a brief window where the parent still holds the
  // previous prompt's state until the new card mounts and pushes — gating
  // on promptId here prevents stale callbacks (like a stale `continue_`
  // double-advancing the user) from firing during that window.
  const activeCardState = cardState?.promptId === prompt.id ? cardState : null;

  // When the timeline card's help offer is open, override Finn's bubble with
  // the "צריכים עזרה?" copy. The buttons sit higher in the card; pulling the
  // question into the bottom Finn bubble keeps both halves visible at once
  // (the previous in-card "text + buttons" block sat below the fold).
  const helpVisible = activeCardState?.helpVisible ?? false;
  const finnMood = helpVisible ? "talking" : recall.state.finnMood;
  const finnMessage = helpVisible
    ? "צריכים עזרה? אני יכול לסדר את זה."
    : recall.state.finnMessage;

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
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: "#ffffff",
            borderTopWidth: 1,
            borderTopColor: "#e2e8f0",
          }}
        >
          <Pressable
            onPress={() => {
              if (!activeCardState) return;
              // Same tap sound as the quiz options in LessonFlowScreen
              // (btn_click_soft_3). The downstream check()/continue_()
              // path inside TimelineOrderCard plays the correct/wrong
              // feedback sound when the result is known.
              playSound('btn_click_soft_3');
              if (activeCardState.locked) activeCardState.continue_();
              else activeCardState.check();
            }}
            disabled={!activeCardState}
            accessibilityRole="button"
            accessibilityLabel={activeCardState?.locked ? "המשך" : "בדוק"}
            accessibilityState={{ disabled: !activeCardState }}
            style={{
              height: 56,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              borderBottomWidth: 3,
              backgroundColor: activeCardState?.locked
                ? "#22c55e"              // correct → green
                : activeCardState?.wrong
                  ? "#ef4444"            // wrong → red
                  : (unitColors.bg ?? "#2563eb"), // default → blue
              borderBottomColor: activeCardState?.locked
                ? "#16a34a"
                : activeCardState?.wrong
                  ? "#b91c1c"
                  : "#1e293b",
              opacity: activeCardState ? 1 : 0.7,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#ffffff", writingDirection: "rtl" }}>
              {activeCardState?.locked ? "המשך" : "בדוק"}
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
});
