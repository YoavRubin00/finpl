/** Client-side mirror of the BreakingNewsSummary type from the server
 *  prompt module. Duplicated here so the client doesn't pull anything from
 *  app/api into the bundle. */

export interface BreakingNewsKeyEvent {
  title: string;
  impact: 'high' | 'med' | 'low';
}

export interface BreakingNewsSource {
  title: string;
  url: string;
  publishedAt?: string;
}

export interface BreakingNewsSummary {
  summary: string;
  hypeIndex: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  keyEvents: BreakingNewsKeyEvent[];
  sources: BreakingNewsSource[];
}
