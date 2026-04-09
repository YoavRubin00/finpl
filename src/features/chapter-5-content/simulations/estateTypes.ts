/**
 * SIM 29: עץ המשפחה (Family Tree — Estate Planning) — Module 5-29
 * Types for the estate planning / will simulation.
 */

export type FamilyRelation = 'spouse' | 'child' | 'parent' | 'sibling';

export type AssetType = 'property' | 'savings' | 'investments' | 'insurance';

export interface FamilyMember {
  id: string;
  name: string; // Hebrew
  relation: FamilyRelation;
  age: number;
  emoji: string;
}

export interface Asset {
  id: string;
  name: string; // Hebrew
  value: number; // ₪
  type: AssetType;
}

export interface WillDecision {
  beneficiaryId: string; // FamilyMember id
  assetId: string; // Asset id
  percentage: number; // 0–100
}

export interface EstateConfig {
  familyMembers: FamilyMember[];
  assets: Asset[];
  legalFees: { withoutWill: number; withWill: number }; // ₪ ranges represented as midpoint
  probateTime: { withoutWill: number; withWill: number }; // months
}

export interface EstateOutcome {
  distribution: Record<string, number>; // memberId → total ₪ received
  legalFees: number;
  timeToResolve: number; // months
  familyConflict: number; // 0–100 scale
  frozenMonths: number; // months assets are frozen
}

export type EstatePhase = 'setup' | 'no-will-scenario' | 'with-will-scenario' | 'comparison';

export interface EstateState {
  phase: EstatePhase;
  familyMembers: FamilyMember[];
  assets: Asset[];
  willDecisions: WillDecision[];
  noWillOutcome: EstateOutcome | null;
  withWillOutcome: EstateOutcome | null;
  isComplete: boolean;
}

export interface EstateScore {
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
  noWillFees: number;
  withWillFees: number;
  noWillTime: number; // months
  withWillTime: number; // months
  noWillConflict: number; // 0–100
  withWillConflict: number; // 0–100
  feesSaved: number; // noWillFees - withWillFees
  timeSaved: number; // noWillTime - withWillTime
}
