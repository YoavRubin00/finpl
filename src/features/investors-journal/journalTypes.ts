export type JournalCountry = 'us' | 'il';
export type JournalKind = 'earnings' | 'rate' | 'cpi' | 'jobs' | 'other';

/** One REAL macro event in the month's Investors Journal. Rows are curated and
 *  Waren-verified server-side (investor_journal_events) — never fabricated. */
export interface JournalEvent {
  id: string;
  /** YYYY-MM-DD */
  eventDate: string;
  country: JournalCountry;
  kind: JournalKind;
  emoji: string;
  title: string;
  teaser: string;
  /** 🤔 מה זה בכלל — plain-Hebrew, zero prior knowledge assumed. */
  explainWhat: string;
  /** 💡 למה אכפת לי — the life-anchor (משכנתא, שכירות, פנסיה). */
  explainWhyMe: string;
  /** 📈 מה זה עושה לשוק — the investor layer. */
  explainMarket: string;
  /** The two-camp forecast question ("תכה בתחזיות?"). */
  question: string;
  optionA: string;
  optionB: string;
  /** null until Waren records the real result (0 = optionA happened, 1 = optionB). */
  outcome: 0 | 1 | null;
  outcomeNote: string | null;
}

export const KIND_LABEL: Record<JournalKind, string> = {
  earnings: 'דוח כספי',
  rate: 'החלטת ריבית',
  cpi: 'מדד המחירים',
  jobs: 'שוק העבודה',
  other: 'אירוע שוק',
};

export const COUNTRY_FLAG: Record<JournalCountry, string> = { us: '🇺🇸', il: '🇮🇱' };
