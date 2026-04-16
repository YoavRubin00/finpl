import React, { useMemo } from "react";
import { Image, Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { TD_ASSETS } from "../towerDefenseAssets";
import { TOWER_DEFENSE_CONFIG } from "../towerDefenseData";
import { PATH_WAYPOINTS, pointAtProgress } from "../pathGeometry";
import type {
  EnemyInstance,
  GamePhase,
  TowerInstance,
  TowerKind,
} from "../types";

interface Props {
  width: number;
  height: number;
  phase: GamePhase;
  towers: ReadonlyArray<TowerInstance>;
  enemies: ReadonlyArray<EnemyInstance>;
  pendingTower: TowerKind | null;
  vaultHealth: number;
  vaultMax: number;
  onPlaceAt: (x: number, y: number) => void;
}

const TOWER_SIZE = 56;
const ENEMY_SIZE = 44;
const VAULT_SIZE = 96;

function buildPathD(w: number, h: number): string {
  const pts = PATH_WAYPOINTS.map((p) => ({ x: p.x * w, y: p.y * h }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x} ${pts[i].y}`;
  }
  return d;
}

export function BattlefieldCanvas({
  width,
  height,
  phase,
  towers,
  enemies,
  pendingTower,
  vaultHealth,
  vaultMax,
  onPlaceAt,
}: Props) {
  const pathD = useMemo(() => buildPathD(width, height), [width, height]);
  const vaultPos = useMemo(() => pointAtProgress(1), []);
  const vaultDamaged = vaultHealth <= 0;
  const vaultShakeX = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (reduceMotion) {
      vaultShakeX.value = 0;
      return;
    }
    if (vaultHealth < vaultMax * 0.5 && vaultHealth > 0) {
      vaultShakeX.value = withRepeat(
        withTiming(3, { duration: 80 }),
        -1,
        true
      );
    } else {
      vaultShakeX.value = withTiming(0);
    }
  }, [vaultHealth, vaultMax, vaultShakeX, reduceMotion]);

  const vaultAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: vaultShakeX.value }],
  }));

  const canPlace = phase === "placement" && pendingTower !== null;

  return (
    <Pressable
      onPress={(e) => {
        if (!canPlace) return;
        const { locationX, locationY } = e.nativeEvent;
        onPlaceAt(locationX / width, locationY / height);
      }}
      accessibilityRole="button"
      accessibilityLabel={
        canPlace
          ? "הקש על שדה הקרב להצבת המגדל הנבחר"
          : "שדה קרב — בחר מגדל מהתפריט התחתון כדי להציב"
      }
      style={{ width, height, overflow: "hidden", borderRadius: 24 }}
    >
      <Image
        source={{ uri: TD_ASSETS.battlefield }}
        style={{ position: "absolute", width, height }}
        resizeMode="cover"
      />

      <Svg
        width={width}
        height={height}
        style={{ position: "absolute" }}
        pointerEvents="none"
      >
        <Path
          d={pathD}
          stroke="rgba(255, 235, 180, 0.22)"
          strokeWidth={26}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d={pathD}
          stroke="rgba(212, 160, 23, 0.5)"
          strokeWidth={3}
          strokeDasharray="10,8"
          fill="none"
        />
      </Svg>

      <Animated.View
        style={[
          {
            position: "absolute",
            left: vaultPos.x * width - VAULT_SIZE / 2,
            top: vaultPos.y * height - VAULT_SIZE / 2,
            width: VAULT_SIZE,
            height: VAULT_SIZE,
          },
          vaultAnimStyle,
        ]}
        pointerEvents="none"
      >
        <Image
          source={{ uri: TD_ASSETS.fortress }}
          style={{
            width: VAULT_SIZE,
            height: VAULT_SIZE,
            opacity: vaultDamaged ? 0.5 : 1,
          }}
          resizeMode="contain"
        />
      </Animated.View>

      {towers.map((tower) => {
        const def = TOWER_DEFENSE_CONFIG.towers.find(
          (t) => t.kind === tower.kind
        );
        if (!def) return null;
        return (
          <View
            key={tower.id}
            style={{
              position: "absolute",
              left: tower.x * width - TOWER_SIZE / 2,
              top: tower.y * height - TOWER_SIZE / 2,
              width: TOWER_SIZE,
              height: TOWER_SIZE,
            }}
            pointerEvents="none"
          >
            <Image
              source={{ uri: TD_ASSETS.towers[tower.kind] }}
              style={{ width: TOWER_SIZE, height: TOWER_SIZE }}
              resizeMode="contain"
            />
          </View>
        );
      })}

      {enemies.map((enemy) => {
        const pt = pointAtProgress(enemy.progress);
        const def = TOWER_DEFENSE_CONFIG.enemies[enemy.kind];
        const hpRatio = Math.max(0, enemy.hp / def.hp);
        return (
          <View
            key={enemy.id}
            style={{
              position: "absolute",
              left: pt.x * width - ENEMY_SIZE / 2,
              top: pt.y * height - ENEMY_SIZE / 2,
              width: ENEMY_SIZE,
              height: ENEMY_SIZE,
              alignItems: "center",
            }}
            pointerEvents="none"
          >
            <Image
              source={{ uri: TD_ASSETS.enemies[enemy.kind] }}
              style={{ width: ENEMY_SIZE, height: ENEMY_SIZE }}
              resizeMode="contain"
            />
            <View
              style={{
                position: "absolute",
                bottom: -6,
                width: ENEMY_SIZE * 0.85,
                height: 4,
                backgroundColor: "rgba(0,0,0,0.5)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${hpRatio * 100}%`,
                  height: "100%",
                  backgroundColor:
                    hpRatio > 0.5
                      ? "#4ade80"
                      : hpRatio > 0.25
                        ? "#facc15"
                        : "#ef4444",
                }}
              />
            </View>
          </View>
        );
      })}
    </Pressable>
  );
}
