import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';

/**
 * Standalone financial profile. Deliberately decoupled from `useAuthStore`
 * and the onboarding flow — the onboarding profile is about *who the user
 * is* and *how they learn*; this is about *their money*. Mixing them
 * pollutes onboarding and forces every signup to think about salary/tax.
 *
 * Source of truth: this store. Local-only persistence (Zustand persist via
 * AsyncStorage on phone / MMKV on web). No Neon sync — the user is the
 * only one who edits this and it never leaves the device.
 *
 * Populated by: (1) the user, via the "בנה פרופיל פיננסי" CTA on the
 * Financial Tools hub, and (2) the Payslip Analyzer when it extracts
 * brutto/tax/credit-points with high confidence.
 *
 * Consumed by: every financial calculator (Salary Net, Tax Refund,
 * Mortgage, Pension Fees) to pre-fill its inputs, and by the
 * ProfileFingerprint banner that shows "עודכן לפני N ימים" at the top
 * of each tool.
 */

export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';

/** Optional household + mortgage context — separate sub-object so the
 *  mortgage calculator can read/write it atomically without touching the
 *  rest of the profile. */
export interface MortgageContext {
  propertyPrice?: number;
  downPayment?: number;
  annualRate?: number;
  years?: number;
  householdIncome?: number;
}

export interface FinancialProfile {
  monthlySalaryGross?: number;
  monthlyTaxPaid?: number;
  creditPoints?: number;
  maritalStatus?: MaritalStatus;
  kidsCount?: number;
  monthsWorkedThisYear?: number;
  householdMonthlyIncome?: number;
  currentPensionDepositFee?: number;
  currentPensionAccumulationFee?: number;
  mortgageContext?: MortgageContext;
  /** ms epoch of the last write — drives the "עודכן לפני X" UI. */
  updatedAt?: number;
}

interface FinancialProfileState {
  profile: FinancialProfile;
  /** Shallow-merge patch into the stored profile. Always stamps `updatedAt`
   *  so the freshness banner stays accurate without callers having to set
   *  it manually. */
  update: (patch: Partial<FinancialProfile>) => void;
  /** Wipe the profile back to empty — used by the "מחק נתונים" button on
   *  the editor screen. */
  reset: () => void;
}

const INITIAL: FinancialProfile = {};

export const useFinancialProfileStore = create<FinancialProfileState>()(
  persist(
    (set) => ({
      profile: INITIAL,
      update: (patch) =>
        set((state) => ({
          profile: { ...state.profile, ...patch, updatedAt: Date.now() },
        })),
      reset: () => set({ profile: INITIAL }),
    }),
    {
      name: 'financial-profile-v1',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ profile: s.profile }),
    },
  ),
);

/** True if any financial field has ever been saved. Used to decide whether
 *  the ProfileFingerprint banner renders the "מבוסס על הנתונים שלך" copy
 *  or the "השלם את הפרופיל" copy. */
export function hasAnyFinancialData(profile: FinancialProfile): boolean {
  return (
    profile.monthlySalaryGross !== undefined ||
    profile.monthlyTaxPaid !== undefined ||
    profile.creditPoints !== undefined ||
    profile.maritalStatus !== undefined ||
    profile.kidsCount !== undefined ||
    profile.monthsWorkedThisYear !== undefined ||
    profile.householdMonthlyIncome !== undefined ||
    profile.currentPensionDepositFee !== undefined ||
    profile.currentPensionAccumulationFee !== undefined ||
    profile.mortgageContext !== undefined
  );
}
