# PRD 9: תוכן האפליקציה בייצור - פרק 3: יציבות (Stability) ⚖️

## 🌟 הקדמת הפרק: יוצאים מהמגננה
שרדתם את היום-יום ובניתם חומות הגנה – עכשיו הגיע הזמן לייצב את הספינה מול הסערות שבחוץ. בפרק "יציבות" אנחנו יוצאים מהמגננה ועוברים להבנה של "העולם הגדול". נלמד איך להתמודד עם המפלצת השקופה שגונבת לכם כסף מהכיס בלי שתשימו לב (האינפלציה), איך לאלף את הרגשות שלכם כששוק ההון משתגע, ואיך להשתמש בכלי השקעה פשוטים וגמישים שמתאימים בדיוק לשלב שבו אתם רוצים שהכסף יתחיל לעבוד – אבל בלי כאב ראש של מומחים. מוכנים לייצב את העתיד שלכם?

מסמך זה מכיל טיוטה של תוכן המודולים עבור הפרק השלישי במשחק: "יציבות".

## User Stories

### US-001: Chapter 3 Content Data
**Description:** As a developer, I want typed data for Chapter 3 (Stability) modules so the existing lesson flow can render this chapter's content.

**Acceptance Criteria:**
- [x] Create `chapter3Data.ts` with all 4 modules (15-18) fully populated from PRD content below, using the same `Chapter` type from `chapter-1-content/types.ts`
- [x] Re-export or import shared types from `chapter-1-content/types.ts` (no duplication)
- [x] Each module includes: `videoHook`, `interactiveIntro`, 2 flashcards, 4 quizzes (4 options each), `simConcept`
- [x] Typecheck passes

### US-002: Chapter Store Extension for Chapter 3
**Description:** As a developer, I want the chapter progress store to support Chapter 3 alongside Chapters 1 and 2.

**Acceptance Criteria:**
- [x] Ensure `useChapterStore` multi-chapter support (from PRD8 US-002) accommodates Chapter 3 data
- [x] Add Chapter 3 entry to chapter registry/config if one exists
- [x] Typecheck passes

### US-003: Interactive Intro Rendering (if not done in PRD8)
**Description:** As a user, I want to see the interactive intro screen before flashcards so each module opens with an engaging hook.

**Acceptance Criteria:**
- [x] Verify `InteractiveIntroCard` component exists (from PRD8 US-003) and renders Chapter 3 intros correctly
- [x] If not implemented yet: add `"intro"` phase to `FlowPhase`, create `InteractiveIntroCard` with neon-styled full-screen card, "בואו נתחיל" CTA
- [x] Flow order: intro → flashcards → quizzes → summary
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-004: Chapter 3 Map Screen
**Description:** As a user, I want a Chapter 3 overview showing modules 15-18 with my progress.

**Acceptance Criteria:**
- [x] Reuse `ChapterMapScreen` component, passing Chapter 3 data
- [x] Verify it renders correctly with 4 modules (15-18)
- [x] Tapping a module opens `LessonFlowScreen` with Chapter 3 module data
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-005: Navigation Update for Chapter 3
**Description:** As a user, I want to access Chapter 3 from the chapter selection or pyramid screen.

**Acceptance Criteria:**
- [x] Add Chapter 3 card to `ChapterSelectScreen` (from PRD8 US-004)
- [x] Update PyramidScreen: Layer 3 (Stability) → Chapter 3
- [x] Typecheck passes
- [x] Verify changes work in browser

---

## Content Data (Modules 15-18)

## Module 15: המפלצת השקופה (אינפלציה)
🎯 הקדמת המודול: למה פעם "מאה שקל" קנו חצי סופר והיום הם בקושי סוגרים פינה לארוחת צהריים? הכירו את האינפלציה – הכוח השקט ששוחק לכם את הכסף בזמן שהוא יושב בעו"ש. במודול הזה נלמד איך לזהות אותה ואיך לנצח אותה במירוץ החימוש של יוקר המחיה.

