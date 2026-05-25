/** Runner data for the "Retirement Race" simulation (Module 2-12) */

import { Runner, RetirementRaceConfig } from './retirementRaceTypes';

/**
 * נטע, starts early at 22, lower deposit
 * Employee: ₪500/mo (6%), Employer: ₪650/mo (6.5%) on ₪10K salary.
 * (Severance contribution of additional 6% omitted for simplicity — only
 * the 6.5% pension portion grows in the fund here.)
 */
const netaRunner: Runner = {
  name: 'נטע',
  emoji: '👩',
  startAge: 22,
  monthlyDeposit: 500,
  employerMatch: 650,
  currentBalance: 0,
  color: '#10B981', // emerald-green
  yearData: [],
};

/**
 * אורי, starts late at 35, higher deposit
 * Employee: ₪1,200/mo (6%), Employer: ₪1,300/mo (6.5%) on ₪20K salary.
 */
const oriRunner: Runner = {
  name: 'אורי',
  emoji: '👨',
  startAge: 35,
  monthlyDeposit: 1_200,
  employerMatch: 1_300,
  currentBalance: 0,
  color: '#3B82F6', // sapphire-blue
  yearData: [],
};

/**
 * Pre-compute year-by-year cumulative balances for a runner.
 * Compounds monthly: each month adds (deposit + employer), then applies monthly return.
 */
function computeYearData(
  runner: Runner,
  retirementAge: number,
  annualReturn: number,
): number[] {
  const monthlyReturn = annualReturn / 12;
  const totalMonthlyContribution = runner.monthlyDeposit + runner.employerMatch;
  const years = retirementAge - runner.startAge;
  const yearData: number[] = [];
  let balance = 0;

  for (let year = 1; year <= years; year++) {
    for (let month = 0; month < 12; month++) {
      balance += totalMonthlyContribution;
      balance *= 1 + monthlyReturn;
    }
    yearData.push(Math.round(balance));
  }

  return yearData;
}

const RETIREMENT_AGE = 67;
const ANNUAL_RETURN = 0.05;

const netaWithData: Runner = {
  ...netaRunner,
  yearData: computeYearData(netaRunner, RETIREMENT_AGE, ANNUAL_RETURN),
};

const oriWithData: Runner = {
  ...oriRunner,
  yearData: computeYearData(oriRunner, RETIREMENT_AGE, ANNUAL_RETURN),
};

export const retirementRaceConfig: RetirementRaceConfig = {
  retirementAge: RETIREMENT_AGE,
  annualReturn: ANNUAL_RETURN,
  runners: [netaWithData, oriWithData],
};
