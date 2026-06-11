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
const SIGNATURE = 'קפטן שארק · FinPlay';

function formatQuick(data: StockAnalysisQuick): string {
  const dir = data.priceChangePct >= 0 ? '+' : '';
  return [
    `ניתוח מהיר: ${data.companyName} (${data.ticker})`,
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

function bullets(items: string[]): string {
  return items.map((b) => `   • ${b}`).join('\n');
}

/**
 * Build a COMPACT share summary — not the full deep card.
 *
 * Why: the full analysis runs ~6-8KB of Hebrew text. RN's Share.share hands
 * that to the receiving app (WhatsApp/Telegram/Notes), which silently
 * truncates long text — users were getting the share cut off mid-sentence
 * in the thesis section. A tight summary (~1KB) fits under every app's limit
 * so nothing is lost. The full analysis stays available in-app.
 */
function formatDeep(data: StockAnalysisDeep): string {
  const { summary, thesis, fundamental } = data;
  const sb = summary.scoreBreakdown;
  const cy = summary.priceTargets.currency;

  const lines: Array<string | false> = [
    `ניתוח מעמיק: ${data.companyName} (${data.ticker})`,
    `🎯 ${VERDICT_HE[summary.verdict]} · דירוג ${RANKING_HE[summary.ranking]} · קונבישן ${thesis.conviction}/10`,
    `⏱ טווח: ${HORIZON_HE[data.horizon]}`,
    '',
    `📈 ${summary.oneLiner}`,
    '',
    `📊 ציוני משנה: פונדמנטלים ${sb.fundamentals.toFixed(1)} · מומנטום ${sb.momentum.toFixed(1)} · סנטימנט ${sb.sentiment.toFixed(1)} · חפיר ${sb.moat.toFixed(1)} (מתוך 10)`,
    '',
    fundamental.highlights.length > 0 ? `💪 חוזקות:\n${bullets(fundamental.highlights.slice(0, 2))}` : false,
    fundamental.risks.length > 0 ? `⚠️ סיכונים:\n${bullets(fundamental.risks.slice(0, 2))}` : false,
    '',
    `🎯 יעדי מחיר חינוכיים: 🔻${summary.priceTargets.bear} · ▫${summary.priceTargets.base} · 🔺${summary.priceTargets.bull} ${cy}`,
    '',
    DISCLAIMER,
    SIGNATURE,
  ];

  // Drop omitted (false) sections, then collapse blank-line runs.
  return lines
    .filter((l): l is string => typeof l === 'string')
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