🎬 Video Hook: בחור מחזיק שטר של 100 שקל בשנת 2010 וקונה ערימת מצרכים. אז הוא עובר לשנת 2026 עם אותו שטר וקונה רק חלב וביצים. "מי גנב לי את הכסף?!".

🎯 Interactive Intro: המשתמש גורר שק של "100 ש"ח" על פני ציר זמן. ככל שהוא מתקדם קדימה בשנים, השק הופך לקטן ושקוף יותר, בעוד שמחירי המוצרים על המסך (דירה, דלק, קפה) קופצים למעלה. טקסט מלווה: "הכסף שלכם לא באמת נשאר אותו דבר. אם הוא לא צומח, הוא נעלם".

📇 Flashcard 1: אינפלציה היא עליית המחירים הכללית. זה אומר שעם אותו סכום כסף, אתם קונים פחות מוצרים היום מאשר אתמול. הכסף שלכם "נשחק".

📇 Flashcard 2: אם האינפלציה היא 3% בשנה והכסף שלכם שוכב בעו"ש (0% ריבית), אתם בעצם נהיים עניים יותר ב-3% בכל שנה בלי לשים לב.

❓ Quiz 1 (Multiple Choice):
  - Question: מה זה בעצם "מדד המחירים לצרכן" (CPI) שמדברים עליו בחדשות?
  - Options: A) רשימת המחירים הכי זולים בסופר, B) "סל קניות" ממוצע שהלמ"ס בודק כדי לראות בכמה עלה יוקר המחיה, C) הריבית שבנק ישראל קובע כל חודש, D) מדד שמשווה מחירים בין ישראל לחו"ל
  - Correct Answer: B
  - Success Feedback: 🛒 בול. המדד בודק הכל – משכר דירה ועד מחיר העגבנייה.
  - Fail Feedback: 🛑 לא. זה סל קניות דמיוני שמשקף את ההוצאות של משפחה ישראלית ממוצעת.

❓ Quiz 2 (Scenario-based):
  - Question: יש לך 10,000 ש"ח מתחת לבלטה. האינפלציה השנה הייתה 5%. כמה כוח קנייה נשאר לך?
  - Options: A) עדיין 10,000, שום דבר לא זז, B) שווי של 9,500 ש"ח בערך – המספר אותו דבר אבל המחירים עלו, C) 10,500 ש"ח כי האינפלציה מוסיפה כסף, D) 9,000 ש"ח כי המדינה לוקחת מס
  - Correct Answer: B
  - Success Feedback: 📉 פגיעה כואבת. המספר על השטר לא השתנה, אבל היכולת שלך לקנות מוצרים צנחה.
  - Fail Feedback: ❌ טעות נפוצה. אם המחירים עלו ב-5%, ה-10,000 שלך "שווים" פחות בקופה בסופר.

❓ Quiz 3 (Multiple Choice):
  - Question: מי נחשב ל"מפסיד" הכי גדול מאינפלציה גבוהה?
  - Options: A) מי שיש לו חובות גדולים, B) מי שכל הכסף שלו נמצא במזומן או בעו"ש ללא ריבית, C) מי שמשקיע בנדל"ן, D) מי שקונה דולרים
  - Correct Answer: B
  - Success Feedback: 💸 נכון מאוד. הכסף שלהם פשוט נרקב בזמן שהמחירים בחוץ טסים.
  - Fail Feedback: 🚫 הפוך. מי שחייב כסף דווקא "מרוויח" קצת כי ערך החוב הריאלי שלו יורד.

