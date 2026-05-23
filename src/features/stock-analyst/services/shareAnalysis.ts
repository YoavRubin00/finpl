import { Share, Platform } from 'react-native';
import type { StockAnalysisDeep, StockAnalysisQuick, StockVerdict } from '../types';

const VERDICT_HE: Record<StockVerdict, string> = {
  BUY: 'נטייה חיובית',
  HOLD: 'המתנה',
  SELL: 'נטייה שלילית',
  AVOID: 'דגל אדום',
};

const HORIZON_HE = {
  swing: 'סווינג',
  short: 'קצר',
  medium: 'בינוני',
  long: 'ארוך',
} as const;

const DISCLAIMER = '⚠️ תוכן חינוכי בלבד · אינו ייעוץ השקעות · ביצועי עבר אינם מנבאים את העתיד.';
const SIGNATURE = '🦈 קפטן שארק · FinPlay';

function formatQuick(data: StockAnalysisQuick): string {
  const dir = data.priceChangePct >= 0 ? '+' : '';
  return [
    `🦈 ניתוח מהיר: ${data.companyName} (${data.ticker})`,
    `💰 מחיר: $${data.price.toFixed(2)} (${dir}${data.priceChangePct.toFixed(2)}%)`,
    `🎯 תובנת השארק: ${VERDICT_HE[data.verdict]} · רמת ביטחון ${data.confidence}%`,
    `⏱ טווח: ${HORIZON_HE[data.horizon]}`,
    '',
    data.captainNote,
    data.targetNote ? `\n${data.targetNote}` : '',
    '',
    DISCLAIMER,
    SIGNATURE,
  ].filter(Boolean).join('\n');
}

const RANKING_HE = {
  Leader: 'מוביל',
  Challenger: 'מתחרה',
  Laggard: 'מאחור',
} as const;

const SECTOR_TREND_HE = {
  tailwind: 'רוח גבית',
  neutral: 'ניטרלי',
  headwind: 'רוח נגדית',
} as const;

const MARGIN_TREND_HE = {
  improving: 'בשיפור',
  stable: 'יציבים',
  declining: 'בדעיכה',
  unknown: 'לא ידוע',
} as const;

const SENTIMENT_HE = {
  'very-positive': 'חיובי מאוד',
  positive: 'חיובי',
  neutral: 'ניטרלי',
  negative: 'שלילי',
  'very-negative': 'שלילי מאוד',
  unknown: 'לא ידוע',
} as const;

const INSIDER_HE = {
  buying: 'קונים',
  selling: 'מוכרים',
  neutral: 'ניטרליים',
  unknown: 'לא ידוע',
} as const;

const IMPACT_HE = { low: 'נמוך', medium: 'בינוני', high: 'גבוה' } as const;

function bullets(items: string[]): string {
  return items.map((b) => `   • ${b}`).join('\n');
}

