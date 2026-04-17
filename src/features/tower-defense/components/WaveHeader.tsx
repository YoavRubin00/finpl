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
  placementSecondsLeft: _placementSecondsLeft,
  phase,
}: Props) {
  const wave = TOWER_DEFENSE_CONFIG.waves[waveIndex];
  const vaultRatio = Math.max(0, vaultHealth / vaultMax);

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "rgba(8, 47, 73, 0.9)",
        borderBottomWidth: 2,
        borderBottomColor: "#38bdf8",
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
            color: "#f0f9ff",
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
            backgroundColor: "#fde68a",
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 16,
          }}
        >
          <Text
            style={{
              color: "#78350f",
              fontWeight: "900",
              fontFamily: "Heebo_900Black",
            }}
          >
            {coinsAvailable}
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
        <Text
          style={{
            color: "#bae6fd",
            fontSize: 13,
            textAlign: "center",
            fontFamily: "Heebo_700Bold",
            writingDirection: "rtl",
            paddingTop: 4,
          }}
        >
          בחרו הגנה, מקמו אותה במקומות הרלוונטיים, ולחצו "התמודדו עם החודש"
        </Text>
      )}
      {phase === "wave" && (
        <Text
          style={{
            color: "#fda4af",
            fontSize: 14,
            textAlign: "center",
            fontFamily: "Heebo_700Bold",
            writingDirection: "rtl",
            paddingTop: 4,
          }}
        >
          גל בעיצומו — אויבים תוקפים!
        </Text>
      )}
    </View>
  );
}
