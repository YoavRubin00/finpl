export type EnemyKind = "mechanic" | "tax" | "wedding" | "shopping";

export type TowerKind = "emergency_fund" | "insurance" | "auto_budget";

export type GamePhase =
  | "intro"
  | "placement"
  | "wave"
  | "resolve"
  | "victory"
  | "defeat";

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  emoji: string;
  hp: number;
  speed: number;
  damage: number;
  weakAgainst: TowerKind;
  description: string;
}

export interface TowerDef {
  kind: TowerKind;
  name: string;
  emoji: string;
  cost: number;
  damage: number;
  attackIntervalMs: number;
  range: number;
  description: string;
  strongAgainst: ReadonlyArray<EnemyKind>;
}

export interface WaveDef {
  index: number;
  label: string;
  spawnPlan: ReadonlyArray<{ kind: EnemyKind; delayMs: number }>;
  placementSeconds: number;
  reward: { coins: number };
}

export interface EnemyInstance {
  id: string;
  kind: EnemyKind;
  hp: number;
  progress: number;
  isDead: boolean;
  escaped: boolean;
}

export interface TowerInstance {
  id: string;
  kind: TowerKind;
  x: number;
  y: number;
  lastAttackAt: number;
}

export interface GameState {
  phase: GamePhase;
  waveIndex: number;
  vaultHealth: number;
  vaultMax: number;
  coinsAvailable: number;
  coinsInvested: number;
  towers: ReadonlyArray<TowerInstance>;
  enemies: ReadonlyArray<EnemyInstance>;
  enemiesKilled: number;
  enemiesEscaped: number;
  placementSecondsLeft: number;
}

export interface TowerDefenseConfig {
  vaultStartingHealth: number;
  startingCoins: number;
  waves: ReadonlyArray<WaveDef>;
  towers: ReadonlyArray<TowerDef>;
  enemies: Record<EnemyKind, EnemyDef>;
  victoryReward: { xp: number; coins: number };
}

export interface VictorySummary {
  xpEarned: number;
  coinsEarned: number;
  vaultHealthRemaining: number;
  enemiesKilled: number;
  enemiesEscaped: number;
}