function formatDeep(data: StockAnalysisDeep): string {
  const { summary, thesis, fundamental, businessIntel, sectorMacro, catalysts } = data;
  const sb = summary.scoreBreakdown;
  const cy = summary.priceTargets.currency;
  const valuation = fundamental.valuation;

  const lines: string[] = [
    `🦈 ניתוח מעמיק: ${data.companyName} (${data.ticker})`,
    `🎯 תובנת השארק: ${VERDICT_HE[summary.verdict]} · דירוג ${RANKING_HE[summary.ranking]}`,
    `📊 קונבישן: ${thesis.conviction}/10 — ${thesis.convictionLabel}`,
    `⏱ טווח: ${HORIZON_HE[data.horizon]}`,
    '',
    `📈 ${summary.oneLiner}`,
    '',
    `📊 ציוני משנה:`,
    `   פונדמנטלים ${sb.fundamentals.toFixed(1)} · מומנטום ${sb.momentum.toFixed(1)} · סנטימנט ${sb.sentiment.toFixed(1)} · חפיר ${sb.moat.toFixed(1)} (מתוך 10)`,
    '',
    '────── פונדמנטלים ──────',
    fundamental.headline,
    `• צמיחת הכנסות: ${fundamental.revenueGrowthYoY !== null ? fundamental.revenueGrowthYoY.toFixed(1) + '%' : 'לא ידוע'}`,
    `• מרווחים: ${MARGIN_TREND_HE[fundamental.marginTrend]}`,
    `• מזומן: ${fundamental.cashPosition}`,
    `• חוב: ${fundamental.debtLoad}`,
    `• מכפיל רווח (P/E): ${valuation.peRatio !== null ? valuation.peRatio.toFixed(1) : 'לא ידוע'} · PEG: ${valuation.pegRatio !== null ? valuation.pegRatio.toFixed(2) : 'לא ידוע'}`,
    `   ${valuation.relativeNote}`,
    '',
    `💪 נקודות חוזק:`,
    bullets(fundamental.highlights),
    '',
    `⚠️ סיכונים:`,
    bullets(fundamental.risks),
    fundamental.commentary?.message ? `\n🦈 ${fundamental.commentary.message}` : '',
    '',
    '────── עומק עסקי ──────',
    `בעלות: פנימיים ${businessIntel.ownership.insiderPct.toFixed(0)}% · מוסדיים ${businessIntel.ownership.institutionalPct.toFixed(0)}% · ציבור ${businessIntel.ownership.publicPct.toFixed(0)}%`,
    `   ${businessIntel.ownership.note}`,
    `פעילות פנים: ${INSIDER_HE[businessIntel.insiderActivity.netDirection]} — ${businessIntel.insiderActivity.detail}`,
    `פטנטים: ${businessIntel.patentActivity}`,
    `סנטימנט: ${SENTIMENT_HE[businessIntel.sentiment.label]} — ${businessIntel.sentiment.summary}`,
    businessIntel.commentary?.message ? `\n🦈 ${businessIntel.commentary.message}` : '',
    '',
    '────── התזה — שני הצדדים ──────',
    `🐂 בולית:`,
    bullets(thesis.bullCase),
    '',
    `🐻 דובית:`,
    bullets(thesis.bearCase),
    thesis.commentary?.message ? `\n🦈 ${thesis.commentary.message}` : '',
    '',
    '────── סקטור ומאקרו ──────',
    `${sectorMacro.sector} · ${SECTOR_TREND_HE[sectorMacro.sectorTrend]}`,
    sectorMacro.peers.length > 0
      ? `מתחרים: ${sectorMacro.peers.map((p) => `${p.symbol} (${p.delta})`).join(', ')}`
      : '',
    sectorMacro.macroNotes.length > 0 ? `סביבה:\n${bullets(sectorMacro.macroNotes)}` : '',
    sectorMacro.commentary?.message ? `\n🦈 ${sectorMacro.commentary.message}` : '',
    '',
    '────── קטליסטים קרובים ──────',
    catalysts.upcoming
      .map((c) => `• ${c.title} (${c.timing}) — השפעה ${IMPACT_HE[c.impact]}`)
      .join('\n'),
    catalysts.watchList.length > 0 ? `\nשווה לעקוב:\n${bullets(catalysts.watchList)}` : '',
    catalysts.commentary?.message ? `\n🦈 ${catalysts.commentary.message}` : '',
    '',
    '────── יעדי מחיר חינוכיים ──────',
    `🔻 תרחיש שלילי: ${summary.priceTargets.bear} ${cy}`,
    `▫ בסיס: ${summary.priceTargets.base} ${cy}`,
    `🔺 תרחיש חיובי: ${summary.priceTargets.bull} ${cy}`,
    '',
    summary.closingNote.message,
    '',
    DISCLAIMER,
    SIGNATURE,
  ];

  // Strip blank duplicate lines / leading-trailing whitespace
  return lines.filter((l) => l !== undefined).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Open the OS share sheet with a Hebrew-formatted summary of the analysis.
 * Works on iOS, Android, and Web (via navigator.share when available).
 */
export async function shareQuickAnalysis(data: StockAnalysisQuick): Promise<void> {
  const message = formatQuick(data);
  await shareText(message, `קפטן שארק על ${data.ticker}`);
}

export async function shareDeepAnalysis(data: StockAnalysisDeep): Promise<void> {
  const message = formatDeep(data);
  await shareText(message, `ניתוח מעמיק של ${data.ticker}`);
}

async function shareText(message: string, title: string): Promise<void> {
  if (Platform.OS === 'web') {
    // Web Share API
    const nav = (globalThis as { navigator?: { share?: (data: { title?: string; text?: string }) => Promise<void>; clipboard?: { writeText?: (s: string) => Promise<void> } } }).navigator;
    if (nav?.share) {
      try {
        await nav.share({ title, text: message });
        return;
      } catch {
        // user cancelled or browser blocked — fall through to clipboard
      }
    }
    if (nav?.clipboard?.writeText) {
      try {
        await nav.clipboard.writeText(message);
        return;
      } catch {
        // fall through
      }
    }
    return;
  }
  try {
    await Share.share({ title, message }, { dialogTitle: title });
  } catch {
    // user cancelled
  }
}
