/**
 * Daily Learning Log Store
 * Tracks all learning activities throughout the day so we can
 * generate a "Daily Learning Summary" in the Profile screen.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';

export interface LearningEvent {
  type: 'module' | 'quiz' | 'dilemma' | 'investment' | 'crash-game' | 'swipe-game' | 'macro-event' | 'bullshit-swipe' | 'higher-lower' | 'budget-ninja' | 'price-slider' | 'cashout-rush' | 'fomo-killer';
  title: string;
  timestamp: number;
  xpEarned?: number;
}

interface DailyLogState {
  /** ISO date string of when events were last reset */
  currentDate: string;
  /** Events for the current day */
  events: LearningEvent[];
  /** Total XP earned today (tracked separately for display) */
  todayXP: number;
  /** Total coins earned today */
  todayCoins: number;
  /** Number of correct answers today */
  todayCorrect: number;

  logEvent: (event: LearningEvent) => void;
  addTodayXP: (amount: number) => void;
  addTodayCoins: (amount: number) => void;
  addCorrectAnswer: () => void;
  getTodayEvents: () => LearningEvent[];
  getTodaySummaryText: (displayName: string) => string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function maybeResetDay(state: DailyLogState): Partial<DailyLogState> {
  const today = todayStr();
  if (state.currentDate !== today) {
    return {
      currentDate: today,
      events: [],
      todayXP: 0,
      todayCoins: 0,
      todayCorrect: 0,
    };
  }
  return {};
}

export const useDailyLogStore = create<DailyLogState>()(
  persist(
    (set, get) => ({
      currentDate: todayStr(),
      events: [],
      todayXP: 0,
      todayCoins: 0,
      todayCorrect: 0,

      logEvent: (event: LearningEvent) => {
        const state = get();
        const reset = maybeResetDay(state);
        set({
          ...reset,
          events: [...(reset.events ?? state.events), event],
        });
      },

      addTodayXP: (amount: number) => {
        const state = get();
        const reset = maybeResetDay(state);
        set({
          ...reset,
          todayXP: (reset.todayXP ?? state.todayXP) + amount,
        });
      },

      addTodayCoins: (amount: number) => {
        const state = get();
        const reset = maybeResetDay(state);
        set({
          ...reset,
          todayCoins: (reset.todayCoins ?? state.todayCoins) + amount,
        });
      },

      addCorrectAnswer: () => {
        const state = get();
        const reset = maybeResetDay(state);
        set({
          ...reset,
          todayCorrect: (reset.todayCorrect ?? state.todayCorrect) + 1,
        });
      },

      getTodayEvents: () => {
        const state = get();
        if (state.currentDate !== todayStr()) return [];
        return state.events;
      },

      getTodaySummaryText: (displayName: string): string => {
        const state = get();
        if (state.currentDate !== todayStr() || state.events.length === 0) {
          return '';
        }

        // Group events by type for clean bullet points
        const typeLabels: Record<string, string> = {
          module: '📚 שיעור',
          quiz: '🧠 בוחן',
          dilemma: '🤔 דילמה פיננסית',
          investment: '💰 תרגיל השקעות',
          'crash-game': '📈 מרוץ הריבית',
          'swipe-game': '📊 שורט או לונג',
          'macro-event': '🌍 אירוע מאקרו',
        };

        const topics = [...new Set(state.events.map((e) => e.title))];
        const uniqueTypes = [...new Set(state.events.map((e) => e.type))];

        const lines: string[] = [
          `היום למדתי ב-FinPlay:`,
          '',
        ];

        // Content bullets, what they actually learned
        for (const topic of topics.slice(0, 5)) {
          lines.push(`• ${topic}`);
        }
        if (topics.length > 5) {
          lines.push(`• ...ועוד ${topics.length - 5} נושאים`);
        }

        lines.push('');

        // Activity types as a single line
        const typeNames = uniqueTypes.map((t) => typeLabels[t] ?? t);
        lines.push(`${state.events.length} פעילויות | ${typeNames.join(' · ')}`);

        lines.push(
          '',
          'רוצים ללמוד על כסף בצורה כיפית? נסו את Finpl',
        );

        return lines.join('\n');
      },
    }),
    {
      name: 'daily-log-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        currentDate: state.currentDate,
        events: state.events,
        todayXP: state.todayXP,
        todayCoins: state.todayCoins,
        todayCorrect: state.todayCorrect,
      }),
    },
  ),
);
