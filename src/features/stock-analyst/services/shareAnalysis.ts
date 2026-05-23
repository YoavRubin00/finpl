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

function formatDeep(data: StockAnalysisDeep): string {
  const { summary, thesis, fundamental } = data;
  return [
    `🦈 ניתוח מעמיק: ${data.companyName} (${data.ticker})`,
    `🎯 תובנת השארק: ${VERDICT_HE[summary.verdict]} · דירוג ${summary.ranking}`,
    `📊 קונבישן: ${thesis.conviction}/10 — ${thesis.convictionLabel}`,
    `⏱ טווח: ${HORIZON_HE[data.horizon]}`,
    '',
    `📈 ${summary.oneLiner}`,
    '',
    `💎 פונדמנטלים: ${fundamental.headline}`,
    `🎯 יעדי מחיר (חינוכי):`,
    `   תרחיש שלילי: ${summary.priceTargets.bear} ${summary.priceTargets.currency}`,
    `   בסיס: ${summary.priceTargets.base} ${summary.priceTargets.currency}`,
    `   תרחיש חיובי: ${summary.priceTargets.bull} ${summary.priceTargets.currency}`,
    '',
    summary.closingNote.message,
    '',
    DISCLAIMER,
    SIGNATURE,
  ].join('\n');
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
