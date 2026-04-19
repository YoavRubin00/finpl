import { useCallback, useEffect, useMemo, useState } from "react";
import { Image as ExpoImage } from "expo-image";
import { View, Text, Pressable, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FINN_FIRE } from "../retention-loops/finnMascotConfig";
import Animated, {
  FadeInDown,
  FadeOut,
} from "react-native-reanimated";
import { X, ShieldAlert } from "lucide-react-native";
import { useEconomyStore } from "../economy/useEconomyStore";
import { tapHaptic, successHaptic } from "../../utils/haptics";

const DISMISSED_KEY = "no_freeze_upsell_dismissed_date";
const FREEZE_COST_COINS = 50;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Upsell banner when user has streak >= 7 but 0 streak freezes */
export function NoFreezeUpsellBanner() {
  const streak = useEconomyStore((s) => s.streak);
  const streakFreezes = useEconomyStore((s) => s.streakFreezes);
  const coins = useEconomyStore((s) => s.coins);
  const spendCoins = useEconomyStore((s) => s.spendCoins);
  const addStreakFreezes = useEconomyStore((s) => s.addStreakFreezes);
  const [dismissed, setDismissed] = useState(true); // hidden until storage check

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then((val) => {
      setDismissed(val === todayISO());
    });
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    AsyncStorage.setItem(DISMISSED_KEY, todayISO());
  }, []);

  const handleBuyFreeze = useCallback(() => {
    tapHaptic();
    const success = spendCoins(FREEZE_COST_COINS);
    if (success) {
      addStreakFreezes(1);
      successHaptic();
      dismiss();
    }
  }, [spendCoins, addStreakFreezes, dismiss]);

  const shouldShow = useMemo(
    () => streak >= 7 && streakFreezes === 0,
    [streak, streakFreezes],
  );

  if (!shouldShow || dismissed) return null;

  const canAfford = coins >= FREEZE_COST_COINS;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(14)}
      exiting={FadeOut.duration(200)}
      style={styles.wrap}
    >
      <View style={styles.banner}>
        {/* Dismiss X */}
        <Pressable
          onPress={dismiss}
          style={styles.closeBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="סגור באנר מגן רצף"
        >
          <X size={14} color="#64748b" />
        </Pressable>

        <View style={styles.inner}>
          {/* Text (RTL, right side) */}
          <View style={styles.textWrap}>
            <View style={styles.titleRow}>
              <ShieldAlert size={16} color="#ea580c" />
              <Text style={styles.title}>
                רצף של {streak} ימים!
              </Text>
            </View>
            <Text style={styles.sub}>
              כדאי שיהיה לך מגן רצף למקרה חירום
            </Text>
          </View>
          {/* Finn */}
          <View style={{ width: 96, height: 96, borderRadius: 48, overflow: 'hidden', backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <ExpoImage
            source={FINN_FIRE}
            accessible={false}
            style={[{ width: 64, height: 64 }, { opacity: 0.92 }]}
            contentFit="contain"
          />
          </View>
        </View>

        {/* Buy CTA */}
        <Pressable
          onPress={handleBuyFreeze}
          disabled={!canAfford}
          style={[styles.buyBtn, !canAfford && styles.buyBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel={`קנה מגן רצף ב-${FREEZE_COST_COINS} מטבעות`}
        >
          <Text style={[styles.buyBtnText, !canAfford && styles.buyBtnTextDisabled]}>
            קנה מגן ({FREEZE_COST_COINS} מטבעות) 🛡️
          </Text>
        </Pressable>

        {/* Already have dismiss */}
        <Pressable
          onPress={dismiss}
          style={styles.dismissLink}
          accessibilityRole="button"
          accessibilityLabel="כבר יש לי, הסתר באנר"
        >
          <Text style={styles.dismissLinkText}>כבר יש לי</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 6,
  },
  banner: {
    backgroundColor: "#fff7ed",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#fdba74",
    shadowColor: "#f97316",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  textWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    color: "#c2410c",
    textAlign: "right",
    writingDirection: "rtl" as const,
  },
  sub: {
    fontSize: 12,
    fontWeight: "600",
    color: "#78350f",
    textAlign: "right",
    writingDirection: "rtl" as const,
    lineHeight: 18,
  },
  buyBtn: {
    marginHorizontal: 14,
    marginBottom: 8,
    marginTop: -4,
    backgroundColor: "#ea580c",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "#c2410c",
  },
  buyBtnDisabled: {
    backgroundColor: "#d1d5db",
    borderBottomColor: "#9ca3af",
  },
  buyBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
    writingDirection: "rtl" as const,
  },
  buyBtnTextDisabled: {
    color: "#6b7280",
  },
  dismissLink: {
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  dismissLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9a3412",
    opacity: 0.7,
    writingDirection: "rtl" as const,
  },
});
