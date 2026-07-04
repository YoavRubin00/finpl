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
  primaryCyan: '#9ccee6',       // Gilded Vault primary
  primaryCyanDim: '#55869d',    // on-primary-container (CTA gradients)
  secondary: '#006688',
  secondaryContainer: '#58cafe',
  secondaryPurple: '#c3c0ff',   // Gilded Vault secondary
  secondaryPurpleDark: '#3e3c8f', // secondary-container

  // Backgrounds & Surfaces (Tonal Layering)
  background: '#f7f9fb',
  surface: '#f7f9fb',
  surfaceLow: '#f2f4f6',
  surfaceLowest: '#ffffff',
  surfaceContainer: '#eceef0',
  surfaceHigh: '#e6e8ea',
  surfaceHighest: '#e0e3e5',
  surfaceVariant: '#e0e3e5',

  // Typography Colors (No Pure Black)
  onSurface: '#191c1e',
  onSurfaceVariant: '#404752',

  // Elements
  tertiaryGold: '#735c00', // for coins/achievements
  tertiaryGoldBright: '#e9c400', // Gilded Vault tertiary (reward accent)
  tertiaryGoldLight: '#ffe16d',  // tertiary-fixed (subtle gold bg)
  outlineVariant: '#c0c7d4',
  outline: '#707783',
  error: '#ba1a1a',

  // Functional token aliases — semantic, not raw
  successAccent: '#9ccee6',      // Use cyan, NOT green (per DS rules)
  rewardGlow: '#e9c400',         // Gold for rewards & achievements
  progressFill: '#9ccee6',       // Cyan progress bars
  progressTrack: '#e0e3e5',      // surfaceVariant for tracks
  ghostBorder: 'rgba(192,199,212,0.15)', // outlineVariant @ 15%
  cardShadow: 'rgba(62,60,143,0.06)',    // tinted purple shadow

  // Premium dark tier — used by advanced financial tools (FIRE, Compound)
  premiumDarkBg: '#0f172a',
  premiumDarkSurface: '#1e293b',
  premiumDarkAccent: '#312e81',          // indigo wash for hero gradient
  premiumDarkText: '#94a8c2',            // muted slate for sublabels
} as const;

/** Stock sector colors — fantasy portfolio chips & sparklines */
export const SECTOR = {
  tech:        { chip: '#1e40af', chipText: '#ffffff', surface: '#dbeafe', spark: '#3b82f6' },
  spec_growth: { chip: '#a855f7', chipText: '#ffffff', surface: '#f3e8ff', spark: '#c084fc' },
  energy:      { chip: '#ea580c', chipText: '#ffffff', surface: '#ffedd5', spark: '#f97316' },
  israel:      { chip: '#0d80ff', chipText: '#ffffff', surface: '#dbeafe', spark: '#3b82f6' },
  crypto:      { chip: '#7c3aed', chipText: '#ffffff', surface: '#ede9fe', spark: '#a855f7' },
  hype:        { chip: '#e11d48', chipText: '#ffffff', surface: '#ffe4e6', spark: '#f43f5e' },
} as const;

/**
 * FANTASY (v2) — Light Stitch premium palette (Pinplay design system).
 * 8 sectors with gradient tiles + 3 tiers + neutrals.
 * Used by the new fantasy league screens; replaces LUXE dark navy.
 */
