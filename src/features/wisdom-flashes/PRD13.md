# PRD 13: פינת חכמה — מבזקי פסיכולוגיה פיננסית 🧠

## 🌟 הקדמת הפיצ'ר
בנוסף לציטוטים המפורסמים ממבזקי החכמה (PRD12), אנחנו רוצים להוסיף שכבה נוספת של תוכן: **תובנות פסיכולוגיות קצרות** שמסבירות למשתמש איך המוח שלו עובד כשמדובר בכסף והשקעות. אלו לא ציטוטים מאנשים מפורסמים — אלו עקרונות מוכחים מתחום הכלכלה ההתנהגותית (Behavioral Finance), הטיות קוגניטיביות מתועדות, ותובנות פסיכולוגיות שהקונצנזוס המדעי תומך בהן. המבזקים יוצגו באותה מערכת פופאפ של PRD12, אך עם קטגוריזציה ומנגנון שמירה/שיתוף.

---

## User Stories

### US-001: Psychological Wisdom Data
**Description:** As a developer, I want a typed data file with categorized psychological wisdom flashes so the existing wisdom system can serve them alongside famous quotes.

**Acceptance Criteria:**
- [ ] Create `psychWisdomData.ts` with 25 wisdom entries, each containing: `id`, `text`, `category`, `icon` (emoji per category)
- [ ] Define `PsychWisdomFlash` interface in `types.ts`: `{ id: string; text: string; category: WisdomCategory; icon: string }`
- [ ] Define `WisdomCategory` type: `'cognitive-bias' | 'emotional-control' | 'discipline' | 'contrarian' | 'money-psychology' | 'right-approach'`
- [ ] All 25 entries populated from content section below
- [ ] Typecheck passes

### US-002: Extend Wisdom Store for Categories & Favorites
**Description:** As a developer, I want the wisdom store to support categorized flashes and a favorites mechanism so users can save and revisit meaningful insights.

**Acceptance Criteria:**
- [ ] Extend `useWisdomStore` (from PRD12) to also pull from `psychWisdomData` pool
- [ ] Add `favorites: string[]` array to store (persisted)
- [ ] Add `toggleFavorite(id: string)` and `isFavorite(id: string)` actions
- [ ] Random selection should mix both quote types (PRD12 quotes + PRD13 psych flashes)
- [ ] Typecheck passes

### US-003: Favorites Heart Button on WisdomPopupCard
**Description:** As a user, I want to tap a heart icon on a wisdom flash to save it to my favorites so I can revisit insights that resonate with me.

**Acceptance Criteria:**
- [ ] Add ❤️ toggle button to `WisdomPopupCard` (from PRD12 US-002)
- [ ] Filled heart = saved, outline heart = not saved
- [ ] Heart animates on tap (scale bounce via `react-native-reanimated`)
- [ ] Typecheck passes

### US-004: Favorites Gallery Screen
**Description:** As a user, I want a screen where I can browse all my saved wisdom flashes so I can revisit them anytime.

**Acceptance Criteria:**
- [ ] Create `FavoritesScreen` component showing saved flashes as scrollable cards
- [ ] Each card shows the flash text, category icon, and category name (Hebrew)
- [ ] Empty state with encouraging message when no favorites saved
- [ ] Add navigation entry to profile or settings area
- [ ] Styling matches FinPlay dark/neon theme
- [ ] Typecheck passes

### US-005: Share as Image
**Description:** As a user, I want to share a wisdom flash as a branded image so I can post it on social media.

**Acceptance Criteria:**
- [ ] Add share button (📤) to `WisdomPopupCard` and `FavoritesScreen` cards
- [ ] Generate a styled image with the flash text + FinPlay branding using `react-native-view-shot`
- [ ] Use `expo-sharing` to open the native share sheet
- [ ] Typecheck passes

---

## Content Data (מבזקי פסיכולוגיה פיננסית)

