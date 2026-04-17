import React, { useState, useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import LottieView from "lottie-react-native";
import Animated, {
  FadeIn,
  ZoomIn,
  FadeInUp,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { REWARD } from "../diamondHandsData";
import { FlyingRewards } from "../../../components/ui/FlyingRewards";
import { ConfettiExplosion } from "../../../components/ui/ConfettiExplosion";
import { GoldCoinIcon } from "../../../components/ui/GoldCoinIcon";

const DIAMOND_LOTTIE = require("../../../../assets/lottie/Diamond.json");

interface Props {
  onFinish: () => void;
}

export function VictoryBlast({ onFinish }: Props) {
  const [showFlyingXp, setShowFlyingXp] = useState(false);
  const [showFlyingCoins, setShowFlyingCoins] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Stagger: confetti → XP shower → coins shower (module-style celebration)
  useEffect(() => {
    const t1 = setTimeout(() => setShowConfetti(true), 300);
    const t2 = setTimeout(() => setShowFlyingXp(true), 900);
    const t3 = setTimeout(() => setShowFlyingCoins(true), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
      }}
    >
      <LinearGradient
        colors={["rgba(3,105,161,0.55)", "rgba(14,165,233,0.18)"]}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        }}
      />

      {showConfetti && <ConfettiExplosion onComplete={() => setShowConfetti(false)} />}
      {showFlyingXp && (
        <FlyingRewards type="xp" amount={REWARD.xp} onComplete={() => setShowFlyingXp(false)} />
      )}
      {showFlyingCoins && (
        <FlyingRewards type="coins" amount={REWARD.coins} onComplete={() => setShowFlyingCoins(false)} />
      )}

      <Animated.View
        entering={ZoomIn.duration(500)}
        style={{ alignItems: "center", gap: 16 }}
      >
        <Text
          style={{
            color: "#7dd3fc",
            fontSize: 13,
            letterSpacing: 3,
            fontFamily: "Heebo_700Bold",
          }}
        >
          ✨ ידיים של יהלום ✨
        </Text>
        <LottieView
          source={DIAMOND_LOTTIE}
          style={{ width: 200, height: 200 }}
          autoPlay
          loop
          resizeMode="contain"
        />
        <Text
          style={{
            color: "#bae6fd",
            fontSize: 16,
            textAlign: "center",
            writingDirection: "rtl",
            fontFamily: "Heebo_500Medium",
            lineHeight: 24,
            maxWidth: 280,
          }}
        >
          החזקת 10 שניות תחת לחץ.{"\n"}זה בדיוק מה שמפריד משקיעי ערך
          מסוחרי פאניקה.
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(700).duration(500).springify().damping(18)}
        style={{
          marginTop: 32,
          flexDirection: "row-reverse",
          gap: 12,
        }}
      >
        <RewardChip label="XP" value={`+${REWARD.xp}`} />
        <RewardChip icon={<GoldCoinIcon size={22} />} value={`+${REWARD.coins}`} variant="coin" />
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(1400).duration(400)}
        style={{ marginTop: 40 }}
      >
        <ContinueButton onPress={onFinish} />
      </Animated.View>
    </View>
  );
}

function RewardChip({
  label,
  icon,
  value,
  variant,
}: {
  label?: string;
  icon?: React.ReactNode;
  value: string;
  variant?: "xp" | "coin";
}) {
  // XP chip = deep blue. Coin chip = bright cyan accent + coin icon (no label).
  const isCoin = variant === "coin";
  const bg = isCoin ? "rgba(14,165,233,0.2)" : "rgba(3,105,161,0.25)";
  const border = isCoin ? "#38bdf8" : "#0ea5e9";
  const fg = isCoin ? "#7dd3fc" : "#bae6fd";
  const valueFg = isCoin ? "#fde68a" : "#ffffff";

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 18,
        backgroundColor: bg,
        borderWidth: 2,
        borderColor: border,
        borderBottomWidth: 4,
        borderBottomColor: isCoin ? "#0284c7" : "#0c4a6e",
        alignItems: "center",
        minWidth: 96,
      }}
    >
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
        <Text
          style={{
            color: valueFg,
            fontSize: 20,
            fontWeight: "900",
            fontFamily: "Heebo_900Black",
          }}
        >
          {value}
        </Text>
        {icon}
      </View>
      {label && (
        <Text
          style={{
            color: fg,
            fontSize: 12,
            fontFamily: "Heebo_700Bold",
            marginTop: 2,
          }}
        >
          {label}
        </Text>
      )}
    </View>
  );
}

function ContinueButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="חזרה לפיד וקבלת התגמולים"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{
        backgroundColor: "#0ea5e9",
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 18,
        borderBottomWidth: 4,
        borderBottomColor: "#0369a1",
        shadowColor: "#0369a1",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
      }}
    >
      <Text
        style={{
          color: "#ffffff",
          fontSize: 16,
          fontWeight: "900",
          fontFamily: "Heebo_900Black",
          writingDirection: "rtl",
        }}
      >
        חזרה לפיד
      </Text>
    </Pressable>
  );
}
