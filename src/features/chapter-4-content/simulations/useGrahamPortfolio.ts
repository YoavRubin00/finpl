/**
 * SIM: בנה תיק לפי גראהם (Graham Portfolio Builder)
 * Zustand store: allocate budget across 10 stocks, score by Graham's 7 criteria.
 */

import { create } from 'zustand';
import type {
  PortfolioAllocation,
  GrahamGrade,
  GrahamResult,
} from './grahamPortfolioTypes';
import { GRAHAM_STOCKS } from './grahamPortfolioData';

// ── Graham criteria helpers ─────────────────────────────────────────────

interface CriteriaResult {
  passed: number;
  total: number;
}

function evaluateGrahamCriteria(stockId: string): CriteriaResult {
  const stock = GRAHAM_STOCKS.find((s) => s.id === stockId);
  if (!stock) return { passed: 0, total: 7 };

  let passed = 0;
  const total = 7;

  // 1. Adequate size: market cap > 1B
  if (stock.marketCapBillion > 1) passed++;
  // 2. Strong financial condition: current ratio > 2
  if (stock.currentRatio > 2) passed++;
  // 3. Earnings stability: 10+ years of positive profits
  if (stock.yearsOfProfits >= 10) passed++;
  // 4. Dividend record: 20+ years of dividends
  if (stock.dividendYears >= 20) passed++;
  // 5. Earnings growth: > 33% over 10yr (use 5yr proxy)
  if (stock.earningsGrowth5y > 33) passed++;
  // 6. Moderate P/E: < 15
  if (stock.pe > 0 && stock.pe < 15) passed++;
  // 7. Moderate P/E x P/B: < 22.5
  if (stock.pe > 0 && stock.pe * stock.pb < 22.5) passed++;

  return { passed, total };
}

function isSpeculative(stockId: string): boolean {
  const stock = GRAHAM_STOCKS.find((s) => s.id === stockId);
  if (!stock) return true;
  return stock.pe > 50 || stock.pe === 0 || stock.yearsOfProfits < 3;
}

// ── Scoring ─────────────────────────────────────────────────────────────

function calculateGrahamResult(allocations: PortfolioAllocation[]): GrahamResult {
  const active = allocations.filter((a) => a.percent > 0);
  if (active.length === 0) {
    return {
      totalScore: 0,
      grade: 'F',
      diversificationScore: 0,
      valueScore: 0,
      safetyScore: 0,
      feedback: 'לא הקצית תקציב לאף מניה.',
    };
  }

  // ── Value score (0-40): weighted average of Graham criteria pass rate ──
  let weightedCriteria = 0;
  for (const alloc of active) {
    const { passed, total } = evaluateGrahamCriteria(alloc.stockId);
    weightedCriteria += (passed / total) * (alloc.percent / 100);
  }
  const valueScore = Math.round(weightedCriteria * 40);

  // ── Safety score (0-40): penalise speculative stocks ──────────────────
  let speculativePercent = 0;
  for (const alloc of active) {
    if (isSpeculative(alloc.stockId)) {
      speculativePercent += alloc.percent;
    }
  }
  let safetyScore = 40;
  if (speculativePercent > 25) {
    // Heavy penalty: lose 1.5 points per % over 25
    safetyScore = Math.max(0, Math.round(40 - (speculativePercent - 25) * 1.5));
  } else if (speculativePercent > 10) {
    // Moderate penalty
    safetyScore = Math.max(10, Math.round(40 - (speculativePercent - 10) * 0.8));
  }

  // ── Diversification score (0-20) ─────────────────────────────────────
  const numStocks = active.length;
  let diversificationScore = 0;
  if (numStocks >= 6) {
    diversificationScore = 20;
  } else if (numStocks >= 4) {
    diversificationScore = 15;
  } else if (numStocks >= 3) {
    diversificationScore = 10;
  } else if (numStocks >= 2) {
    diversificationScore = 5;
  }

  // Bonus for no single stock > 30%
  const maxSingle = Math.max(...active.map((a) => a.percent));
  if (maxSingle <= 30 && numStocks >= 4) {
    diversificationScore = Math.min(20, diversificationScore + 5);
  }

  const totalScore = Math.min(100, valueScore + safetyScore + diversificationScore);

  // ── Grade ─────────────────────────────────────────────────────────────
  let grade: GrahamGrade;
  if (totalScore >= 90) grade = 'S';
  else if (totalScore >= 75) grade = 'A';
  else if (totalScore >= 55) grade = 'B';
  else if (totalScore >= 35) grade = 'C';
  else grade = 'F';

  // ── Feedback ──────────────────────────────────────────────────────────
  let feedback: string;
  if (grade === 'S') {
    feedback = 'בנג\'מין גראהם היה גאה! תיק ערך מפוזר עם שולי ביטחון מצוינים.';
  } else if (grade === 'A') {
    feedback = 'תיק חזק עם דגש על ערך. גראהם היה מאשר את רוב הבחירות שלך.';
  } else if (grade === 'B') {
    feedback = 'תיק סביר, אבל יש מקום לשיפור בבחירת מניות ערך ובפיזור.';
  } else if (grade === 'C') {
    feedback = 'התיק שלך מכיל יותר מדי ספקולציה. גראהם היה ממליץ על שולי ביטחון גבוהים יותר.';
  } else {
    feedback = 'תיק ספקולטיבי מדי. גראהם מזכיר: "מרווח ביטחון" הוא המפתח להשקעה חכמה.';
  }

  return {
    totalScore,
    grade,
    diversificationScore,
    valueScore,
    safetyScore,
    feedback,
  };
}

// ── Zustand store ───────────────────────────────────────────────────────

interface GrahamPortfolioState {
  allocations: PortfolioAllocation[];
  isComplete: boolean;
  result: GrahamResult | null;

  setAllocation: (stockId: string, percent: number) => void;
  submit: () => void;
  reset: () => void;

  /** Computed: total allocated percentage. */
  totalAllocated: () => number;
}

function createInitialAllocations(): PortfolioAllocation[] {
  return GRAHAM_STOCKS.map((s) => ({ stockId: s.id, percent: 0 }));
}

export const useGrahamPortfolio = create<GrahamPortfolioState>((set, get) => ({
  allocations: createInitialAllocations(),
  isComplete: false,
  result: null,

  setAllocation: (stockId: string, percent: number) => {
    set((state) => {
      const clamped = Math.max(0, Math.min(40, Math.round(percent)));
      // Check total won't exceed 100%
      const othersTotal = state.allocations
        .filter((a) => a.stockId !== stockId)
        .reduce((sum, a) => sum + a.percent, 0);
      const maxAllowed = Math.max(0, 100 - othersTotal);
      const finalPercent = Math.min(clamped, maxAllowed);
      const updated = state.allocations.map((a) =>
        a.stockId === stockId ? { ...a, percent: finalPercent } : a,
      );
      return { allocations: updated };
    });
  },

  submit: () => {
    const { allocations } = get();
    const result = calculateGrahamResult(allocations);
    set({ isComplete: true, result });
  },

  reset: () => {
    set({
      allocations: createInitialAllocations(),
      isComplete: false,
      result: null,
    });
  },

  totalAllocated: () => {
    const { allocations } = get();
    return allocations.reduce((sum, a) => sum + a.percent, 0);
  },
}));
