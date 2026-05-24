import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { ChevronUp, ChevronDown } from "lucide-react-native";
import { successHaptic, tapHaptic, mediumHaptic, selectionHaptic, errorHaptic } from "../../utils/haptics";
import { ConfettiExplosion } from "../../components/ui/ConfettiExplosion";
import type { TimelineOrderPrompt } from "./sentenceTypes";

// משוער — גובה item כולל gap. משמש את ה-pan gesture לחישוב כמה מקומות
// המשתמש גרר. אם תעדכן את itemRow padding או itemsColumn gap, עדכן גם פה.
// פריט: paddingVertical 8+8 + content max(28,22) + border 1.5+1.5 = ~47;
// gap 6 → step ≈ 53. נשתמש ב-52 כדי שגרירה גדולה תרגיש מדויקת.
const ITEM_STEP_HEIGHT = 52;

/**
 * State that the card exposes to its parent so the parent can render a
 * sticky bottom CTA. Lifted out of the card body so the button is never
 * trapped below the fold of a long card or hidden behind the FinnCoach.
 */
export interface TimelineOrderCardState {
  locked: boolean;
  check: () => void;
  continue_: () => void;
}

interface TimelineOrderCardProps {
  prompt: TimelineOrderPrompt;
  initialOrder: string[];
  accentColor: string;
  onSubmit: (order: string[]) => { correct: boolean; finishesSet: boolean };
  onCorrectSettled: () => void;
  /** Fires whenever the card's lock state or callbacks change, so the
   *  parent can render the primary CTA button outside the card. */
  onStateChange?: (state: TimelineOrderCardState) => void;
}

const RANK_COLORS = ["#f97316", "#eab308", "#22c55e", "#3b82f6"];
const RANK_BG = ["#fff7ed", "#fefce8", "#f0fdf4", "#eff6ff"];

/**
 * Single row of the timeline order list. Pan gesture wraps the WHOLE row so
 * a user can grab from anywhere — not only a side handle. Reorder happens
 * in real time as the finger crosses each row's mid-line, so rows never sit
 * stacked on top of each other while dragging.
 *
 * Coordinate model:
 *  - indexRef holds the row's *current* position (updated by both prop
 *    sync and in-worklet after a moveItem fires)
 *  - stepsAcc holds how many slots we've already reordered during the active
 *    drag, so the visual translateY = e.translationY - stepsAcc * STEP_HEIGHT
 *    keeps the row anchored under the finger across rearrangements.
 */
interface DraggableItemRowProps {
  idx: number;
  totalItems: number;
  locked: boolean;
  accentColor: string;
  onMoveItem: (fromIdx: number, toIdx: number) => void;
  onSwap: (idx: number, dir: -1 | 1) => void;
  rankColor: string;
  rankBg: string;
  children: ReactNode;
}

