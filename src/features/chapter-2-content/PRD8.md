# PRD 8: תוכן האפליקציה בייצור - פרק 2: ביטחון (Security) 🛡️

## 🌟 הקדמת הפרק: בונים את המבצר
ברוכים הבאים לשלב שבו אתם מפסיקים להיות "טרף" של המערכת ומתחילים להשתמש בחוקים שלה לטובתכם. בפרק "ביטחון" אנחנו בונים את חומות ההגנה שלכם לטווח ארוך. נבין איך המערכת הפיננסית מדרגת את האמינות שלכם, איך לגרום למדינה להחזיר לכם כסף, ואיך לוודא שאתם מכוסים מול הבלת"מים הגדולים באמת של החיים. זה הזמן לבנות בסיס פלדה.

מסמך זה מכיל טיוטה של תוכן המודולים עבור הפרק השני במשחק: "ביטחון".

## User Stories

### US-001: Chapter 2 Content Data
**Description:** As a developer, I want typed data for Chapter 2 (Security) modules so the existing lesson flow can render this chapter's content.

**Acceptance Criteria:**
- [x] Create `chapter2Data.ts` with all 5 modules (10-14) fully populated from PRD content below, using the same `Chapter` type from `chapter-1-content/types.ts`
- [x] Re-export or import shared types from `chapter-1-content/types.ts` (no duplication)
- [x] Typecheck passes

### US-002: Chapter Store Extension for Chapter 2
**Description:** As a developer, I want the chapter progress store to support multiple chapters so users can track progress in both Chapter 1 and Chapter 2.

**Acceptance Criteria:**
- [x] Extend `useChapterStore` to support a `currentChapterId` field and per-chapter progress (e.g., `progress: Record<chapterId, { completedModules, quizResults }>`)
- [x] Existing Chapter 1 progress is preserved (migration-safe)
- [x] Typecheck passes

### US-003: Interactive Intro Phase in Lesson Flow
**Description:** As a user, I want to see an engaging interactive intro screen before the flashcards, so that each module opens with a visual "hook" that draws me in.

**Acceptance Criteria:**
- [x] Add `"intro"` phase to `FlowPhase` type in `LessonFlowScreen`
- [x] Create `InteractiveIntroCard` component that renders the module's `interactiveIntro` text in a visually engaging card with the module's accompanying text (`טקסט מלווה`)
- [x] The intro card should display a full-screen dark card with neon-accented title, the intro description text, and a "בואו נתחיל" (Let's go) CTA button
- [x] Flow order: intro → flashcards → quizzes → summary
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-004: Chapter Selection Screen
**Description:** As a user, I want to see all available chapters (Survival, Security, and future ones) so I can choose which chapter to study.

**Acceptance Criteria:**
- [x] Create `ChapterSelectScreen` component showing available chapters as large cards
- [x] Each card shows: chapter number, title (Hebrew), icon/emoji, module count, overall progress percentage
- [x] Chapter 1 card links to Chapter 1's `ChapterMapScreen`, Chapter 2 to Chapter 2's map
- [x] Locked chapters (future) appear dimmed with a lock icon
- [x] Styling matches FinPlay dark/neon theme
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-005: Chapter 2 Map Screen
**Description:** As a user, I want a Chapter 2 overview showing modules 10-14 with my progress.

**Acceptance Criteria:**
- [x] Reuse `ChapterMapScreen` component from US-004 of PRD7, passing Chapter 2 data
- [x] Verify it renders correctly with 5 modules (10-14) instead of 9
- [x] Tapping a module opens `LessonFlowScreen` with Chapter 2 module data
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-006: Navigation Update for Multi-Chapter
**Description:** As a user, I want the pyramid screen to link to the chapter selection, so I can access all chapters from there.

**Acceptance Criteria:**
- [ ] Update PyramidScreen layer taps: Layer 1 (Survival) → Chapter 1, Layer 2 (Security) → Chapter 2
- [ ] Or add a "Chapters" entry point that goes to `ChapterSelectScreen`
- [ ] Typecheck passes
- [ ] Verify changes work in browser

---

## Content Data (Modules 10-14)

## Module 10: דירוג אשראי (FICO / BDI)
🎬 Video Hook: בחור מנסה לקחת הלוואה לרכב והבנקאי אומר לו "מצטער, הדירוג שלך ברצפה". הבחור בשוק: "אבל מה עשיתי?!".
🎯 Interactive Intro: מופיע מונה דיגיטלי של נקודות זכות מרחף מעל הראש של הגיבור. פעולת תשלום טובה (מוצגת במעטפה ירוקה) מקפיצה נקודות; חריגה במסגרת זורקת עליו סלע אדום שמוחץ את המונה. טקסט מלווה: "יש מאחורי הקלעים תעודת זהות דיגיטלית ארצית שעוקבת אחרי כל מהלך פיננסי שלך בישראל – והיא קובעת מי יסכים לפתוח לך דלתות, ובאיזה מחיר".
📇 Flashcard 1: דירוג אשראי הוא "תעודת הזהות הפיננסית" שלך. זה מספר שקובע אם יסמכו עליך ויתנו לך הלוואה, ובעיקר – באיזו ריבית.
📇 Flashcard 2: צ'ק שחזר, איחור בתשלום חשמל או חריגה מהמסגרת? הכל נרשם ב"דו"ח נתוני האשראי" של בנק ישראל ונדבק אליך לשנים.
❓ Quiz 1 (Multiple Choice):
  - Question: מי קובע את דירוג האשראי שלך בישראל?
  - Options: A) מנהל הבנק שלך באופן אישי, B) מערכת מרכזית של בנק ישראל שאוספת נתונים מכל הגופים, C) ההורים שלך, D) פייסבוק
  - Correct Answer: B
  - Success Feedback: 🎯 בול. זה מאגר נתונים ארצי שרואה הכל.
  - Fail Feedback: 🚫 טעות. זה לא עניין של קשרים אישיים, זו מערכת אוטומטית שאוספת נתונים על כל צעד פיננסי שלך.
