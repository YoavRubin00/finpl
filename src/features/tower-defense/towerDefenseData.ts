import type {
  EnemyDef,
  EnemyKind,
  TowerDef,
  TowerDefenseConfig,
  WaveDef,
} from "./types";

// Enemy descriptions grounded in Israeli financial data (Warren/דר כריש content).
// Numbers are based on CBS household survey + BoI + common insurance quotes, 2024-2026 values.
export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  mechanic: {
    kind: "mechanic",
    name: "מוסכניק כועס",
    emoji: "🔧",
    hp: 120,
    speed: 0.14,
    damage: 800,
    weakAgainst: "insurance",
    description: "תקלת רכב ממוצעת, 800-2,500₪. משפחה ישראלית חווה 1.5 תקלות בשנה.",
  },
  tax: {
    kind: "tax",
    name: "מס הכנסה",
    emoji: "📜",
    hp: 220,
    speed: 0.08,
    damage: 1500,
    weakAgainst: "emergency_fund",
    description: "חוב מס שהצטבר. ריבית פיגורים = פריים + 5.5%. כבד ואיטי, אבל מוחץ.",
  },
  wedding: {
    kind: "wedding",
    name: "חתונת חבר",
    emoji: "💍",
    hp: 90,
    speed: 0.16,
    damage: 800,
    weakAgainst: "emergency_fund",
    description: "מתנה (350₪) + בגדים + נסיעה. הישראלי הממוצע נוכח ב-8 חתונות בשנה.",
  },
  shopping: {
    kind: "shopping",
    name: "שופינג אימפולסיבי",
    emoji: "🛍️",
    hp: 50,
    speed: 0.24,
    damage: 300,
    weakAgainst: "auto_budget",
    description: "הוצאה לא מתוכננת ממוצעת, 300₪. ישראלים מוציאים ~14% מהמשכורת על זה.",
  },
};

// Towers represent real financial-defense tools, calibrated to actual ROI.
export const TOWERS: ReadonlyArray<TowerDef> = [
  {
    kind: "emergency_fund",
    name: "קרן חירום",
    emoji: "🛡️",
    cost: 200,
    damage: 45,
    attackIntervalMs: 900,
    range: 320,
    description: "3-6 חודשי הוצאות במזומן. חוסמת את 73% מהחובות של משפחות ישראליות (נתוני CBS).",
    strongAgainst: ["tax", "wedding"],
  },
  {
    kind: "insurance",
    name: "ביטוח",
    emoji: "🚗",
    cost: 150,
    damage: 35,
    attackIntervalMs: 800,
    range: 300,
    description: "ביטוח רכב מקיף: ~4,500₪/שנה מול חשיפה של 50K+₪. יחס עלות-תועלת: 1:10.",
    strongAgainst: ["mechanic"],
  },
  {
    kind: "auto_budget",
    name: "ניהול תקציב",
    emoji: "⚙️",
    cost: 100,
    damage: 22,
    attackIntervalMs: 500,
    range: 280,
    description: "הפקדה אוטומטית לחיסכון בתחילת חודש. מחקרים: חוסך 12-18% מההכנסה ללא מאמץ.",
    strongAgainst: ["shopping"],
  },
];

export const WAVES: ReadonlyArray<WaveDef> = [
  {
    index: 0,
    label: "חודש 1",
    placementSeconds: 45,
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
    placementSeconds: 40,
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
    placementSeconds: 45,
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
  startingCoins: 900,
  waves: WAVES,
  towers: TOWERS,
  enemies: ENEMIES,
  victoryReward: { xp: 100, coins: 500 },
};
