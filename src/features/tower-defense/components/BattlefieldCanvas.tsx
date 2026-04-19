import React, { useMemo } from "react";
import { Image, Pressable, View } from "react-native";
import LottieView from "lottie-react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { TD_ASSETS } from "../towerDefenseAssets";
import { TOWER_DEFENSE_CONFIG } from "../towerDefenseData";
import { PATH_WAYPOINTS, TOWER_PADS, pointAtProgress } from "../pathGeometry";
import type {
  EnemyInstance,
  GamePhase,
  ProjectileInstance,
  TowerInstance,
  TowerKind,
} from "../types";

interface Props {
  width: number;
  height: number;
  phase: GamePhase;
  towers: ReadonlyArray<TowerInstance>;
  enemies: ReadonlyArray<EnemyInstance>;
  projectiles: ReadonlyArray<ProjectileInstance>;
  pendingTower: TowerKind | null;
  vaultHealth: number;
  vaultMax: number;
  onPlaceAt: (padIndex: number) => void;
}

const PROJECTILE_COLORS: Record<TowerKind, string> = {
  emergency_fund: "#38bdf8",
  insurance: "#fbbf24",
  auto_budget: "#a78bfa",
};

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
  projectiles,
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
  const occupiedPads = useMemo(
    () => new Set(towers.map((t) => t.padIndex)),
    [towers]
  );

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={
        canPlace
          ? "שדה קרב, הקש על בסיס ריק כדי להציב את ההגנה הנבחרת"
          : "שדה קרב, בחרו הגנה מהתפריט התחתון"
      }
      style={{ width, height, overflow: "hidden", borderRadius: 24 }}
    >
      {/* Clean gradient battlefield, no baked-in path, so the SVG below is the single source of truth */}
      <LinearGradient
        colors={["#075985", "#0c4a6e", "#082f49"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ position: "absolute", width, height }}
      />

      <Svg
        width={width}
        height={height}
        style={{ position: "absolute" }}
        pointerEvents="none"
      >
        {/* Outer glow so the path stands out over the gradient */}
        <Path
          d={pathD}
          stroke="rgba(14, 165, 233, 0.35)"
          strokeWidth={38}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Solid path road */}
        <Path
          d={pathD}
          stroke="#0ea5e9"
          strokeWidth={20}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Dashed center line for the "road" look */}
        <Path
          d={pathD}
          stroke="rgba(255,255,255,0.65)"
          strokeWidth={2.5}
          strokeDasharray="12,10"
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
            alignItems: "center",
            justifyContent: "center",
            opacity: vaultDamaged ? 0.5 : 1,
          },
          vaultAnimStyle,
        ]}
        pointerEvents="none"
      >
        <LottieView
          source={TD_ASSETS.vaultLottie}
          style={{ width: VAULT_SIZE, height: VAULT_SIZE }}
          autoPlay
          loop
          resizeMode="contain"
        />
      </Animated.View>

      {TOWER_PADS.map((pad, idx) => {
        if (occupiedPads.has(idx)) return null;
        const showPad = phase === "placement" || phase === "wave";
        if (!showPad) return null;
        const padSize = 48;
        const left = pad.x * width - padSize / 2;
        const top = pad.y * height - padSize / 2;
        const interactable = canPlace;
        return (
          <Pressable
            key={`pad-${idx}`}
            onPress={() => interactable && onPlaceAt(idx)}
            disabled={!interactable}
            accessibilityRole="button"
            accessibilityLabel={`בסיס הגנה ${idx + 1}${interactable ? ", זמין" : ""}`}
            style={{
              position: "absolute",
              left,
              top,
              width: padSize,
              height: padSize,
              borderRadius: padSize / 2,
              borderWidth: interactable ? 3 : 2,
              borderColor: interactable ? "#38bdf8" : "rgba(148, 163, 184, 0.6)",
              borderStyle: "dashed",
              backgroundColor: interactable
                ? "rgba(14, 165, 233, 0.22)"
                : "rgba(12, 74, 110, 0.35)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: interactable ? "#bae6fd" : "rgba(203, 213, 225, 0.5)",
              }}
            />
          </Pressable>
        );
      })}

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
              alignItems: "center",
              justifyContent: "center",
            }}
            pointerEvents="none"
          >
            <View
              style={{
                position: "absolute",
                width: TOWER_SIZE,
                height: TOWER_SIZE,
                borderRadius: TOWER_SIZE / 2,
                backgroundColor: "rgba(12, 74, 110, 0.72)",
                borderWidth: 2,
                borderColor: "#38bdf8",
              }}
            />
            <LottieView
              source={TD_ASSETS.towerLottie[tower.kind]}
              style={{ width: TOWER_SIZE - 8, height: TOWER_SIZE - 8 }}
              autoPlay
              loop
              resizeMode="contain"
            />
          </View>
        );
      })}

      {projectiles.map((p) => {
        const age = Date.now() - p.spawnAt;
        const t = Math.min(1, Math.max(0, age / p.ttlMs));
        const cx = p.fromX + (p.toX - p.fromX) * t;
        const cy = p.fromY + (p.toY - p.fromY) * t;
        const size = 14;
        const color = PROJECTILE_COLORS[p.kind];
        return (
          <View
            key={p.id}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: cx * width - size / 2,
              top: cy * height - size / 2,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              shadowColor: color,
              shadowOpacity: 0.9,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
              elevation: 4,
              borderWidth: 1.5,
              borderColor: "#ffffff",
              opacity: 1 - t * 0.15,
            }}
          />
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
              source={TD_ASSETS.enemies[enemy.kind]}
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
    </View>
  );
}
