import { useCallback, useMemo, useState } from "react";
import type {
  FillBlankPrompt,
  FinnMood,
  InteractiveRecallSet,
  InteractiveRecallState,
  RecallPrompt,
  TimelineOrderPrompt,
} from "./sentenceTypes";
import { useSubscriptionStore } from "../subscription/useSubscriptionStore";

const FIRST_TRY_XP = 8;
const FIRST_TRY_COINS = 4;
const SECOND_TRY_XP = 4;
const SECOND_TRY_COINS = 2;
const LATER_TRY_XP = 2;
const LATER_TRY_COINS = 1;
const STREAK_BONUS_XP = 5;
const STREAK_BONUS_AT = new Set([3, 5]);

const CORRECT_FALLBACK = "כל הכבוד!";

export interface RecallAttemptResult {
  correct: boolean;
  completesPrompt: boolean;
  finishesSet: boolean;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function initialPlacementFor(prompt: RecallPrompt): Record<string, string | null> | string[] {
  if (prompt.type === "fill-blank") {
    const slots: Record<string, string | null> = {};
    for (const slot of prompt.slots) slots[slot.slotId] = null;
    return slots;
  }
  return shuffle(prompt.items.map((item) => item.id));
}

function buildInitialState(set: InteractiveRecallSet): InteractiveRecallState {
  const placement: InteractiveRecallState["placement"] = {};
  for (const p of set.prompts) placement[p.id] = initialPlacementFor(p);
  return {
    currentIndex: 0,
    wrongCount: {},
    placement,
    streak: 0,
    totalXp: 0,
    totalCoins: 0,
    finnMood: "talking",
    finnMessage: set.intro,
    isComplete: false,
  };
}

function rewardFor(attempt: number): { xp: number; coins: number } {
  if (attempt === 1) return { xp: FIRST_TRY_XP, coins: FIRST_TRY_COINS };
  if (attempt === 2) return { xp: SECOND_TRY_XP, coins: SECOND_TRY_COINS };
  return { xp: LATER_TRY_XP, coins: LATER_TRY_COINS };
}

function pickCorrectMessage(prompt: RecallPrompt): string {
  const pool = prompt.finn.correct;
  if (pool.length === 0) return CORRECT_FALLBACK;
  return pool[Math.floor(Math.random() * pool.length)];
}

function timelineIsCorrect(prompt: TimelineOrderPrompt, order: string[]): boolean {
  for (let i = 0; i < order.length; i += 1) {
    const item = prompt.items.find((it) => it.id === order[i]);
    if (!item || item.correctOrder !== i) return false;
  }
  return true;
}

export interface UseInteractiveRecallApi {
  set: InteractiveRecallSet | undefined;
  state: InteractiveRecallState;
  current: RecallPrompt | undefined;
  /** Try a fill-blank choice on a slot. Returns whether the attempt was correct. */
  attemptFillBlank: (slotId: string, choiceId: string) => RecallAttemptResult;
  /** Submit the current timeline-order ordering. Pass the displayed order from the card. */
  submitTimelineOrder: (displayedOrder: string[]) => RecallAttemptResult;
  /** Advance to the next prompt (or mark complete). Called after correct answer + feedback delay. */
  advance: () => void;
}

export function useInteractiveRecall(
  set: InteractiveRecallSet | undefined,
): UseInteractiveRecallApi {
  const [state, setState] = useState<InteractiveRecallState>(() =>
    set ? buildInitialState(set) : ({
      currentIndex: 0,
      wrongCount: {},
      placement: {},
      streak: 0,
      totalXp: 0,
      totalCoins: 0,
      finnMood: "standard",
      finnMessage: "",
      isComplete: false,
    } satisfies InteractiveRecallState),
  );

  const current: RecallPrompt | undefined = useMemo(() => {
    if (!set) return undefined;
    return set.prompts[state.currentIndex];
  }, [set, state.currentIndex]);

  const applyCorrect = useCallback(
    (prompt: RecallPrompt, attemptsSoFar: number): RecallAttemptResult => {
      const isFirstTry = attemptsSoFar === 0;
      const reward = rewardFor(attemptsSoFar + 1);
      const finishesSet = state.currentIndex >= (set?.prompts.length ?? 0) - 1;
      const newStreak = isFirstTry ? state.streak + 1 : 0;
      const streakBonus = STREAK_BONUS_AT.has(newStreak) ? STREAK_BONUS_XP : 0;
      const mood: FinnMood = finishesSet ? "dancing" : newStreak >= 3 ? "fire" : "happy";
      const message = finishesSet
        ? "סיימתם את סט התרגול!"
        : newStreak >= 3
          ? "סטריק! 🔥"
          : pickCorrectMessage(prompt);

      setState((prev) => ({
        ...prev,
        streak: newStreak,
        totalXp: prev.totalXp + reward.xp + streakBonus,
        totalCoins: prev.totalCoins + reward.coins,
        finnMood: mood,
        finnMessage: message,
      }));

      return { correct: true, completesPrompt: true, finishesSet };
    },
    [set, state.currentIndex, state.streak],
  );

  const applyWrong = useCallback(
    (prompt: RecallPrompt): RecallAttemptResult => {
      let shouldDeductHeart = false;
      setState((prev) => {
        const prevWrongs = prev.wrongCount[prompt.id] ?? 0;
        const nextWrongs = prevWrongs + 1;
        // Practice is forgiving: only deduct a heart on the 2nd+ mistake per
        // prompt, not the first try. First mistake → just empathic nudge.
        if (nextWrongs >= 2) shouldDeductHeart = true;
        const message =
          nextWrongs >= 2 ? prompt.finn.hintAfterTwoWrongs : prompt.finn.empathicFirst;
        return {
          ...prev,
          wrongCount: { ...prev.wrongCount, [prompt.id]: nextWrongs },
          streak: 0,
          finnMood: "empathic",
          finnMessage: message,
        };
      });
      if (shouldDeductHeart) useSubscriptionStore.getState().useHeart();
      return { correct: false, completesPrompt: false, finishesSet: false };
    },
    [],
  );

  const attemptFillBlank = useCallback(
    (slotId: string, choiceId: string): RecallAttemptResult => {
      if (!current || current.type !== "fill-blank") {
        return { correct: false, completesPrompt: false, finishesSet: false };
      }
      const prompt: FillBlankPrompt = current;
      const slot = prompt.slots.find((s) => s.slotId === slotId);
      if (!slot) return { correct: false, completesPrompt: false, finishesSet: false };

      if (slot.correctChoiceId !== choiceId) return applyWrong(prompt);

      // Commit correct placement immediately so UI can render it
      setState((prev) => {
        const prevSlotMap =
          (prev.placement[prompt.id] as Record<string, string | null>) ?? {};
        return {
          ...prev,
          placement: {
            ...prev.placement,
            [prompt.id]: { ...prevSlotMap, [slotId]: choiceId },
          },
        };
      });

      const attemptsSoFar = state.wrongCount[prompt.id] ?? 0;
      return applyCorrect(prompt, attemptsSoFar);
    },
    [current, applyCorrect, applyWrong, state.wrongCount],
  );

  const submitTimelineOrder = useCallback((displayedOrder: string[]): RecallAttemptResult => {
    if (!current || current.type !== "timeline-order") {
      return { correct: false, completesPrompt: false, finishesSet: false };
    }
    const prompt: TimelineOrderPrompt = current;
    if (!timelineIsCorrect(prompt, displayedOrder)) return applyWrong(prompt);
    const attemptsSoFar = state.wrongCount[prompt.id] ?? 0;
    return applyCorrect(prompt, attemptsSoFar);
  }, [current, state.wrongCount, applyCorrect, applyWrong]);

  const advance = useCallback(() => {
    if (!set) return;
    setState((prev) => {
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= set.prompts.length) {
        return { ...prev, isComplete: true };
      }
      return {
        ...prev,
        currentIndex: nextIndex,
        finnMood: "talking",
        finnMessage: "בואו נמשיך!",
      };
    });
  }, [set]);

  return {
    set,
    state,
    current,
    attemptFillBlank,
    submitTimelineOrder,
    advance,
  };
}