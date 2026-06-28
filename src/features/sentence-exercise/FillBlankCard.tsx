import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { successHaptic, errorHaptic, tapHaptic } from "../../utils/haptics";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import { ConfettiExplosion } from "../../components/ui/ConfettiExplosion";
import type { FillBlankChoice, FillBlankPrompt } from "./sentenceTypes";

const { width: SW } = Dimensions.get("window");
// Match slot width to chip width: (screenWidth - 2*outer margin - 2*chip gap) / 3 choices
const SLOT_W = Math.floor((SW - 36 - 16) / 3);

interface FillBlankCardProps {
  prompt: FillBlankPrompt;
  placement: Record<string, string | null>;
  accentColor: string;
  onAttempt: (slotId: string, choiceId: string) => { correct: boolean; finishesSet: boolean };
  onCorrectSettled: () => void;
}

const CORRECT_HOLD_MS = 900;

type Token =
  | { type: "text"; value: string }
  | { type: "slot"; value: string }
  | { type: "newline" };

// Fisher-Yates with a simple LCG so the shuffled order is deterministic per
// prompt (won't reshuffle on every re-render or after a wrong attempt) but
// varies between prompts. The seed is derived from the template text so two
// different prompts get two different orderings — fixes "correct answer is
// always the rightmost chip" perception in RTL.
function shuffleWithSeed<T>(arr: readonly T[], seed: number): T[] {
  const result = [...arr];
  let s = seed || 1;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function tokenize(template: string): Token[] {
  const parts: Token[] = [];
  const regex = /\{\{([^}]+)\}\}|\n/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(template)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: template.slice(lastIndex, match.index) });
    }
    if (match[0] === "\n") {
      parts.push({ type: "newline" });
    } else {
      parts.push({ type: "slot", value: match[1] });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < template.length) {
    parts.push({ type: "text", value: template.slice(lastIndex) });
  }
  return parts;
}

