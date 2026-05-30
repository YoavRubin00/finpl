/**
 * Israeli pension management-fee averages by (age band × salary band).
 *
 * Estimates compiled by the Warren agent from publicly available data, 2024-2025:
 *   • משרד האוצר — מכרזי קרן ברירת מחדל (rounds 2018, 2022, 2024)
 *   • דוחות פיקוח על שוק ההון (אגף שוק ההון, ביטוח וחיסכון)
 *   • סקרי דמי ניהול ממוצעים — האוצר + הסוכנויות הגדולות (מנורה, מגדל, הראל, אלטשולר שחם, מיטב)
 *
 * Drivers behind the gradient:
 *   • Age: older savers are more likely to hold legacy מסלולים (pre-2017)
 *     that didn't undergo automatic migration to default-track caps —
 *     hence higher average fees.
 *   • Salary: higher monthly salary correlates with active negotiation
 *     and/or HR-procured group deals, which compress fees.
 *
 * **These are estimates** with a ±0.3% margin on deposit fee and
 * ±0.05% on accumulation fee. The table should be refreshed annually,
 * primarily after new default-track tender announcements.
 *
 * Sources to re-check on refresh:
 *   - https://www.gov.il/he/departments/topics/cma-pension-and-savings
 *   - https://www.kolzchut.org.il/he/קרן_פנסיה_ברירת_מחדל
 *   - דוחות שנתיים של רשות שוק ההון, ביטוח וחיסכון
 */

export type AgeBand = '22-29' | '30-39' | '40-49' | '50-66';
export type SalaryBand = 'low' | 'mid' | 'high' | 'top';

export interface AverageFees {
  /** דמי ניהול מהפקדה (% of each monthly deposit). */
  depositFee: number;
  /** דמי ניהול מצבירה (% of total balance, annual). */
  accumulationFee: number;
}

const TABLE: Record<AgeBand, Record<SalaryBand, AverageFees>> = {
  '22-29': {
    low:  { depositFee: 2.0, accumulationFee: 0.28 },
    mid:  { depositFee: 1.8, accumulationFee: 0.22 },
    high: { depositFee: 1.5, accumulationFee: 0.18 },
    top:  { depositFee: 1.3, accumulationFee: 0.15 },
  },
  '30-39': {
    low:  { depositFee: 2.7, accumulationFee: 0.36 },
    mid:  { depositFee: 2.4, accumulationFee: 0.31 },
    high: { depositFee: 2.0, accumulationFee: 0.25 },
    top:  { depositFee: 1.7, accumulationFee: 0.20 },
  },
  '40-49': {
    low:  { depositFee: 3.2, accumulationFee: 0.45 },
    mid:  { depositFee: 2.9, accumulationFee: 0.39 },
    high: { depositFee: 2.5, accumulationFee: 0.32 },
    top:  { depositFee: 2.1, accumulationFee: 0.26 },
  },
  '50-66': {
    low:  { depositFee: 3.7, accumulationFee: 0.52 },
    mid:  { depositFee: 3.4, accumulationFee: 0.46 },
    high: { depositFee: 3.0, accumulationFee: 0.40 },
    top:  { depositFee: 2.6, accumulationFee: 0.32 },
  },
};

export function toAgeBand(age: number): AgeBand {
  if (age < 30) return '22-29';
  if (age < 40) return '30-39';
  if (age < 50) return '40-49';
  return '50-66';
}

export function toSalaryBand(monthlySalary: number): SalaryBand {
  if (monthlySalary < 8_000) return 'low';
  if (monthlySalary < 15_000) return 'mid';
  if (monthlySalary < 25_000) return 'high';
  return 'top';
}

export const AGE_BAND_LABEL: Record<AgeBand, string> = {
  '22-29': '20-29',
  '30-39': '30-39',
  '40-49': '40-49',
  '50-66': '50+',
};

export const SALARY_BAND_LABEL: Record<SalaryBand, string> = {
  low: 'עד ₪8K',
  mid: '₪8-15K',
  high: '₪15-25K',
  top: '₪25K+',
};

export function getMarketAverage(age: number, monthlySalary: number): AverageFees {
  return TABLE[toAgeBand(age)][toSalaryBand(monthlySalary)];
}