❓ Quiz 2 (Scenario-based):
  - Question: חזר לך חיוב של 50 שקל בגלל טעות. "שטויות", אתה אומר. האם זה ישפיע על הדירוג?
  - Options: A) לא, זה סכום קטן מדי, B) כן, למערכת לא אכפת מה הסכום – חזרה של חיוב היא נורה אדומה בוהקת, C) רק אם זה קורה פעמיים
  - Correct Answer: B
  - Success Feedback: 🚩 בדיוק. המערכת מחפשת אמינות. איחור הוא איחור, גם אם זה שקל.
  - Fail Feedback: 💀 אזהרה! גם איחור קטן בסלולר או בחשמל מדווח למאגר ופוגע לך בדירוג לשנים קדימה.
❓ Quiz 3 (Multiple Choice):
  - Question: איך אפשר לשפר דירוג אשראי שנפגע?
  - Options: A) למחוק את החשבון ולפתוח חדש, B) לשלם הכל בזמן לאורך תקופה ארוכה ולהראות התנהלות אחראית, C) לשחד את הבנקאי
  - Correct Answer: B
  - Success Feedback: 📈 נכון. זמן והתמדה הם התרופה היחידה לדירוג פצוע.
  - Fail Feedback: ⏳ אין קיצורי דרך. רק היסטוריה נקייה של תשלומים לאורך זמן תעלה את הדירוג חזרה.
❓ Quiz 4 (Scenario-based):
  - Question: חבר מבקש שתחתום לו ערבות להלוואה. איך זה משפיע עליך?
  - Options: A) זה לא קשור אלי, זו ההלוואה שלו, B) זה מופיע בדוח האשראי שלך ואם הוא לא ישלם – הדירוג שלך יתרסק.
  - Correct Answer: B
  - Success Feedback: 🧠 חכם. ערבות היא התחייבות לכל דבר. אל תחתום למי שאתה לא סומך עליו ב-200%.
  - Fail Feedback: 🛑 סכנה! ערבות הופכת אותך לאחראי לחוב. אם הוא מפשל, הדירוג שלך נשרף יחד איתו.
🎮 SIM Concept: "בנה את הציון": גרף של ציון האשראי שלך (300-1000). נזרקים עליך אירועים (תשלום בזמן, חריגה, הלוואה חדשה) ואתה צריך להגיב כדי להשאיר את המדד בירוק.

