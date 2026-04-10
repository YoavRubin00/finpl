/** FinPlay Adventure Theme — bright, warm, game-like */

export const THEME = {
  /** Main screen gradient (top → middle → bottom) */
  gradient: ["#1b4332", "#2d6a4f", "#1b4332"] as const,
  /** Alternative warm gradient */
  gradientWarm: ["#2d6a4f", "#40916c", "#2d6a4f"] as const,
  /** Card / panel background */
  cardBg: "rgba(0, 40, 20, 0.6)",
  /** Elevated card with golden frame */
  cardBgSolid: "#0a3622",
  /** Golden accent (primary CTA, borders, highlights) */
  gold: "#d4a017",
  goldLight: "#f5c842",
  goldDim: "rgba(212, 160, 23, 0.3)",
  /** Green accent (success, nature) */
  green: "#4ade80",
  greenDark: "#166534",
  /** Sky blue accent */
  sky: "#60a5fa",
  /** Warm orange for streaks, fire */
  orange: "#f97316",
  /** Coin yellow */
  coin: "#facc15",
  /** XP purple */
  xp: "#a78bfa",
  /** Text colors */
  textPrimary: "#fefce8",    // warm white
  textSecondary: "#a7f3d0",  // soft green
  textMuted: "rgba(167, 243, 208, 0.5)",
  /** Borders */
  border: "rgba(212, 160, 23, 0.25)",
  borderLight: "rgba(212, 160, 23, 0.12)",
  /** Tab bar / header */
  headerBg: "#0a3622",
  tabBarBg: "#0a3622",
} as const;

/** Clash Royale UI Overhaul — premium gaming palette */
export const CLASH = {
  /** Backgrounds */
  bgPrimary: '#0d2847',
  bgSecondary: '#1a3a5c',
  /** Diamond grid overlay line color */
  diamondLine: '#2a5a8c',
  /** Gold accents */
  goldBorder: '#d4a017',
  goldLight: '#f5c842',
  goldGlow: 'rgba(212, 160, 23, 0.3)',
  /** Green button gradient */
  greenBtn: '#16a34a',
  greenBtnLight: '#4ade80',
  /** Orange button gradient */
  orangeBtn: '#ea580c',
  orangeBtnLight: '#fbbf24',
  /** Ribbon/banner blue gradient */
  ribbonBlue: '#1e40af',
  ribbonBlueLight: '#2563eb',
  /** Card inner background */
  cardBg: 'rgba(10, 22, 40, 0.85)',
  /** Text shadow color */
  textShadow: 'rgba(0, 0, 0, 0.8)',
  /** Notification badge red */
  redBadge: '#ef4444',
} as const;

/** Union type of all chapter theme entries */
export type ChapterTheme = (typeof OCEAN_CHAPTER_PALETTE)[keyof typeof OCEAN_CHAPTER_PALETTE];

/**
 * Returns the OCEAN_CHAPTER_PALETTE entry for the given chapterId.
 * Accepts "chapter-1" through "chapter-5". Falls back to chapter-1 for unknown ids.
 */
export function getChapterTheme(chapterId: string): ChapterTheme {
  const palette = OCEAN_CHAPTER_PALETTE as Record<string, ChapterTheme>;
  return palette[chapterId] ?? OCEAN_CHAPTER_PALETTE["chapter-1"];
}

/** Calm trading UI — light, pleasant, no-pressure feel */
export const CALM = {
  bg: '#f8fafc',
  surface: '#ffffff',
  surfaceMuted: '#f1f5f9',
  border: '#e5e7eb',
  accent: '#0891b2',
  accentLight: '#cffafe',
  profit: '#16a34a',
  profitSurface: '#dcfce7',
  loss: '#ef4444',
  lossSurface: '#fee2e2',
  textPrimary: '#1f2937',
  textSecondary: '#64748b',
  textTertiary: '#64748b',
  coinGold: '#ca8a04',
  coinSurface: '#fef3c7',
  buttonPrimary: '#0891b2',
  divider: '#e2e8f0',
} as const;

/** Duolingo-style light mode palette */
export const DUO = {
  bg: '#f7f9fb', // Stitch surface
  surface: '#ffffff', // Stitch surface_container_lowest
  border: '#e0e3e5', // Stitch surface_variant
  text: '#191c1e', // Stitch on_surface
  textMuted: '#404752', // Stitch on_surface_variant
  green: '#16a34a',
  greenDark: '#15803d',
  greenSurface: '#dcfce7',
  blue: '#005bb1', // Stitch primary
  blueDark: '#00468b', // Stitch on_primary_fixed_variant
  blueSurface: '#d6e3ff', // Stitch primary_fixed
  orange: '#ea580c',
  orangeDark: '#c2410c',
  orangeSurface: '#ffedd5',
  red: '#d93025',
  redDark: '#b3261e',
  purple: '#7c3aed',
  purpleDark: '#6d28d9',
} as const;

/** Ocean Chapter Palette — underwater blue progression (single source of truth) */
export const OCEAN_CHAPTER_PALETTE = {
  "chapter-1": { primary: "#3b82f6", bg: "#3b82f6", dim: "#dbeafe", glow: "#93c5fd", dark: "#1d4ed8", shadow: "#2563eb", text: "#ffffff", gradient: ["#1e3a8a", "#3b82f6"] as const },
  "chapter-2": { primary: "#38bdf8", bg: "#38bdf8", dim: "#e0f2fe", glow: "#7dd3fc", dark: "#0284c7", shadow: "#0369a1", text: "#ffffff", gradient: ["#075985", "#38bdf8"] as const },
  "chapter-3": { primary: "#60a5fa", bg: "#2563eb", dim: "#dbeafe", glow: "#93c5fd", dark: "#1d4ed8", shadow: "#2563eb", text: "#ffffff", gradient: ["#1e3a8a", "#3b82f6"] as const },
  "chapter-4": { primary: "#818cf8", bg: "#4f46e5", dim: "#e0e7ff", glow: "#a5b4fc", dark: "#4338ca", shadow: "#4f46e5", text: "#ffffff", gradient: ["#312e81", "#6366f1"] as const },
  "chapter-5": { primary: "#a78bfa", bg: "#7c3aed", dim: "#ede9fe", glow: "#c4b5fd", dark: "#6d28d9", shadow: "#7c3aed", text: "#ffffff", gradient: ["#4c1d95", "#8b5cf6"] as const },
} as const;

/** Shared Clash text-shadow style — Supercell feel */
export const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.8)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 4,
} as const;

/** Bold title text — main headers across the app */
export const TITLE_TEXT = {
  fontWeight: '900' as const,
  color: '#ffffff',
  // Removed hard black text shadow to match Intelligent Playfield flat style
};

/** Subtitle text — sub-headers across the app */
export const SUBTITLE_TEXT = {
  fontWeight: '700' as const,
  color: '#f7f9fb',
};

/** Stitch PRD Design System: The Intelligent Playfield */
export const STITCH = {
  // Brand Blues
  primary: '#005bb1',
  primaryContainer: '#2d74ce',
  secondary: '#006688',
  secondaryContainer: '#58cafe',
  // Backgrounds & Surfaces (Tonal Layering)
  background: '#f7f9fb',
  surface: '#f7f9fb',
  surfaceLow: '#f2f4f6',
  surfaceLowest: '#ffffff',
  surfaceVariant: '#e0e3e5',
  // Typography Colors (No Pure Black)
  onSurface: '#191c1e',
  onSurfaceVariant: '#404752',
  // Elements
  tertiaryGold: '#735c00', // for coins/achievements
  outlineVariant: '#c0c7d4', // Ghost Borders
} as const;
