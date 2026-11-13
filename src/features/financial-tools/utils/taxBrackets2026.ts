/**
 * Israeli income tax / Bituach Leumi calculator for 2026.
 *
 * Reference scenarios (cross-checked against Hilan calculator — Income tax + BL +
 * Mas Briut only, NO pension deduction. Hilan's full payslip view also subtracts
 * mandatory pension at ~6%; this calculator does not model pension yet, so its
 * "net" sits ~5% above Hilan's pension-on default at low salaries):
 *
 * Scenario A — Junior single, no kids:
 *   Input:  gross=10,000/month, creditPoints=2.25
 *   Output: net ≈ ₪8,816/month (effective ≈ 11.8%)
 *   Note: with the ~6% mandatory employee pension deducted the payslip net is ≈ ₪8,216.
 *
 * Scenario B — Mid-level married:
 *   Input:  gross=20,000/month, creditPoints=2.75
 *   Output: net ≈ ₪15,614/month (effective ≈ 21.9%)
 *
 * Scenario C — Senior single, no kids:
 *   Input:  gross=40,000/month, creditPoints=2.25
 *   Output: net ≈ ₪26,263/month (effective ≈ 34.3%)
 *
 * משותף בין: SalaryNetCalculator (#4), TaxRefundCalculator (#1), HishtalmutCalculator (#5).
 */

export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';

export interface TaxBracket {
  from: number;
  to: number | null;
  rate: number;
}

export interface TaxCalculationInput {
  grossAnnual: number;
  creditPoints: number;
  age: number;
  status: MaritalStatus;
}

export interface TaxCalculationResult {
  incomeTax: number;
  bituachLeumi: number;
  masBriut: number;
  totalDeductions: number;
  netAnnual: number;
  netMonthly: number;
  effectiveRate: number;
}

// ─── Constants (2026 values) ──────────────────────────────────────────

export const TAX_BRACKETS_2026: readonly TaxBracket[] = [
  { from: 0,        to: 84_120,   rate: 0.10 },
  { from: 84_120,   to: 120_720,  rate: 0.14 },
  { from: 120_720,  to: 228_000,  rate: 0.20 },
  { from: 228_000,  to: 301_200,  rate: 0.31 },
  { from: 301_200,  to: 560_280,  rate: 0.35 },
  { from: 560_280,  to: 721_560,  rate: 0.47 },
  { from: 721_560,  to: null,     rate: 0.50 },
];

// Audit 2026-11-13. Sources: kolzchut.org.il/he/מדרגות_מס_הכנסה (updated 5.4.2026;
// brackets 3-4 widened from 1.1.2026, credit point ₪242/mo = ₪2,904/yr);
// btl.gov.il employee rates page (reduced-rate threshold ₪7,703, max insured
// income ₪51,910, from 1.1.2026; employee BL+health 4.27% / 12.17%).
export const CREDIT_POINT_VALUE_ANNUAL = 2_904;
export const BL_MAX_MONTHLY = 51_910;
export const BL_BREAK_MONTHLY = 7_703;
// Employee-only Bituach Leumi rates (excluding Mas Briut, which is its own line).
// Combined BL+Health is 4.27% / 12.17% — that's the figure paychecks display in one row,
// but the calculator splits them so each appears separately in the breakdown UI.
export const BL_RATE_LOW = 0.0104;
export const BL_RATE_HIGH = 0.07;
export const HEALTH_RATE_LOW = 0.0323;
export const HEALTH_RATE_HIGH = 0.0517;

// ─── Pure calculation functions ───────────────────────────────────────

/**
 * חישוב מס הכנסה שנתי: צובר מס מדורג מכל מדרגה, מחסיר נקודות זיכוי, לא יורד מאפס.
 */
export function calculateIncomeTax(grossAnnual: number, creditPoints: number): number {
  if (grossAnnual <= 0) return 0;

  let tax = 0;
  for (const bracket of TAX_BRACKETS_2026) {
    if (grossAnnual <= bracket.from) break;
    const upper = bracket.to ?? grossAnnual;
    const taxable = Math.min(grossAnnual, upper) - bracket.from;
    if (taxable > 0) tax += taxable * bracket.rate;
  }

  const credit = creditPoints * CREDIT_POINT_VALUE_ANNUAL;
  return Math.max(0, tax - credit);
}

/**
 * ביטוח לאומי חודשי: שיעור נמוך עד נקודת השבירה, שיעור גבוה מעליה ועד התקרה.
 */
export function calculateBituachLeumi(monthlyGross: number): number {
  if (monthlyGross <= 0) return 0;

  const capped = Math.min(monthlyGross, BL_MAX_MONTHLY);
  if (capped <= BL_BREAK_MONTHLY) {
    return capped * BL_RATE_LOW;
  }
  return BL_BREAK_MONTHLY * BL_RATE_LOW + (capped - BL_BREAK_MONTHLY) * BL_RATE_HIGH;
}

/**
 * מס בריאות חודשי: אותו מבנה שכבות כמו ביטוח לאומי, עם שיעורים של בריאות.
 * תקרת השכר המבוטח (BL_MAX_MONTHLY) חלה גם כאן — לא ניתן לחייב בריאות מעבר לה.
 */
export function calculateMasBriut(monthlyGross: number): number {
  if (monthlyGross <= 0) return 0;

  const capped = Math.min(monthlyGross, BL_MAX_MONTHLY);
  if (capped <= BL_BREAK_MONTHLY) {
    return capped * HEALTH_RATE_LOW;
  }
  return BL_BREAK_MONTHLY * HEALTH_RATE_LOW + (capped - BL_BREAK_MONTHLY) * HEALTH_RATE_HIGH;
}

/**
 * חישוב נטו מלא: משלב את כל הניכויים ומחזיר אובייקט תוצאה.
 */
export function calculateNet(input: TaxCalculationInput): TaxCalculationResult {
  const { grossAnnual, creditPoints } = input;
  const monthlyGross = grossAnnual / 12;

  const incomeTax = calculateIncomeTax(grossAnnual, creditPoints);
  const bituachLeumi = calculateBituachLeumi(monthlyGross) * 12;
  const masBriut = calculateMasBriut(monthlyGross) * 12;

  const totalDeductions = incomeTax + bituachLeumi + masBriut;
  const netAnnual = grossAnnual - totalDeductions;
  const netMonthly = netAnnual / 12;
  const effectiveRate = grossAnnual > 0 ? totalDeductions / grossAnnual : 0;

  return {
    incomeTax,
    bituachLeumi,
    masBriut,
    totalDeductions,
    netAnnual,
    netMonthly,
    effectiveRate,
  };
}

// ✓ Re-verified against Hilan on 2026-05-21 after BL/Health split fix.
// Prior implementation labelled the combined BL+Health rates (3.5%/12%) as BL alone,
// then added Mas Briut on top — double-counting the health portion. Now split per
// official ביטוח לאומי employee-only rates: 0.4%/7% BL + 3.1%/5% Health.

