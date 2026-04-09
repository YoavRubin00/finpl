# PRD 49 — Daily News Flash Quiz (בוסטר חדשות)

## מטרה
מנגנון אוטומטי שמושך נתוני מאקרו-כלכלה אמיתיים (שער דולר, ריבית, מדדים),
מייצר שאלת טריוויה יומית באמצעות AI, ומגיש אותה למשתמש כחלק מהפיד היומי.
"סוכן AI פיננסי" שהופך חדשות יבשות לאינטראקציה לימודית ממכרת.

---

## שלב 1: Data Layer — טיפוסים ונתונים

### US-001: Types & Schema
- [ ] יצירת `src/features/daily-quiz/dailyQuizTypes.ts`:
  ```typescript
  type QuizCategory = 'INTEREST_RATE' | 'CPI' | 'USD_ILS' | 'STOCK_INDEX';

  interface DailyQuiz {
    quizId: string;
    date: string;               // "2026-03-16"
    category: QuizCategory;
    rawNewsTitle: string;        // כותרת המקור
    userFacingTitle: string;     // כותרת מהודרת עם אימוג'י
    question: string;            // שאלה — איך זה משפיע עליך?
    options: [string, string, string]; // 3 תשובות
    correctAnswerIndex: 0 | 1 | 2;
    explanation: string;         // הסבר "תכל'ס" בעברית
    xpReward: number;
    coinReward: number;
    sourceValue: string;         // "4.75%" / "3.62₪" / "+1.2%"
    sourceLabel: string;         // "ריבית בנק ישראל" / "שער דולר"
  }

  interface DailyQuizState {
    todayQuiz: DailyQuiz | null;
    answeredDates: string[];     // תאריכים שכבר ענה
    correctCount: number;
    totalAnswered: number;
    streak: number;

    hasAnsweredToday: () => boolean;
    answerQuiz: (date: string, wasCorrect: boolean) => void;
    setTodayQuiz: (quiz: DailyQuiz) => void;
  }
  ```

### US-002: Zustand Store
- [ ] יצירת `src/features/daily-quiz/useDailyQuizStore.ts`:
  - Zustand + persist (AsyncStorage)
  - `hasAnsweredToday()` — בודק אם תאריך היום ב-`answeredDates`
  - `answerQuiz(date, wasCorrect)` — מוסיף לתאריכים, מעדכן streak, נותן XP+Coins
  - `setTodayQuiz(quiz)` — שומר את השאלה היומית
  - Rewards: תשובה נכונה = +50 XP, +25 Coins; streak ×3 = בונוס +20 Coins
- [ ] Typecheck עובר

---

## שלב 2: Data Fetching — APIs

### US-003: Market Data Service
- [ ] יצירת `src/features/daily-quiz/newsDataService.ts`:
  - `fetchUsdIls()` — שער דולר/שקל
    - מקור: Bank of Israel API (https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI/EXR/1.0?startperiod=YYYY-MM-DD)
    - Fallback: Alpha Vantage `CURRENCY_EXCHANGE_RATE` (מפתח ב-.env)
  - `fetchInterestRate()` — ריבית בנק ישראל
    - מקור: Bank of Israel API
    - Fallback: ערך קבוע אחרון ידוע
  - `fetchSP500()` — שינוי יומי ב-S&P 500
    - מקור: Alpha Vantage `GLOBAL_QUOTE` (מפתח ב-.env: `EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY`)
  - `fetchTA125()` — שינוי יומי במדד ת"א 125
    - מקור: Yahoo Finance (כבר יש ב-`marketApiService.ts` — לשכפל pattern)
  - כל פונקציה מחזירה `{ value: string, label: string, direction: 'up' | 'down' | 'stable' }`
  - Cache יומי (לא למשוך פעמיים באותו יום)
- [ ] Typecheck עובר

