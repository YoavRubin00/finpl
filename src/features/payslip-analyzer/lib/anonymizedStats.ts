import type { PayslipResult, PayslipMetric, PayslipDeduction } from "../types";

/**
 * Aggregate, range-only fingerprint of a payslip, safe to share with a clan.
 * Stored locally in `usePayslipMetaStore.lastAnonymizedStats`. Never includes
 * absolute amounts — only buckets (₪100s ranges, %s rounded to nearest int).
 */
export interface AnonymizedStats {
  /** Gross salary bucket, e.g. "9,000-9,999". Empty when brutto unknown. */
  bruttoRangeIls: string;
  /** Pension employee contribution as a percentage of gross. */
  pensionEmployeePct: number | null;
  /** Number of credit points (nikudot zikuy) the payslip declared. */
  creditPoints: number | null;
  /** Whether a keren-hishtalmut deduction exists. */
  hasKerenHishtalmut: boolean;
  /** When the user generated this snapshot (epoch ms). */
  computedAt: number;
}

function bucketBrutto(brutto: number | null): string {
  if (brutto === null || brutto <= 0) return "";
  // Bucket size 1,000 ₪. e.g. 9,847 → "9,000-9,999"
  const lower = Math.floor(brutto / 1000) * 1000;
  const upper = lower + 999;
  return `${lower.toLocaleString("he-IL")} – ${upper.toLocaleString("he-IL")}`;
}

function findDeduction<K extends PayslipDeduction["kind"]>(
  result: PayslipResult,
  kind: K,
): PayslipDeduction | undefined {
  return result.deductions.find((d) => d.kind === kind);
}

function findMetric<K extends PayslipMetric["kind"]>(
  result: PayslipResult,
  kind: K,
): PayslipMetric | undefined {
  return result.metrics.find((m) => m.kind === kind);
}

export function buildAnonymizedStats(result: PayslipResult): AnonymizedStats {
  const pensionDeduction = findDeduction(result, "pension_employee");
  const creditMetric = findMetric(result, "credit_points");
  const hasKeren = !!findDeduction(result, "keren_hishtalmut");

  let pensionPct: number | null = null;
  if (pensionDeduction && result.brutto && result.brutto > 0) {
    pensionPct = Math.round((pensionDeduction.amount / result.brutto) * 100);
  }

  return {
    bruttoRangeIls: bucketBrutto(result.brutto),
    pensionEmployeePct: pensionPct,
    creditPoints: creditMetric ? Number(creditMetric.value) : null,
    hasKerenHishtalmut: hasKeren,
    computedAt: Date.now(),
  };
}
