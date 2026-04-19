/**
 * SIM 27: בעל הבית הווירטואלי (Virtual Landlord, REITs), Module 5-27
 * REIT sector definitions, world events, and configuration data.
 */

import type { REITSector, REITEvent, REITConfig } from './reitTypes';

// ── Budget ───────────────────────────────────────────────────────────
export const REIT_BUDGET = 100_000; // ₪100,000

// ── Sectors ──────────────────────────────────────────────────────────

export const REIT_SECTORS: REITSector[] = [
  {
    id: 'offices',
    name: 'משרדים, Offices',
    emoji: '🏢',
    annualReturn: 0.07,
    dividendYield: 0.05,
    volatility: 0.5, // moderate
    description: 'מגדלי משרדים בערים מרכזיות. תשואה יציבה כשהשוק חזק, אבל רגיש לעבודה מרחוק.',
  },
  {
    id: 'residential',
    name: 'מגורים, Residential',
    emoji: '🏠',
    annualReturn: 0.05,
    dividendYield: 0.035,
    volatility: 0.2, // low
    description: 'דירות להשכרה. ביקוש קבוע, כולם צריכים גג. תשואה נמוכה אבל יציבה מאוד.',
  },
  {
    id: 'commercial',
    name: 'מסחרי, קניונים, Commercial',
    emoji: '🏬',
    annualReturn: 0.09,
    dividendYield: 0.06,
    volatility: 0.8, // high
    description: 'קניונים ומרכזי קניות. דיבידנד גבוה כשהכלכלה חזקה, אבל מגפות ואונליין מסוכנים.',
  },
  {
    id: 'healthcare',
    name: 'בריאות, Healthcare',
    emoji: '🏥',
    annualReturn: 0.06,
    dividendYield: 0.04,
    volatility: 0.2, // low
    description: 'בתי חולים, בתי אבות, מרפאות. ביקוש מובטח, אנשים תמיד צריכים טיפול רפואי.',
  },
  {
    id: 'logistics',
    name: 'לוגיסטיקה, מחסנים, Logistics',
    emoji: '📦',
    annualReturn: 0.08,
    dividendYield: 0.045,
    volatility: 0.5, // moderate
    description: 'מחסנים ומרכזי הפצה. המנוע השקט של המסחר, כל חבילה צריכה מקום.',
  },
];

// ── World Events ─────────────────────────────────────────────────────

export const REIT_EVENTS: REITEvent[] = [
  {
    id: 'remote-work',
    description: 'מעבר המוני לעבודה מרחוק! משרדים מתרוקנים, מחסנים מתמלאים',
    emoji: '💻',
    impacts: {
      offices: -0.15,
      residential: 0.03,
      commercial: -0.05,
      healthcare: 0.02,
      logistics: 0.12,
    },
  },
  {
    id: 'pandemic',
    description: 'מגפה עולמית! קניונים נסגרים, בתי חולים עמוסים',
    emoji: '🦠',
    impacts: {
      offices: -0.08,
      residential: 0.05,
      commercial: -0.25,
      healthcare: 0.15,
      logistics: 0.10,
    },
  },
  {
    id: 'tech-boom',
    description: 'בום טכנולוגי! חברות הייטק שוכרות משרדים ומחסנים בטירוף',
    emoji: '🚀',
    impacts: {
      offices: 0.10,
      residential: 0.03,
      commercial: 0.05,
      healthcare: 0.02,
      logistics: 0.20,
    },
  },
  {
    id: 'rate-hike',
    description: 'עליית ריבית חדה! כל סקטור נפגע, מגורים ומסחרי בפרט',
    emoji: '📈',
    impacts: {
      offices: -0.10,
      residential: -0.05,
      commercial: -0.12,
      healthcare: -0.03,
      logistics: -0.10,
    },
  },
  {
    id: 'recovery',
    description: 'התאוששות כלכלית! כל הסקטורים חוזרים לצמוח',
    emoji: '🌱',
    impacts: {
      offices: 0.15,
      residential: 0.08,
      commercial: 0.15,
      healthcare: 0.10,
      logistics: 0.15,
    },
  },
];

// ── Config ───────────────────────────────────────────────────────────
export const reitConfig: REITConfig = {
  budget: REIT_BUDGET,
  sectors: REIT_SECTORS,
  events: REIT_EVENTS,
  years: 10,
};
