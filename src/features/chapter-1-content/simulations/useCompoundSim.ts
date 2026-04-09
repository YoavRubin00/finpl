import { useState, useCallback, useMemo } from 'react';
import type { CompoundSimConfig, CompoundSimState } from './compoundTypes';

/**
 * Calculates compound interest with monthly compounding.
 * FV = P(1 + r/n)^(nt) + PMT × [((1 + r/n)^(nt) - 1) / (r/n)]
 * where P = initial, PMT = monthly contribution, r = annual rate, n = 12, t = years
 */
function calcCompoundValue(
    initialAmount: number,
    monthlyContribution: number,
    years: number,
    annualRate: number,
): number {
    const monthlyRate = annualRate / 12;
    const totalMonths = years * 12;
    const growthFactor = Math.pow(1 + monthlyRate, totalMonths);

    const fvLump = initialAmount * growthFactor;
    const fvAnnuity =
        monthlyRate > 0
            ? monthlyContribution * ((growthFactor - 1) / monthlyRate)
            : monthlyContribution * totalMonths;

    return Math.round(fvLump + fvAnnuity);
}

export function useCompoundSim(config: CompoundSimConfig) {
    const [initialAmount, setInitialAmount] = useState(config.defaultInitialAmount);
    const [monthlyContribution, setMonthlyContribution] = useState(
        config.defaultMonthlyContribution,
    );
    const [years, setYears] = useState(config.minYears);

    const totalInvested = useMemo(
        () => initialAmount + monthlyContribution * 12 * years,
        [initialAmount, monthlyContribution, years],
    );

    const totalCompoundValue = useMemo(
        () =>
            calcCompoundValue(
                initialAmount,
                monthlyContribution,
                years,
                config.annualInterestRate,
            ),
        [initialAmount, monthlyContribution, years, config.annualInterestRate],
    );

    const state: CompoundSimState = useMemo(
        () => ({
            initialAmount,
            monthlyContribution,
            years,
            totalInvested,
            totalCompoundValue,
        }),
        [initialAmount, monthlyContribution, years, totalInvested, totalCompoundValue],
    );

    const updateInitialAmount = useCallback(
        (amount: number) => setInitialAmount(Math.max(0, Math.round(amount))),
        [],
    );

    const updateMonthlyContribution = useCallback(
        (amount: number) => setMonthlyContribution(Math.max(0, Math.round(amount))),
        [],
    );

    const updateYears = useCallback(
        (y: number) =>
            setYears(Math.max(config.minYears, Math.min(config.maxYears, Math.round(y)))),
        [config.minYears, config.maxYears],
    );

    const reset = useCallback(() => {
        setInitialAmount(config.defaultInitialAmount);
        setMonthlyContribution(config.defaultMonthlyContribution);
        setYears(config.minYears);
    }, [config.defaultInitialAmount, config.defaultMonthlyContribution, config.minYears]);

    return {
        state,
        updateInitialAmount,
        updateMonthlyContribution,
        updateYears,
        reset,
    };
}
