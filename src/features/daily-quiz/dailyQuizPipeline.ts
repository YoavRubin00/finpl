import { useDailyQuizStore } from './useDailyQuizStore';
import { fetchDataForCategory } from './newsDataService';
import { generateDailyQuiz } from './quizGenerator';
import { getCategoryForDate, getFallbackQuiz } from './fallbackQuizzes';
import type { DailyQuiz } from './dailyQuizTypes';

/**
 * Main daily quiz pipeline:
 * 1. Check cache, if today's quiz exists, return it
 * 2. Pick rotating category for today
 * 3. Fetch real market data
 * 4. Generate quiz via AI (Gemini)
 * 5. Save to store and return
 * Falls back to pre-written quizzes if anything fails.
 */
export async function refreshDailyQuiz(): Promise<DailyQuiz> {
  const store = useDailyQuizStore.getState();
  const today = new Date().toISOString().slice(0, 10);

  // Already have today's quiz cached
  if (store.todayQuiz && store.todayQuiz.date === today) {
    return store.todayQuiz;
  }

  const category = getCategoryForDate(today);

  try {
    // Fetch real market data
    const dataPoint = await fetchDataForCategory(category);

    // Generate quiz via AI
    const quiz = await generateDailyQuiz(dataPoint);

    // Save to store
    store.setTodayQuiz(quiz);
    return quiz;
  } catch {
    // Full fallback, pre-written quiz
    const fallback = getFallbackQuiz(today, category);
    store.setTodayQuiz(fallback);
    return fallback;
  }
}