## Module 11: נקודות זיכוי והטבות מס
🎬 Video Hook: בחורה רואה בתלוש שגבו ממנה 500 ש"ח מס הכנסה, מוסיפה "נקודת זיכוי" והמס נעלם. "קסם? לא, חוק".
🎯 Interactive Intro: מפלצת אדומה ורעבה ("מס הכנסה") נגלית עלי המסך, והמשתמש גורר עליה "נקודת פלוס זהובה" שחוסמת חלק מהלוע שלה. המפלצת מתכווצת חלקית. טקסט מלווה: "המדינה מחלקת שוברים שנקראים 'נקודות זיכוי' – הן חותכות לכם אלפי שקלים של חובות מס ישר מהתלוש. פשוט חייבים לוודא שלא שוכחים לעדכן אותן".
📇 Flashcard 1: נקודת זיכוי היא הנחה במס שהמדינה נותנת לך. כל נקודה שווה כ-242 ש"ח נטו בחודש (נכון ל-2024).
📇 Flashcard 2: כל תושב ישראל מקבל 2.25 נקודות אוטומטית. חיילים משוחררים, אקדמאים והורים מקבלים עוד – וזה שווה אלפי שקלים בשנה.
❓ Quiz 1 (Multiple Choice):
  - Question: כמה שווה בערך נקודת זיכוי אחת בחודש בנטו שלך?
  - Options: A) 100 ש"ח, B) כ-242 ש"ח, C) 1,000 ש"ח, D) זה תלוי כמה הברוטו שלך
  - Correct Answer: B
  - Success Feedback: 💵 בול. זה כסף חי שנשאר אצלך בכיס במקום ללכת למדינה.
  - Fail Feedback: 📉 לא. הסכום קבוע בחוק ומתעדכן כל שנה. נכון לעכשיו זה בערך 242 ש"ח לכל נקודה.
❓ Quiz 2 (Scenario-based):
  - Question: השתחררת מצה"ל אחרי שירות מלא. לכמה זמן מגיעה לך הטבת מס של נקודות זיכוי?
  - Options: A) לכל החיים, תודה על השירות!, B) ל-36 חודשים (3 שנים) מרגע השחרור, C) רק לשנה הראשונה
  - Correct Answer: B
  - Success Feedback: 🎖️ נכון. זו מתנת שחרור משמעותית מהמדינה כדי לעזור לך להתחיל את האזרחות.
  - Fail Feedback: 🪖 לא. ההטבה מוגבלת ל-36 החודשים הראשונים אחרי השחרור. אל תפספס אותה!
❓ Quiz 3 (Multiple Choice):
  - Question: סיימת תואר ראשון. האם מגיע לך משהו ממס הכנסה?
  - Options: A) לא, תואר זה בשבילך, B) כן, נקודת זיכוי אחת למשך שנה (או חצי נקודה לתואר קצר), C) המדינה מחזירה לך את שכר הלימוד
  - Correct Answer: B
  - Success Feedback: 🎓 בדיוק. המדינה מתמרצת השכלה דרך הנחה במס.
  - Fail Feedback: 📚 טעות. מגיעה לך נקודת זיכוי אחת על תואר ראשון. וודא שהמעסיק יודע מזה!
❓ Quiz 4 (Scenario-based):
  - Question: עברת לגור ביישוב בפריפריה שמוגדר כ"יישוב מוטב". מה זה אומר על התלוש שלך?
  - Options: A) תקבל הנחה בארנונה בלבד, B) תקבל זיכוי מס באחוזים מהשכר שיכול לחסוך לך אלפי שקלים בחודש.
  - Correct Answer: B
  - Success Feedback: 🏡 בינגו. הטבת יישוב היא אחת ההטבות הכלכליות הכי חזקות שיש בישראל.
  - Fail Feedback: 🗺️ לא רק ארנונה. מגורים ביישובים מסוימים נותנים הנחה מטורפת במס הכנסה. שווה בדיקה!
🎮 SIM Concept: "פאזל התלוש": דמות עם מאפיינים (חייל משוחרר, גר בשדרות, תואר ראשון). המשתמש צריך לגרור את "כרטיסי הנקודות" המתאימים לתלוש שלה כדי להוריד את המס למינימום.

## Module 12: פנסיה – הבסיס (החיסכון הכי חשוב)
🎯 הקדמת המודול: פנסיה נשמעת כמו מושג של סבא וסבתא, אבל בפועל זו "קופסת כסף" שבה מישהו אחר (המעסיק) חייב להוסיף לכם כסף על כל שקל שאתם שמים. בואו נבין איך לגרום למכונה הזו לעבוד בשבילכם כבר מעכשיו, כדי שבגיל 60 תוכלו לחיות כמו מלכים ולא לרדוף אחרי קצבאות.

