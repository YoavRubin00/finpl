import type { CompoundSimConfig } from './compoundTypes';

/** S&P 500 historical average ~10% annual return */
export const compoundConfig: CompoundSimConfig = {
    defaultInitialAmount: 10_000,
    defaultMonthlyContribution: 500,
    minYears: 1,
    maxYears: 40,
    annualInterestRate: 0.10,
};
