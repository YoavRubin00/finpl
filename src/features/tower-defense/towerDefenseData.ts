import type {
  EnemyDef,
  EnemyKind,
  TowerDef,
  TowerDefenseConfig,
  WaveDef,
} from "./types";

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  mechanic: {
    kind: "mechanic",
    name: "מוסכניק כועס",
    emoji: "🔧",
    hp: 120,
    speed: 0.14,
    damage: 800,
    weakAgainst: "insurance",
    description: "תקלה פתאומית ברכב — 800₪ למכה",
  },
  tax: {
    kind: "tax",
    name: "מס הכנסה",
    emoji: "📜",
    hp: 220,
    speed: 0.08,
    damage: 1500,
    weakAgainst: "emergency_fund",
    description: "חוב מס ישן — 1,500₪ למכה",
  },
  wedding: {
    kind: "wedding",
    name: "חתונת חבר",
    emoji: "💍",
    hp: 90,
    speed: 0.16,
    damage: 800,
    weakAgainst: "emergency_fund",
    description: "מתנה + בגדים + נסיעה — 800₪",
  },
  shopping: {
    kind: "shopping",
    name: "שופינג אימפולסיבי",
    emoji: "🛍️",
    hp: 50,
    speed: 0.24,
    damage: 300,
    weakAgainst: "auto_budget",
    description: "פריט שלא היה צריך — 300₪",
  },
};

export const TOWERS: ReadonlyArray<TowerDef> = [
  {
    kind: "emergency_fund",
    name: "קרן חירום",
    emoji: "🛡️",
    cost: 200,
    damage: 45,
    attackIntervalMs: 900,
    range: 140,
    description: "יציבה, עוצרת הוצאות גדולות",
    strongAgainst: ["tax", "wedding"],
  },
  {
    kind: "insurance",
    name: "ביטוח",
    emoji: "🚗",
    cost: 150,
    damage: 35,
    attackIntervalMs: 800,
    range: 120,
    description: "מגן מפני תקלות רכב ונזקים",
    strongAgainst: ["mechanic"],
  },
  {
    kind: "auto_budget",
    name: "תקציב אוטומטי",
    emoji: "⚙️",
    cost: 100,
    damage: 22,
    attackIntervalMs: 500,
    range: 110,
    description: "ירייה מהירה נגד שופינג",
    strongAgainst: ["shopping"],
  },
];

export const WAVES: ReadonlyArray<WaveDef> = [
  {
    index: 0,
    label: "חודש 1",
    placementSeconds: 12,
    spawnPlan: [
      { kind: "shopping", delayMs: 0 },
      { kind: "shopping", delayMs: 1800 },
      { kind: "mechanic", delayMs: 4000 },
      { kind: "shopping", delayMs: 6200 },
    ],
    reward: { coins: 180 },
  },
  {
    index: 1,
    label: "חודש 2",
    placementSeconds: 12,
    spawnPlan: [
      { kind: "shopping", delayMs: 0 },
      { kind: "mechanic", delayMs: 1600 },
      { kind: "wedding", delayMs: 3400 },
      { kind: "shopping", delayMs: 5000 },
      { kind: "mechanic", delayMs: 6800 },
    ],
    reward: { coins: 220 },
  },
  {
    index: 2,
    label: "חודש 3",
    placementSeconds: 14,
    spawnPlan: [
      { kind: "wedding", delayMs: 0 },
      { kind: "shopping", delayMs: 1400 },
      { kind: "mechanic", delayMs: 2800 },
      { kind: "tax", delayMs: 4600 },
      { kind: "wedding", delayMs: 6400 },
      { kind: "shopping", delayMs: 7800 },
      { kind: "tax", delayMs: 9400 },
    ],
    reward: { coins: 0 },
  },
];

export const TOWER_DEFENSE_CONFIG: TowerDefenseConfig = {
  vaultStartingHealth: 5000,
  startingCoins: 500,
  waves: WAVES,
  towers: TOWERS,
  enemies: ENEMIES,
  victoryReward: { xp: 100, coins: 500 },
};