🎬 Video Hook: בחור בן 20 ובחור בן 60 מדברים. הצעיר: "מה אכפת לי פנסיה עכשיו?". הזקן: "הלוואי שהייתי מקשיב לזה כשהייתי בגילך, זה ההבדל בין פנטהאוז לדירת מרתף".
🎯 Interactive Intro: על המסך מופיעה קופה עם כיתוב "הפנסיה שלי". המשתמש גורר מטבע של 500 ש"ח פנימה. ברגע שהמטבע נוחת, "יד" של מעסיק וירטואלי זורקת אוטומטית עוד 600 ש"ח לאותה קופה. טקסט מלווה: "ראיתם? זה הכסף היחיד בעולם שבו המעסיק חייב להוסיף לכם כסף רק כי הסכמתם לחסוך לעצמכם".
📇 Flashcard 1: פנסיה היא חיסכון חובה שבו המעסיק "מכפיל" לכם את הכסף (בערך). זה כסף שלכם ששמור בקופסה נעולה עד הפרישה, כדי שתפרשו בכבוד ובסטייל.
📇 Flashcard 2: הכוח הסודי פה הוא הזמן. בגלל הריבית דריבית, כל שקל שתשימו בגיל 20 יהיה שווה בערך פי 10 (!!!) מאותו שקל שתשימו בגיל 50.
❓ Quiz 1 (Multiple Choice):
  - Question: מי חייב להפריש כסף לקרן הפנסיה שלך?
  - Options: A) רק אתה, B) רק המעסיק, C) גם אתה וגם המעסיק (חובה על פי חוק), D) המדינה בלבד
  - Correct Answer: C
  - Success Feedback: 🤝 נכון. זה שילוב של שניכם, והמעסיק שם חלק גדול יותר (כולל פיצויים).
  - Fail Feedback: 🛑 טעות. החוק מחייב את שניכם להפריש אחוזים מהשכר כדי להבטיח את העתיד שלך.
❓ Quiz 2 (Scenario-based):
  - Question: התחלת עבודה חדשה. מי בוחר באיזו קרן פנסיה (אלטשולר, הראל, מנורה וכו') יופקד הכסף?
  - Options: A) המעסיק מחליט עבורי, B) אני בוחר איזו קרן שבא לי והמעסיק חייב להפקיד לשם, C) סוכן הביטוח מחליט
  - Correct Answer: B
  - Success Feedback: 👑 בדיוק. זכות הבחירה היא שלך בלבד. אל תיתן להם להחליט בשבילך.
  - Fail Feedback: ❌ לא. לפי החוק, לעובד יש זכות מלאה לבחור את סוג המוצר ואת הגוף המנהל.
❓ Quiz 3 (Multiple Choice):
  - Question: מה קורה לכסף בקרן הפנסיה במהלך ה-40 שנה עד הפרישה?
  - Options: A) הוא שוכב בכספת בבנק, B) הוא מושקע בשוק ההון (מניות, אג"ח) כדי לגדול ולצבור ריבית, C) המדינה משתמשת בו
  - Correct Answer: B
  - Success Feedback: 📈 יס! הכסף עובד בשבילך בשוק ההון. בגלל זה המסלול שבחרת כל כך חשוב.
  - Fail Feedback: 💤 ממש לא שוכב. הכסף מושקע כדי לייצר תשואה, אחרת הוא היה מאבד ערך בגלל האינפלציה.
❓ Quiz 4 (Scenario-based):
  - Question: מה היתרון הכי גדול של קרן פנסיה לעומת סתם חיסכון בבנק?
  - Options: A) הבנק יותר בטוח, B) הטבות מס מטורפות מהמדינה + המעסיק שם לך כסף "מתנה" על כל הפקדה שלך.
  - Correct Answer: B
  - Success Feedback: 🎁 בינגו. זה המוצר עם התשואה הכי גבוהה "על הנייר" בגלל השתתפות המעסיק והטבות המס.
  - Fail Feedback: 🏦 בבנק אין מעסיק שמוסיף לך כסף ואין הטבות מס. פנסיה היא המכשיר הכי משתלם בישראל לטווח ארוך.
🎮 SIM Concept: "מרוץ הפרישה": שני רצים על המסך – "נטע" שמתחילה להפריש עכשיו (קטן ועקבי) ו"אורי" שמתחיל רק בעוד 15 שנה (גדול ומהיר). המשתמש רואה איך נטע עוקפת בסיבוב ומגיעה לקו הסיום עם הר ערימות של כסף, בזמן שאורי מזיע כדי להדביק את הפער.

