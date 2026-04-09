# PRD 12: מבזקי חכמה (Wisdom Flashes) 💡

## 🌟 הקדמת הפיצ'ר
במהלך השימוש באפליקציה, אנחנו רוצים להעשיר את החוויה של המשתמשים לא רק עם תוכן לימודי מובנה, אלא גם עם השראה ומשפטי מחץ מאנשים ש"עשו את זה". "מבזקי חכמה" הם ציטוטים, טיפים קצרים או תובנות מפורסמות מכלכלנים, משקיעים אגדיים ואנשי חזון. המבזקים יקפצו למשתמש באופן הרמוני במהלך השימוש (למשל אחרי סיום מודול, בעליית רמה, או כשהוא נכנס לאפליקציה). אלו יהיו פופאפים או "טוסטים" בסגנון סייברפנק/גיימינג כדי להתאים לקהל דור ה-Z.

---

## User Stories

### US-001: Wisdom Flashes Data & Store
**Description:** As a developer, I want a structured data setup and global state to manage the wisdom quotes, ensuring users don't see the same quote repetitively.

**Acceptance Criteria:**
- [ ] Create `wisdomData.ts` with an initial list of at least 10-15 famous financial quotes in Hebrew.
- [ ] Each quote object includes: `id`, `text`, `author`, `authorRole` (e.g., "משקיע אגדי"), and optionally an `avatarUrl` or `icon`.
- [ ] Create `useWisdomStore.ts` (Zustand) to track seen quotes and manage the active quote to display.
- [ ] Implement logic to pull a random unseen quote (or cycle through them).

### US-002: UI Component - WisdomPopup
**Description:** As a user, I want the wisdom flashes to appear in a visually engaging and "Gen-Z" appropriate way, fitting the app's neon/cyber aesthetic.

**Acceptance Criteria:**
- [ ] Create a `WisdomPopupCard` component (can be a modal, toast, or a floating card).
- [ ] Design: Holographic/neon borders, sleek typography for the quote, and a distinct avatar/icon for the author.
- [ ] Animations: Smooth pop-in/slide-up using `react-native-reanimated`, and a dismiss animation.
- [ ] Automatically dismiss after X seconds, or require user to swipe/tap "הבנתי" (Got it!).

### US-003: Triggering Mechanism (Hooks/Events)
**Description:** As a user, I want the quotes to appear contextually at exciting moments, not randomly interrupting my focus.

**Acceptance Criteria:**
- [ ] Implement a system to trigger a wisdom flash globally.
- [ ] Hooks/triggers to add:
  - After successfully completing a lesson/module.
  - When achieving a new Streak milestone (e.g., day 3, day 7).
  - Randomly upon app launch (e.g., 20% chance on startup).
- [ ] Ensure the popup is an overlay configured in the root layout (`app/_layout.tsx` or similar) so it can be called from anywhere.

---

## Content Data (מבזקי תובנות וציטוטים)

להלן רשימה ראשונית של ציטוטים מפורסמים לשילוב במערכת:

1. **וורן באפט (משקיע אגדי, "הנביא מאומהה"):**
   > "החוק הראשון של השקעות הוא לעולם לא להפסיד כסף. החוק השני הוא לעולם לא לשכוח את החוק הראשון."

2. **אלברט איינשטיין (פיזיקאי חתן פרס נובל):**
   > "ריבית דריבית היא הפלא השמיני בתבל. מי שמבין אותה, מרוויח אותה. מי שלא, משלם אותה."

3. **פיטר לינץ' (מנהל השקעות מיתולוגי):**
   > "מאחורי כל מניה עומדת חברה. סוד ההצלחה הוא לגלות מה החברה הזו עושה."

4. **בנג'מין פרנקלין (מהאבות המייסדים של ארה"ב, מדען ודיפלומט):**
   > "השקעה בידע תמיד משלמת את הריבית הגבוהה ביותר."