> **הערה:** כל הפריטים שנשארו הם עקרונות מוכחים מתחום הכלכלה ההתנהגותית ופסיכולוגיה קוגניטיבית — קונצנזוס מקצועי, לא דעות אישיות.

### קטגוריה א': הטיות קוגניטיביות והחלטות (`cognitive-bias`) 🧩

1. 💡 **ידעת?** רוב האנשים מקבלים החלטה תוך דקות ספורות — ואז מבלים שעות בלחפש סיבות שיתמכו בה. בהשקעות, זה מתכון להפסד.

2. 💡 **עצירה לרגע:** כשאתה בוחר מניה — שאל את עצמך: האם בחרתי אותה כי חקרתי לעומק, או כי רציתי שהיא תהיה הבחירה הנכונה?

3. 💡 **מלכודת הנוחות:** המוח שלנו מעדיף מידע שמאשר את מה שכבר החלטנו. משקיע חכם מחפש דווקא את המידע שסותר אותו.

4. 💡 **חשוב על זה:** טעות נשארת טעות גם אם אלפי אנשים עושים אותה יחד. הקהל לא הופך שגיאה לאסטרטגיה.

5. 💡 **חשוב על זה:** אנחנו לא רואים את השוק כפי שהוא — אנחנו רואים אותו דרך מצב הרוח שלנו, הפחדים שלנו, והתקוות שלנו.

### קטגוריה ב': שליטה רגשית (`emotional-control`) 🎭

6. 💡 **רגע של אמת:** כשהשוק נפתח אחרי אירוע דרמטי, הרגשות שוטפים את כולם. מי שמחכה שהרעש ישקט — רואה את התמונה המלאה.

7. 💡 **תזכורת יומית:** פחד וחמדנות הם שני הכוחות הכי חזקים בשוק. שניהם עובדים נגדך אם אתה לא מזהה אותם.

8. 💡 **שאלה למחשבה:** כשמניה יורדת 30% — אתה מרגיש אחרת מאשר כשהיא עולה 30%. למה? כי ההפסד כואב פי שניים מהרווח.

9. 💡 **כלל ברזל:** אל תקבל החלטות השקעה בשעות של לחץ רגשי. מה שנראה דחוף היום — לרוב יכול לחכות ליום המחרת.

10. 💡 **מחשבה:** בימים סוערים בשוק, היכולת לשבת בשקט ולא לעשות כלום — היא לפעמים ההחלטה הכי חכמה.

### קטגוריה ג': משמעת השקעתית (`discipline`) 📏

11. 💡 **שווה לזכור:** מי שלא לומד את המקצוע לעומק — משלם את שכר הלימוד ישירות לשוק.

12. 💡 **בדיקת מציאות:** לרכוש מניה בלי להבין מה החברה עושה, זה כמו לשים כסף במעטפה ולזרוק אותה מהחלון.

13. 💡 **חוק פשוט:** אין קיצורי דרך בהשקעות. מי שמחפש טריק מהיר — בדרך כלל מוצא הפסד מהיר.

### קטגוריה ד': חשיבה נגד הזרם (`contrarian`) 🔄

14. 💡 **היפוך מעניין:** הימים הכי טובים בשוק מגיעים הרבה פעמים דווקא אחרי הימים הכי גרועים. מי שברח — פספס.

15. 💡 **חכמה עתיקה:** כשהשוק עולה, כולם מרגישים גאונים. המבחן האמיתי הוא איך אתה מתנהל כשהוא יורד.

### קטגוריה ה': פסיכולוגיה של כסף (`money-psychology`) 💭

16. 💡 **מחשבה יומית:** היחס שלך לכסף נבנה שנים לפני שפתחת חשבון מסחר. תבין את היחס הזה — ותבין את ההחלטות שלך.

17. 💡 **עובדה:** אנשים מוכנים לקחת סיכון גדול כדי להימנע מהפסד, אבל נהיים שמרנים כשמדובר ברווח. זה בדיוק ההפך ממה שצריך.