## Module 13: קרן השתלמות (היהלום)
🎬 Video Hook: מישהו לוחש למצלמה: "רוצה לדעת איך להרוויח כסף בלי לשלם עליו שקל מס למדינה? קוראים לזה קרן השתלמות".
🎯 Interactive Intro: המשתמש רואה שתי תיבות רווח זהות: מתיבת השקעות רגילה, "יד שחופה" של המדינה גוזלת מיד 25% מהמטבעות שבתיבה. התיבה השנייה, "השתלמות", מוגנת בבועה כחולה, והיד מחליקה החוצה מבלי לגעת. טקסט מלווה: "תכירו את המקלט: ההטבה היחידה בארץ שעובד פשוט יכול להרוויח בה כספים פטורים לחלוטין ממס רווחי הון אם יתמיד מספיק".
📇 Flashcard 1: קרן השתלמות היא "ההטבה הכי טובה בישראל". זה חיסכון לטווח בינוני (6 שנים) שבו המדינה לא לוקחת לך מס רווחי הון (25%) על הרווחים.
📇 Flashcard 2: המעסיק שם פי 3 ממה שאתה שם (לרוב 7.5% מול 2.5%). זה פשוט כסף חינמי שגדל פטור ממס. חובה לכל מי שיכול.
❓ Quiz 1 (Multiple Choice):
  - Question: מתי הכסף בקרן השתלמות הופך ל"נזיל" (אפשר למשוך אותו בלי קנס)?
  - Options: A) אחרי שנה, B) רק בפנסיה, C) אחרי 6 שנים מיום הפתיחה, D) מיד
  - Correct Answer: C
  - Success Feedback: 🕒 נכון. 6 שנים זה הזמן שצריך לחכות כדי ליהנות מהפטור ממס.
  - Fail Feedback: ⏳ סבלנות. הכסף ננעל ל-6 שנים כדי לעודד חיסכון, אבל אחרי זה הוא כולו שלך פטור ממס.
❓ Quiz 2 (Scenario-based):
  - Question: המעסיק מציע לך: "תוסיף 200 שקל לקרן השתלמות ואני אוסיף לך 600 שקל". מה התשובה?
  - Options: A) לא תודה, אני צריך את ה-200 שקל לעו"ש, B) ברור! זה כאילו העלו לי את השכר ב-600 שקל נטו.
  - Correct Answer: B
  - Success Feedback: 💎 לגמרי. זו העלאת שכר במסווה של חיסכון. לעולם אל תגיד לזה לא.
  - Fail Feedback: 🤦♂️ אחי, זו מתנה. המעסיק שם לך פי 3 ממה שאתה שם. אל תשאיר את הכסף הזה על הרצפה.
❓ Quiz 3 (Multiple Choice):
  - Question: מה זה "פטור ממס רווחי הון" בקרן השתלמות?
  - Options: A) המדינה לא לוקחת 25% מהרווחים שהכסף עשה בבורסה, B) המעסיק לא משלם מס, C) אין מע"מ על הקרן
  - Correct Answer: A
  - Success Feedback: 🎯 פגיעה. בשום מקום אחר לא תקבל פטור כזה. זה שווה המון כסף לאורך שנים.
  - Fail Feedback: 💸 בתיק השקעות רגיל, המדינה לוקחת רבע מהרווחים שלך. בקרן השתלמות? אפס. זה היתרון הגדול.
❓ Quiz 4 (Scenario-based):
  - Question: עברו 6 שנים והקרן נזילה. האם כדאי למשוך את הכסף כדי לקנות רכב?
  - Options: A) כן, הכסף נזיל אז יאללה, B) עדיף להשאיר – הכסף ימשיך לצבור רווחים פטורים ממס לנצח, פטור כזה לא מקבלים שוב.
  - Correct Answer: B
  - Success Feedback: 🧠 מוח של משקיע. הקרן היא "מכונה פטורה ממס", חבל להוציא ממנה את הדלק.
  - Fail Feedback: 🚘 אפשר, אבל זה חבל. ברגע שמשכת, איבדת את הפטור ממס על הרווחים העתידיים של הכסף הזה.
🎮 SIM Concept: "מגרסה": המשתמש רואה שתי ערימות כסף גדלות. מערימה אחת "המגרסה של מס הכנסה" אוכלת 25% מהרווח בכל שנה. מהערימה של קרן השתלמות היא לא נוגעת.

