export type QuizCategory = 'INTEREST_RATE' | 'CPI' | 'USD_ILS' | 'STOCK_INDEX';

export interface DailyQuiz {
  quizId: string;
  date: string;               // "2026-03-16"
  category: QuizCategory;
  rawNewsTitle: string;        // כותרת המקור
  userFacingTitle: string;     // כותרת מהודרת עם אימוג'י
  question: string;            // שאלה, איך זה משפיע עליך?
  options: [string, string, string]; // 3 תשובות
  correctAnswerIndex: 0 | 1 | 2;
  explanation: string;         // הסבר "תכל'ס" בעברית
  citation: string;            // ידיעה אקטואלית, כותרת אמיתית
  historicalExample: string;   // דוגמה היסטורית, מקרה דומה מהעבר
  xpReward: number;
  coinReward: number;
  sourceValue: string;         // "4.75%" / "3.62₪" / "+1.2%"
  sourceLabel: string;         // "ריבית בנק ישראל" / "שער דולר"
}

export interface DailyQuizState {
  todayQuiz: DailyQuiz | null;
  answeredDates: string[];     // תאריכים שכבר ענה
  correctCount: number;
  totalAnswered: number;
  streak: number;

  hasAnsweredToday: () => boolean;
  answerQuiz: (date: string, wasCorrect: boolean) => void;
  setTodayQuiz: (quiz: DailyQuiz) => void;
}
