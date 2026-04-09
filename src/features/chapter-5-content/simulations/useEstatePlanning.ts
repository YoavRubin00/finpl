/**
 * SIM 29: עץ המשפחה (Family Tree — Estate Planning) — Module 5-29
 * Hook: set up family, view no-will scenario (Israeli law), create will,
 * compare outcomes side by side.
 */

import { useState, useCallback, useMemo } from 'react';

import type {
  FamilyMember,
  Asset,
  WillDecision,
  EstateState,
  EstateOutcome,
  EstateScore,
  EstatePhase,
} from './estateTypes';
import {
  DEFAULT_FAMILY,
  DEFAULT_ASSETS,
  estateConfig,
  NO_WILL_SPOUSE_SHARE,
  NO_WILL_CHILDREN_SHARE,
  LEGAL_FEES_WITHOUT_WILL,
  LEGAL_FEES_WITH_WILL,
  PROBATE_MONTHS_WITHOUT_WILL,
  PROBATE_MONTHS_WITH_WILL,
  FROZEN_MONTHS_WITHOUT_WILL,
  FROZEN_MONTHS_WITH_WILL,
  CONFLICT_SCORE_WITHOUT_WILL,
  CONFLICT_SCORE_WITH_WILL,
} from './estateData';

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Calculate distribution under Israeli inheritance law (no will).
 * When spouse + children exist: spouse 50%, children split remaining 50% equally.
 * Insurance goes to named beneficiary (spouse by default).
 * Parents inherit only if no children exist.
 */
function computeNoWillDistribution(
  members: FamilyMember[],
  assets: Asset[],
): Record<string, number> {
  const distribution: Record<string, number> = {};
  members.forEach((m) => {
    distribution[m.id] = 0;
  });

  const spouse = members.find((m) => m.relation === 'spouse');
  const children = members.filter((m) => m.relation === 'child');
  const parents = members.filter((m) => m.relation === 'parent');

  for (const asset of assets) {
    // Insurance goes to named beneficiary (spouse if exists, else split equally)
    if (asset.type === 'insurance') {
      if (spouse) {
        distribution[spouse.id] += asset.value;
      } else if (children.length > 0) {
        const share = asset.value / children.length;
        children.forEach((c) => {
          distribution[c.id] += share;
        });
      }
      continue;
    }

    // Regular assets: Israeli inheritance law
    if (spouse && children.length > 0) {
      // Spouse gets 50%, children split 50% equally
      distribution[spouse.id] += asset.value * NO_WILL_SPOUSE_SHARE;
      const childrenTotal = asset.value * NO_WILL_CHILDREN_SHARE;
      const perChild = childrenTotal / children.length;
      children.forEach((c) => {
        distribution[c.id] += perChild;
      });
    } else if (spouse && children.length === 0) {
      // No children — spouse gets 50%, parents get 50% (or all to spouse if no parents)
      if (parents.length > 0) {
        distribution[spouse.id] += asset.value * 0.5;
        const perParent = (asset.value * 0.5) / parents.length;
        parents.forEach((p) => {
          distribution[p.id] += perParent;
        });
      } else {
        distribution[spouse.id] += asset.value;
      }
    } else if (children.length > 0) {
      // No spouse — children split equally
      const perChild = asset.value / children.length;
      children.forEach((c) => {
        distribution[c.id] += perChild;
      });
    } else if (parents.length > 0) {
      // No spouse, no children — parents split equally
      const perParent = asset.value / parents.length;
      parents.forEach((p) => {
        distribution[p.id] += perParent;
      });
    }
  }

  // Round all values
  for (const id of Object.keys(distribution)) {
    distribution[id] = Math.round(distribution[id]);
  }

  return distribution;
}

/**
 * Calculate distribution based on will decisions.
 * Each WillDecision assigns a percentage of an asset to a beneficiary.
 * Unallocated portions remain in "unassigned" (go through probate).
 */
function computeWithWillDistribution(
  members: FamilyMember[],
  assets: Asset[],
  decisions: WillDecision[],
): Record<string, number> {
  const distribution: Record<string, number> = {};
  members.forEach((m) => {
    distribution[m.id] = 0;
  });

  for (const asset of assets) {
    const assetDecisions = decisions.filter((d) => d.assetId === asset.id);
    for (const decision of assetDecisions) {
      if (distribution[decision.beneficiaryId] !== undefined) {
        distribution[decision.beneficiaryId] +=
          asset.value * (decision.percentage / 100);
      }
    }
  }

  // Round all values
  for (const id of Object.keys(distribution)) {
    distribution[id] = Math.round(distribution[id]);
  }

  return distribution;
}

