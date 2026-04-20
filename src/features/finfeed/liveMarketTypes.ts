export interface RateItem {
  value: string;
  numericValue: number;
  changePct: number;
  direction: 'up' | 'down' | 'stable';
  label: string;
  symbol: string;
}

export interface NewsItem {
  headline: string;
  summary: string;
  source: string;
  pubDate: string;
  link: string;
}

export interface LiveMarketData {
  rates: RateItem[];
  news: NewsItem[];
  fetchedAt: string;
}

export interface NewsQuizChoice {
  id: 'a' | 'b' | 'c';
  text: string;
}

export interface NewsQuizData {
  quizId: string;
  headline: string;
  question: string;
  choices: [NewsQuizChoice, NewsQuizChoice, NewsQuizChoice];
  correctChoiceId: 'a' | 'b' | 'c';
  explanation: string;
  xpReward: number;
  coinReward: number;
  generatedAt: string;
}