function AnimatedChip({
  choice,
  used,
  isWrong,
  onPress,
}: {
  choice: FillBlankChoice;
  used: boolean;
  isWrong: boolean;
  onPress: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const ty = useSharedValue(0);
  const sc = useSharedValue(1);

  useEffect(() => {
    if (!isWrong || reducedMotion) return;
    ty.value = withSequence(
      withTiming(-5, { duration: 55 }),
      withTiming(4, { duration: 55 }),
      withTiming(-2, { duration: 45 }),
      withTiming(0, { duration: 75 }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWrong]);

  const chipAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }, { scale: sc.value }],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, chipAnim]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { if (!used && !reducedMotion) sc.value = withTiming(0.94, { duration: 80 }); }}
        onPressOut={() => { if (!reducedMotion) sc.value = withSpring(1, { damping: 8, stiffness: 200 }); }}
        disabled={used}
        accessibilityRole="button"
        accessibilityLabel={choice.text}
        accessibilityState={{ disabled: used }}
        style={[
          styles.chip,
          isWrong && styles.chipWrong,
          used && styles.chipUsed,
        ]}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={[styles.chipText, isWrong && styles.chipTextWrong, used && styles.chipTextUsed]}
        >
          {choice.text}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function FillBlankCard({
  prompt,
  placement,
  accentColor,
  onAttempt,
  onCorrectSettled,
}: FillBlankCardProps) {
  const tokens = useMemo(() => tokenize(prompt.template), [prompt.template]);
  // Stable shuffle per prompt — same prompt always gets the same order in a
  // session, but the correct answer isn't pinned to the right side anymore.
  const shuffledChoices = useMemo(
    () => shuffleWithSeed(prompt.choices, hashString(prompt.template)),
    [prompt.choices, prompt.template],
  );
  const [activeSlot, setActiveSlot] = useState<string>(prompt.slots[0]?.slotId ?? "");
  const [wrongChoice, setWrongChoice] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<number>(0);
  const reducedMotion = useReducedMotion();
  const shake = useSharedValue(0);

  const onCorrectSettledRef = useRef(onCorrectSettled);
  useEffect(() => { onCorrectSettledRef.current = onCorrectSettled; });

  // Pending timers from handleChoice — sound cue, the correct-hold settle, and
  // the wrong-flash auto-clear. Stored in refs so they can be cleared on
  // unmount and at the start of each handleChoice (mirrors TimelineOrderCard's
  // wrongTimerRef pattern) — otherwise a rapid tap or unmount mid-delay leaks
  // the timer and fires a setState / callback on a stale/unmounted card.
  const soundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearPendingTimers = useCallback(() => {
    if (soundTimerRef.current) clearTimeout(soundTimerRef.current);
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
  }, []);
  useEffect(() => clearPendingTimers, [clearPendingTimers]);

  const { playSound } = useSoundEffect();

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const handleChoice = useCallback(
    (choice: FillBlankChoice) => {
      if (!activeSlot || placement[activeSlot]) return;
      // Cancel any timers still pending from a previous tap before scheduling
      // new ones, so a fast second tap doesn't leak the earlier delays.
      clearPendingTimers();
      tapHaptic();
      // Same sound palette as the quiz options in LessonFlowScreen
      // (btn_click_soft_3 on tap, modal_open_2 on correct, modal_open_3
      // on wrong) — keeps the recall + quiz audio identity consistent.
      playSound('btn_click_soft_3');
      const result = onAttempt(activeSlot, choice.id);
      if (result.correct) {
        successHaptic();
        soundTimerRef.current = setTimeout(() => { playSound('modal_open_2'); }, 100);
        setWrongChoice(null);
        setConfetti((n) => n + 1);
        const nextSlot = prompt.slots.find((s) => s.slotId !== activeSlot && !placement[s.slotId]);
        if (nextSlot) {
          setActiveSlot(nextSlot.slotId);
        } else {
          settleTimerRef.current = setTimeout(() => onCorrectSettledRef.current(), CORRECT_HOLD_MS);
        }
      } else {
        errorHaptic();
        soundTimerRef.current = setTimeout(() => { playSound('modal_open_3'); }, 100);
        setWrongChoice(choice.id);
        if (!reducedMotion) {
          shake.value = withSequence(
            withTiming(-7, { duration: 55 }),
            withTiming(7, { duration: 55 }),
            withTiming(-4, { duration: 50 }),
            withTiming(0, { duration: 60 }),
          );
        }
        wrongTimerRef.current = setTimeout(() => setWrongChoice((c) => (c === choice.id ? null : c)), 420);
      }
    },
    [activeSlot, onAttempt, placement, prompt.slots, shake, reducedMotion, playSound],
  );

  const resolvedText = (slotId: string): string => {
    const choiceId = placement[slotId];
    if (!choiceId) return "";
    return prompt.choices.find((c) => c.id === choiceId)?.text ?? "";
  };

  const isChoiceUsed = (choiceId: string): boolean =>
    Object.values(placement).some((v) => v === choiceId);

  type ContentToken = Extract<Token, { type: "text" | "slot" }>;

  // Split tokens into display lines on \n boundaries
  const lines = useMemo<ContentToken[][]>(() => {
    const result: ContentToken[][] = [[]];
    for (const tok of tokens) {
      if (tok.type === "newline") {
        result.push([]);
      } else {
        result[result.length - 1].push(tok as ContentToken);
      }
    }
    return result.filter((l) => l.length > 0);
  }, [tokens]);

  return (
    <Animated.View entering={FadeInUp.duration(300)} style={[styles.outer, shakeStyle]}>
      {confetti > 0 && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ConfettiExplosion key={confetti} />
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.labelRow}>
          <View style={[styles.labelPill, { backgroundColor: `${accentColor}20` }]}>
            <Text style={[styles.labelText, { color: accentColor }]}>השלימו את המשפט</Text>
          </View>
        </View>

        {/* Sentence lines — row-reverse so tokens flow right-to-left matching Hebrew reading order */}
        <View style={styles.sentenceBox}>
          {lines.map((lineTokens, lineIdx) => (
            <View key={lineIdx} style={styles.sentenceLine}>
              {lineTokens.map((tok, tokIdx) => {
                if (tok.type === "text") {
                  return (
                    <Text key={tokIdx} style={styles.sentenceText}>
                      {tok.value}
                    </Text>
                  );
                }
                // slot
                const filled = resolvedText(tok.value);
                const isActive = tok.value === activeSlot && !filled;
                return (
                  <View
                    key={tokIdx}
                    style={[
                      styles.slotBase,
                      filled ? styles.slotFilled : isActive ? styles.slotActive : styles.slotEmpty,
                    ]}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        filled ? styles.slotTextFilled : { color: "transparent" },
                      ]}
                    >
                      {filled || "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Chips — shuffled so the correct answer isn't always rightmost */}
      <View style={styles.choicesRow}>
        {shuffledChoices.map((choice) => (
          <AnimatedChip
            key={choice.id}
            choice={choice}
            used={isChoiceUsed(choice.id)}
            isWrong={wrongChoice === choice.id}
            onPress={() => handleChoice(choice)}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: 16,
    marginTop: 8,
    gap: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    gap: 14,
    shadowColor: "#6366f1",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
    borderWidth: 1.5,
    borderColor: "#e0e7ff",
  },
  labelRow: {
    flexDirection: "row-reverse",
  },
  labelPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  labelText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    writingDirection: "rtl",
  },
  sentenceBox: {
    gap: 10,
    paddingHorizontal: 4,
  },
  sentenceLine: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
  },
  sentenceText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    lineHeight: 30,
    writingDirection: "rtl",
    textAlign: "right",
  },
  slotBase: {
    minWidth: SLOT_W,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  slotEmpty: {
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 3,
    borderColor: "#cbd5e1",
    borderRadius: 4,
  },
  slotActive: {
    backgroundColor: "#eff6ff",
    borderBottomWidth: 3,
    borderColor: "#3b82f6",
    borderRadius: 4,
  },
  slotFilled: {
    backgroundColor: "#d1fae5",
    borderWidth: 1.5,
    borderColor: "#6ee7b7",
  },
  slotText: {
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 28,
    writingDirection: "rtl",
    textAlign: "center",
  },
  slotTextFilled: {
    color: "#065f46",
  },
  choicesRow: {
    flexDirection: "row-reverse",
    gap: 6,
    paddingHorizontal: 0,
  },
  chip: {
    width: "100%",
    paddingVertical: 15,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3b82f6",
    borderColor: "#2563eb",
    borderBottomColor: "#1d4ed8",
    shadowColor: "#3b82f6",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  chipWrong: {
    backgroundColor: "#f59e0b",
    borderColor: "#d97706",
    borderBottomColor: "#b45309",
  },
  chipUsed: {
    backgroundColor: "#10b981",
    borderColor: "#059669",
    borderBottomColor: "#047857",
    opacity: 0.65,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
    includeFontPadding: false,
  },
  chipTextWrong: { color: "#ffffff" },
  chipTextUsed: { color: "#ffffff" },
});