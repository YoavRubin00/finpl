import type { FinancialProfile, MaritalStatus, MortgageContext } from './useFinancialProfileStore';

/**
 * Helpers that read the standalone `useFinancialProfileStore` and convert
 * it into the shape each calculator's local state needs.
 *
 * Every calculator already has its own `INITIAL_STATE` with sensible demo
 * defaults (₪12k salary, etc.). These helpers preserve those defaults when
 * the relevant profile field is missing — they only override when there's
 * a real saved value, so first-time users still see meaningful defaults.
 */

// ── Inputs ────────────────────────────────────────────────────────────────

interface SalaryNetInitial {
  monthlyGross: string;
  creditPoints: number;
  status: MaritalStatus;
}

interface TaxRefundInitial {
  annualGross: string;
  monthsWorked: number;
  taxPaid: string;
  kidsCount: number;
  status: MaritalStatus;
  extraDeposits: string;
}

interface MortgageInitial {
  propertyPrice: string;
  downPayment: string;
  annualRate: number;
  years: number;
  householdIncome: string;
}

interface PensionInitial {
  age: number;
  monthlySalary: string;
  currentDepositFee: number;
  currentAccumulationFee: number;
}

// ── Builders ──────────────────────────────────────────────────────────────

export function buildSalaryNetInitial(
  profile: FinancialProfile,
  fallback: SalaryNetInitial,
): SalaryNetInitial {
  return {
    monthlyGross: profile.monthlySalaryGross
      ? String(profile.monthlySalaryGross)
      : fallback.monthlyGross,
    creditPoints: profile.creditPoints ?? fallback.creditPoints,
    status: profile.maritalStatus ?? fallback.status,
  };
}

export function buildTaxRefundInitial(
  profile: FinancialProfile,
  fallback: TaxRefundInitial,
): TaxRefundInitial {
  const annualFromMonthly = profile.monthlySalaryGross
    ? String(profile.monthlySalaryGross * 12)
    : fallback.annualGross;
  const taxFromMonthly = profile.monthlyTaxPaid
    ? String(profile.monthlyTaxPaid * 12)
    : fallback.taxPaid;
  return {
    annualGross: annualFromMonthly,
    monthsWorked: profile.monthsWorkedThisYear ?? fallback.monthsWorked,
    taxPaid: taxFromMonthly,
    kidsCount: profile.kidsCount ?? fallback.kidsCount,
    status: profile.maritalStatus ?? fallback.status,
    extraDeposits: fallback.extraDeposits,
  };
}

export function buildMortgageInitial(
  profile: FinancialProfile,
  fallback: MortgageInitial,
): MortgageInitial {
  const ctx: MortgageContext | undefined = profile.mortgageContext;
  return {
    propertyPrice: ctx?.propertyPrice ? String(ctx.propertyPrice) : fallback.propertyPrice,
    downPayment: ctx?.downPayment ? String(ctx.downPayment) : fallback.downPayment,
    annualRate: ctx?.annualRate ?? fallback.annualRate,
    years: ctx?.years ?? fallback.years,
    householdIncome: profile.householdMonthlyIncome
      ? String(profile.householdMonthlyIncome)
      : ctx?.householdIncome
        ? String(ctx.householdIncome)
        : fallback.householdIncome,
  };
}

export function buildPensionInitial(
  profile: FinancialProfile,
  fallback: PensionInitial,
): PensionInitial {
  return {
    age: fallback.age, // age comes from birthYear; tool keeps own slider
    monthlySalary: profile.monthlySalaryGross
      ? String(profile.monthlySalaryGross)
      : fallback.monthlySalary,
    currentDepositFee: profile.currentPensionDepositFee ?? fallback.currentDepositFee,
    currentAccumulationFee:
      profile.currentPensionAccumulationFee ?? fallback.currentAccumulationFee,
  };
}

// ── UI helpers ────────────────────────────────────────────────────────────

/** Returns a short Hebrew "עודכן לפני N ימים" string from the saved epoch.
 *  Returns null if the timestamp is missing — caller decides what to render. */
export function describeProfileFreshness(updatedAtMs: number | undefined): string | null {
  if (!updatedAtMs) return null;
  const days = Math.floor((Date.now() - updatedAtMs) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'עודכן היום';
  if (days === 1) return 'עודכן אתמול';
  if (days < 7) return `עודכן לפני ${days} ימים`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? 'עודכן לפני שבוע' : `עודכן לפני ${weeks} שבועות`;
  }
  const months = Math.floor(days / 30);
  return months === 1 ? 'עודכן לפני חודש' : `עודכן לפני ${months} חודשים`;
}
