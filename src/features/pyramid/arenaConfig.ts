import type { PyramidLayer } from "../../types/economy";
import { getPyramidLayer } from "../../utils/progression";

export interface ArenaConfig {
  id: PyramidLayer;
  name: string;
  subtitle: string;
  emoji: string;
  lottieSource?: number;
  gradientFrom: string;
  gradientTo: string;
  glow: string;
  xpThreshold: number;
  chapterRoute: string;
  // Populated after running: py scripts/generate_content.py
  audioOverview?: number;   // require('assets/SOUND/chapterN_overview.mp3')
  infographic?: number;     // require('assets/images/chapterN_infographic.png')
}

export const ARENAS: readonly ArenaConfig[] = [
  {
    id: 0,
    name: "ברוכים הבאים",
    subtitle: "הכניסה לעולם הפיננסי",
    emoji: "👋",
    lottieSource: require('../../../assets/lottie/wired-flat-63-home-hover-3d-roll.json') as number, // optionally replace with star/compass
    gradientFrom: "#1e3a8a",
    gradientTo: "#3b82f6",
    glow: "#93c5fd",
    xpThreshold: 0,
    chapterRoute: "/chapter/chapter-0",
  },
  {
    id: 1,
    name: "יסודות פיננסיים",
    subtitle: "תזרים מזומנים וחירום",
    emoji: "🏕️",
    lottieSource: require('../../../assets/lottie/wired-flat-63-home-hover-3d-roll.json') as number,
    gradientFrom: "#0e7490",
    gradientTo: "#22d3ee",
    glow: "#67e8f9",
    xpThreshold: 0,
    chapterRoute: "/chapter/chapter-1",
  },
  {
    id: 2,
    name: "ביטחון",
    subtitle: "ביטוח וחובות",
    emoji: "🛡️",
    lottieSource: require('../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json') as number,
    gradientFrom: "#075985",
    gradientTo: "#38bdf8",
    glow: "#7dd3fc",
    xpThreshold: 100,
    chapterRoute: "/chapter/chapter-2",
  },
  {
    id: 3,
    name: "יציבות",
    subtitle: "תקציב וחיסכון",
    emoji: "⚖️",
    lottieSource: require('../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json') as number,
    gradientFrom: "#1e3a8a",
    gradientTo: "#3b82f6",
    glow: "#93c5fd",
    xpThreshold: 250,
    chapterRoute: "/chapter/chapter-3",
  },
  {
    id: 4,
    name: "צמיחה",
    subtitle: "השקעות",
    emoji: "📈",
    lottieSource: require('../../../assets/lottie/wired-flat-161-growth-hover-pinch.json') as number,
    gradientFrom: "#312e81",
    gradientTo: "#6366f1",
    glow: "#a5b4fc",
    xpThreshold: 450,
    chapterRoute: "/chapter/chapter-4",
  },
  {
    id: 5,
    name: "הדרך לחופש כלכלי",
    subtitle: "תיק השקעות ומיסוי",
    emoji: "👑",
    lottieSource: require('../../../assets/lottie/Crown.json') as number,
    gradientFrom: "#4c1d95",
    gradientTo: "#8b5cf6",
    glow: "#c4b5fd",
    xpThreshold: 700,
    chapterRoute: "/chapter/chapter-5",
  },
] as const;

export function getArenaForXP(xp: number): ArenaConfig {
  const layer = getPyramidLayer(xp);
  return ARENAS[layer - 1];
}