❓ Quiz 4 (Scenario-based):
  - Question: איך נלחמים באינפלציה כדי שהכסף לא יתאדה?
  - Options: A) קונים מלא מוצרים ושומרים במחסן, B) משקיעים בנכסים (מניות, נדל"ן) שעולים בדרך כלל יותר מקצב האינפלציה, C) שמים הכל בפיקדון בנקאי ל-3 חודשים, D) ממירים הכל לזהב פיזי
  - Correct Answer: B
  - Success Feedback: 🚀 בדיוק. זו הסיבה היחידה שמשקיעים – כדי לנצח את עליית המחירים.
  - Fail Feedback: 🥫 לא. הדרך היחידה היא לגרום לכסף שלך לצמוח מהר יותר מהמחירים בחוץ.

🎮 SIM Concept: "מירוץ הקניות": אתה רץ עם עגלה. המחירים על המדפים עולים תוך כדי ריצה, ואתה חייב לאסוף "מטבעות השקעה" כדי שהארנק שלך יגדל מהר יותר מהאינפלציה.

## Module 16: הפסיכולוגיה של הכסף
🎯 הקדמת המודול: המוח שלנו תוכנת לשרוד בג'ונגל, לא לסחור בבורסה. פחד ופניקה הם יועצי השקעות גרועים מאוד. במודול הזה נלמד למה אנחנו עושים טעויות יקרות כשהשוק משתולל, ואיך להישאר רגועים כשכולם בלחץ.

🎬 Video Hook: בחור רואה כתבה בחדשות "הבורסה מתרסקת!", נכנס לפניקה ומוכר הכל. יומיים אחרי זה הבורסה מזנקת והוא תופס את הראש: "למה הקשבתי להם?!".

🎯 Interactive Intro: מופיע כפתור אדום ענק עליו כתוב "מכור הכל!". סביבו מהבהבות כותרות מלחיצות: "משבר!", "קריסה!". אם המשתמש לוחץ, הוא רואה את הגרף ממשיך לעלות בלעדיו. אם הוא מחזיק מעמד, הוא מקבל בונוס "קור רוח". טקסט מלווה: "האויב הכי גדול של הכסף שלכם הוא לא הבנק, אלא הרגשות שלכם".

📇 Flashcard 1: פחד (כשכולם מוכרים) ותאוות בצע (כשכולם רצים לקנות) הם המתכון הבטוח להפסדים. "אפקט העדר" גורם לנו לעשות טעויות יקרות.

📇 Flashcard 2: בשוק ההון, לפעמים הצעד הכי חכם הוא פשוט לא לעשות כלום. סבלנות שווה הרבה יותר מניסיונות "לתזמן" את השוק.

❓ Quiz 1 (Multiple Choice):
  - Question: מה זה FOMO בעולם ההשקעות?
  - Options: A) פחד להפסיד כסף בהשקעה קיימת, B) פחד לפספס הזדמנות כשרואים את השכן מרוויח ("Fear Of Missing Out"), C) שיטת ניתוח טכני של מניות, D) ביטוח נגד הפסדים בבורסה
  - Correct Answer: B
  - Success Feedback: 🤡 בדיוק. FOMO גורם לאנשים לקנות בשיא, שניה לפני שהכל מתרסק.
  - Fail Feedback: 🚩 לא. זה הפחד שכולם חוגגים ורק אתה בחוץ. זה הרגש שמוביל להחלטות גרועות.

❓ Quiz 2 (Scenario-based):
  - Question: השקעת 1,000 ש"ח. למחרת השוק ירד ב-5% וההשקעה שווה 950. מה הנטייה הטבעית של המוח שלנו?
  - Options: A) לקנות עוד בהנחה, B) למכור מיד כדי "להציל" את מה שנשאר (שנאת הפסד), C) לחכות בדיוק שבוע ואז להחליט, D) להתעלם לגמרי ולא לבדוק
  - Correct Answer: B
  - Success Feedback: 🧠 נכון. המוח שלנו שונא להפסיד פי 2 ממה שהוא אוהב להרוויח. זה נקרא "שנאת הפסד".
  - Fail Feedback: 🛑 שנאת הפסד היא אינסטינקט גרוע בשוק ההון. אם תמכור בירידה, הפכת את ההפסד "על הנייר" להפסד אמיתי.