// ── Initial state ──────────────────────────────────────────────────────

function createInitialState(): EstateState {
  return {
    phase: 'setup',
    familyMembers: [...DEFAULT_FAMILY],
    assets: [...DEFAULT_ASSETS],
    willDecisions: [],
    noWillOutcome: null,
    withWillOutcome: null,
    isComplete: false,
  };
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useEstatePlanning() {
  const [state, setState] = useState<EstateState>(createInitialState);

  // ── Family management ──────────────────────────────────────────────

  const toggleFamilyMember = useCallback((memberId: string) => {
    setState((prev) => {
      const exists = prev.familyMembers.some((m) => m.id === memberId);
      if (exists) {
        // Remove member + any will decisions for that member
        return {
          ...prev,
          familyMembers: prev.familyMembers.filter((m) => m.id !== memberId),
          willDecisions: prev.willDecisions.filter(
            (d) => d.beneficiaryId !== memberId,
          ),
        };
      }
      // Add member back from defaults
      const defaultMember = DEFAULT_FAMILY.find((m) => m.id === memberId);
      if (!defaultMember) return prev;
      return {
        ...prev,
        familyMembers: [...prev.familyMembers, defaultMember],
      };
    });
  }, []);

  // ── Phase transitions ──────────────────────────────────────────────

  const goToPhase = useCallback((phase: EstatePhase) => {
    setState((prev) => {
      if (phase === 'no-will-scenario') {
        // Compute no-will outcome
        const distribution = computeNoWillDistribution(
          prev.familyMembers,
          prev.assets,
        );
        const noWillOutcome: EstateOutcome = {
          distribution,
          legalFees: LEGAL_FEES_WITHOUT_WILL,
          timeToResolve: PROBATE_MONTHS_WITHOUT_WILL,
          familyConflict: CONFLICT_SCORE_WITHOUT_WILL,
          frozenMonths: FROZEN_MONTHS_WITHOUT_WILL,
        };
        return { ...prev, phase, noWillOutcome };
      }

      if (phase === 'with-will-scenario') {
        return { ...prev, phase };
      }

      if (phase === 'comparison') {
        // Compute with-will outcome
        const distribution = computeWithWillDistribution(
          prev.familyMembers,
          prev.assets,
          prev.willDecisions,
        );
        const withWillOutcome: EstateOutcome = {
          distribution,
          legalFees: LEGAL_FEES_WITH_WILL,
          timeToResolve: PROBATE_MONTHS_WITH_WILL,
          familyConflict: CONFLICT_SCORE_WITH_WILL,
          frozenMonths: FROZEN_MONTHS_WITH_WILL,
        };
        return { ...prev, phase, withWillOutcome, isComplete: true };
      }

      return { ...prev, phase };
    });
  }, []);

  // ── Will creation ──────────────────────────────────────────────────

  const setWillDecision = useCallback(
    (assetId: string, beneficiaryId: string, percentage: number) => {
      setState((prev) => {
        const clamped = Math.max(0, Math.min(100, Math.round(percentage)));

        // Get all other decisions for this asset (excluding the changed one)
        const othersForAsset = prev.willDecisions.filter(
          (d) => d.assetId === assetId && d.beneficiaryId !== beneficiaryId,
        );
        const restDecisions = prev.willDecisions.filter(
          (d) => d.assetId !== assetId,
        );

        const remaining = 100 - clamped;
        const otherTotal = othersForAsset.reduce((s, d) => s + d.percentage, 0);

        // Build adjusted others
        const adjustedOthers: WillDecision[] = [];
        if (otherTotal === 0 && othersForAsset.length > 0) {
          // All others are 0 — split remaining equally
          const each = Math.floor(remaining / othersForAsset.length);
          let leftover = remaining;
          othersForAsset.forEach((d, i) => {
            const val = i === othersForAsset.length - 1 ? leftover : each;
            adjustedOthers.push({ ...d, percentage: val });
            leftover -= val;
          });
        } else if (otherTotal > 0) {
          // Distribute proportionally
          let distributed = 0;
          othersForAsset.forEach((d, i) => {
            if (i === othersForAsset.length - 1) {
              adjustedOthers.push({ ...d, percentage: Math.max(0, remaining - distributed) });
            } else {
              const ratio = d.percentage / otherTotal;
              const val = Math.max(0, Math.round(remaining * ratio));
              adjustedOthers.push({ ...d, percentage: val });
              distributed += val;
            }
          });
        }

        const newDecisions = [
          ...restDecisions,
          ...adjustedOthers,
          ...(clamped > 0 ? [{ assetId, beneficiaryId, percentage: clamped }] : []),
        ];

        return { ...prev, willDecisions: newDecisions };
      });
    },
    [],
  );

  /**
   * Auto-generate a balanced will: each asset split equally among active members.
   */
  const autoGenerateWill = useCallback(() => {
    setState((prev) => {
      if (prev.familyMembers.length === 0) return prev;

      const decisions: WillDecision[] = [];
      const perMember = Math.floor(100 / prev.familyMembers.length);
      const remainder = 100 - perMember * prev.familyMembers.length;

      for (const asset of prev.assets) {
        prev.familyMembers.forEach((member, idx) => {
          decisions.push({
            assetId: asset.id,
            beneficiaryId: member.id,
            // Give remainder to first member
            percentage: idx === 0 ? perMember + remainder : perMember,
          });
        });
      }

      return { ...prev, willDecisions: decisions };
    });
  }, []);

  // ── Validation ─────────────────────────────────────────────────────

  /** Check if each asset is fully allocated (sums to 100%) */
  const willValidation = useMemo(() => {
    const assetAllocations: Record<string, number> = {};
    for (const asset of state.assets) {
      const assetDecisions = state.willDecisions.filter(
        (d) => d.assetId === asset.id,
      );
      assetAllocations[asset.id] = assetDecisions.reduce(
        (sum, d) => sum + d.percentage,
        0,
      );
    }
    const isFullyAllocated = state.assets.every(
      (a) => Math.abs(assetAllocations[a.id] - 100) < 0.01,
    );
    return { assetAllocations, isFullyAllocated };
  }, [state.assets, state.willDecisions]);

  // ── Score ──────────────────────────────────────────────────────────

  const score = useMemo<EstateScore | null>(() => {
    if (!state.isComplete || !state.noWillOutcome || !state.withWillOutcome) {
      return null;
    }

    const feesSaved = state.noWillOutcome.legalFees - state.withWillOutcome.legalFees;
    const timeSaved = state.noWillOutcome.timeToResolve - state.withWillOutcome.timeToResolve;

    // Grade based on how well the will was allocated
    let grade: EstateScore['grade'];
    if (willValidation.isFullyAllocated && feesSaved > 30_000) {
      grade = 'S'; // perfect will + big savings
    } else if (willValidation.isFullyAllocated) {
      grade = 'A'; // complete will
    } else {
      // Partial will — still better than nothing
      const allocatedCount = state.assets.filter(
        (a) => (willValidation.assetAllocations[a.id] ?? 0) >= 99,
      ).length;
      if (allocatedCount >= state.assets.length * 0.75) {
        grade = 'B';
      } else if (allocatedCount >= state.assets.length * 0.5) {
        grade = 'C';
      } else {
        grade = 'F';
      }
    }

    return {
      grade,
      noWillFees: state.noWillOutcome.legalFees,
      withWillFees: state.withWillOutcome.legalFees,
      noWillTime: state.noWillOutcome.timeToResolve,
      withWillTime: state.withWillOutcome.timeToResolve,
      noWillConflict: state.noWillOutcome.familyConflict,
      withWillConflict: state.withWillOutcome.familyConflict,
      feesSaved,
      timeSaved,
    };
  }, [state.isComplete, state.noWillOutcome, state.withWillOutcome, willValidation]);

  // ── Reset ──────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setState(createInitialState());
  }, []);

  return {
    state,
    config: estateConfig,
    score,
    willValidation,
    toggleFamilyMember,
    goToPhase,
    setWillDecision,
    autoGenerateWill,
    reset,
    allFamilyMembers: DEFAULT_FAMILY,
  };
}
