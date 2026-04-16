import React from "react";
import { Text, View } from "react-native";
import { TOWER_DEFENSE_CONFIG } from "../towerDefenseData";

interface Props {
  waveIndex: number;
  vaultHealth: number;
  vaultMax: number;
  coinsAvailable: number;
  placementSecondsLeft: number;
  phase: string;
}

export function WaveHeader({
  waveIndex,
  vaultHealth,
  vaultMax,
  coinsAvailable,
  placementSecondsLeft,
  phase,
}: Props) {
  const wave = TOWER_DEFENSE_CONFIG.waves[waveIndex];
  const vaultRatio = Math.max(0, vaultHealth / vaultMax);

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "rgba(10, 54, 34, 0.9)",
        borderBottomWidth: 2,
        borderBottomColor: "#d4a017",
        gap: 8,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            color: "#fefce8",
            fontSize: 20,
            fontWeight: "900",
            fontFamily: "Heebo_900Black",
            writingDirection: "rtl",
          }}
        >
          {wave.label} · {waveIndex + 1}/{TOWER_DEFENSE_CONFIG.waves.length}
        </Text>
        <View
          style={{
            backgroundColor: "#d4a017",
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 16,
          }}
        >
          <Text
            style={{
              color: "#1b4332",
              fontWeight: "900",
              fontFamily: "Heebo_900Black",
            }}
          >
            🪙 {coinsAvailable}
          </Text>
        </View>
      </View>

      <View>
        <View
          style={{
            height: 10,
            backgroundColor: "rgba(0,0,0,0.4)",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${vaultRatio * 100}%`,
              height: "100%",
              backgroundColor:
                vaultRatio > 0.5
                  ? "#4ade80"
                  : vaultRatio > 0.25
                    ? "#facc15"
                    : "#ef4444",
            }}
          />
        </View>
        <Text
          style={{
            color: "#a7f3d0",
            fontSize: 12,
            marginTop: 4,
            textAlign: "right",
            fontFamily: "Heebo_500Medium",
            writingDirection: "rtl",
          }}
        >
          עו״ש: ₪{vaultHealth.toLocaleString("he-IL")} / ₪
          {vaultMax.toLocaleString("he-IL")}
        </Text>
      </View>

      {phase === "placement" && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingTop: 4,
          }}
        >
          <Text
            style={{
              color: "#fefce8",
              fontSize: 14,
              fontFamily: "Heebo_700Bold",
              writingDirection: "rtl",
            }}
          >
            🛡️ זמן להתכונן
          </Text>
          <Text
            style={{
              color: "#d4a017",
              fontSize: 18,
              fontWeight: "900",
              fontFamily: "Heebo_900Black",
            }}
          >
            {placementSecondsLeft}s
          </Text>
        </View>
      )}
      {phase === "wave" && (
        <Text
          style={{
            color: "#f97316",
            fontSize: 14,
            textAlign: "center",
            fontFamily: "Heebo_700Bold",
            writingDirection: "rtl",
            paddingTop: 4,
          }}
        >
          ⚠️ גל בעיצומו — אויבים תוקפים!
        </Text>
      )}
    </View>
  );
}
