import { z } from 'zod';

/**
 * Zod schemas for the Stock Analyst API responses.
 * Server-side validation only — the client types live in
 * `src/features/stock-analyst/types.ts` (hand-written to avoid pulling
 * zod into the mobile bundle).
 */

const SharkPoseEnum = z.enum(['talking', 'fire', 'empathic', 'happy', 'tablet', 'hello', 'dancing']);
const SharkVariantEnum = z.enum(['info', 'positive', 'warning', 'danger']);

export const SharkCommentarySchema = z.object({
  pose: SharkPoseEnum,
  variant: SharkVariantEnum.optional(),
  title: z.string().optional(),
  message: z.string(),
});

export const HorizonEnum = z.enum(['swing', 'short', 'medium', 'long']);

export const VerdictEnum = z.enum(['BUY', 'HOLD', 'SELL', 'AVOID']);

/* ── Quick ─────────────────────────────────────────────────────────── */

export const StockQuickResponseSchema = z.object({
  verdict: VerdictEnum,
  confidence: z.number().min(0).max(100),
  captainNote: z.string().min(2).max(400),
  targetNote: z.string().max(200).optional(),
  commentary: SharkCommentarySchema,
});

export type StockQuickResponse = z.infer<typeof StockQuickResponseSchema>;

/* ── Deep ──────────────────────────────────────────────────────────── */

const FundamentalSchema = z.object({
  headline: z.string(),
  revenueGrowthYoY: z.number().nullable(),
  marginTrend: z.enum(['improving', 'stable', 'declining', 'unknown']),
  cashPosition: z.string(),
  debtLoad: z.string(),
  valuation: z.object({
    peRatio: z.number().nullable(),
    pegRatio: z.number().nullable(),
    relativeNote: z.string(),
  }),
  highlights: z.array(z.string()).min(2).max(5),
  risks: z.array(z.string()).min(1).max(5),
  commentary: SharkCommentarySchema,
});

const BusinessIntelSchema = z.object({
  ownership: z.object({
    insiderPct: z.number().min(0).max(100),
    institutionalPct: z.number().min(0).max(100),
    publicPct: z.number().min(0).max(100),
    note: z.string(),
  }),
  insiderActivity: z.object({
    netDirection: z.enum(['buying', 'selling', 'neutral', 'unknown']),
    detail: z.string(),
  }),
  jobsTrend: z.array(z.object({ dept: z.string(), weight: z.number().min(0).max(100) })),
  patentActivity: z.string(),
  sentiment: z.object({
    label: z.enum(['very-positive', 'positive', 'neutral', 'negative', 'very-negative', 'unknown']),
    summary: z.string(),
  }),
  commentary: SharkCommentarySchema,
});

const ThesisSchema = z.object({
  bullCase: z.array(z.string()).min(2).max(5),
  bearCase: z.array(z.string()).min(2).max(5),
  conviction: z.number().min(1).max(10),
  convictionLabel: z.string(),
  commentary: SharkCommentarySchema,
});

const SectorMacroSchema = z.object({
  sector: z.string(),
  sectorTrend: z.enum(['tailwind', 'neutral', 'headwind']),
  peers: z.array(z.object({
    symbol: z.string(),
    name: z.string(),
    note: z.string(),
    delta: z.string(),
  })).max(5),
  macroNotes: z.array(z.string()).min(1).max(4),
  commentary: SharkCommentarySchema,
});

const CatalystSchema = z.object({
  upcoming: z.array(z.object({
    title: z.string(),
    timing: z.string(),
    impact: z.enum(['low', 'medium', 'high']),
  })).min(1).max(5),
  watchList: z.array(z.string()).max(5),
  commentary: SharkCommentarySchema,
});

const SummarySchema = z.object({
  verdict: VerdictEnum,
  ranking: z.enum(['Leader', 'Challenger', 'Laggard']),
  oneLiner: z.string(),
  scoreBreakdown: z.object({
    fundamentals: z.number().min(0).max(10),
    momentum: z.number().min(0).max(10),
    sentiment: z.number().min(0).max(10),
    moat: z.number().min(0).max(10),
  }),
  priceTargets: z.object({
    bear: z.number(),
    base: z.number(),
    bull: z.number(),
    currency: z.string().default('USD'),
  }),
  closingNote: SharkCommentarySchema,
});

export const StockDeepResponseSchema = z.object({
  ticker: z.string(),
  companyName: z.string(),
  horizon: HorizonEnum,
  fundamental: FundamentalSchema,
  businessIntel: BusinessIntelSchema,
  thesis: ThesisSchema,
  sectorMacro: SectorMacroSchema,
  catalysts: CatalystSchema,
  summary: SummarySchema,
});

export type StockDeepResponse = z.infer<typeof StockDeepResponseSchema>;