export const FANTASY = {
  /** Backgrounds */
  bg:          '#f7f9fb',
  bgElevated:  '#ffffff',
  surfaceLow:  '#f7f9fb',
  surfaceCard: '#ffffff',
  surfaceMuted:'#f1f5f9',

  /** Borders */
  border:      '#eceef0',
  borderStrong:'#e5e7eb',
  borderHigh:  '#cbd5e1',

  /** Text */
  ink:         '#0f172a',
  inkSoft:     '#1e293b',
  inkMuted:    '#6b7280',
  inkFaint:    '#9ca3af',
  inkLabel:    '#475569',

  /** Primary brand (Stitch deep blue) */
  primary:     '#005bb1',
  primaryHover:'#0077d6',
  primaryDark: '#1e3a8a',
  primarySoft: '#dbeafe',
  primaryTint: '#f0f9ff',

  /** Gold accent */
  gold:        '#facc15',
  goldDark:    '#a16207',
  goldDeep:    '#78350f',
  goldSoft:    '#fef3c7',
  goldTint:    '#fffbeb',
  goldStroke:  '#fde68a',

  /** Silver accent */
  silver:      '#cbd5e1',
  silverDark:  '#94a3b8',
  silverEdge:  '#475569',
  silverSoft:  '#f1f5f9',

  /** Diamond / light-blue accent */
  cyan:        '#0891b2',
  cyanLight:   '#22d3ee',
  cyanDeep:    '#155e75',
  cyanSoft:    '#cffafe',
  cyanTint:    '#ecfeff',

  /** Functional */
  positive:    '#16a34a',
  positiveDark:'#15803d',
  positiveSoft:'#dcfce7',
  positiveStroke:'#bbf7d0',
  negative:    '#dc2626',
  negativeDark:'#b91c1c',
  negativeSoft:'#fee2e2',
  negativeStroke:'#fecaca',
  warning:     '#f59e0b',
  warningDark: '#92400e',
  warningSoft: '#fef3c7',
  warningStroke:'#fde68a',
  purple:      '#7c3aed',
  purpleLight: '#a78bfa',
  purpleSoft:  '#ede9fe',

  /** Score chip (dark navy used everywhere) */
  scoreChipBg: '#0d2847',
  scoreChipFg: '#ffffff',
} as const;

/** 8 sectors — gradient tiles, full palette per sector (Pinplay v2) */
export const F2_SECTORS = {
  tech:        { id: 'tech',        label: 'טכנולוגיה', short: 'טק',     color: '#3b82f6', g1: '#60a5fa', g2: '#1d4ed8' },
  spec_growth: { id: 'spec_growth', label: 'צמיחה ספק׳', short: 'ספק׳',  color: '#a855f7', g1: '#c084fc', g2: '#6d28d9' },
  banks:       { id: 'banks',       label: 'בנקים',     short: 'בנקים', color: '#10b981', g1: '#34d399', g2: '#047857' },
  energy:      { id: 'energy',      label: 'אנרגיה',    short: 'אנרגיה',color: '#f59e0b', g1: '#fbbf24', g2: '#b45309' },
  israel:      { id: 'israel',      label: 'שוק ישראלי',short: 'ישראל', color: '#0d80ff', g1: '#3b82f6', g2: '#1e40af' },
  health:      { id: 'health',      label: 'בריאות',    short: 'בריאות',color: '#ef4444', g1: '#f87171', g2: '#b91c1c' },
  crypto:      { id: 'crypto',      label: 'קריפטו',    short: 'קריפטו',color: '#a78bfa', g1: '#c4b5fd', g2: '#6d28d9' },
  consumer:    { id: 'consumer',    label: 'צריכה',     short: 'צריכה', color: '#ec4899', g1: '#f472b6', g2: '#be185d' },
  hype:        { id: 'hype',        label: 'טרנד',      short: 'טרנד',  color: '#f43f5e', g1: '#fb7185', g2: '#be123c' },
} as const;

export type FantasySectorId = keyof typeof F2_SECTORS;

