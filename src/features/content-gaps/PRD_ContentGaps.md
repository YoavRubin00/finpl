# PRD: Content Gaps — השלמת פערי תוכן

## Introduction
סריקת תוכן מקיפה של האפליקציה חשפה פערים בכמות ואיכות התוכן. PRD זה מתמקד בהשלמת הפערים ללא שינוי תוכן קיים — רק הוספה.

## Goals
- הוספת דילמות לקטגוריות חלשות (קטגוריות עם פריט בודד)
- עדכון אירועי מאקרו ל-2023-2026 + אירועים ישראליים
- גיוון ציטוטי חוכמה (קולות נשיים, ישראליים, מודרניים)
- מילוי אתגרי ארנה (מ-3 ל-13 אתגרים)

## User Stories

---

### US-001: הוספת 10 דילמות לקטגוריות חלשות
**Description:** As a learner, I want more dilemma scenarios in underrepresented categories so that I get broader financial education.

**Target file:** `src/features/daily-challenges/dilemma-data.ts`

**Interface:** `DilemmaScenario` (from `./daily-challenge-types`)

**ID pattern:** `dilemma-N` — continue from last existing ID (check file for max)

**Content to add — 10 dilemmas, 2 per category:**
- קריפטו (2): סיכוני מטבעות דיגיטליים, FOMO מול מחקר
- ביטוח (2): ביטוח חיים vs השקעה, ביטוח מקיף vs צד ג
- משכנתא (2): ריבית קבועה vs משתנה, מסלולי מחזור
- מיסים (2): תכנון מס חכם, החזרי מס שלא מנצלים
- נדל"ן (2): שכירות מול קנייה, נדל"ן להשקעה

**Fields per dilemma:**
```typescript
{
  id: 'dilemma-XX',
  emoji: '🔑',
  category: 'משכנתא',
  scenarioText: '...',  // תרחיש בעברית, שפה של Gen-Z
  choices: [
    { text: '...', isCorrect: true/false, feedback: '...' },
    { text: '...', isCorrect: true/false, feedback: '...' },
    { text: '...', isCorrect: true/false, feedback: '...' }
  ],
  xpReward: 40,
  coinReward: 20
}
```

**Acceptance Criteria:**
- [x] 10 new dilemmas appended to the `dilemmaScenarios` array
- [x] IDs are unique and continue from last existing ID
- [x] Each has 2-3 choices with exactly one `isCorrect: true`
- [x] All text in Hebrew, RTL-friendly, Gen-Z tone
- [x] Financial content is accurate
- [x] Typecheck passes (`npx tsc --noEmit`)

---

### US-002: הוספת 6 אירועי מאקרו 2023-2026
**Description:** As a learner, I want recent macro events so the timeline feels current and relevant.

**Target file:** `src/features/macro-events/macroEventsData.ts`

**Interface:** `MacroEvent` (from `./types`)

**ID pattern:** `me-{year}` or `me-{year}-{suffix}` if year already exists

**Events to add:**
1. 2023 — קריסת SVB (Silicon Valley Bank) | crisis | difficulty 2
2. 2023 — עליית ה-AI (ChatGPT boom, NVIDIA rally) | tech | difficulty 2
3. 2024 — ירידת ריבית הפד (Fed rate cuts begin) | policy | difficulty 2
4. 2024 — ראלי ה-Magnificent 7 | boom | difficulty 3
5. 2025 — מלחמת הסחר של טראמפ (tariffs) | shock | difficulty 2
6. 2025 — ירידות שווקים ממלחמת סחר | crisis | difficulty 2

**Fields per event:**
```typescript
{
  id: 'me-2023-svb',
  year: 2023,
  headline: '...',
  context: '...',
  question: '...',
  direction: 'down',
  magnitude: '...',
  explanation: '...',
  lesson: '...',
  category: 'crisis',
  difficulty: 2
}
```

**Acceptance Criteria:**
- [ ] 6 new events appended to the macroEvents array
- [ ] IDs unique (check for year conflicts)
- [ ] All text in Hebrew
- [ ] Financial data accurate
- [ ] Difficulty 2-3
- [ ] Typecheck passes

---

### US-003: הוספת 5 אירועי מאקרו ישראליים
**Description:** As an Israeli learner, I want local market events so I understand my own financial history.

**Target file:** `src/features/macro-events/macroEventsData.ts`

