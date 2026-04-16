import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { TD_ASSETS } from "../towerDefenseAssets";
import type { VictorySummary } from "../types";

interface Props {
  summary: VictorySummary;
  onContinue: () => void;
}

export function VictoryScreen({ summary, onContinue }: Props) {
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 24,
        paddingVertical: 40,
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      <View style={{ alignItems: "center", gap: 16 }}>
        <Text
          style={{
            color: "#4ade80",
            fontSize: 14,
            letterSpacing: 3,
            fontFamily: "Heebo_700Bold",
          }}
        >
          ✨ ניצחון ✨
        </Text>
        <Text
          style={{
            color: "#fefce8",
            fontSize: 38,
            fontWeight: "900",
            fontFamily: "Heebo_900Black",
            textAlign: "center",
            writingDirection: "rtl",
          }}
        >
          הקופה מוגנת!
        </Text>
        <Image
          source={{ uri: TD_ASSETS.fortress }}
          style={{ width: 200, height: 200 }}
          resizeMode="contain"
        />
      </View>

      <View
        style={{
          backgroundColor: "rgba(0, 40, 20, 0.6)",
          borderRadius: 20,
          borderWidth: 2.5,
          borderColor: "#d4a017",
          padding: 20,
          gap: 14,
        }}
      >
        <Row label="XP" value={`+${summary.xpEarned}`} accent="#a78bfa" />
        <Row
          label="Coins"
          value={`+${summary.coinsEarned}`}
          accent="#d4a017"
        />
        <Row
          label="עו״ש שנותר"
          value={`₪${summary.vaultHealthRemaining.toLocaleString("he-IL")}`}
          accent="#4ade80"
        />
        <Row
          label="אויבים שנעצרו"
          value={String(summary.enemiesKilled)}
          accent="#fefce8"
        />
      </View>

      <Pressable
        onPress={onContinue}
        accessibilityRole="button"
        accessibilityLabel="פתח את פרק 2 וקבל את התגמולים"
        style={{
          backgroundColor: "#4ade80",
          paddingVertical: 18,
          borderRadius: 20,
          alignItems: "center",
          borderBottomWidth: 4,
          borderBottomColor: "#166534",
        }}
      >
        <Text
          style={{
            color: "#0a3622",
            fontSize: 18,
            fontWeight: "900",
            fontFamily: "Heebo_900Black",
            writingDirection: "rtl",
          }}
        >
          🚀 פתח את פרק 2
        </Text>
      </Pressable>
    </View>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: accent,
          fontSize: 20,
          fontWeight: "900",
          fontFamily: "Heebo_900Black",
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: "#a7f3d0",
          fontSize: 15,
          fontFamily: "Heebo_700Bold",
          writingDirection: "rtl",
        }}
      >
        {label}
      </Text>
    </View>
  );
}
