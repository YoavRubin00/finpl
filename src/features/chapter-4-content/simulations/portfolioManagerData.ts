/**
 * SIM 24: מנהל התיקים (Portfolio Manager) — Module 4-24
 * Asset classes and world events data for the portfolio simulation.
 */

import type { AssetClass, WorldEvent, PortfolioManagerConfig } from './portfolioManagerTypes';

// ── Asset Classes ─────────────────────────────────────────────────────
export const ASSET_CLASSES: AssetClass[] = [
  {
    id: 'us-stocks',
    name: 'מניות US',
    emoji: '🇺🇸',
    color: '#4CAF50', // green
  },
  {
    id: 'gov-bonds',
    name: 'אג"ח ממשלתי',
    emoji: '🏛️',
    color: '#2196F3', // blue
  },
  {
    id: 'real-estate',
    name: 'נדל"ן',
    emoji: '🏠',
    color: '#FF9800', // orange
  },
  {
    id: 'gold',
    name: 'זהב',
    emoji: '🥇',
    color: '#FFD700', // gold
  },
  {
    id: 'emerging',
    name: 'מניות שווקים מתפתחים',
    emoji: '🌍',
    color: '#9C27B0', // purple
  },
];

// ── World Events ──────────────────────────────────────────────────────
// 5 events with impacts as decimals (e.g., -0.20 = -20%)
export const WORLD_EVENTS: WorldEvent[] = [
  {
    id: 'war',
    name: 'מלחמה במזרח התיכון',
    emoji: '⚔️',
    impacts: {
      'us-stocks': -0.20,
      'gov-bonds': 0.05,
      'real-estate': -0.05,
      'gold': 0.15,
      'emerging': -0.25,
    },
  },
  {
    id: 'tech-boom',
    name: 'בום טכנולוגי',
    emoji: '🚀',
    impacts: {
      'us-stocks': 0.25,
      'gov-bonds': -0.03,
      'real-estate': 0.05,
      'gold': -0.05,
      'emerging': 0.10,
    },
  },
  {
    id: 'pandemic',
    name: 'מגפה עולמית',
    emoji: '🦠',
    impacts: {
      'us-stocks': -0.30,
      'gov-bonds': 0.08,
      'real-estate': -0.15,
      'gold': 0.20,
      'emerging': -0.20,
    },
  },
  {
    id: 'rate-hike',
    name: 'עלייה בריבית',
    emoji: '📈',
    impacts: {
      'us-stocks': -0.05,
      'gov-bonds': -0.10,
      'real-estate': -0.08,
      'gold': -0.02,
      'emerging': -0.07,
    },
  },
  {
    id: 'global-recovery',
    name: 'התאוששות גלובלית',
    emoji: '🌅',
    impacts: {
      'us-stocks': 0.20,
      'gov-bonds': 0.02,
      'real-estate': 0.12,
      'gold': -0.03,
      'emerging': 0.15,
    },
  },
];

// ── Config ────────────────────────────────────────────────────────────
export const portfolioManagerConfig: PortfolioManagerConfig = {
  assetClasses: ASSET_CLASSES,
  events: WORLD_EVENTS,
  budget: 200_000,
};
