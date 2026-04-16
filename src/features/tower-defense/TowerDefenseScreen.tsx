import React, { useCallback, useState } from "react";
import { LayoutChangeEvent, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEconomyStore } from "../economy/useEconomyStore";
import {
  doubleHeavyHaptic,
  errorHaptic,
  heavyHaptic,
  successHaptic,
  tapHaptic,
} from "../../utils/haptics";
import { BattlefieldCanvas } from "./components/BattlefieldCanvas";
import { DefeatScreen } from "./components/DefeatScreen";
import { IntroScreen } from "./components/IntroScreen";
import { TowerPaletteBar } from "./components/TowerPaletteBar";
import { VictoryScreen } from "./components/VictoryScreen";
import { WaveHeader } from "./components/WaveHeader";
import { TOWER_DEFENSE_CONFIG } from "./towerDefenseData";
import { useTowerDefense } from "./useTowerDefense";
import type { TowerKind, VictorySummary } from "./types";

interface Props {
  onExit: () => void;
  onVictory: () => void;
}

export function TowerDefenseScreen({ onExit, onVictory }: Props) {
  const [boardSize, setBoardSize] = useState({ width: 1, height: 1 });
  const [selectedTower, setSelectedTower] = useState<TowerKind | null>(null);
  const [victorySummary, setVictorySummary] = useState<VictorySummary | null>(
    null
  );
  const addXP = useEconomyStore((s) => s.addXP);
  const addCoins = useEconomyStore((s) => s.addCoins);

  const handleVictory = useCallback(
    (summary: VictorySummary) => {
      setVictorySummary(summary);
      addXP(summary.xpEarned, "sim_complete");
      addCoins(summary.coinsEarned);
      doubleHeavyHaptic();
    },
    [addXP, addCoins]
  );

  const { state, beginPlacement, placeTower, startWave, retry } =
    useTowerDefense({ onVictory: handleVictory });

  const handleBoardLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBoardSize({ width, height });
  }, []);

  const handlePlaceAt = useCallback(
    (nx: number, ny: number) => {
      if (!selectedTower) return;
      const def = TOWER_DEFENSE_CONFIG.towers.find(
        (t) => t.kind === selectedTower
      );
      if (!def) return;
      if (state.coinsAvailable < def.cost) {
        errorHaptic();
        return;
      }
      const placed = placeTower(selectedTower, nx, ny);
      if (placed) {
        successHaptic();
        if (state.coinsAvailable - def.cost < def.cost) {
          setSelectedTower(null);
        }
      } else {
        errorHaptic();
      }
    },
    [placeTower, selectedTower, state.coinsAvailable]
  );

  const handleStartWave = useCallback(() => {
    heavyHaptic();
    setSelectedTower(null);
    startWave();
  }, [startWave]);

  const handleRetry = useCallback(() => {
    tapHaptic();
    setSelectedTower(null);
    setVictorySummary(null);
    retry();
  }, [retry]);

  if (state.phase === "intro") {
    return (
      <BossShell>
        <IntroScreen
          onStart={() => {
            heavyHaptic();
            beginPlacement();
          }}
          onBack={onExit}
        />
      </BossShell>
    );
  }

  if (state.phase === "victory" && victorySummary) {
    return (
      <BossShell>
        <VictoryScreen
          summary={victorySummary}
          onContinue={() => {
            tapHaptic();
            onVictory();
          }}
        />
      </BossShell>
    );
  }

  if (state.phase === "defeat") {
    return (
      <BossShell>
        <DefeatScreen onRetry={handleRetry} onBack={onExit} />
      </BossShell>
    );
  }

  return (
    <BossShell>
      <WaveHeader
        waveIndex={state.waveIndex}
        vaultHealth={state.vaultHealth}
        vaultMax={state.vaultMax}
        coinsAvailable={state.coinsAvailable}
        placementSecondsLeft={state.placementSecondsLeft}
        phase={state.phase}
      />
      <View
        style={{ flex: 1, padding: 12, justifyContent: "center" }}
        onLayout={handleBoardLayout}
      >
        {boardSize.width > 1 && (
          <View
            style={{
              width: boardSize.width - 24,
              height: boardSize.height - 24,
              alignSelf: "center",
            }}
          >
            <BattlefieldCanvas
              width={boardSize.width - 24}
              height={boardSize.height - 24}
              phase={state.phase}
              towers={state.towers}
              enemies={state.enemies}
              pendingTower={selectedTower}
              vaultHealth={state.vaultHealth}
              vaultMax={state.vaultMax}
              onPlaceAt={handlePlaceAt}
            />
          </View>
        )}
      </View>
      {state.phase === "placement" && (
        <TowerPaletteBar
          coinsAvailable={state.coinsAvailable}
          selectedKind={selectedTower}
          onSelect={(kind) => {
            tapHaptic();
            setSelectedTower(kind);
          }}
          onStartWave={handleStartWave}
        />
      )}
      {state.phase === "wave" && (
        <View
          style={{
            padding: 14,
            backgroundColor: "rgba(10, 54, 34, 0.9)",
            borderTopWidth: 2,
            borderTopColor: "#d4a017",
          }}
        >
          <Text
            style={{
              color: "#fefce8",
              textAlign: "center",
              fontFamily: "Heebo_700Bold",
              writingDirection: "rtl",
              fontSize: 15,
            }}
          >
            המגדלים פועלים אוטומטית · המשך לצפות
          </Text>
        </View>
      )}
    </BossShell>
  );
}

function BossShell({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient
      colors={["#1b4332", "#0a3622"]}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
}
