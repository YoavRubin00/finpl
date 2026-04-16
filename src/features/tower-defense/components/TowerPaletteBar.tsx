import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { TD_ASSETS } from "../towerDefenseAssets";
import { TOWER_DEFENSE_CONFIG } from "../towerDefenseData";
import type { TowerKind } from "../types";

interface Props {
  coinsAvailable: number;
  selectedKind: TowerKind | null;
  onSelect: (kind: TowerKind | null) => void;
  onStartWave: () => void;
  disabled?: boolean;
}

export function TowerPaletteBar({
  coinsAvailable,
  selectedKind,
  onSelect,
  onStartWave,
  disabled,
}: Props) {
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "rgba(10, 54, 34, 0.95)",
        borderTopWidth: 2,
        borderTopColor: "#d4a017",
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", gap: 8 }}>
        {TOWER_DEFENSE_CONFIG.towers.map((tower) => {
          const affordable = coinsAvailable >= tower.cost;
          const selected = selectedKind === tower.kind;
          return (
            <Pressable
              key={tower.kind}
              disabled={!affordable || disabled}
              onPress={() => onSelect(selected ? null : tower.kind)}
              accessibilityRole="button"
              accessibilityLabel={`בחר מגדל ${tower.name}, עלות ${tower.cost} מטבעות`}
              accessibilityState={{ selected, disabled: !affordable }}
              style={{
                flex: 1,
                backgroundColor: selected
                  ? "rgba(212, 160, 23, 0.3)"
                  : "rgba(0,0,0,0.4)",
                borderWidth: 2.5,
                borderColor: selected
                  ? "#d4a017"
                  : affordable
                    ? "rgba(212,160,23,0.4)"
                    : "rgba(100,100,100,0.3)",
                borderRadius: 16,
                padding: 8,
                alignItems: "center",
                opacity: affordable ? 1 : 0.5,
              }}
            >
              <Image
                source={{ uri: TD_ASSETS.towers[tower.kind] }}
                style={{ width: 48, height: 48 }}
                resizeMode="contain"
              />
              <Text
                style={{
                  color: "#fefce8",
                  fontSize: 11,
                  marginTop: 4,
                  fontFamily: "Heebo_700Bold",
                  writingDirection: "rtl",
                  textAlign: "center",
                }}
                numberOfLines={1}
              >
                {tower.name}
              </Text>
              <Text
                style={{
                  color: affordable ? "#d4a017" : "#9ca3af",
                  fontSize: 12,
                  fontWeight: "900",
                  fontFamily: "Heebo_900Black",
                  marginTop: 2,
                }}
              >
                🪙 {tower.cost}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={onStartWave}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="שלח את גל האויבים עכשיו"
        style={{
          backgroundColor: disabled ? "rgba(156,163,175,0.4)" : "#d4a017",
          paddingVertical: 14,
          borderRadius: 16,
          alignItems: "center",
          borderBottomWidth: 3,
          borderBottomColor: disabled ? "#6b7280" : "#92580a",
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
          ⚔️ שלחו את הגל עכשיו
        </Text>
      </Pressable>
    </View>
  );
}