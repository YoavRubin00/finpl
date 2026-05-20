export type DidYouKnowCategory = 'israel' | 'wallstreet' | 'crypto';

export interface DidYouKnowItem {
  id: string;
  category: DidYouKnowCategory;
  teaser: string;      // open-ended question / hook shown before tap
  punch: string;       // the payoff, full story revealed
  highlight: string;   // the hero number / phrase to counter-animate
  source: string;      // verifiable source attribution
  emoji: string;       // single-char hero emoji, always present
  image?: number | { uri: string };  // optional: local require() or remote URI; overrides emoji on reveal
}

export interface CategoryTheme {
  bg: string;
  accent: string;
  border: string;
  chipBg: string;
  chipText: string;
  label: string;
}

export const CATEGORY_THEMES: Record<DidYouKnowCategory, CategoryTheme> = {
  israel: {
    bg: '#fef3c7',        // amber-100
    accent: '#d97706',    // amber-600
    border: 'rgba(217,119,6,0.3)',
    chipBg: '#fde68a',
    chipText: '#92400e',
    label: '🇮🇱 ישראל מרוויחה',
  },
  wallstreet: {
    bg: '#dbeafe',        // blue-100
    accent: '#1d4ed8',    // blue-700
    border: 'rgba(29,78,216,0.3)',
    chipBg: '#bfdbfe',
    chipText: '#1e3a8a',
    label: '🌍 המסחר הגדול',
  },
  crypto: {
    bg: '#e9d5ff',        // purple-200
    accent: '#7c3aed',    // violet-600
    border: 'rgba(124,58,237,0.3)',
    chipBg: '#ddd6fe',
    chipText: '#5b21b6',
    label: '₿ עידן הקריפטו',
  },
};
