import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import Animated, {
  FadeIn,
  ZoomIn,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { DH_ASSETS } from "../diamondHandsAssets";
import { REWARD } from "../diamondHandsData";

interface Props {
  onFinish: () => void;
}

export function VictoryBlast({ onFinish }: Props) {
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
        colors={["rgba(22, 101, 52, 0.4)", "rgba(212, 160, 23, 0.15)"]}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        }}
      />

      <Animated.View
        entering={ZoomIn.duration(500)}
        style={{ alignItems: "center", gap: 16 }}
      >
        <Text
          style={{
            color: "#4ade80",
            fontSize: 13,
            letterSpacing: 3,
            fontFamily: "Heebo_700Bold",
          }}
        >
          ✨ ידיים של יהלום ✨
        </Text>
        <Image
          source={{ uri: DH_ASSETS.diamondPristine }}
          style={{ width: 200, height: 200 }}
          resizeMode="contain"
        />
        <Text
          style={{
            color: "#fefce8",
            fontSize: 34,
            fontWeight: "900",
            fontFamily: "Heebo_900Black",
            textAlign: "center",
            writingDirection: "rtl",
          }}
        >
          HODL!
        </Text>
        <Text
          style={{
            color: "#a7f3d0",
            fontSize: 16,
            textAlign: "center",
            writingDirection: "rtl",
            fontFamily: "Heebo_500Medium",
            lineHeight: 24,
            maxWidth: 280,
          }}
        >
          החזקת 15 שניות תחת לחץ.{"\n"}זה בדיוק מה שמפריד משקיעי ערך
          מסוחרי פאניקה.
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(400).duration(500)}
        style={{
          marginTop: 32,
          flexDirection: "row-reverse",
          gap: 12,
        }}
      >
        <RewardChip label="XP" value={`+${REWARD.xp}`} color="#a78bfa" />
        <RewardChip
          label="Coins"
          value={`+${REWARD.coins}`}
          color="#d4a017"
        />
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(800).duration(400)}
        style={{ marginTop: 40 }}
      >
        <ContinueButton onPress={onFinish} />
      </Animated.View>
    </View>
  );
}

function RewardChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 16,
        backgroundColor: "rgba(10, 54, 34, 0.85)",
        borderWidth: 2,
        borderColor: color,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color,
          fontSize: 18,
          fontWeight: "900",
          fontFamily: "Heebo_900Black",
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: "#a7f3d0",
          fontSize: 11,
          fontFamily: "Heebo_700Bold",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ContinueButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="חזרה לפיד וקבלת התגמולים"
      style={{
        backgroundColor: "#d4a017",
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 18,
        borderBottomWidth: 4,
        borderBottomColor: "#92580a",
      }}
    >
      <Text
        style={{
          color: "#1b4332",
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