❓ Quiz 3 (Multiple Choice):
  - Question: מה פירוש המשפט "כשיש דם ברחובות – תקנה"?
  - Options: A) שצריך להיזהר מהשוק ולצאת מהר, B) שדווקא כשיש פאניקה והמחירים ברצפה זו ההזדמנות הכי טובה לקנות בזול, C) שצריך להשקיע רק בחברות בריאות, D) שהמדינה מגנה על המשקיעים במשבר
  - Correct Answer: B
  - Success Feedback: 🩸 אכזרי אבל חכם. המשקיעים הכי עשירים בעולם קנו כשאחרים רעדו מפחד.
  - Fail Feedback: 📉 הפוך. כולם מוכרים בזול מתוך פחד? זה הזמן של החכמים לאסוף סחורה במחיר רצפה.

❓ Quiz 4 (Scenario-based):
  - Question: חבר מספר לך על "מניה בטוחה שתעלה ב-100% תוך חודש". מה התגובה הכי בריאה?
  - Options: A) לשים שם הכל לפני שיהיה מאוחר, B) להבין שאין דבר כזה "בטוח" עם 100% רווח ולבדוק טוב טוב לפני שנוגעים, C) לשים רק חצי מהחיסכון, D) לשאול את הבנקאי שלך אם הוא שמע על זה
  - Correct Answer: B
  - Success Feedback: 🛡️ חוסן מנטלי! הבטחות לרווח מהיר הן בדרך כלל הדרך המהירה להפסד מהיר.
  - Fail Feedback: 🚫 תתעורר. אם מישהו באמת היה יודע על מניה כזו, הוא לא היה מספר לך עליה, הוא היה משקיע בעצמו בשקט.

🎮 SIM Concept: "מדד הפאניקה": גרף מניות משתולל על המסך עם כותרות חדשות מלחיצות. המשתמש צריך להחזיק את הכפתור "HOLD" ולא לשחרר למרות הרעש.

## Module 17: קופת גמל להשקעה (המקפצה)
🎯 הקדמת המודול: רוצים להשקיע בשוק ההון אבל המילה "בורסה" עושה לכם צמרמורת? הכירו את קופת הגמל להשקעה. זה הגשר הכי נוח בין החיסכון המשעמם בבנק לבין הצמיחה של העולם הגדול. גמיש, נזיל ועם בונוס מטורף בסוף הדרך.

🎬 Video Hook: בחורה מראה יתרה בבנק עם 0.1% ריבית, ואז עוברת לקופת גמל ומראה איך הכסף עובד בבורסה בלחיצת כפתור. "למה אף אחד לא אמר לי?".

🎯 Interactive Intro: מופיעה דלת כספת (העו"ש) ולידה "מעלית" (קופת גמל). המשתמש גורר שק כסף למעלית, לוחץ על כפתור "בורסה" ורואה את השק עולה קומות בזמן שהכספת תקועה בקרקע. טקסט מלווה: "זה הגשר שלכם לעולם ההשקעות. נזיל תמיד, אבל צומח כמו בבורסה".

📇 Flashcard 1: קופת גמל להשקעה היא המוצר הכי גמיש בישראל. הכסף נזיל תמיד (אפשר למשוך תוך ימים) והוא מושקע בשוק ההון לפי בחירתך.

📇 Flashcard 2: אם תתאפקו ותמשכו את הכסף כקצבה רק אחרי גיל 60, תקבלו פטור מלא ממס רווחי הון (25%). הטבה נדירה ומטורפת.

❓ Quiz 1 (Multiple Choice):
  - Question: מה ההבדל העיקרי בין קופת גמל להשקעה לבין הפנסיה שלכם?
  - Options: A) אין הבדל, שניהם אותו מוצר, B) בקופת גמל להשקעה הכסף נזיל ואפשר למשוך בכל גיל (אבל משלמים מס רווחים), C) הפנסיה נותנת תשואה גבוהה יותר, D) קופת גמל מיועדת רק לעצמאים
  - Correct Answer: B
  - Success Feedback: 💧 בדיוק! הגמישות הזו היא שהופכת אותה ללהיט.
  - Fail Feedback: 🔐 לא. פנסיה נעולה עד הפרישה. "להשקעה" נזילה תמיד.