18. 💡 **תובנה:** הכסף שהפסדת כואב יותר מהכסף שהרווחת משמח. הכרה בעובדה הזו היא הצעד הראשון לקבלת החלטות טובות יותר.

19. 💡 **שווה לדעת:** אנשים נוטים להעריך יותר דברים שכבר בבעלותם. זה נכון גם למניות — וזו הסיבה שקשה למכור גם כשצריך.

20. 💡 **בדוק את עצמך:** האם אתה מחזיק מניה כי יש לה עתיד — או כי קשה לך להודות שטעית?

### קטגוריה ו': בניית גישה נכונה (`right-approach`) 🧭

21. 💡 **תזכורת:** להשקיע בהצלחה זה לא עניין של מזל או תחושות בטן. זה עניין של שיטה, סבלנות, ולמידה מתמדת.

22. 💡 **משל חכם:** אסטרטגיית השקעה בלי כללים ברורים היא כמו סירה בלב ים בלי הגה — כל גל יכול לסחוף אותה לכיוון אחר.

23. 💡 **שאלה חשובה:** לפני כל עסקה, שאל: מה יגרום לי למכור? אם אין לך תשובה — אל תקנה.

24. 💡 **זכור:** ההיסטוריה של השוק חוזרת על עצמה לא כי העולם זהה — אלא כי הפסיכולוגיה האנושית לא משתנה.

25. 💡 **לסיום:** המשקיע הכי מסוכן הוא לא זה שלא יודע — אלא זה שבטוח שהוא יודע, בלי שבדק מספיק.

---

## 🎨 Design & Aesthetic Guidelines
- **הבדל מ-PRD12:** מבזקי PRD12 מציגים ציטוט + שם המחבר + תפקיד. מבזקי PRD13 מציגים תובנה פסיכולוגית + אייקון קטגוריה + שם קטגוריה בעברית.
- **Category Labels (Hebrew):** cognitive-bias → "הטיות קוגניטיביות", emotional-control → "שליטה רגשית", discipline → "משמעת השקעתית", contrarian → "חשיבה נגד הזרם", money-psychology → "פסיכולוגיה של כסף", right-approach → "בניית גישה נכונה"
- **Card Variant:** כרטיס פסיכולוגי מקבל גוון סגול-כהה (gradient) במקום הסגנון ההולוגרפי של ציטוטים, כדי להפריד ויזואלית בין שני סוגי התוכן.
- **Heart Animation:** לב מתמלא בצבע אדום-ניאון (`#ef4444`) עם אנימציית scale bounce (`withSpring`).
- **Share Image:** רקע כהה עם מסגרת ניאון, טקסט המבזק במרכז, לוגו FinPlay בתחתית.

## Non-Goals
- מערכת המלצות חכמה שמבוססת על התנהגות המשתמש (אלגוריתם ML).
- תרגום אוטומטי של תוכן לשפות נוספות.
- עריכה או הוספה של מבזקים על ידי המשתמש.

## Technical Notes
- **תלות ב-PRD12:** PRD זה מרחיב את המערכת שנבנתה ב-PRD12 (Store, PopupCard, Triggers). אם PRD12 לא מומש — יש לממש קודם את US-001 ו-US-002 של PRD12.
- **Dependencies:** `react-native-view-shot` ו-`expo-sharing` נדרשים ל-US-005 (שיתוף כתמונה). יש להתקין אם לא קיימים.
- **Persistence:** מערך favorites נשמר ב-Zustand persist (AsyncStorage), כך שמועדפים שמורים בין הפעלות.
- **RTL Support:** כל הטקסטים בעברית — יישור ימין חובה.
- **Content Filtering:** הוסרו 5 פריטים מהתוכן המקורי שהיו דעות אישיות ולא קונצנזוס מקצועי (למשל: "cut losers first", "focus beats diversification", "crowd is always wrong at extremes").
