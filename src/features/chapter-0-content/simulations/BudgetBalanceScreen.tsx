import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  FadeIn,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { AnimatedPressable } from "../../../components/ui/AnimatedPressable";
import { useTimeoutCleanup } from "../../../hooks/useTimeoutCleanup";
import { successHaptic, errorHaptic, mediumHaptic } from "../../../utils/haptics";
import LottieView from "lottie-react-native";

const { height: SCREEN_H } = Dimensions.get("window");

interface BudgetItem {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  icon: string;
}

const ITEMS: BudgetItem[] = [
  { id: "1", name: "משכורת דמי כיס", amount: 200, type: "income", icon: "💵" },
  { id: "2", name: "גלידה עם חברים", amount: 30, type: "expense", icon: "🍦" },
  { id: "3", name: "כרטיס לסרט", amount: 45, type: "expense", icon: "🍿" },
  { id: "4", name: "מכירת בגדים ישנים", amount: 80, type: "income", icon: "👕" },
  { id: "5", name: "מתנה של סבתא", amount: 100, type: "income", icon: "👵" },
  { id: "6", name: "מנוי לאפליקציה", amount: 20, type: "expense", icon: "📱" },
];

/* ── Scale Visual ── */
const BEAM_W = 180;
const PIVOT_H = 50;

function ScaleVisual({ balance }: { balance: number }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Clamp rotation between -12 and 12 degrees
    rotation.value = withSpring(Math.max(-12, Math.min(12, balance / 15)), {
      damping: 14,
      stiffness: 120,
    });
  }, [balance, rotation]);

  const beamStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={s.scaleWrap}>
      {/* Beam — rotates around center pivot */}
      <Animated.View style={[s.beam, beamStyle]}>
        {/* Left bowl — income */}
        <View style={s.bowlLeft}>
          <Text style={s.bowlIcon}>💰</Text>
          <Text style={s.bowlLabel}>הכנסות</Text>
        </View>
        {/* Beam bar */}
        <View style={s.beamBar} />
        {/* Right bowl — expenses */}
        <View style={s.bowlRight}>
          <Text style={s.bowlIcon}>🛍️</Text>
          <Text style={s.bowlLabel}>הוצאות</Text>
        </View>
      </Animated.View>
      {/* Pivot triangle — fixed, always at bottom center */}
      <View style={s.pivot} />
    </View>
  );
}