❓ Quiz 2 (Scenario-based):
  - Question: יש לך 10,000 ש"ח לטיול בעוד שנתיים. למה לשים אותם בקופת גמל להשקעה ולא בעו"ש?
  - Options: A) כי הכסף יכול לצמוח בבורסה, בעו"ש הוא נשחק מהאינפלציה, B) כי זה יותר בטוח מעו"ש, C) כי המעסיק מוסיף כסף, D) כי אין דמי ניהול
  - Correct Answer: A
  - Success Feedback: 🚀 נכון. זה לתת לכסף שלך לעבוד בזמן שאתה מתכנן את הטיול.
  - Fail Feedback: 📉 עו"ש זה ליום-יום. לטווח של שנתיים ומעלה, הכסף חייב להיות מושקע כדי לא להישחק.

❓ Quiz 3 (Multiple Choice):
  - Question: מהי תקרת ההפקדה השנתית לקופת גמל להשקעה?
  - Options: A) אין תקרה, מפקידים כמה שרוצים, B) כ-79,000 ש"ח בשנה לאדם, C) 20,000 ש"ח בשנה, D) עד מיליון ש"ח
  - Correct Answer: B
  - Success Feedback: 💰 יפה. המדינה מגבילה את ההפקדה כי הטבת המס בפרישה נדיבה מאוד.
  - Fail Feedback: 🛑 לא. המדינה לא נותנת להפקיד שם מיליונים בגלל הפטור הנדיב בסוף.

❓ Quiz 4 (Scenario-based):
  - Question: השקעת ועברו 3 שנים. הרווחת 2,000 ש"ח ואתה מושך הכל. כמה מס תשלם?
  - Options: A) אפס מס – קופת גמל תמיד פטורה, B) 25% מס רווח הון מהרווח (500 ש"ח), C) 10% מס מופחת כי זה חיסכון, D) מס רק אם הרווח מעל 10,000 ש"ח
  - Correct Answer: B
  - Success Feedback: 🏦 נכון. משכת לפני גיל 60? המדינה לוקחת את הנתח הרגיל שלה מהרווחים.
  - Fail Feedback: 💸 הפטור הוא לא אוטומטי. רק משיכה כקצבה אחרי גיל 60 פטורה ממס.

🎮 SIM Concept: "מסלול המכשולים": המשתמש בוחר מסלול השקעה. רואה את הכסף מתקדם. בירידה בשוק – המשתמש מחליט אם למשוך (ולשלם מס) או להמשיך ליעד.

## Module 18: ניהול אוטומטי (רובו-אדוויזור)
🎯 הקדמת המודול: לא כולנו רוצים להיות זאבים מוול סטריט. לפעמים אנחנו פשוט רוצים שהכסף ינוהל נכון בלי שנצטרך להסתכל על גרפים כל יום. הכירו את הניהול האוטומטי – איפה שהאלגוריתם עובד, ואתם נחים.

🎬 Video Hook: בחור מנסה לקרוא גרפים מסובכים ונרדם. לוחץ על כפתור "ניהול אוטומטי", הרובוט עושה הכל והוא יוצא לים.

🎯 Interactive Intro: מופיע לוח בקרה עם סליידרים: "גיל", "מטרת השקעה", ו"רמת פחד מירידות". המשתמש מכוון אותם ורואה איך הרובוט בונה לו "עוגת השקעות" שמשתנה לפי ההגדרות. טקסט מלווה: "לא חייבים להיות מומחים. תנו לאלגוריתם לעבוד בזמן שאתם חיים את החיים".

📇 Flashcard 1: מערכות "רובו-אדוויזור" בונות לך תיק השקעות אוטומטי. זה מנטרל את הרגש – הרובוט לא מפחד כשכולם בלחץ.

📇 Flashcard 2: היתרון הגדול: איזון אוטומטי. הרובוט מוודא שהתיק תמיד נשאר במסלול שקבעתם, בלי שתצטרכו לבדוק כל יום.

❓ Quiz 1 (Multiple Choice):
  - Question: מה הצעד הראשון שרובו-אדוויזור יבקש ממך?
  - Options: A) לבחור מניות ספציפיות, B) למלא שאלון אפיון סיכון (מתי תצטרך את הכסף? איך תגיב לירידות?), C) להפקיד לפחות 50,000 ש"ח, D) לפתוח חשבון מסחר בבורסה
  - Correct Answer: B
  - Success Feedback: 📋 בול. הכל מתחיל בלהבין מי אתה ומה מתאים לאופי שלך.
  - Fail Feedback: 🤖 לא. הרובוט לא מנחש. הוא בונה תיק על סמך התשובות שלך לשאלון.