/** Fantasy League — Super Premium palette (gold / silver / light-blue) */
export const LUXE = {
  /** Backgrounds — deep premium navy */
  bgPrimary:    '#0a1e3a',
  bgSecondary:  '#142a52',
  bgElevated:   '#1c3a6e',

  /** Light Blue — core accent (Sky palette) */
  blueLight:    '#7dd3fc',   // Sky-300 — highlights
  blueLighter:  '#bae6fd',   // Sky-200 — surfaces
  blueAccent:   '#38bdf8',   // Sky-400 — primary action
  blueDeep:     '#0284c7',   // Sky-600 — pressed states

  /** Gold — hero CTAs, podium #1, premium accents */
  gold:         '#fbbf24',   // Amber-400
  goldLight:    '#fcd34d',   // Amber-300
  goldDark:     '#d97706',   // Amber-600
  goldDeep:     '#92570a',
  goldGlow:     'rgba(251,191,36,0.45)',

  /** Silver — tier 2, secondary metallics */
  silver:       '#cbd5e1',   // Slate-300
  silverLight:  '#e2e8f0',   // Slate-200
  silverDark:   '#94a3b8',   // Slate-400

  /** Surfaces (cards on dark bg) */
  surfaceCard:   'rgba(255,255,255,0.06)',
  surfaceCardHi: 'rgba(255,255,255,0.10)',
  borderSubtle:  'rgba(255,255,255,0.12)',
  borderHigh:    'rgba(255,255,255,0.18)',

  /** Text */
  textPrimary: '#ffffff',
  textMuted:   'rgba(255,255,255,0.65)',
  textFaint:   'rgba(255,255,255,0.45)',
  textOnGold:  '#3b1f00',
  textOnBlue:  '#0a1e3a',

  /** Functional */
  positive:     '#86efac',   // light green for gains on dark
  positiveTint: 'rgba(74,222,128,0.18)',
  negative:     '#fca5a5',   // soft red on dark
  negativeTint: 'rgba(248,113,113,0.18)',
} as const;

/** Premium gradients used across the Fantasy League */
export const LUXE_GRADIENTS = {
  heroHeader:  ['#0a1e3a', '#1c3a6e', '#0a1e3a'] as const,
  ctaGold:     ['#fcd34d', '#fbbf24', '#d97706'] as const,
  ctaBlue:     ['#bae6fd', '#7dd3fc', '#38bdf8'] as const,
  podiumGold:  ['#fef3c7', '#fbbf24', '#d97706'] as const,
  podiumSilver:['#f1f5f9', '#cbd5e1', '#94a3b8'] as const,
  podiumBlue:  ['#bae6fd', '#7dd3fc', '#0284c7'] as const,
  premiumCard: ['rgba(125,211,252,0.10)', 'rgba(251,191,36,0.08)'] as const,
} as const;

/** Fantasy League gold theme — promotion banner & podium #1 */
export const LEAGUE_GOLD = {
  bgFrom: '#fcd34d',
  bgTo: '#d97706',
  border: '#92570a',
  ink: '#3b1f00',
  glow: 'rgba(251,191,36,0.55)',
} as const;

/** Fantasy zone palette — leaderboard promote/safe/relegate */
export const ZONE = {
  promote: { bar: '#16a34a', tint: '#dcfce7', text: '#15803d', label: 'אזור עלייה' },
  safe:    { bar: '#94a3b8', tint: '#f1f5f9', text: '#475569', label: 'אזור בטוח' },
  relegate:{ bar: '#dc2626', tint: '#fee2e2', text: '#b91c1c', label: 'אזור ירידה' },
} as const;

/** Clan Hub — Clash Royale dark theme for the social clan zone */
export const CLAN = {
  bg: '#0d2847',
  cardBg: 'rgba(10, 22, 40, 0.85)',
  tierBronze: '#a16207',
  tierBronzeLight: '#facc15',
  tierSilver: '#94a3b8',
  tierSilverLight: '#e2e8f0',
  tierGold: '#d4a017',
  tierGoldLight: '#f5c842',
  tierDiamond: '#7dd3fc',
  tierDiamondLight: '#bae6fd',
  ownBubble: ['#f5c842', '#d4a017'] as const,
  otherBubble: 'rgba(255,255,255,0.08)',
  donationGreen: '#16a34a',
  projectFunded: '#a78bfa',
} as const;
