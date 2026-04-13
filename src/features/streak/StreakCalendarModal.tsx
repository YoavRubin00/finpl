import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import LottieView from "lottie-react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { tapHaptic } from "../../utils/haptics";
import { useStreakCalendar, type DayCellStatus } from "./useStreakCalendar";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 56) / 7);
const CELL_GAP = 4;

const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };

const WEEKDAY_LABELS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

// eslint-disable-next-line @typescript-eslint/no-var-requires
const FIRE_LOTTIE = require("../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ICE_LOTTIE = require("../../../assets/lottie/wired-flat-2441-natural-crystal-hover-pinch.json");

interface StreakCalendarModalProps {
  visible: boolean;
  onClose: () => void;
}

export function StreakCalendarModal({ visible, onClose }: StreakCalendarModalProps) {
  const now = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [tooltip, setTooltip] = useState<{ text: string; key: string } | null>(null);

  const { days, streak, streakFreezes } = useStreakCalendar(viewYear, viewMonth);

  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const canGoForward = viewYear < todayYear || (viewYear === todayYear && viewMonth < todayMonth);

  const goBack = useCallback(() => {
    tapHaptic();
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goForward = useCallback(() => {
    if (!canGoForward) return;
    tapHaptic();
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, [canGoForward]);

  // Auto-dismiss tooltip
  useEffect(() => {
    if (!tooltip) return;
    const t = setTimeout(() => setTooltip(null), 2000);
    return () => clearTimeout(t);
  }, [tooltip]);

  const handleDayPress = useCallback((status: DayCellStatus, date: string) => {
    if (status === "active") {
      tapHaptic();
      const d = date.slice(8, 10).replace(/^0/, "");
      const m = HEBREW_MONTHS[parseInt(date.slice(5, 7), 10) - 1];
      setTooltip({ text: `✓ השלמת שיעור ב-${d} ${m}`, key: date });
    } else if (status === "frozen") {
      tapHaptic();
      setTooltip({ text: "🧊 הקפאת סטריק הופעלה", key: date });
    }
  }, []);

  // Split days into rows of 7
  const rows = useMemo(() => {
    const result: (typeof days)[] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* ── Header: streak summary ── */}
          <Animated.View entering={FadeIn.duration(300)} style={styles.headerRow}>
            <View style={styles.streakSummary}>
              {Platform.OS === "web" ? (
                <Text style={{ fontSize: 28 }}>🔥</Text>
              ) : (
                <LottieView
                  source={FIRE_LOTTIE}
                  style={{ width: 36, height: 36 }}
                  autoPlay
                  loop
                />
              )}
              <Text style={styles.streakNumber}>{streak}</Text>
              <Text style={styles.streakLabel}>ימים רצופים!</Text>
            </View>
            {streakFreezes > 0 && (
              <View style={styles.freezeBadge}>
                {Platform.OS === "web" ? (
                  <Text style={styles.freezeEmoji}>🧊</Text>
                ) : (
                  <LottieView
                    source={ICE_LOTTIE}
                    style={{ width: 24, height: 24 }}
                    autoPlay
                    loop
                  />
                )}
                <Text style={styles.freezeCount}>×{streakFreezes}</Text>
              </View>
            )}
          </Animated.View>

          {/* ── Month navigation ── */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.monthNav}>
            <Pressable
              onPress={goForward}
              style={[styles.navArrow, !canGoForward && styles.navArrowDisabled]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronLeft size={22} color={canGoForward ? "#374151" : "#d1d5db"} />
            </Pressable>
            <Text style={styles.monthTitle}>
              {HEBREW_MONTHS[viewMonth]} {viewYear}
            </Text>
            <Pressable
              onPress={goBack}
              style={styles.navArrow}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronRight size={22} color="#374151" />
            </Pressable>
          </Animated.View>

          {/* ── Weekday labels ── */}
          <Animated.View entering={FadeInDown.delay(160).duration(250)} style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label) => (
              <View key={label} style={styles.weekdayCell}>
                <Text style={styles.weekdayText}>{label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* ── Calendar grid ── */}
          <View style={styles.grid}>
            {rows.map((row, rowIdx) => (
              <Animated.View
                key={rowIdx}
                entering={FadeInDown.delay(220 + rowIdx * 60).duration(250)}
                style={styles.gridRow}
              >
                {row.map((cell, colIdx) => (
                  <DayCell
                    key={`${rowIdx}-${colIdx}`}
                    day={cell.day}
                    status={cell.status}
                    date={cell.date}
                    onPress={handleDayPress}
                  />
                ))}
              </Animated.View>
            ))}
          </View>

          {/* ── Tooltip ── */}
          {tooltip && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.tooltip}>
              <Text style={styles.tooltipText}>{tooltip.text}</Text>
            </Animated.View>
          )}

          {/* ── Legend ── */}
          <Animated.View entering={FadeInDown.delay(500).duration(300)} style={styles.legendRow}>
            <View style={styles.legendItem}>
              {Platform.OS === "web" ? (
                <Text style={{ fontSize: 14 }}>🔥</Text>
              ) : (
                <LottieView source={FIRE_LOTTIE} style={{ width: 18, height: 18 }} autoPlay loop />
              )}
              <Text style={styles.legendText}>פעיל</Text>
            </View>
            <View style={styles.legendItem}>
              {Platform.OS === "web" ? (
                <Text style={{ fontSize: 14 }}>🧊</Text>
              ) : (
                <LottieView source={ICE_LOTTIE} style={{ width: 18, height: 18 }} autoPlay loop />
              )}
              <Text style={styles.legendText}>הקפאה</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendMissed]} />
              <Text style={styles.legendText}>החמצה</Text>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// DayCell
// ---------------------------------------------------------------------------

interface DayCellProps {
  day: number;
  status: DayCellStatus;
  date: string;
  onPress: (status: DayCellStatus, date: string) => void;
}

function DayCell({ day, status, date, onPress }: DayCellProps) {
  if (status === "empty") {
    return <View style={styles.cell} />;
  }

  const isInteractive = status === "active" || status === "frozen";

  return (
    <Pressable
      style={[
        styles.cell,
        status === "active" && styles.cellActive,
        status === "frozen" && styles.cellFrozen,
        status === "missed" && styles.cellMissed,
        status === "today" && styles.cellToday,
        status === "future" && styles.cellFuture,
      ]}
      onPress={isInteractive ? () => onPress(status, date) : undefined}
      disabled={!isInteractive}
    >
      {status === "active" ? (
        <ActiveDayContent day={day} />
      ) : status === "frozen" ? (
        <FrozenDayContent day={day} />
      ) : status === "missed" ? (
        <>
          <Text style={styles.missedDash}>—</Text>
          <Text style={[styles.dayNumber, styles.dayNumberMissed]}>{day}</Text>
        </>
      ) : status === "today" ? (
        <TodayCell day={day} />
      ) : (
        <Text
          style={[
            styles.dayNumber,
            status === "future" && styles.dayNumberFuture,
            status === "neutral" && styles.dayNumberNeutral,
          ]}
        >
          {day}
        </Text>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// ActiveDayContent — fire with breathing glow
// ---------------------------------------------------------------------------

function ActiveDayContent({ day }: { day: number }) {
  const glow = useSharedValue(0.7);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(glow);
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <Animated.View style={[styles.activeDayInner, glowStyle]}>
      {Platform.OS === "web" ? (
        <Text style={{ fontSize: 16 }}>🔥</Text>
      ) : (
        <LottieView
          source={FIRE_LOTTIE}
          style={{ width: 20, height: 20 }}
          autoPlay
          loop
        />
      )}
      <Text style={[styles.dayNumber, styles.dayNumberActive]}>{day}</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// FrozenDayContent — ice crystal Lottie with cold glow
// ---------------------------------------------------------------------------

function FrozenDayContent({ day }: { day: number }) {
  const glow = useSharedValue(0.6);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(glow);
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <Animated.View style={[styles.frozenDayInner, glowStyle]}>
      {Platform.OS === "web" ? (
        <Text style={{ fontSize: 16 }}>🧊</Text>
      ) : (
        <LottieView
          source={ICE_LOTTIE}
          style={{ width: 22, height: 22 }}
          autoPlay
          loop
        />
      )}
      <Text style={[styles.dayNumber, styles.dayNumberFrozen]}>{day}</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// TodayCell — pulsing orange ring
// ---------------------------------------------------------------------------

function TodayCell({ day }: { day: number }) {
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.4, { duration: 1000 }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(249, 115, 22, ${pulse.value})`,
    borderWidth: 2,
  }));

  return (
    <Animated.View style={[styles.todayInner, ringStyle]}>
      <Text style={[styles.dayNumber, styles.dayNumberToday]}>{day}</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    paddingTop: 12,
    maxHeight: "85%",
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginBottom: 16,
  },

  // Header
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  streakSummary: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: "900",
    color: "#f97316",
    textShadowColor: "rgba(249, 115, 22, 0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  streakLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    ...RTL,
  },
  freezeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(186, 230, 253, 0.4)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 2,
  },
  freezeEmoji: {
    fontSize: 16,
  },
  freezeCount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0284c7",
  },

  // Month nav
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 14,
  },
  navArrow: {
    padding: 4,
  },
  navArrowDisabled: {
    opacity: 0.3,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1f2937",
    minWidth: 130,
    textAlign: "center",
  },

  // Weekday row
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: CELL_GAP,
    marginBottom: 6,
  },
  weekdayCell: {
    width: CELL_SIZE,
    alignItems: "center",
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
  },

  // Grid
  grid: {
    alignItems: "center",
    gap: CELL_GAP,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: CELL_GAP,
  },

  // Cell base
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // Cell states
  cellActive: {
    backgroundColor: "rgba(249, 115, 22, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.5)",
  },
  cellFrozen: {
    backgroundColor: "rgba(186, 230, 253, 0.3)",
    borderWidth: 1.5,
    borderColor: "#7dd3fc",
  },
  cellMissed: {
    backgroundColor: "rgba(100, 116, 139, 0.08)",
  },
  cellToday: {
    // border handled by animated TodayCell
  },
  cellFuture: {
    opacity: 0.3,
  },

  // Day content
  activeDayInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  frozenDayInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  todayInner: {
    width: CELL_SIZE - 2,
    height: CELL_SIZE - 2,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },
  dayNumberActive: {
    color: "#f97316",
    fontWeight: "900",
    fontSize: 10,
  },
  dayNumberFrozen: {
    color: "#0284c7",
    fontSize: 10,
  },
  dayNumberMissed: {
    color: "#94a3b8",
    fontSize: 10,
  },
  dayNumberToday: {
    color: "#f97316",
    fontWeight: "900",
  },
  dayNumberFuture: {
    color: "#d1d5db",
  },
  dayNumberNeutral: {
    color: "#9ca3af",
  },
  frozenEmoji: {
    fontSize: 14,
  },
  missedDash: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "700",
  },

  // Tooltip
  tooltip: {
    alignSelf: "center",
    backgroundColor: "#1f2937",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 10,
  },
  tooltipText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    ...RTL,
  },

  // Legend
  legendRow: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    gap: 20,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  legendItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  legendActive: {
    backgroundColor: "rgba(249, 115, 22, 0.4)",
    borderWidth: 1,
    borderColor: "#f97316",
  },
  legendFrozen: {
    backgroundColor: "rgba(186, 230, 253, 0.5)",
    borderWidth: 1,
    borderColor: "#7dd3fc",
  },
  legendMissed: {
    backgroundColor: "rgba(100, 116, 139, 0.15)",
  },
  legendText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    ...RTL,
  },
});