❓ Quiz 2 (Scenario-based):
  - Question: הבורסה צללה ב-10%. מה הרובו-אדוויזור יעשה בדרך כלל?
  - Options: A) ימכור הכל כדי להגן עליך, B) יבצע "איזון מחדש" – יקנה עוד ממה שירד כדי לחזור לתמהיל המקורי, C) ישלח לך הודעת פאניקה, D) יכבה את עצמו עד שהשוק יתייצב
  - Correct Answer: B
  - Success Feedback: ⚖️ חכם! איזון מחדש זו הדרך של הרובוט לקנות בזול ולמכור ביוקר אוטומטית.
  - Fail Feedback: 🚫 ממש לא. הרובוט לא פועל מפחד. הוא מוודא שהתיק נשאר ביחס שקבעת.

❓ Quiz 3 (Multiple Choice):
  - Question: למי הכי מתאים שימוש בניהול השקעות דיגיטלי?
  - Options: A) למי שרוצה "לשגר ושכוח" – השקעה מפוזרת בלי כאב ראש, B) למי שרוצה להמר על המניה הבאה שתתפוצץ, C) רק למי שיש לו מעל מיליון ש"ח, D) רק לאנשים מעל גיל 40
  - Correct Answer: A
  - Success Feedback: 🏖️ בדיוק. זה פתרון מעולה למי שרוצה תשואה בלי כאב ראש ניהולי.
  - Fail Feedback: ❌ לא. רובוטים משקיעים בפיזור רחב (מדדים), לא בהימורים על מניות בודדות. ומתאים לכל סכום.

❓ Quiz 4 (Multiple Choice):
  - Question: מה המחיר שמשלמים על הנוחות של ניהול אוטומטי?
  - Options: A) סיכון גבוה יותר מהשקעה עצמאית, B) דמי ניהול (עמלה) שמשלמים לחברה שמפעילה את הרובוט, C) נעילת הכסף לשנתיים, D) ויתור על הטבות מס
  - Correct Answer: B
  - Success Feedback: 💸 נכון. הניהול עולה קצת כסף, בעוד שבניהול עצמאי אתה חוסך עמלות אבל עובד קשה.
  - Fail Feedback: 🚩 לא. המערכות האלה מפוקחות ונזילות. המחיר היחיד הוא דמי הניהול על השירות.

🎮 SIM Concept: "שגר ושכח": המשתמש עונה על שאלות סיכון, והרובוט בונה תיק. המשחק מריץ 10 שנים ב-30 שניות. המשתמש רואה איך התיק "מתקן" את עצמו במשברים.

## Non-Goals
- Interactive SIM games are concept-only (description for future implementation)
- Video Hook production (text descriptions only for now)

## Technical Notes
- **Shared Types:** Import `Chapter`, `Module`, `Flashcard`, `QuizQuestion`, `SimConcept` from `chapter-1-content/types.ts`
- **Store:** Relies on multi-chapter store infrastructure from PRD8 US-002
- **Navigation:** Relies on `ChapterSelectScreen` and reusable `ChapterMapScreen` from PRD8
- **Interactive Intro:** Relies on `InteractiveIntroCard` component from PRD8 US-003
- **RTL Support:** All Hebrew content must render correctly in RTL layout
