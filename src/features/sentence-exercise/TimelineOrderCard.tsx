import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { ChevronUp, ChevronDown } from "lucide-react-native";
import { successHaptic, errorHaptic, tapHaptic } from "../../utils/haptics";
import { ConfettiExplosion } from "../../components/ui/ConfettiExplosion";
import type { TimelineOrderPrompt } from "./sentenceTypes";

interface TimelineOrderCardProps {
  prompt: TimelineOrderPrompt;
  initialOrder: string[];
  accentColor: string;
  onSubmit: (order: string[]) => { correct: boolean; finishesSet: boolean };
  onCorrectSettled: () => void;
}

const REVEAL_HOLD_MS = 1800;
const HELP_DELAY_MS = 20_000;

const RANK_COLORS = ["#f97316", "#eab308", "#22c55e", "#3b82f6"];
const RANK_BG = ["#fff7ed", "#fefce8", "#f0fdf4", "#eff6ff"];

export function TimelineOrderCard({
  prompt,
  initialOrder,
  accentColor,
  onSubmit,
  onCorrectSettled,
}: TimelineOrderCardProps) {
  const [localOrder, setLocalOrder] = useState<string[]>(initialOrder);
  const localOrderRef = useRef<string[]>(localOrder);
  localOrderRef.current = localOrder;

  const [confetti, setConfetti] = useState<number>(0);
  const [locked, setLocked] = useState<boolean>(false);
  const [showYears, setShowYears] = useState<boolean>(false);
  const [helpVisible, setHelpVisible] = useState<boolean>(false);
  const [resolvedOrder, setResolvedOrder] = useState<string[] | null>(null);
  const reducedMotion = useReducedMotion();
  const shake = useSharedValue(0);

  const onCorrectSettledRef = useRef(onCorrectSettled);
  useEffect(() => { onCorrectSettledRef.current = onCorrectSettled; });

  const helpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const itemMap = useMemo(() => {
    const m: Record<string, (typeof prompt.items)[number]> = {};
    for (const it of prompt.items) m[it.id] = it;
    return m;
  }, [prompt.items]);

  const resetHelpTimer = useCallback(() => {
    if (helpTimerRef.current) clearTimeout(helpTimerRef.current);
    helpTimerRef.current = setTimeout(() => setHelpVisible(true), HELP_DELAY_MS);
  }, []);

  useEffect(() => {
    if (locked) {
      if (helpTimerRef.current) { clearTimeout(helpTimerRef.current); helpTimerRef.current = null; }
      setHelpVisible(false);
      return;
    }
    resetHelpTimer();
    return () => { if (helpTimerRef.current) clearTimeout(helpTimerRef.current); };
  }, [locked, resetHelpTimer]);

  const swapAt = useCallback(
    (idx: number, dir: -1 | 1) => {
      if (locked) return;
      const current = localOrderRef.current;
      if (idx + dir < 0 || idx + dir >= current.length) return;
      const next = [...current];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
      setLocalOrder(next);
      tapHaptic();

      const isCorrect = next.every((itemId, i) => {
        const item = prompt.items.find((it) => it.id === itemId);
        return item !== undefined && item.correctOrder === i;
      });

      if (isCorrect) {
        successHaptic();
        setLocked(true);
        setConfetti((n) => n + 1);
        setShowYears(true);
        onSubmit(next);
        setTimeout(() => { onCorrectSettledRef.current(); }, REVEAL_HOLD_MS);
      }
    },
    [locked, prompt.items, onSubmit],
  );

  const handleSubmit = useCallback(() => {
    if (locked) {
      onCorrectSettledRef.current();
      return;
    }
    const result = onSubmit(localOrderRef.current);
    if (result.correct) {
      successHaptic();
      setLocked(true);
      setConfetti((n) => n + 1);
      setShowYears(true);
      setTimeout(() => { onCorrectSettledRef.current(); }, REVEAL_HOLD_MS);
    } else {
      errorHaptic();
      if (!reducedMotion) {
        shake.value = withSequence(
          withTiming(-7, { duration: 55 }),
          withTiming(7, { duration: 55 }),
          withTiming(-4, { duration: 50 }),
          withTiming(0, { duration: 60 }),
        );
      }
    }
  }, [locked, onSubmit, shake, reducedMotion]);

  const handleYes = useCallback(() => {
    const correctOrder = [...prompt.items]
      .sort((a, b) => a.correctOrder - b.correctOrder)
      .map((it) => it.id);
    setResolvedOrder(correctOrder);
    setHelpVisible(false);
    successHaptic();
    setLocked(true);
    setShowYears(true);
    setTimeout(() => { onCorrectSettledRef.current(); }, REVEAL_HOLD_MS);
  }, [prompt.items]);

  const handleNo = useCallback(() => {
    setHelpVisible(false);
    resetHelpTimer();
  }, [resetHelpTimer]);

  const displayOrder = resolvedOrder ?? localOrder;

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
            <Animated.View
              key={itemId}
              entering={FadeInUp.duration(200).delay(idx * 40)}
              style={[
                styles.itemRow,
                {
                  borderColor: locked ? "#6ee7b7" : "#e2e8f0",
                  backgroundColor: locked ? "#f0fdf4" : "#ffffff",
                  shadowColor: locked ? "#34d399" : "#6366f1",
                },
              ]}
            >
              {/* Rank badge */}
              <View style={[styles.rankBadge, { backgroundColor: rankBg, borderColor: rankColor }]}>
                <Text style={[styles.rankText, { color: rankColor }]}>{idx + 1}</Text>
              </View>

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

              {/* Arrow buttons */}
              {!locked && (
                <View style={styles.arrows}>
                  <Pressable
                    onPress={() => swapAt(idx, -1)}
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
                    onPress={() => swapAt(idx, 1)}
                    disabled={idx === displayOrder.length - 1}
                    accessibilityRole="button"
                    accessibilityLabel={`הזז פריט ${idx + 1} למטה`}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.arrowBtn,
                      {
                        borderColor: accentColor,
                        opacity: idx === displayOrder.length - 1 ? 0.25 : pressed ? 0.6 : 1,
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
          );
        })}
      </View>

      {/* ── Help panel (only when visible, inside card flow so never overflows) ── */}
      {helpVisible && !locked && (
        <Animated.View
          entering={FadeInUp.duration(220)}
          style={styles.helpPanel}
        >
          <Text style={styles.helpText}>צריכים עזרה?</Text>
          <View style={styles.helpRow}>
            <Pressable
              onPress={handleYes}
              accessibilityRole="button"
              accessibilityLabel="כן, פתרו עבורי"
              style={styles.helpYesBtn}
            >
              <Text style={styles.helpYesBtnText}>כן, תעזרו לי</Text>
            </Pressable>
            <Pressable
              onPress={handleNo}
              accessibilityRole="button"
              accessibilityLabel="לא, אני ממשיך לנסות"
              style={styles.helpNoBtn}
            >
              <Text style={styles.helpNoBtnText}>אני מנסה</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* ── Submit button ── */}
      <Pressable
        onPress={handleSubmit}
        accessibilityRole="button"
        accessibilityLabel={locked ? "נכון! לחצו להמשך" : "בדקו את הסדר"}
        style={({ pressed }) => [
          styles.submitBtn,
          locked ? styles.submitBtnCorrect : { backgroundColor: accentColor },
          pressed && styles.submitBtnPressed,
        ]}
      >
        <Text style={styles.submitText}>{locked ? "✓  המשך" : "בדקו את הסדר"}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    gap: 14,
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
    fontSize: 17,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 26,
  },
  itemsColumn: {
    gap: 8,
  },
  itemRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 15,
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
  helpPanel: {
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#93c5fd",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    alignItems: "center",
  },
  helpText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
    writingDirection: "rtl",
    textAlign: "center",
  },
  helpRow: {
    flexDirection: "row-reverse",
    gap: 10,
  },
  helpYesBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#3b82f6",
    borderRadius: 14,
    borderBottomWidth: 3,
    borderBottomColor: "#1d4ed8",
  },
  helpYesBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
    writingDirection: "rtl",
  },
  helpNoBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#e2e8f0",
    borderRadius: 14,
    borderBottomWidth: 3,
    borderBottomColor: "#94a3b8",
  },
  helpNoBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
    writingDirection: "rtl",
  },
  submitBtn: {
    marginTop: 2,
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: "center",
    borderBottomWidth: 4,
    borderBottomColor: "rgba(0,0,0,0.2)",
  },
  submitBtnCorrect: {
    backgroundColor: "#10b981",
    borderBottomColor: "#059669",
  },
  submitBtnPressed: {
    opacity: 0.88,
    transform: [{ translateY: 1 }],
  },
  submitText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#ffffff",
    writingDirection: "rtl",
    letterSpacing: 0.3,
  },
});