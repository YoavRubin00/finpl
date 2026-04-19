// PRD 38, US-003: DailyIncomeCard for PyramidScreen
// Shows pending real-asset income; allows one-tap collection.

import { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  FadeInDown,
} from "react-native-reanimated";
import { useRealAssetsStore } from "./useRealAssetsStore";
import { GlowCard } from "../../components/ui/GlowCard";
import { SPRING_BOUNCY } from "../../utils/animations";

function hoursUntilNextCollection(ownedAssets: Record<string, { lastCollectedAt?: number; dailyYield: number }>): number {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  let minHoursLeft = 24;
  for (const asset of Object.values(ownedAssets)) {
    if (!asset.lastCollectedAt) { minHoursLeft = 0; break; }
    const lastDate = new Date(asset.lastCollectedAt).toISOString().slice(0, 10);
    if (lastDate !== today) { minHoursLeft = 0; break; }
    const hoursElapsed = (now - asset.lastCollectedAt) / (1000 * 60 * 60);
    const hoursLeft = Math.max(0, 24 - hoursElapsed);
    if (hoursLeft < minHoursLeft) minHoursLeft = hoursLeft;
  }
  return Math.ceil(minHoursLeft);
}

export function DailyIncomeCard() {
  const ownedAssets = useRealAssetsStore((s) => s.ownedAssets);
  const pendingIncome = useRealAssetsStore((s) => s.pendingIncome);
  const collectDailyIncome = useRealAssetsStore((s) => s.collectDailyIncome);
  const [collected, setCollected] = useState(false);
  const [lastAmount, setLastAmount] = useState(0);

  const collectedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (collectedTimerRef.current) clearTimeout(collectedTimerRef.current); }, []);

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const hasAssets = Object.keys(ownedAssets).length > 0;
  if (!hasAssets) return null;

  const pending = Math.floor(pendingIncome());
  const hasPending = pending > 0;
  const hoursLeft = hasPending ? 0 : hoursUntilNextCollection(ownedAssets);

  const handleCollect = () => {
    if (!hasPending) return;
    setLastAmount(pending);
    collectDailyIncome();
    setCollected(true);
    scale.value = withSequence(
      withSpring(1.08, SPRING_BOUNCY),
      withTiming(1, { duration: 300 }),
    );
    collectedTimerRef.current = setTimeout(() => setCollected(false), 2500);
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(80).springify()}
      style={{ width: "100%", marginBottom: 16 }}
    >
      <GlowCard glowColor="#facc15" pressable={false} style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.icon}>🏠</Text>
          <View style={styles.textBlock}>
            <Text style={styles.title}>נכסים ממשיים</Text>
            {collected ? (
              <Text style={styles.successText}>+{lastAmount} מטבעות נגבו!</Text>
            ) : hasPending ? (
              <Text style={styles.pendingText}>+{pending} מטבעות ממתינים לגבייה</Text>
            ) : (
              <Text style={styles.waitText}>🌙 הכנסה הבאה בעוד {hoursLeft} שעות</Text>
            )}
          </View>
          {!collected && hasPending && (
            <Animated.View style={animStyle}>
              <Pressable
                onPress={handleCollect}
                style={styles.collectBtn}
                accessibilityRole="button"
                accessibilityLabel="גבה הכנסה יומית"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.collectBtnText}>גבה</Text>
              </Pressable>
            </Animated.View>
          )}
          {collected && (
            <View style={styles.doneChip}>
              <Text style={styles.doneChipText}>✓</Text>
            </View>
          )}
        </View>
      </GlowCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    fontSize: 30,
  },
  textBlock: {
    flex: 1,
    alignItems: "flex-end",
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#facc15",
    marginBottom: 2,
    textAlign: "right",
  },
  pendingText: {
    fontSize: 12,
    color: "#fde68a",
    textAlign: "right",
  },
  waitText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "right",
  },
  successText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4ade80",
    textAlign: "right",
  },
  collectBtn: {
    backgroundColor: "#facc15",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  collectBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#1a1035",
  },
  doneChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#052e16",
    borderWidth: 1.5,
    borderColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
  },
  doneChipText: {
    color: "#4ade80",
    fontSize: 16,
    fontWeight: "900",
  },
});
