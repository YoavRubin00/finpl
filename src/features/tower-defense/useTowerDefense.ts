import { useCallback, useEffect, useRef, useState } from "react";
import { TOWER_DEFENSE_CONFIG } from "./towerDefenseData";
import { distanceNorm, pointAtProgress } from "./pathGeometry";
import type {
  EnemyInstance,
  GameState,
  TowerInstance,
  TowerKind,
  VictorySummary,
} from "./types";

const TICK_MS = 50;

const buildInitialState = (): GameState => ({
  phase: "intro",
  waveIndex: 0,
  vaultHealth: TOWER_DEFENSE_CONFIG.vaultStartingHealth,
  vaultMax: TOWER_DEFENSE_CONFIG.vaultStartingHealth,
  coinsAvailable: TOWER_DEFENSE_CONFIG.startingCoins,
  coinsInvested: 0,
  towers: [],
  enemies: [],
  enemiesKilled: 0,
  enemiesEscaped: 0,
  placementSecondsLeft: TOWER_DEFENSE_CONFIG.waves[0].placementSeconds,
});

interface UseTowerDefenseArgs {
  onVictory: (summary: VictorySummary) => void;
}

export function useTowerDefense({ onVictory }: UseTowerDefenseArgs) {
  const [state, setState] = useState<GameState>(buildInitialState);
  const stateRef = useRef<GameState>(state);
  stateRef.current = state;

  const waveStartAtRef = useRef<number>(0);
  const spawnCursorRef = useRef<number>(0);
  const enemyCounterRef = useRef<number>(0);
  const towerCounterRef = useRef<number>(0);
  const towerLastAttackRef = useRef<Record<string, number>>({});
  const placementIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const beginIntro = useCallback(() => {
    setState(buildInitialState());
  }, []);

  const beginPlacement = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: "placement",
      placementSecondsLeft:
        TOWER_DEFENSE_CONFIG.waves[prev.waveIndex].placementSeconds,
    }));
  }, []);

  const startWave = useCallback(() => {
    waveStartAtRef.current = Date.now();
    spawnCursorRef.current = 0;
    setState((prev) => ({ ...prev, phase: "wave", enemies: [] }));
  }, []);

  const placeTower = useCallback((kind: TowerKind, x: number, y: number) => {
    const def = TOWER_DEFENSE_CONFIG.towers.find((t) => t.kind === kind);
    if (!def) return false;
    let didPlace = false;
    setState((prev) => {
      if (prev.phase !== "placement") return prev;
      if (prev.coinsAvailable < def.cost) return prev;
      const id = `tower-${++towerCounterRef.current}`;
      const newTower: TowerInstance = { id, kind, x, y, lastAttackAt: 0 };
      didPlace = true;
      return {
        ...prev,
        coinsAvailable: prev.coinsAvailable - def.cost,
        coinsInvested: prev.coinsInvested + def.cost,
        towers: [...prev.towers, newTower],
      };
    });
    return didPlace;
  }, []);

  const retry = useCallback(() => {
    towerLastAttackRef.current = {};
    spawnCursorRef.current = 0;
    enemyCounterRef.current = 0;
    towerCounterRef.current = 0;
    setState(buildInitialState());
  }, []);

  useEffect(() => {
    if (state.phase !== "placement") {
      if (placementIntervalRef.current) {
        clearInterval(placementIntervalRef.current);
        placementIntervalRef.current = null;
      }
      return;
    }
    placementIntervalRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.phase !== "placement") return prev;
        const next = prev.placementSecondsLeft - 1;
        if (next <= 0) {
          waveStartAtRef.current = Date.now();
          spawnCursorRef.current = 0;
          return {
            ...prev,
            placementSecondsLeft: 0,
            phase: "wave",
            enemies: [],
          };
        }
        return { ...prev, placementSecondsLeft: next };
      });
    }, 1000);
    return () => {
      if (placementIntervalRef.current) {
        clearInterval(placementIntervalRef.current);
        placementIntervalRef.current = null;
      }
    };
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "wave") return;
    const id = setInterval(() => {
      tick();
    }, TICK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  const tick = useCallback(() => {
    const now = Date.now();
    const elapsed = now - waveStartAtRef.current;
    const current = stateRef.current;
    if (current.phase !== "wave") return;
    const wave = TOWER_DEFENSE_CONFIG.waves[current.waveIndex];

    const toSpawn: EnemyInstance[] = [];
    while (
      spawnCursorRef.current < wave.spawnPlan.length &&
      wave.spawnPlan[spawnCursorRef.current].delayMs <= elapsed
    ) {
      const plan = wave.spawnPlan[spawnCursorRef.current];
      const def = TOWER_DEFENSE_CONFIG.enemies[plan.kind];
      toSpawn.push({
        id: `enemy-${++enemyCounterRef.current}`,
        kind: plan.kind,
        hp: def.hp,
        progress: 0,
        isDead: false,
        escaped: false,
      });
      spawnCursorRef.current += 1;
    }

    setState((prev) => {
      if (prev.phase !== "wave") return prev;
      const dtSeconds = TICK_MS / 1000;
      let vaultHealth = prev.vaultHealth;
      let enemiesKilled = prev.enemiesKilled;
      let enemiesEscaped = prev.enemiesEscaped;
      const alive: EnemyInstance[] = [];

      const moved = [...prev.enemies, ...toSpawn].map((e) => {
        if (e.isDead || e.escaped) return e;
        const def = TOWER_DEFENSE_CONFIG.enemies[e.kind];
        const nextProgress = e.progress + def.speed * dtSeconds;
        if (nextProgress >= 1) {
          enemiesEscaped += 1;
          vaultHealth = Math.max(0, vaultHealth - def.damage);
          return { ...e, progress: 1, escaped: true };
        }
        return { ...e, progress: nextProgress };
      });

      for (const tower of prev.towers) {
        const tDef = TOWER_DEFENSE_CONFIG.towers.find(
          (t) => t.kind === tower.kind
        );
        if (!tDef) continue;
        const lastAttack = towerLastAttackRef.current[tower.id] ?? 0;
        if (now - lastAttack < tDef.attackIntervalMs) continue;
        const rangeNorm = tDef.range / 1000;
        let victimIdx = -1;
        let victimProgress = -1;
        for (let i = 0; i < moved.length; i++) {
          const e = moved[i];
          if (e.isDead || e.escaped) continue;
          const pt = pointAtProgress(e.progress);
          const d = distanceNorm(pt, { x: tower.x, y: tower.y });
          if (d <= rangeNorm && e.progress > victimProgress) {
            victimIdx = i;
            victimProgress = e.progress;
          }
        }
        if (victimIdx !== -1) {
          const victim = moved[victimIdx];
          const multiplier = tDef.strongAgainst.includes(victim.kind)
            ? 2
            : 1;
          const newHp = victim.hp - tDef.damage * multiplier;
          if (newHp <= 0) {
            moved[victimIdx] = { ...victim, hp: 0, isDead: true };
            enemiesKilled += 1;
          } else {
            moved[victimIdx] = { ...victim, hp: newHp };
          }
          towerLastAttackRef.current[tower.id] = now;
        }
      }

      for (const e of moved) {
        if (!e.isDead && !e.escaped) alive.push(e);
      }

      const allSpawned = spawnCursorRef.current >= wave.spawnPlan.length;
      const waveClear = allSpawned && alive.length === 0;

      if (vaultHealth <= 0) {
        return {
          ...prev,
          phase: "defeat",
          vaultHealth: 0,
          enemies: alive,
          enemiesKilled,
          enemiesEscaped,
        };
      }
      if (waveClear) {
        const isLastWave =
          prev.waveIndex >= TOWER_DEFENSE_CONFIG.waves.length - 1;
        if (isLastWave) {
          const summary: VictorySummary = {
            xpEarned: TOWER_DEFENSE_CONFIG.victoryReward.xp,
            coinsEarned: TOWER_DEFENSE_CONFIG.victoryReward.coins,
            vaultHealthRemaining: vaultHealth,
            enemiesKilled,
            enemiesEscaped,
          };
          queueMicrotask(() => onVictory(summary));
          return {
            ...prev,
            phase: "victory",
            vaultHealth,
            enemies: [],
            enemiesKilled,
            enemiesEscaped,
          };
        }
        const nextWaveIdx = prev.waveIndex + 1;
        return {
          ...prev,
          phase: "placement",
          waveIndex: nextWaveIdx,
          vaultHealth,
          coinsAvailable: prev.coinsAvailable + wave.reward.coins,
          enemies: [],
          enemiesKilled,
          enemiesEscaped,
          placementSecondsLeft:
            TOWER_DEFENSE_CONFIG.waves[nextWaveIdx].placementSeconds,
        };
      }

      return {
        ...prev,
        vaultHealth,
        enemies: alive,
        enemiesKilled,
        enemiesEscaped,
      };
    });
  }, [onVictory]);

  return {
    state,
    beginIntro,
    beginPlacement,
    placeTower,
    startWave,
    retry,
  };
}