5. **רוברט קיוסאקי (מחבר רב-המכר "אבא עשיר, אבא עני"):**
   > "עניים ובני המעמד הבינוני עובדים בשביל כסף. עשירים גורמים לכסף לעבוד בשבילם."

6. **ג'ון בוגל (מייסד ענקית ההשקעות 'ונגארד'):**
   > "אל תחפשו את המחט בערימת השחת. פשוט תקנו את ערימת השחת כולה." (מתייחס להשקעה חכמה במדדים)

7. **נאבאל רביקאנט (יזם, משקיע ופילוסוף מודרני):**
   > "תעבדו קשה כדי להשיג בעלות. הון הוא בעלות על נכסים שמכניסים לכם כסף בזמן שאתם ישנים."

8. **צ'רלי מאנגר (השותף ההיסטורי של וורן באפט):**
   > "הכסף הגדול לא נמצא בקנייה או במכירה, אלא פשוט בהמתנה."

9. **ג'ורג' סורוס (מיליארדר ומשקיע):**
   > "זה לא משנה אם אתה צודק או טועה, מה שמשנה זה כמה כסף אתה עושה כשאתה צודק, וכמה אתה מפסיד כשאתה טועה."

10. **ריי דאליו (מייסד קרן הגידור הגדולה בעולם):**
    > "מי שחי לפי כדור הבדולח, יאכל הרבה מאוד זכוכית." (מתייחס לסכנה בלנסות לחזות את העתיד בשוק ההון)

11. **מורגן האוזל (מחבר "הפסיכולוגיה של הכסף"):**
    > "התנהגות כלכלית טובה לא דורשת אינטליגנציה גבוהה. היא פשוט דורשת שליטה עצמית, והרבה סבלנות עקשנית."

12. **מרק קיובן (יזם, משקיע מיליארדר וכריש טלוויזיוני):**
    > "ההשקעה הכי טובה שתעשה בחיים שלך היא בעצמך. תלמד כל יום משהו חדש – הדבידנד שזה ישלם לך הוא עצום."

---

## 🎨 Design & Aesthetic Guidelines
- **Pop-up Style:** תצוגת קלף שקוף (Glassmorphism) או מרחף בסגנון מדע בדיוני. מסגרות זוהרות בצבעי אולטרה (סגול-ניאון או ציאן) כדי לתת תחושה של "בונוס" או "דרופ" (Drop) של ידע.
- **Avatar:** יש להשתמש בווקטורים מעוצבים או איורי "Pixel Art" או סייבר של הדמויות, כדי לדבר בגובה העיניים לדור ה-Z ולהתאים למיתוג FinPlay. מומלץ להימנע מתמונות פוטו-ריאליסטיות רשמיות.
- **Typography:** פונט גדול ובולט לציטוט עצמו. שם הדובר והטייטל יופיעו במעומעם יותר (Muted) כדי לתת כבוד לתוכן.

## Non-Goals
- מודלים מורכבים של AI ששואבים ציטוטים חדשים באופן אוטומטי מהאינטרנט.
- מערכת בינה שממפה בדיוק איזה ציטוט מתאים לאיזה מסך ברגע נתון (כרגע אנחנו נשענים על הקפצה אקראית מתוך מאגר מקומי).

## Technical Notes
- **State Management:** שימוש ב-Zustand כחלק מ-`useWisdomStore`. יאפשר לדחוף ציטוט מכל קומפוננטה שרצה באותו רגע בלי שרשורים (Prop Drilling).
- **Animation:** שימוש ב-`react-native-reanimated` לאנימציות (כגון `FadeIn`, `SlideInDown`, `BounceIn`).
- **RTL Support:** הציטוט והטקסט דורשים יישור ויזואלי מושלם לימין ואתנחתות (פסיקים/נקודות) במקום הנכון.
- **Dependencies:** אין צורך בספריות חדשות, ניתן להתבסס על אלו שכבר בפרויקט.
