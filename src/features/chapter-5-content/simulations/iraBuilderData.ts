/**
 * SIM 5-31: בונה ה-IRA (IRA Builder) — Module 5-31
 * Default config, pre-computed comparison, and Hebrew helper texts
 * for Traditional vs Roth IRA simulation.
 */

import type { IRAConfig, IRAType } from './iraBuilderTypes';

// ── Default Config ──────────────────────────────────────────────────────────

export const IRA_CONFIG: IRAConfig = {
  annualLimit: 7_000,
  catchUpLimit: 8_000,
  defaultReturn: 0.08,
  defaultTaxNow: 0.22,
  defaultTaxRetirement: 0.30,
  years: 30,
};

// ── Pre-computed Comparison (default values) ────────────────────────────────

function computeFutureValue(
  annualContribution: number,
  rate: number,
  years: number,
): number {
  let balance = 0;
  for (let y = 0; y < years; y++) {
    balance = (balance + annualContribution) * (1 + rate);
  }
  return Math.round(balance);
}

const traditionalGross = computeFutureValue(
  IRA_CONFIG.annualLimit,
  IRA_CONFIG.defaultReturn,
  IRA_CONFIG.years,
);

const rothContribution = Math.round(
  IRA_CONFIG.annualLimit * (1 - IRA_CONFIG.defaultTaxNow),
);
const rothGross = computeFutureValue(
  rothContribution,
  IRA_CONFIG.defaultReturn,
  IRA_CONFIG.years,
);

export interface PreComputedComparison {
  traditionalGross: number;
  traditionalNet: number;
  rothGross: number;
  rothNet: number;
  winner: IRAType;
  differenceNet: number;
}

export const DEFAULT_COMPARISON: PreComputedComparison = {
  traditionalGross,
  traditionalNet: Math.round(traditionalGross * (1 - IRA_CONFIG.defaultTaxRetirement)),
  rothGross,
  rothNet: rothGross, // Roth withdrawals are tax-free
  winner: rothGross > Math.round(traditionalGross * (1 - IRA_CONFIG.defaultTaxRetirement))
    ? 'roth'
    : 'traditional',
  differenceNet: Math.abs(
    rothGross - Math.round(traditionalGross * (1 - IRA_CONFIG.defaultTaxRetirement)),
  ),
};

// ── Hebrew Helper Texts ─────────────────────────────────────────────────────

export interface IRAHelperText {
  title: string;
  emoji: string;
  description: string;
  taxTiming: string;
  bestWhen: string;
}

export const IRA_HELPER_TEXTS: Record<IRAType, IRAHelperText> = {
  traditional: {
    title: 'Traditional IRA',
    emoji: '📜',
    description: 'הפקדות לפני מס — הכסף גדל ללא מס, אבל משלמים מס בפרישה',
    taxTiming: 'מס עכשיו: ❌ | מס בפרישה: ✅',
    bestWhen: 'כשמס הכנסה שלך היום גבוה יותר ממה שתהיה בפרישה',
  },
  roth: {
    title: 'Roth IRA',
    emoji: '🔮',
    description: 'הפקדות אחרי מס — משלמים מס היום, אבל הכל פטור בפרישה',
    taxTiming: 'מס עכשיו: ✅ | מס בפרישה: ❌',
    bestWhen: 'כשמס הכנסה שלך היום נמוך יותר ממה שתהיה בפרישה',
  },
};

// ── Israeli Equivalent Callout ──────────────────────────────────────────────

export const ISRAELI_CALLOUT = 'המקבילה הישראלית: קופת גמל להשקעה';
export const ISRAELI_CALLOUT_DETAIL =
  'קופת גמל להשקעה מאפשרת הפקדה של עד ₪79,006 בשנה. הרווחים ממוסים ב-25% בפדיון, אלא אם ממתינים עד גיל 60 — אז פטור מלא.';

// ── Slider Ranges ───────────────────────────────────────────────────────────

export const SLIDER_RANGES = {
  contribution: { min: 1_000, max: 7_000, step: 500, default: 7_000 },
  returnRate: { min: 0.04, max: 0.12, step: 0.01, default: 0.08 },
  taxNow: { min: 0.10, max: 0.40, step: 0.01, default: 0.22 },
  taxRetirement: { min: 0.10, max: 0.40, step: 0.01, default: 0.30 },
} as const;