### US-004: AI Quiz Generator
- [ ] יצירת `src/features/daily-quiz/quizGenerator.ts`:
  - `generateDailyQuiz(dataPoint: { value, label, direction, category })` → `DailyQuiz`
  - Prompt ל-Gemini (מפתח ב-.env: `EXPO_PUBLIC_GOOGLE_AI_API_KEY`):
    ```
    אתה מורה לפיננסים לבני 18-28 בישראל.
    קיבלת נתון כלכלי: [label] עומד על [value].
    צור שאלת טריוויה בעברית בפורמט JSON הבא:
    {
      "userFacingTitle": "כותרת מושכת עם אימוג'י",
      "question": "שאלה — איך זה משפיע על הארנק שלך?",
      "options": ["תשובה 1", "תשובה 2", "תשובה 3"],
      "correctAnswerIndex": 0,
      "explanation": "הסבר תכל'ס פשוט ב-2-3 משפטים"
    }
    ```
  - Structured output (JSON only) — parse + validate
  - Fallback: שאלות pre-written לכל קטגוריה (5 שאלות גיבוי לכל אחת)
  - Rate limit: 1 קריאה ביום
- [ ] Typecheck עובר

---

## שלב 3: Orchestration — Pipeline יומי

### US-005: Daily Quiz Pipeline
- [ ] יצירת `src/features/daily-quiz/dailyQuizPipeline.ts`:
  - `refreshDailyQuiz()` — הפונקציה הראשית:
    1. בדוק אם כבר יש שאלה להיום (cache) → אם כן, החזר אותה
    2. בחר קטגוריה רנדומלית (סיבוב: יום 1=INTEREST, יום 2=USD_ILS, יום 3=STOCK_INDEX, יום 4=CPI...)
    3. שלוף נתון אמיתי (`fetchUsdIls` / `fetchInterestRate` / etc.)
    4. שלח ל-AI (`generateDailyQuiz`) → קבל JSON
    5. שמור ב-store (`setTodayQuiz`)
    6. החזר את ה-DailyQuiz
  - נקרא ב-mount של FinFeedScreen (רקע, לא חוסם)
  - אם ה-API נכשל → Fallback לשאלה מוכנה מראש
- [ ] Typecheck עובר

---

## שלב 4: Frontend — UI Components

### US-006: Quiz Card (Feed Widget)
- [ ] יצירת `src/features/daily-quiz/DailyQuizCard.tsx`:
  - מצב "נעול" (טרם נענה):
    - רקע gradient זהוב-כחול + אנימציית פעימה
    - אייקון 🚨 + כותרת "מבזק פיננסי יומי"
    - תת-כותרת: `userFacingTitle` מהשאלה
    - Badge: "🎯 50 XP" + טיימר "נותרו X שעות"
    - כפתור CTA זהוב: "ענה ותרוויח!"
  - מצב "נענה":
    - ✅ ירוק + "ענית נכון!" / ❌ אדום + "טעית"
    - הצגת ה-explanation
  - RTL, FadeInDown animation, haptics
  - Lottie: `wired-flat-411-news-newspaper-hover-pinch.json`

### US-007: Quiz Bottom Sheet (Modal)
- [ ] יצירת `src/features/daily-quiz/DailyQuizSheet.tsx`:
  - Bottom sheet (חצי מסך) עם:
    - כותרת הנתון + ערך: "📊 שער הדולר: 3.62₪"
    - השאלה (fontSize: 18, bold)
    - 3 כפתורי תשובה (רדיאל סטייל, RTL)
    - פידבק מיידי:
      - נכון: קונפטי מיני, צליל קופה רושמת, ירוק + "+50 XP"
      - שגוי: רטט (haptic), אדום, הבלטת תשובה נכונה בירוק
    - Explanation slide-down (אחרי תשובה)
    - כפתור "הבנתי, תודה!" → סגירת sheet
  - `visible: boolean`, `onClose: () => void`
- [ ] Typecheck עובר

### US-008: Feed Integration
- [ ] עדכון `src/features/finfeed/types.ts`:
  - הוספת `FeedDailyQuiz` type:
    ```typescript
    interface FeedDailyQuiz {
      id: string;
      type: 'daily-quiz';
      quiz: DailyQuiz;
    }
    ```
  - הוספה ל-union: `FeedItem = ... | FeedDailyQuiz`
