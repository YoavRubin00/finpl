/**
 * SIM 29: עץ המשפחה (Family Tree, Estate Planning), Module 5-29
 * Default family, assets, legal costs, and Israeli inheritance law data.
 */

import type {
  FamilyMember,
  Asset,
  EstateConfig,
} from './estateTypes';

// ── Default Family Members ───────────────────────────────────────────

export const DEFAULT_FAMILY: FamilyMember[] = [
  {
    id: 'spouse',
    name: 'בן/בת זוג',
    relation: 'spouse',
    age: 45,
    emoji: '💑',
  },
  {
    id: 'child-1',
    name: 'ילד/ה בכור/ה',
    relation: 'child',
    age: 20,
    emoji: '👦',
  },
  {
    id: 'child-2',
    name: 'ילד/ה צעיר/ה',
    relation: 'child',
    age: 16,
    emoji: '👧',
  },
  {
    id: 'parent-1',
    name: 'הורה',
    relation: 'parent',
    age: 72,
    emoji: '👴',
  },
];

// ── Estate Assets ────────────────────────────────────────────────────

export const DEFAULT_ASSETS: Asset[] = [
  {
    id: 'apartment',
    name: 'דירה',
    value: 2_000_000,
    type: 'property',
  },
  {
    id: 'savings',
    name: 'חיסכון',
    value: 500_000,
    type: 'savings',
  },
  {
    id: 'investments',
    name: 'תיק השקעות',
    value: 300_000,
    type: 'investments',
  },
  {
    id: 'insurance',
    name: 'ביטוח חיים',
    value: 400_000,
    type: 'insurance',
  },
];

export const TOTAL_ESTATE = 3_200_000; // ₪3,200,000

// ── Israeli Inheritance Law (No Will) ────────────────────────────────
// When spouse + children exist: spouse gets 50%, children split remaining 50% equally.
// Parents inherit only if no children exist (not relevant for default family).
// Insurance payout goes to named beneficiary (spouse by default), not part of estate.

export const NO_WILL_SPOUSE_SHARE = 0.5;
export const NO_WILL_CHILDREN_SHARE = 0.5; // split equally among all children

// ── Legal Fees & Probate ─────────────────────────────────────────────

export const LEGAL_FEES_WITHOUT_WILL = 55_000; // ₪30K–80K midpoint
export const LEGAL_FEES_WITH_WILL = 15_000; // ₪8K–20K midpoint
export const PROBATE_MONTHS_WITHOUT_WILL = 13; // 8–18 months midpoint
export const PROBATE_MONTHS_WITH_WILL = 3; // 2–4 months midpoint
export const FROZEN_MONTHS_WITHOUT_WILL = 13; // property frozen during probate
export const FROZEN_MONTHS_WITH_WILL = 1; // minimal freeze with a will
export const CONFLICT_SCORE_WITHOUT_WILL = 75; // high family conflict (0–100)
export const CONFLICT_SCORE_WITH_WILL = 10; // low conflict with clear will

// ── Config ───────────────────────────────────────────────────────────

export const estateConfig: EstateConfig = {
  familyMembers: DEFAULT_FAMILY,
  assets: DEFAULT_ASSETS,
  legalFees: {
    withoutWill: LEGAL_FEES_WITHOUT_WILL,
    withWill: LEGAL_FEES_WITH_WILL,
  },
  probateTime: {
    withoutWill: PROBATE_MONTHS_WITHOUT_WILL,
    withWill: PROBATE_MONTHS_WITH_WILL,
  },
};
