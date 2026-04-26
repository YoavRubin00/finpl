export type Sentiment = 'green' | 'red' | 'yes' | 'no';

export type Timing = 'daily' | 'weekly' | 'monthly' | 'evergreen';

export type Topic =
  | 'sp500'
  | 'btc'
  | 'rates'
  | 'tlv35'
  | 'usd_ils'
  | 'gold'
  | 'oil'
  | 'macro'
  | 'earnings';

export interface CrowdOption {
  id: 'a' | 'b';
  label: string;
  emoji?: string;
  sentiment: Sentiment;
}

export interface CrowdQuestionTriggers {
  dayOfWeek?: number[];
  monthDay?: number[];
  btcNear?: number;
  spyNear?: number;
  gtBtcPrice?: number;
  vixGt?: number;
}

export interface CrowdQuestion {
  id: string;
  text: string;
  options: [CrowdOption, CrowdOption];
  baselinePct: [number, number];
  baselineN: number;
  tags: {
    timing: Timing;
    topic: Topic;
    triggers?: CrowdQuestionTriggers;
  };
}

export interface MarketSnapshot {
  btcPrice?: number;
  spyPrice?: number;
  vix?: number;
}

export interface SelectionContext {
  todayISO: string;
  dayOfWeek: number;
  monthDay: number;
  market?: MarketSnapshot;
}