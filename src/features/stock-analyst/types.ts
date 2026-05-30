/**
 * Type definitions for the Stock Analyst feature.
 *
 * The schemas are intentionally hand-written to match
 * `C:\Users\yrubi\OneDrive\Desktop\.claude\projects\PORTFOLIO\lib\ai\schemas\stock.ts`
 * but without the Zod runtime dependency on the client side. The server
 * routes (`api/ai/stock-analyze-*.ts`) own the Zod validation; here we
 * just consume the validated JSON.
 */

/* ────────────────────────────────────────────────────────────────────── */
/* Captain Shark commentary blocks — used inline throughout the analysis  */
/* ────────────────────────────────────────────────────────────────────── */

export type SharkPose =
  | 'talking'
  | 'fire'
  | 'empathic'
  | 'happy'
  | 'tablet'
  | 'hello'
  | 'dancing';

export type SharkVariant = 'info' | 'positive' | 'warning' | 'danger';

export interface SharkCommentary {
  pose: SharkPose;
  variant?: SharkVariant;
  title?: string;
  message: string;
}

/* ────────────────────────────────────────────────────────────────────── */
/* Stock analysis — Deep mode (Claude Opus 4.7 + extended thinking)       */
/* ────────────────────────────────────────────────────────────────────── */

export type StockHorizon = 'swing' | 'short' | 'medium' | 'long';

export type StockVerdict = 'BUY' | 'HOLD' | 'SELL' | 'AVOID';

export type StockRanking = 'Leader' | 'Challenger' | 'Laggard';

export interface FundamentalAnalysis {
  headline: string;
  revenueGrowthYoY: number | null;
  marginTrend: 'improving' | 'stable' | 'declining' | 'unknown';
  cashPosition: string;
  debtLoad: string;
  valuation: {
    peRatio: number | null;
    pegRatio: number | null;
    relativeNote: string;
  };
  highlights: string[];
  risks: string[];
  commentary: SharkCommentary;
}

export interface BusinessIntelAnalysis {
  ownership: {
    insiderPct: number;
    institutionalPct: number;
    publicPct: number;
    note: string;
  };
  insiderActivity: {
    netDirection: 'buying' | 'selling' | 'neutral' | 'unknown';
    detail: string;
  };
  jobsTrend: Array<{ dept: string; weight: number }>;
  patentActivity: string;
  sentiment: {
    label: 'very-positive' | 'positive' | 'neutral' | 'negative' | 'very-negative' | 'unknown';
    summary: string;
  };
  commentary: SharkCommentary;
}

export interface ThesisAnalysis {
  bullCase: string[];
  bearCase: string[];
  conviction: number; // 1-10
  convictionLabel: string;
  commentary: SharkCommentary;
}

export interface SectorMacroAnalysis {
  sector: string;
  sectorTrend: 'tailwind' | 'neutral' | 'headwind';
  peers: Array<{
    symbol: string;
    name: string;
    note: string;
    delta: string;
  }>;
  macroNotes: string[];
  commentary: SharkCommentary;
}

export interface CatalystAnalysis {
  upcoming: Array<{
    title: string;
    timing: string;
    impact: 'low' | 'medium' | 'high';
  }>;
  watchList: string[];
  commentary: SharkCommentary;
}

export interface StockSummary {
  verdict: StockVerdict;
  ranking: StockRanking;
  oneLiner: string;
  scoreBreakdown: {
    fundamentals: number;
    momentum: number;
    sentiment: number;
    moat: number;
  };
  priceTargets: {
    bear: number;
    base: number;
    bull: number;
    currency: string;
  };
  closingNote: SharkCommentary;
}

export interface StockAnalysisDeep {
  ticker: string;
  companyName: string;
  horizon: StockHorizon;
  fundamental: FundamentalAnalysis;
  businessIntel: BusinessIntelAnalysis;
  thesis: ThesisAnalysis;
  sectorMacro: SectorMacroAnalysis;
  catalysts: CatalystAnalysis;
  summary: StockSummary;
}

/* ────────────────────────────────────────────────────────────────────── */
/* Stock analysis — Quick mode (Gemini 2.5 Flash)                         */
/* ────────────────────────────────────────────────────────────────────── */

export interface StockAnalysisQuick {
  ticker: string;
  companyName: string;
  exchange: string; // e.g. "NASDAQ", "NYSE"
  horizon: StockHorizon;
  /** Current quote — supplied by the backend from marketApiService */
  price: number;
  priceChangePct: number;
  currency: string;
  /** Sparkline points (timestamp + price) — 30 datapoints */
  spark: Array<{ t: number; p: number }>;
  /** Educational verdict label — rendered as "תובנת השארק" */
  verdict: StockVerdict;
  /** 0-100 confidence */
  confidence: number;
  /** 1-2 sentence captain analysis in Hebrew */
  captainNote: string;
  /** Optional target price commentary */
  targetNote?: string;
  /** Inline shark commentary for the card */
  commentary: SharkCommentary;
}

/* ────────────────────────────────────────────────────────────────────── */
/* Portfolio context (computed from useTradingStore positions)            */
/* ────────────────────────────────────────────────────────────────────── */

export interface PortfolioContextSnapshot {
  totalValue: number;
  todayChangePct: number;
  bestPerformer: { ticker: string; changePct: number } | null;
  worstPerformer: { ticker: string; changePct: number } | null;
  sectorConcentrationWarning: string | null;
}

/* ────────────────────────────────────────────────────────────────────── */
/* Captain warning + missed opportunity cards                             */
/* ────────────────────────────────────────────────────────────────────── */

export interface MissedOpportunity {
  ticker: string;
  headline: string;
  detail: string;
}

export interface CaptainWarning {
  title: string;
  detail: string;
}

/* ────────────────────────────────────────────────────────────────────── */
/* AnalystMessage union — what flows through the chat-like feed           */
/* ────────────────────────────────────────────────────────────────────── */

export type AnalystMode = 'quick' | 'deep';

export type AnalystMessage =
  | { id: string; kind: 'user-query'; text: string; ts: number }
  | { id: string; kind: 'captain-text'; text: string; pose?: SharkPose; ts: number }
  | { id: string; kind: 'quick-card'; data: StockAnalysisQuick; ts: number }
  | { id: string; kind: 'deep-card'; data: StockAnalysisDeep; ts: number }
  | { id: string; kind: 'portfolio-context'; data: PortfolioContextSnapshot; ts: number }
  | { id: string; kind: 'missed-opportunity'; data: MissedOpportunity; ts: number }
  | { id: string; kind: 'captain-warning'; data: CaptainWarning; ts: number }
  | { id: string; kind: 'error'; text: string; ts: number }
  | { id: string; kind: 'loading'; mode: AnalystMode; ticker: string; ts: number }
  | { id: string; kind: 'followup-question'; text: string; ts: number }
  | { id: string; kind: 'followup-answer'; text: string; ts: number }
  | { id: string; kind: 'followup-loading'; ts: number };

export interface FollowupTurn {
  role: 'user' | 'shark';
  text: string;
}