function DraggableItemRow({
  idx,
  totalItems,
  locked,
  accentColor,
  onMoveItem,
  onSwap,
  rankColor,
  rankBg,
  children,
}: DraggableItemRowProps) {
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(0);
  const indexRef = useSharedValue(idx);
  const stepsAcc = useSharedValue(0);
  // Smooth scale/shadow transition — eased between dragging/idle states
  // instead of snapping. 0 = idle, 1 = fully picked up.
  const liftProgress = useSharedValue(0);

  // Keep the worklet's view of the row's index in sync with React props.
  useEffect(() => { indexRef.value = idx; }, [idx, indexRef]);

  const triggerStartHaptic = useCallback(() => { mediumHaptic(); }, []);
  const triggerTickHaptic = useCallback(() => { selectionHaptic(); }, []);
  const triggerDropHaptic = useCallback(() => { tapHaptic(); }, []);

  // Spring profile — soft, slightly bouncy, low stiffness. Mimics iOS reorder
  // feel rather than a tight engineering snap.
  const SOFT_SPRING = { damping: 13, stiffness: 130, mass: 0.7 } as const;

  const pan = Gesture.Pan()
    .enabled(!locked)
    // ה-gesture מתחיל אחרי 6px אנכיים — קצת יותר רגיש מ-8 הקודם, נעים יותר
    // לתחילת גרירה בלי לחטוף taps על החצים.
    .activeOffsetY([-6, 6])
    .onStart(() => {
      isDragging.value = 1;
      stepsAcc.value = 0;
      liftProgress.value = withSpring(1, SOFT_SPRING);
      runOnJS(triggerStartHaptic)();
    })
    .onUpdate((e) => {
      // כמה שלבים מהמקור צריך להיות עכשיו ה-row.
      const target = Math.round(e.translationY / ITEM_STEP_HEIGHT);
      if (target !== stepsAcc.value) {
        const oldIdx = indexRef.value;
        const newIdx = oldIdx + (target - stepsAcc.value);
        const clamped = Math.max(0, Math.min(totalItems - 1, newIdx));
        if (clamped !== oldIdx) {
          runOnJS(onMoveItem)(oldIdx, clamped);
          // "תיק תיק" subtle בכל חציית שורה — מקנה תחושת picker iOS-י.
          runOnJS(triggerTickHaptic)();
          // עדכון אופטימי ב-worklet כך שה-onUpdate הבא יראה את המיקום החדש
          // עוד לפני שה-React renders חזרה אלינו ויעדכן את indexRef דרך useEffect.
          indexRef.value = clamped;
          stepsAcc.value = target;
        }
      }
      // translateY ויזואלי = הסטה של האצבע פחות מה שכבר התקדמנו ב-reorder.
      // כך ה-row נשאר תחת האצבע גם אחרי שהוא קפץ במיקום ב-array.
      translateY.value = e.translationY - stepsAcc.value * ITEM_STEP_HEIGHT;
    })
    .onEnd(() => {
      translateY.value = withSpring(0, SOFT_SPRING);
      liftProgress.value = withSpring(0, SOFT_SPRING);
      isDragging.value = 0;
      stepsAcc.value = 0;
      runOnJS(triggerDropHaptic)();
    })
    .onFinalize(() => {
      translateY.value = withSpring(0, SOFT_SPRING);
      liftProgress.value = withSpring(0, SOFT_SPRING);
      isDragging.value = 0;
      stepsAcc.value = 0;
    });

  const animatedStyle = useAnimatedStyle(() => {
    // interp [0..1] for scale (1 → 1.06) and shadow (0.05 → 0.22)
    const lift = liftProgress.value;
    return {
      transform: [
        { translateY: translateY.value },
        { scale: 1 + lift * 0.06 },
      ],
      // הגבהה ויזואלית בזמן drag כך שה-row המתנייד תמיד מעל האחרים בזמן
      // החלפת מיקום, גם אם React טרם השלים את הרינדור.
      zIndex: isDragging.value ? 50 : 0,
      elevation: 2 + lift * 14,
      shadowOpacity: 0.05 + lift * 0.17,
      shadowRadius: 6 + lift * 10,
    };
  });

  // ה-GestureDetector עוטף את כל ה-row כדי שאפשר יהיה לתפוס מכל מקום.
  // ה-arrow Pressables עדיין מקבלים taps בזכות activeOffsetY של ה-pan.
  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        entering={FadeInUp.duration(200).delay(idx * 40)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`פריט ${idx + 1}. גרור כדי לסדר`}
        accessibilityHint="החלק למעלה או למטה כדי לשנות מיקום"
        style={[
          styles.itemRow,
          {
            borderColor: locked ? "#6ee7b7" : "#e2e8f0",
            backgroundColor: locked ? "#f0fdf4" : "#ffffff",
            shadowColor: locked ? "#34d399" : "#6366f1",
          },
          animatedStyle,
        ]}
      >
        {/* Rank badge */}
        <View style={[styles.rankBadge, { backgroundColor: rankBg, borderColor: rankColor }]}>
          <Text style={[styles.rankText, { color: rankColor }]}>{idx + 1}</Text>
        </View>

        {children}

        {/* Arrow buttons */}
        {!locked && (
          <View style={styles.arrows}>
            <Pressable
              onPress={() => onSwap(idx, -1)}
              disabled={idx === 0}
              accessibilityRole="button"
              accessibilityLabel={`הזז פריט ${idx + 1} למעלה`}
              hitSlop={6}
              style={({ pressed }) => [
                styles.arrowBtn,
                { borderColor: accentColor, opacity: idx === 0 ? 0.25 : pressed ? 0.6 : 1 },
              ]}
            >
              <ChevronUp size={17} color={accentColor} />
            </Pressable>
            <Pressable
              onPress={() => onSwap(idx, 1)}
              disabled={idx === totalItems - 1}
              accessibilityRole="button"
              accessibilityLabel={`הזז פריט ${idx + 1} למטה`}
              hitSlop={6}
              style={({ pressed }) => [
                styles.arrowBtn,
                {
                  borderColor: accentColor,
                  opacity: idx === totalItems - 1 ? 0.25 : pressed ? 0.6 : 1,
                },
              ]}
            >
              <ChevronDown size={17} color={accentColor} />
            </Pressable>
          </View>
        )}

        {locked && (
          <View style={styles.checkMark}>
            <Text style={styles.checkMarkText}>✓</Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export function TimelineOrderCard({
  prompt,
  initialOrder,
  accentColor,
  onSubmit,
  onCorrectSettled,
  onStateChange,
}: TimelineOrderCardProps) {
  const [localOrder, setLocalOrder] = useState<string[]>(initialOrder);
  const localOrderRef = useRef<string[]>(localOrder);
  localOrderRef.current = localOrder;

  const [confetti, setConfetti] = useState<number>(0);
  const [locked, setLocked] = useState<boolean>(false);
  const [showYears, setShowYears] = useState<boolean>(false);
  const reducedMotion = useReducedMotion();

  // Shake animation for incorrect Check attempts. Skipped under reducedMotion.
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));
  const triggerShake = useCallback(() => {
    if (reducedMotion) return;
    shakeX.value = withSequence(
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(-6, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  }, [reducedMotion, shakeX]);

  const onCorrectSettledRef = useRef(onCorrectSettled);
  useEffect(() => { onCorrectSettledRef.current = onCorrectSettled; });

  const itemMap = useMemo(() => {
    const m: Record<string, (typeof prompt.items)[number]> = {};
    for (const it of prompt.items) m[it.id] = it;
    return m;
  }, [prompt.items]);

  // מהלך לוגי משותף ל-swap ע"י חצים ול-drag: מעביר item ל-toIdx. ולידציה
  // התנתקה מ-moveItem ועברה לכפתור "בדוק" — כך המשתמש שולט מתי לבדוק.
  const moveItem = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (locked) return;
      const current = localOrderRef.current;
      const clamped = Math.max(0, Math.min(current.length - 1, toIdx));
      if (clamped === fromIdx) return;
      const next = [...current];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(clamped, 0, moved);
      setLocalOrder(next);
      tapHaptic();
    },
    [locked],
  );

  const swapAt = useCallback(
    (idx: number, dir: -1 | 1) => {
      moveItem(idx, idx + dir);
    },
    [moveItem],
  );

  // לחיצה על "בדוק". אם הסדר נכון: locked + confetti + שנים נחשפות, ומופיע
  // כפתור "המשך". אם שגוי: shake + errorHaptic, נשאר פתוח להמשך עריכה.
  const handleCheck = useCallback(() => {
    if (locked) return;
    const current = localOrderRef.current;
    const isCorrect = current.every((itemId, i) => {
      const item = prompt.items.find((it) => it.id === itemId);
      return item !== undefined && item.correctOrder === i;
    });

    if (isCorrect) {
      successHaptic();
      setLocked(true);
      setConfetti((n) => n + 1);
      setShowYears(true);
      onSubmit(current);
    } else {
      errorHaptic();
      triggerShake();
    }
  }, [locked, prompt.items, onSubmit, triggerShake]);

  const handleContinue = useCallback(() => {
    onCorrectSettledRef.current();
  }, []);

  // Push the latest state to the parent so it can render the sticky CTA.
  // Re-fires whenever `locked` flips or a callback identity changes.
  useEffect(() => {
    onStateChange?.({ locked, check: handleCheck, continue_: handleContinue });
  }, [locked, handleCheck, handleContinue, onStateChange]);

  const displayOrder = localOrder;

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      style={[styles.card, shakeStyle]}
    >
      {confetti > 0 && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ConfettiExplosion key={confetti} />
        </View>
      )}

      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View style={[styles.labelPill, { backgroundColor: `${accentColor}20` }]}>
          <Text style={[styles.labelText, { color: accentColor }]}>סדרו ברצף הנכון</Text>
        </View>
      </View>

      <Text style={styles.instruction}>{prompt.instruction}</Text>

      {/* ── Items ── */}
      <View style={styles.itemsColumn}>
        {displayOrder.map((itemId, idx) => {
          const item = itemMap[itemId];
          const hasYear = !!item?.yearNumber;
          const rankColor = locked ? "#34d399" : (RANK_COLORS[idx % RANK_COLORS.length] ?? accentColor);
          const rankBg = locked ? "#ecfdf5" : (RANK_BG[idx % RANK_BG.length] ?? "#f8fafc");

          return (
            <DraggableItemRow
              key={itemId}
              idx={idx}
              totalItems={displayOrder.length}
              locked={locked}
              accentColor={accentColor}
              onMoveItem={moveItem}
              onSwap={swapAt}
              rankColor={rankColor}
              rankBg={rankBg}
            >
              {/* Content */}
              <View style={styles.itemContent}>
                {hasYear ? (
                  <View style={styles.yearLabelRow}>
                    <Text style={styles.itemLabel}>שנה</Text>
                    {showYears ? (
                      <Animated.Text
                        entering={FadeInDown.duration(300).springify()}
                        style={styles.yearRevealed}
                      >
                        {item.yearNumber}
                      </Animated.Text>
                    ) : (
                      <View style={styles.yearBlank} />
                    )}
                    <Text style={styles.itemLabel}>{item.label}</Text>
                  </View>
                ) : (
                  <Text style={styles.itemLabel} numberOfLines={2}>
                    {item?.label ?? itemId}
                  </Text>
                )}
              </View>
            </DraggableItemRow>
          );
        })}
      </View>

      {/* Check / Continue button is rendered as a sticky footer by the
          parent (InteractiveRecallScreen). Lifting it out of the card body
          guarantees it stays visible regardless of card height — previously
          it could be hidden below the fold or covered by the FinnCoach,
          since the row-level pan gesture also stole scroll attempts. */}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 6,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 12,
    gap: 10,
    shadowColor: "#6366f1",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    borderWidth: 1.5,
    borderColor: "#e0e7ff",
  },
  headerRow: {
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
  instruction: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 22,
  },
  itemsColumn: {
    gap: 6,
  },
  itemRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 14,
    fontWeight: "900",
  },
  itemContent: {
    flex: 1,
    alignItems: "flex-end",
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "right",
    writingDirection: "rtl",
  },
  yearLabelRow: {
    flexDirection: "row-reverse",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  yearBlank: {
    width: 30,
    height: 3,
    backgroundColor: "#93c5fd",
    borderRadius: 2,
  },
  yearRevealed: {
    fontSize: 16,
    fontWeight: "900",
    color: "#2563eb",
    minWidth: 28,
    textAlign: "center",
  },
  arrows: {
    flexDirection: "column",
    gap: 4,
  },
  arrowBtn: {
    width: 30,
    height: 28,
    borderWidth: 1.5,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  checkMark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
  },
  checkMarkText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#059669",
  },
});