- [ ] עדכון `src/features/finfeed/FinFeedScreen.tsx`:
  - Import `DailyQuizCard` + `useDailyQuizStore` + `refreshDailyQuiz`
  - קריאה ל-`refreshDailyQuiz()` ב-useEffect (mount)
  - הזרקת `FeedDailyQuiz` לפיד:
    - מיקום: כרטיס #2 (אחרי WelcomeCard, לפני השאר)
    - תנאי: רק אם יש שאלה יומית + לא נענתה
  - Render: `{item.type === 'daily-quiz' && <DailyQuizCard quiz={item.quiz} />}`
- [ ] Typecheck עובר

### US-009: Home Screen Teaser
- [ ] הוספת טיזר קטן בראש מסך הבית (FinFeedScreen):
  - בין ה-header ל-feed, כרטיסייה צרה:
    - "🚨 מבזק: [כותרת קצרה] — ענה עכשיו!"
    - גלילה אוטומטית (marquee effect) או static
    - Tap → גלילה לכרטיס ה-quiz בפיד
  - נעלם אחרי שענה
- [ ] Typecheck עובר

---

## שלב 5: Fallback Data

### US-010: Pre-written Quiz Bank
- [ ] יצירת `src/features/daily-quiz/fallbackQuizzes.ts`:
  - 20 שאלות מוכנות מראש (5 לכל קטגוריה):
    - INTEREST_RATE: השפעה על משכנתא, פיקדון, הלוואות, פריים, חיסכון
    - USD_ILS: אמזון, חופשות, יבוא, קרנות S&P, מחירי דלק
    - STOCK_INDEX: פנסיה, קופות גמל, תיק השקעות, ETF, קרנות נאמנות
    - CPI: כוח קנייה, שכר דירה, צמוד מדד, מחירי מזון, אינפלציה
  - נבחרות לפי תאריך (hash של תאריך → index)
  - מופעלות כאשר API/AI נכשל
- [ ] Typecheck עובר

---

## Technical Notes

### APIs נדרשים (כבר יש מפתחות):
- **Alpha Vantage**: `EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY` (ב-.env) — S&P 500, שערים
- **Google AI (Gemini)**: `EXPO_PUBLIC_GOOGLE_AI_API_KEY` (ב-.env) — יצירת שאלות
- **Bank of Israel**: חינמי, ללא מפתח — ריבית, שער דולר
- **Yahoo Finance**: חינמי — ת"א 125 (pattern קיים ב-`marketApiService.ts`)

### קבצים קיימים לשימוש חוזר:
- `src/features/macro-events/MacroEventCard.tsx` — דוגמה ל-quiz card עם אנימציות
- `src/features/trading-hub/marketApiService.ts` — Yahoo Finance API pattern
- `src/features/chat/buildChatPrompt.ts` — LLM prompt pattern
- `src/features/economy/useEconomyStore.ts` — XP/Coins rewards
- `src/utils/haptics.ts` — tap/success/error haptics

### Design Principles:
- RTL Hebrew: `writingDirection: 'rtl'`, `textAlign: 'right'`
- Colors: Gold (#facc15) for teaser, ocean-blue (#0f172a) base
- Animations: FadeInDown stagger, Lottie micro-animations
- No `any` types — strict TypeScript
- Feature folder: `src/features/daily-quiz/`

### Pre-existing TS errors (safe to ignore):
- FeedSidebar.tsx — CLASH.primary does not exist
- useClashStore.ts — 'clash_win'/'clash_draw' not assignable to XPSource
- GlassOverlay.tsx — expo-blur not found

---

## סדר ביצוע

```
US-001 → US-002 → US-010 (types + store + fallbacks — תשתית)
US-003 → US-004 → US-005 (APIs + AI + pipeline — data)
US-006 → US-007 (UI components — cards + sheet)
US-008 → US-009 (integration — feed + teaser)
```
