/** Track data for the "Tax Grinder" simulation (Module 2-13) */

import { InvestmentTrack, TaxGrinderConfig } from './taxGrinderTypes';

const MONTHLY_DEPOSIT = 500;
const ANNUAL_RETURN = 0.07;
const REGULAR_TAX_RATE = 0.25;
const EMPLOYER_BONUS_MONTHLY = 600;
const MIN_YEARS = 6;
const MAX_YEARS = 20;
const DEFAULT_YEARS = 10;

/**
 * Pre-compute year-by-year data for an investment track.
 * Compounds monthly. For regular: 25% tax on gains at withdrawal.
 * For hishtalmut: 0% tax after 6 years.
 * Both tracks use the same monthly deposit for apples-to-apples tax comparison.
 */
function computeTrackData(
  monthlyDeposit: number,
  annualReturn: number,
  taxRate: number,
  maxYears: number,
): { deposits: number[]; gains: number[]; taxPaid: number[] } {
  const monthlyReturn = annualReturn / 12;
  const deposits: number[] = [];
  const gains: number[] = [];
  const taxPaid: number[] = [];
  let balance = 0;

  for (let year = 1; year <= maxYears; year++) {
    for (let month = 0; month < 12; month++) {
      balance += monthlyDeposit;
      balance *= 1 + monthlyReturn;
    }
    const totalDeposited = monthlyDeposit * 12 * year;
    const totalGains = balance - totalDeposited;
    const tax = Math.round(totalGains * taxRate);

    deposits.push(Math.round(totalDeposited));
    gains.push(Math.round(totalGains));
    taxPaid.push(tax);
  }

  return { deposits, gains, taxPaid };
}

/** Regular investment: ₪500/mo, 25% tax on gains */
const regularData = computeTrackData(MONTHLY_DEPOSIT, ANNUAL_RETURN, REGULAR_TAX_RATE, MAX_YEARS);

const regularTrack: InvestmentTrack = {
  type: 'regular',
  name: 'השקעה רגילה',
  emoji: '📊',
  monthlyDeposit: MONTHLY_DEPOSIT,
  employerBonus: 0,
  deposits: regularData.deposits,
  gains: regularData.gains,
  taxPaid: regularData.taxPaid,
  netBalance: 0,
  color: '#EF4444',
};

/** Hishtalmut fund: same ₪500/mo, 0% tax — apples-to-apples comparison */
const hishtalmutData = computeTrackData(MONTHLY_DEPOSIT, ANNUAL_RETURN, 0, MAX_YEARS);

const hishtalmutTrack: InvestmentTrack = {
  type: 'hishtalmut',
  name: 'קרן השתלמות',
  emoji: '🛡️',
  monthlyDeposit: MONTHLY_DEPOSIT,
  employerBonus: EMPLOYER_BONUS_MONTHLY,
  deposits: hishtalmutData.deposits,
  gains: hishtalmutData.gains,
  taxPaid: hishtalmutData.taxPaid,
  netBalance: 0,
  color: '#3B82F6',
};

export const taxGrinderConfig: TaxGrinderConfig = {
  minYears: MIN_YEARS,
  maxYears: MAX_YEARS,
  defaultYears: DEFAULT_YEARS,
  annualReturn: ANNUAL_RETURN,
  regularTaxRate: REGULAR_TAX_RATE,
  tracks: [regularTrack, hishtalmutTrack],
};
