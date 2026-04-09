
# PRD: בניית 5 סימולציות לגראהם (Chapter 4 Bonus)

## Context
כחלק ממודולי הבונוס של בנג'מין גראהם, נדרש לבנות 4 סימולטורים אינטראקטיביים + מבחן אישיות 1.
מודולים אלו ישולבו תחת `chapter-4-content/simulations/`.

## Shared Infrastructure
- שימוש בתשתיות קיימות: `GlowCard`, `AnimatedPressable`, `ConfettiExplosion`, `SimFeedbackBar`.
- שילוב עם `useEconomyStore`: כל סימולטור מזכה ב-XP ומטבעות.
- מנגנון בחירת הסימולטורים יעבור דרך `SimulatorLoader.tsx` וקובץ הראוטינג של Expo Router.

---

## 1. GrahamPersonalityScreen (מבחן אישיות)
**Concept:** "איזה משקיע אתה?" (הגנתי לעומת יזום) בסגנון Swipe קלפים.
- **Hook:** צובר נקודות 'Defensive' מול 'Enterprising'.
- **Screen:** אנימציית Swipe בסגנון קלפים. תוצאה: קלף אישי מרהיב המגדיר אותך כ-Defensive או Enterprising.

## 2. GrahamPortfolioScreen (mod-4-b1)
**Concept:** בנה תיק לפי גראהם. המשתמש "מרכיב" תיק השקעות ממניות שונות לפי חוקי גראהם.
- **Hook:** מוודא שהמשתמש בחר לפחות 5 חברות שעומדות בקריטריוני השמרנות של גראהם (מתוך 10 מוצגות).
- **Screen:** ממשק גרירה/בחירה. מד יציבות (Stability Meter) שזז עם כל בחירה.

## 3. MarginSafetyScreen (mod-4-b2)
**Concept:** מחשבון הערכת שווי / מרווח ביטחון אינטראקטיבי.
- **Hook:** המשתמש מקבל אירוע שוק שחותך את המחיר של נכס מסוים. יכולת לבחור מתי לקנות (איזה מרווח ביטחון).
- **Screen:** סליידר שבו המשתמש בוחר אחוז Discount לקנייה מעלות השווי הפנימי (Intrinsic Value).

## 4. PriceValueScreen (mod-4-b3)
**Concept:** מחיר מול ערך - משחק זיהוי 'מחיר' מול 'ערך פנימי'.
- **Hook:** 5 סיבובים. צריך לבחור בנכס שבו המחיר נמוך משמעותית מהערך שלו (Mr Market Radar).
- **Screen:** בחירה קריטית בזמן המוקצב כדי "להרוויח" מר-מרקט בפאניקה.

## 5. CrisisTimelineScreen (mod-4-b4)
**Concept:** ציר הזמן של המשברים הגדולים, דומה קצת ל-"מנהל המשבר", אבל עם דגש על המסר של גראהם.
- **Hook:** ההחלטה לחכות או לברוח, כשבוחנים איך ההמתנה השתלמה תמיד אחרי כנסיות עמוקות לשוק הדוב.
- **Screen:** גרף אינטראקטיבי.

---
## Integration Points
- ייצוא מ- `chapter-4-content/simulations/index.ts`
- הוספה ל- `SIM_LOADERS` ב- `SimulatorLoader.tsx`
- רישום המסלול המיוחד בתיקיית ה- Router (`app/simulator/[id].tsx` או טיפול דרך קריסטל לודר).