## Module 14: ביטוחים – מי נגד מי?
🎬 Video Hook: בחור עושה תאונה קטנה, מחייך ואומר: "מזל שעשיתי צד ג'". ואז הוא מגלה שהצד השני זה פרארי...
🎯 Interactive Intro: מתקרב טיל מאיים המסומן "שחיטה בתאונה". המשתמש מתבקש להקריב כמה נקודות קטנות עבור הפעלת שדה כוח (פרמיית ביטוח מגן). הטיל המפלצתי פוגע במגן ומתנפץ לאלפי רסיסים מבלי שנגרם שום נזק לחיסכון הליבה. טקסט מלווה: "ביטוח קיים במטרה להגן מפני מכות שהכיס שלכם לעולם לא היה מצליח לשרוד במזומן - מעבירים סיכון עצום למקום שקוף אך בטוח, במחיר נמוך וקבוע".
📇 Flashcard 1: ביטוח הוא הדרך שלך להעביר סיכון גדול לחברה עשירה תמורת סכום קטן כל חודש. המטרה: שאירוע אחד לא ימוטט אותך כלכלית.
📇 Flashcard 2: יש ביטוחי חובה (כמו רכב ובריאות בסיסי) ויש ביטוחי רשות (מקיף, צד ג', מבנה). הסוד הוא לא לעשות "כפל ביטוחים" ולשלם פעמיים על אותו דבר.
❓ Quiz 1 (Multiple Choice):
  - Question: מה זה "השתתפות עצמית" בביטוח?
  - Options: A) הסכום שהביטוח משלם לי, B) הסכום שאני חייב לשלם מהכיס שלי במקרה של תביעה, C) העמלה של הסוכן
  - Correct Answer: B
  - Success Feedback: 🔧 נכון. ככל שההשתתפות העצמית גבוהה יותר, המחיר החודשי של הביטוח יורד.
  - Fail Feedback: 🧾 לא. זה החלק שלך בנזק. הביטוח מכסה רק את מה שמעבר לסכום הזה.
❓ Quiz 2 (Scenario-based):
  - Question: יש לך רכב ישן ששווה 5,000 ש"ח. איזה ביטוח הכי הגיוני לעשות?
  - Options: A) מקיף מלא (כולל גניבה ותאונות), B) חובה + צד ג' (כדי לכסות נזק שתיגרם לאחרים), C) שום ביטוח
  - Correct Answer: B
  - Success Feedback: 🚗 בול. חבל לשלם מקיף יקר על רכב ששווה גרושים, אבל צד ג' חובה כדי שלא תשלם כל החיים אם תפגע במרצדס.
  - Fail Feedback: 💸 מקיף על רכב זול זה בזבוז כסף. הפרמיה תעלה לך כמו חצי רכב תוך שנה. צד ג' זה הפתרון.
❓ Quiz 3 (Multiple Choice):
  - Question: מה זה "כפל ביטוחים"?
  - Options: A) שיש לך שני ביטוחים שונים, B) שאתה משלם לשתי חברות שונות על אותו כיסוי בדיוק (למשל ניתוחים בחו"ל), C) ביטוח שמכסה שני אנשים
  - Correct Answer: B
  - Success Feedback: 👯♂️ נכון. ישראלים משלמים מיליארדים מיותרים בגלל כפל ביטוחים. בדוק ב"הר הביטוח".
  - Fail Feedback: 🚩 לא. זה מצב שבו אתה משלם פעמיים על אותה הגנה. הביטוח לא ישלם לך פעמיים, אז פשוט זרקת כסף.
❓ Quiz 4 (Scenario-based):
  - Question: מהו "הר הביטוח"?
  - Options: A) מקום בירושלים, B) אתר ממשלתי חינמי שבו אפשר לראות את כל הביטוחים שיש לך ולמצוא כפילויות.
  - Correct Answer: B
  - Success Feedback: 🏔️ כלי חובה! שימוש של 2 דקות באתר הזה יכול לחסוך לך מאות שקלים בחודש.
  - Fail Feedback: 🖥️ זה האתר הכי חשוב לסדר בביטוחים. הוא מרכז את כל המידע עליך במקום אחד.
🎮 SIM Concept: "מגן הביטוח": דמות הולכת במסלול מכשולים. היא צריכה לקנות "מגנים" (ביטוחים) ספציפיים. אם היא קונה מגן מיותר (כפל) היא נהיית איטית. אם חסר לה מגן והיא נפגעת – היא חוזרת להתחלה.
