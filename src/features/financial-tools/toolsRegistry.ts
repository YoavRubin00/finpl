/**
 * Central metadata for every entry in the Financial Tools hub.
 *
 * One source of truth — read by the hub Grid, the ToolHubCard, and each tool
 * screen that wants its own accent/emoji/dark-hero flag. Adding a new tool
 * means appending one entry here and creating its screen file.
 *
 * Premium-dark flag: when `premiumDark: true`, the tool's StatHero result
 * card switches to the dark indigo→purple gradient (reserved for FIRE +
 * Compound — the advanced/horizon tools).
 */

import {
  CalendarDays,
  Coins,
  FileText,
  Home,
  LineChart,
  Newspaper,
  PieChart,
  PiggyBank,
  ReceiptText,
  Rocket,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';

export type ToolKey =
  | 'payslip'
  | 'compound'
  | 'fire'
  | 'salary-net'
  | 'tax-refund'
  | 'mortgage'
  | 'pension-fees'
  | 'breaking-news'
  | 'portfolio'
  | 'analyst'
  | 'journal'
  | 'cashflow';

export type ToolStatus = 'active' | 'coming_soon';

/**
 * Splits the hub into two accordion sections.
 * - `investor`: long-horizon wealth tools (analyst, compound, news, portfolio)
 * - `financial`: personal-finance tools (paycheck, tax, mortgage, pension, cashflow…)
 */
export type ToolCategory = 'investor' | 'financial';

export interface ToolMeta {
  key: ToolKey;
  route: `/${string}`;
  label: string;
  subtitle: string;
  Icon: LucideIcon;
  /** Primary accent — borders, active chips, slider thumbs, glow shadows. */
  hue: string;
  /** Tinted background — chip-active surface, hero card glow halo. */
  light: string;
  /** Deeper shade — text on the tinted bg, badge text. */
  deep: string;
  /** Emoji mascot for the hub card. */
  emoji: string;
  /** When true, the result card uses dark hero gradient. Only for advanced tools. */
  premiumDark: boolean;
  /** XP rewarded on first completed calculation today. */
  xpReward: number;
  status: ToolStatus;
  category: ToolCategory;
  /** TOOL DILUTION (Yoav 11.7, 30d data): true = removed from the hub grid
   *  (route stays live for deep links). The shelf goes 9 → 5 sharp tools
   *  aligned to the salary-first wedge; mortgage (3 users), tax-refund (3)
   *  and pension-fees (2) are 30+-audience tools that only added clutter. */
  hidden?: boolean;
}

export const TOOLS_REGISTRY: readonly ToolMeta[] = [
  {
    key: 'journal',
    route: '/investors-journal',
    label: 'יומן משקיעים',
    subtitle: 'אירועי השוק של החודש',
    Icon: CalendarDays,
    hue: '#2563eb',
    light: '#dbeafe',
    deep: '#1d4ed8',
    emoji: '📅',
    premiumDark: false,
    xpReward: 5,
    status: 'active',
    category: 'investor',
  },
  {
    key: 'analyst',
    route: '/stock-analyst',
    label: 'אנליסט מניות',
    subtitle: 'תחזיות AI על מניות',
    Icon: LineChart,
    hue: '#0ea5e9',
    light: '#e0f2fe',
    deep: '#0369a1',
    emoji: '🔮',
    premiumDark: false,
    xpReward: 10,
    status: 'active',
    category: 'investor',
  },
  {
    key: 'payslip',
    route: '/payslip-analyzer',
    label: 'קריאת תלוש שכר',
    subtitle: 'ניתוח AI של תלוש משכורת עם שארק רואה החשבון',
    Icon: FileText,
    hue: '#005bb1',
    light: '#dbeafe',
    deep: '#0a3a78',
    emoji: '📄',
    premiumDark: false,
    xpReward: 25,
    status: 'active',
    category: 'financial',
  },
  {
    key: 'compound',
    route: '/compound-calculator',
    label: 'ריבית דריבית',
    subtitle: 'איך הכסף שלך מכפיל את עצמו',
    Icon: TrendingUp,
    hue: '#0891b2',
    light: '#cffafe',
    deep: '#155e75',
    emoji: '📈',
    premiumDark: true,
    xpReward: 20,
    status: 'active',
    category: 'investor',
  },
  {
    key: 'fire',
    route: '/fire-calculator',
    label: 'חופש פיננסי · FIRE',
    subtitle: 'בעוד כמה שנים אפשר להפסיק לעבוד',
    Icon: Rocket,
    hue: '#7c3aed',
    light: '#ede9fe',
    deep: '#4c1d95',
    emoji: '🔥',
    premiumDark: true,
    xpReward: 30,
    status: 'active',
    category: 'financial',
  },
  {
    key: 'salary-net',
    route: '/salary-net-calculator',
    label: 'שכר ברוטו ↔ נטו',
    subtitle: 'כמה נכנס לך לכיס באמת',
    Icon: Coins,
    hue: '#22c55e',
    light: '#dcfce7',
    deep: '#14532d',
    emoji: '💰',
    premiumDark: false,
    xpReward: 15,
    status: 'active',
    category: 'financial',
    // MERGED into the payslip analyzer (Yoav 11.7): same salary-first pain,
    // two shelf slots. The route stays live — reached via the CTA inside
    // the payslip tool (and deep links).
    hidden: true,
  },
  {
    key: 'tax-refund',
    route: '/tax-refund-calculator',
    label: 'החזר מס',
    subtitle: '8 מתוך 10 ישראלים זכאים',
    Icon: ReceiptText,
    hue: '#fb923c',
    light: '#fff7ed',
    deep: '#9a3412',
    emoji: '🧾',
    premiumDark: false,
    xpReward: 20,
    status: 'active',
    category: 'financial',
    hidden: true, // dilution 11.7 — 3 users/30d
  },
  {
    key: 'mortgage',
    route: '/mortgage-calculator',
    label: 'משכנתא',
    subtitle: 'כמה זה יעלה — והאם תאושר',
    Icon: Home,
    hue: '#6366f1',
    light: '#eef2ff',
    deep: '#3730a3',
    emoji: '🏠',
    premiumDark: false,
    xpReward: 25,
    status: 'active',
    category: 'financial',
    hidden: true, // dilution 11.7 — 3 users/30d
  },
  {
    key: 'pension-fees',
    route: '/pension-fees-comparator',
    label: 'דמי ניהול פנסיה',
    subtitle: 'כמה הלך לבית ההשקעות בדמי ניהול',
    Icon: PiggyBank,
    hue: '#ec4899',
    light: '#fce7f3',
    deep: '#be185d',
    emoji: '🐖',
    premiumDark: false,
    xpReward: 20,
    status: 'active',
    category: 'financial',
    hidden: true, // dilution 11.7 — 2 users/30d
  },
  {
    key: 'breaking-news',
    route: '/breaking-news',
    label: 'חדשות מתפרצות',
    subtitle: 'סיכום AI יומי + מדד הייפ',
    Icon: Newspaper,
    hue: '#dc2626',
    light: '#fee2e2',
    deep: '#991b1b',
    emoji: '🔥',
    premiumDark: true,
    xpReward: 25,
    status: 'active',
    category: 'investor',
  },
  {
    key: 'portfolio',
    route: '/coming-soon',
    label: 'מנתח תיקי מניות',
    subtitle: 'פיזור וסיכון בתיק',
    Icon: PieChart,
    hue: '#94a3b8',
    light: '#f1f5f9',
    deep: '#475569',
    emoji: '🥧',
    premiumDark: false,
    xpReward: 0,
    status: 'coming_soon',
    category: 'investor',
  },
  {
    key: 'cashflow',
    route: '/coming-soon',
    label: 'ניהול תזרים',
    subtitle: 'הכנסות והוצאות עם AI',
    Icon: Wallet,
    hue: '#94a3b8',
    light: '#f1f5f9',
    deep: '#475569',
    emoji: '💼',
    premiumDark: false,
    xpReward: 0,
    status: 'coming_soon',
    category: 'financial',
  },
];

export function findTool(key: ToolKey): ToolMeta | undefined {
  return TOOLS_REGISTRY.find((t) => t.key === key);
}