**Events to add:**
1. 1983 — ויסות מניות הבנקים (בועת הבנקים) | crisis | difficulty 2
2. 1985 — תוכנית הייצוב הכלכלי | policy | difficulty 2
3. 2005 — רפורמת בכר (הפרדת הבנקים מקרנות נאמנות) | policy | difficulty 3
4. 2012 — גילוי מאגרי הגז (לוויתן, תמר) | boom | difficulty 2
5. 2023 — המחאה והשפעתה על השקל והשוק | shock | difficulty 3

**Acceptance Criteria:**
- [ ] 5 Israeli events appended
- [ ] IDs unique with `me-{year}-il` suffix
- [ ] Hebrew text, accurate historical data
- [ ] Includes lesson relevant to Israeli investors
- [ ] Typecheck passes

---

### US-004: הוספת 10 ציטוטי חוכמה — קולות מגוונים
**Description:** As a learner, I want wisdom from diverse voices — women, Israelis, and modern thinkers.

**Target file:** `src/features/wisdom-flashes/finplay_quotes_updated.json`

**Current structure (JSON array):**
```json
{
  "id": 81,
  "quote": "...",
  "author": "...",
  "about_author": "...",
  "category": "השקעות"
}
```

**Quotes to add (10) — diverse authors:**
1. קתי ווד (Cathie Wood) — ARK Invest | השקעות
2. אביגיל ג'ונסון — Fidelity CEO | מיינדסט
3. סוזי אורמן — financial educator | חינוך פיננסי
4. כריסטין לגארד — ECB president | מיינדסט
5. פרופ' דן אריאלי — behavioral economist, Israeli | חינוך פיננסי
6. גיל שוויד — Check Point founder | מיינדסט
7. אלון מאסק — on risk and disruption | השקעות
8. נסים טלב — Black Swan author | ניהול סיכונים → מיינדסט
9. מורגן האוסל — Psychology of Money | חיסכון
10. ריי דאליו — Bridgewater | טווח ארוך

**Acceptance Criteria:**
- [ ] 10 new quotes added to JSON array
- [ ] IDs continue from last existing (probably 80+)
- [ ] At least 3 women, 2 Israelis
- [ ] Categories match existing CATEGORY_ICON map
- [ ] Quotes translated to Hebrew, accurate attribution
- [ ] Typecheck passes

---

### US-005: הוספת 10 אתגרי ארנה
**Description:** As a player, I want more arena challenges so the feature feels complete and engaging.

**Target file:** `src/features/arena/arenaData.ts`

**Interface:** `Challenge` (from `./types`)

**ID pattern:** `challenge-{NNN}` (zero-padded, continue from 003)

**Current state:** Only 3 challenges in English. New challenges should be in Hebrew and cover financial skills.

**Challenges to add (10):**
1. challenge-004: "בדוק את הציון שלך" — בדיקת ציון אשראי | 30 coins, 15 XP
2. challenge-005: "תקציב שבועי" — הכן תקציב שבועי | 40 coins, 20 XP
3. challenge-006: "מילון פיננסי" — למד 5 מושגים חדשים | 25 coins, 10 XP
4. challenge-007: "חסוך היום" — מצא הוצאה מיותרת | 35 coins, 15 XP
5. challenge-008: "ריבית דריבית" — חשב תשואה לשנה | 40 coins, 20 XP
6. challenge-009: "סקר שוק" — בדוק מחירים של 3 מוצרים | 30 coins, 15 XP
7. challenge-010: "פנסיה בגיל 25" — חשב הפרשה חודשית | 50 coins, 25 XP
8. challenge-011: "חוק 72" — תרגל חישוב הכפלת כסף | 35 coins, 15 XP
9. challenge-012: "קרא דוח רווח" — נתח דוח חברה אחת | 45 coins, 20 XP
10. challenge-013: "יום ללא הוצאות" — אתגר no-spend day | 40 coins, 20 XP

**Acceptance Criteria:**
- [ ] 10 new challenges appended to challenges array
- [ ] IDs sequential from challenge-004
- [ ] Hebrew titles and descriptions
- [ ] Reward values reasonable (25-50 coins, 10-25 XP)
- [ ] Typecheck passes

---

## Non-Goals
- לא משנים תוכן קיים — רק מוסיפים
- לא מוסיפים סימולציות חדשות (פרויקט נפרד)
- לא משנים UI/UX — רק data files
- לא מוסיפים פרקים חדשים

## Technical Notes
- כל הקבצים הם data files בלבד — אין לוגיקה חדשה
- יש לבדוק שה-IDs לא מתנגשים עם קיימים (קרא את הקובץ לפני הוספה)
- ציטוטים נמצאים ב-JSON (לא TS) — `finplay_quotes_updated.json`
- דילמות חייבות **2-3 אפשרויות** עם בדיוק אחת `isCorrect: true`
