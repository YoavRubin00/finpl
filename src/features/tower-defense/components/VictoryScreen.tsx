import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { FINN_HAPPY } from "../../retention-loops/finnMascotConfig";
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
        <ExpoImage
          source={FINN_HAPPY}
          accessible={false}
          style={{ width: 140, height: 140 }}
          contentFit="contain"
        />
        <Text
          style={{
            color: "#7dd3fc",
            fontSize: 14,
            letterSpacing: 3,
            fontFamily: "Heebo_700Bold",
          }}
        >
          ניצחון
        </Text>
        <Text
          style={{
            color: "#f0f9ff",
            fontSize: 38,
            fontWeight: "900",
            fontFamily: "Heebo_900Black",
            textAlign: "center",
            writingDirection: "rtl",
          }}
        >
          הקופה מוגנת!
        </Text>
      </View>

      <View
        style={{
          backgroundColor: "rgba(12, 74, 110, 0.6)",
          borderRadius: 20,
          borderWidth: 2.5,
          borderColor: "#38bdf8",
          padding: 20,
          gap: 14,
        }}
      >
        <Row label="XP" value={`+${summary.xpEarned}`} accent="#bae6fd" />
        <Row
          label="מטבעות"
          value={`+${summary.coinsEarned}`}
          accent="#fde68a"
        />
        <Row
          label="עו״ש שנותר"
          value={`₪${summary.vaultHealthRemaining.toLocaleString("he-IL")}`}
          accent="#7dd3fc"
        />
        <Row
          label="אויבים שנעצרו"
          value={String(summary.enemiesKilled)}
          accent="#f0f9ff"
        />
      </View>

      <Pressable
        onPress={onContinue}
        accessibilityRole="button"
        accessibilityLabel="פתח את פרק 2 וקבל את התגמולים"
        style={{
          backgroundColor: "#0ea5e9",
          paddingVertical: 18,
          borderRadius: 20,
          alignItems: "center",
          borderBottomWidth: 4,
          borderBottomColor: "#0369a1",
        }}
      >
        <Text
          style={{
            color: "#ffffff",
            fontSize: 18,
            fontWeight: "900",
            fontFamily: "Heebo_900Black",
            writingDirection: "rtl",
          }}
        >
          פתח את פרק 2
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
          color: "#bae6fd",
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