/* ── Main Screen ── */
export function BudgetBalanceScreen({ onComplete }: { onComplete: (score: number) => void }) {
  const [balance, setBalance] = useState(0);
  const [items, setItems] = useState<BudgetItem[]>(ITEMS);
  const safeTimeout = useTimeoutCleanup();

  const [isFinished, setIsFinished] = useState(false);

  const handleProcessItem = (item: BudgetItem) => {
    if (item.type === "income") {
      setBalance(b => b + item.amount);
      successHaptic();
    } else {
      setBalance(b => b - item.amount);
      if (balance - item.amount < 0) {
        errorHaptic();
      } else {
        mediumHaptic();
      }
    }

    setItems(prev => prev.filter(i => i.id !== item.id));
    if (items.length <= 1) {
      safeTimeout(() => setIsFinished(true), 800);
    }
  };

  const handleFinish = () => {
    successHaptic();
    onComplete(balance > 0 ? 100 : 70);
  };

  return (
    <View style={s.container}>
      {/* Title */}
      <Text style={s.header} accessibilityRole="header">כמה נכנס וכמה יוצא?</Text>
      <Text style={s.subtitle}>לחץ על הפריטים להוסיף או להוריד מהתקציב.</Text>

      {/* Balance */}
      <View style={s.balanceCard} accessibilityLiveRegion="polite">
        <Text style={s.balanceLabel}>היתרה שלך</Text>
        <Text style={[s.balanceValue, { color: balance >= 0 ? "#10b981" : "#ef4444" }]}>
          ₪{balance}
        </Text>
      </View>

      {/* Scale */}
      <ScaleVisual balance={balance} />

      {/* Content */}
      {isFinished ? (
        <Animated.View entering={FadeIn.duration(400)} style={s.finishedBox}>
          <View accessible={false}>
            <LottieView
              source={require("../../../../assets/lottie/wired-flat-63-home-hover-3d-roll.json")}
              style={{ width: 70, height: 70, alignSelf: "center", marginBottom: 8 }}
              autoPlay
              loop={false}
            />
          </View>
          <Text style={s.finishedTitle} accessibilityLiveRegion="polite">
            {balance >= 0 ? "מעולה! נשארת ביתרת זכות." : "אוי! נכנסת למינוס."}
          </Text>
          <Text style={s.finishedSubtitle}>
            הסוד לחופש כלכלי מתחיל בלהוציא פחות ממה שמכניסים.
          </Text>
          <Animated.View entering={SlideInDown} style={{ width: "100%" }}>
            <AnimatedPressable onPress={handleFinish} style={s.finishBtn} accessibilityRole="button" accessibilityLabel="הבנתי" accessibilityHint="סיום הסימולציה ומעבר הלאה">
              <Text style={s.finishBtnText}>הבנתי!</Text>
            </AnimatedPressable>
          </Animated.View>
        </Animated.View>
      ) : (
        <View style={s.itemsQueue}>
          {items.slice(0, 3).map((item) => (
            <AnimatedPressable
              key={item.id}
              onPress={() => handleProcessItem(item)}
              style={s.itemBtn}
              accessibilityRole="button"
              accessibilityLabel={`${item.name} ${item.type === "income" ? "+" : "-"} ${item.amount} שקלים`}
              accessibilityHint={item.type === "income" ? "הוספת הכנסה לתקציב" : "הוספת הוצאה מהתקציב"}
            >
              <Text style={s.itemIcon}>{item.icon}</Text>
              <View style={s.itemInfo}>
                <Text style={s.itemName}>{item.name}</Text>
                <Text style={[s.itemAmount, { color: item.type === "income" ? "#10b981" : "#ef4444" }]}>
                  {item.type === "income" ? "+" : "-"} ₪{item.amount}
                </Text>
              </View>
            </AnimatedPressable>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#dbeafe",
    paddingHorizontal: 20,
    paddingTop: SCREEN_H < 700 ? 16 : 28,
  },
  header: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1d4ed8",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#1e3a8a",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 12,
  },
  balanceCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    shadowColor: "#3b82f6",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: "900",
    marginTop: 2,
  },

  /* ── Scale ── */
  scaleWrap: {
    alignItems: "center",
    height: 90,
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  beam: {
    width: BEAM_W,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    bottom: PIVOT_H - 6,
  },
  beamBar: {
    position: "absolute",
    width: BEAM_W,
    height: 6,
    backgroundColor: "#94a3b8",
    borderRadius: 3,
  },
  bowlLeft: {
    position: "absolute",
    left: -24,
    top: -6,
    alignItems: "center",
  },
  bowlRight: {
    position: "absolute",
    right: -24,
    top: -6,
    alignItems: "center",
  },
  bowlIcon: {
    fontSize: 24,
  },
  bowlLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
    marginTop: 2,
  },
  pivot: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: PIVOT_H,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#64748b",
  },

  /* ── Items ── */
  itemsQueue: {
    gap: 8,
  },
  itemBtn: {
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  itemIcon: {
    fontSize: 24,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1f2937",
    textAlign: "right",
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 2,
  },

  /* ── Finished ── */
  finishedBox: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
  },
  finishedTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1e3a8a",
    marginBottom: 6,
    textAlign: "center",
  },
  finishedSubtitle: {
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  finishBtn: {
    backgroundColor: "#1d4ed8",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    width: "100%",
    borderBottomWidth: 3,
    borderBottomColor: "#1e3a8a",
  },
  finishBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
});
