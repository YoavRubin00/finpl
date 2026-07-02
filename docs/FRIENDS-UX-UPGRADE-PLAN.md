# תוכנית שדרוג עמוד החברים — "ממכר + כיף + נגיש"

PM: חברון (עמוד החברים) · תאריך: 2026-07-02 · מקור: 32 רעיונות סרוקים (עדשות: רטנשן-מוצר + נגישות)

## חוק-הברזל של המייסד: אפס פִבּרוּק
כל מספר על המסך חייב להגיע ממקור אמיתי (self-data של המשתמש, או נתון-שוק אמיתי) — או שלא יוצג בכלל.
**מסקנת הטריאז': כל 32 הרעיונות עוברים את חוק-הברזל.** 6 מהם *מסירים* פִבּרוּק קיים (P0). היתר מוסיפים פיצ'רים שנשענים אך ורק על נתוני-אמת אישיים או נתוני-שוק. אף רעיון לא ממציא פעילות/ספירה/social-proof.

**אזהרת-אכיפה יחידה:** ב"ציון החזאי" (פריט A3) אסור להשתמש ב"רצף עם-הרוב" — הוא נגזר מ-`baselinePct` המומצא. להשתמש רק בדיוק-מול-שוק (computeVerdict) וברצף-ההשתתפות האמיתי.

**הערת כנות על לולאות-הדדיות (פריטים B: תגובה-חדשה, לייקים-לתיק, חגיגת-סגירה):** אלה נדלקים רק על אינטראקציה נכנסת אמיתית. לפני שיש בק-אנד/גרף-חברתי אמיתי הם עשויים כמעט לא להידלק — וזה תקין וכן. עדיף מנגנון דומם-עד-אמת מאשר טריגר מזויף.

---

## שלב 0 — הסרת פִבּרוּק (P0, חוסם הכל)
לפני כל פיצ'ר-רטנשן חדש. סדר לפי סיכון (דלף-כלכלה אמיתי > פִבּרוּק-כאמת גלוי > seed סמוי).

### P0-1 · פנטזי-ליג: פרסים אמיתיים מול יריבים מזויפים  ‹fabrication-P0 · impact high · effort M›
- **מה:** `getMockLeaderboard` בונה לוח מ-`MOCK_NAMES` + `seededRandom`, ו-`claimResults` מחלק פרסי-מטבעות אמיתיים לפי דירוג מול יריבים מומצאים. גם פִבּרוּק-כאמת וגם **דלף-כלכלה אמיתי** — הסיכון הגבוה ביותר.
- **פעולה:** להקפיא את תשלום-הפרסים עד ש-settle עובר ל-cron בשרת מול מתחרים רשומים. להחליף את הלוח במצב-ריק כן: "הליגה הראשונה נפתחת — היו הראשונים".
- **קבצים:** `src/features/fantasy-league/fantasyData.ts:541-575` · `src/features/fantasy-league/useFantasyStore.ts:108,250`
- **למה ל-KPI:** אי-אפשר להעלות "שיעור-פעולה-חברתית-אמיתית" כשהפעולה היא מול בוטים; וזה גם עוצר שחיקת-כלכלה אמיתית.
- **אמת-לא-פייק:** מסיר את מקור-הפייק לגמרי; settle עתידי מול נרשמים אמיתיים.

### P0-2 · לוח "אלופי המטבעות": 10 חברים מזויפים + אישור-חברות אוטומטי  ‹fabrication-P0 · high · M›
- **מה:** `FriendsLeaderboardCard` ממפה ל-`FRIEND_PROFILES` (coinsWon מומצא), ו-`sendFriendRequest` מאשר אוטומטית אחרי 20-45ש' (ו-`onRehydrate` הופך pending→friend).
- **פעולה:** להחליף במאגר `referrals` האמיתי; עד השרת — מצב-ריק כן + CTA "הזמינו חברים".
- **קבצים:** `src/features/friends-hub/components/FriendsLeaderboardCard.tsx:22,143-145` · `src/features/friends/useFriendsStore.ts:35-53,84-91` · `src/features/friends/friendsData.ts:8-119`
- **אמת-לא-פייק:** הגרף-החברתי היחיד שכבר אמיתי הוא `referredFriends`; הכל נשען עליו.

### P0-3 · חדרי-מסחר: הודעות-seed נספרות כ"לא-נקרא"  ‹fabrication-P0 · high · M›
- **מה:** `buildSeedMessages` מוזרק לכל חדר, ו-`unreadFor`/`getUnreadCount` סופרים אותן כ-badge "יש שיחה" כשאין — FOMO מזויף.
- **פעולה:** להחליף ב-seed בהודעת-פתיחה בודדת של קפטן-שארק (לא נספרת כ"לא-נקרא") + מצב-ריק כן "החדר שקט — פִתחו את הדיון".
- **קבצים:** `src/features/trade-rooms/useTradeRoomsStore.ts:30-36,82,258-269` · `src/features/friends-hub/components/TradeRoomsCard.tsx:30-37`

### P0-4 · חכמת-ההמונים: אחוזי-הצבעה מומצאים אחרי ההצבעה  ‹fabrication-P0 · high · M›
- **מה:** `PollBar` לפני-הצבעה נקי, אבל אחרי הצבעה ממלא את הבר ב-`q.baselinePct` (57/43…) ומציג כ"סנטימנט הקהילה".
- **פעולה:** עד ≥100 הצבעות אמיתיות (`honestCounts` כבר מגדיר את הסף) — לא להציג פילוח-%, רק את בחירת המשתמש + "עדיין אוספים הצבעות".
- **קבצים:** `src/features/friends-hub/components/CrowdWisdomCard.tsx:46-140,337-344` · `src/features/crowd-question/crowdQuestionsData.ts:11,27,41`

### P0-5 · ייעוץ-אנונימי: SEED_POSTS/REPLIES עם upvotes מומצאים  ‹fabrication-P0 · high · M›
- **מה:** `useAnonAdviceStore` מאתחל ל-`SEED_POSTS`+`SEED_REPLIES` (upvotes קשיחים 12/9/7), ו-`total=approved.length` מונה בעיקר seed.
- **פעולה:** להסיר seed; לבנות total/preview רק מפוסטים אמיתיים (isSelf/שרת); מתחת ל-100 — בלי מספר.
- **קבצים:** `src/features/anon-advice/useAnonAdviceStore.ts:82-83,340-343` · `src/features/anon-advice/anonAdviceData.ts:107-286` · `src/features/friends-hub/components/AnonAdviceHeroCard.tsx:124-130,203`

### P0-6 · שיתוף-תיקים: seed ברמת ה-store  ‹fabrication-P0 · med · S›
- **מה:** הכרטיס כבר מסנן ל-isSelf, אבל `usePortfolioShareStore` עדיין מאתחל `portfolios=SEED_PORTFOLIOS` ומשחזר ב-onRehydrate — כל צרכן אחר של getFeed עלול לחשוף אותם.
- **פעולה:** להסיר seed מה-store עצמו.
- **קבצים:** `src/features/portfolio-share/usePortfolioShareStore.ts:38,41-52,125` · `src/features/portfolio-share/portfolioShareData.ts:34-99`

---

## שלב 1 — לולאות-רטנשן אמיתיות (addictive)
מנועים אמיתיים שכבר בנויים אך קבורים במסכי-בת; להצֵיף אותם לעמוד עצמו — איפה שמתקבלת החלטת-החזרה-היומית.

### A1 · רצף-הצבעות אמיתי על כרטיס חכמת-ההמונים  ‹addictive · high · M›
- `votedDates` = רצף-יומי אישי 100% אמיתי, לא מוצג היום. להוסיף "רצף הצבעות: N ימים" + חגיגה במיילסטונים (3/7/14) עם +מטבעות אמיתיות.
- **קבצים:** `CrowdWisdomCard.tsx:143-175` · `useCrowdQuestionStore.ts:66-82` · **אמת:** רק ימים שהמשתמש עצמו הצביע.

### A2 · חגיגה אמיתית כשהשאלה נסגרת לטובת המשתמש  ‹addictive · high · M›
- כששאלה שבועית נסגרת מול השוק (`computeVerdict`) והבחירה צדקה — +מטבעות + celebration בכניסה הבאה ("צדקת! ת"א-35 נסגר בירוק — +X").
- **קבצים:** `computeVerdict.ts` · `useCrowdQuestionStore.ts:74-82` · `CrowdWisdomCard.tsx` · **אמת:** התוצאה=נתון-שוק, הזכייה=בחירת-המשתמש.

### A3 · ציון-החזאי + דיוק-שוק אל העמוד  ‹addictive · high · M›
- `AccuracyHeroCard`+`StreakHeroCard` קבורים ב-`CrowdWisdomHistoryScreen`. להביא מיני-גרסה ל-`CrowdWisdomCard`. **אזהרה:** דיוק-מול-שוק ורצף-השתתפות בלבד — לא "עם-הרוב" (נגזר מ-baselinePct המומצא).
- **קבצים:** `AccuracyHeroCard.tsx:39-77` · `StreakHeroCard.tsx:17-60` · `CrowdWisdomCard.tsx:361-401`

### A4 · "תגובה חדשה לשאלה שלך" — הדדיות-מחבר  ‹addictive · high · M›
- כשפוסט-ייעוץ של המשתמש (isSelf) מקבל תגובה אמיתית, `POST_AUTHOR_REPLY_XP` נדלק אבל המשתמש לא יודע. סימון אמיתי שמחזיר את המחבר.
- **קבצים:** `useAnonAdviceStore.ts:202-237` · `AnonAdviceHeroCard.tsx:121-207`

### A5 · "השבוע שלך בקהילה" — סיכום אישי מנתוני-אמת בלבד  ‹addictive · high · M›
- רצועת-סיכום בראש העמוד: כמה הצבעת, כמה הודעות שלחת, כמה תגובות כתבת, כמה מטבעות הרווחת מהקהילה — הכל self-data.
- **קבצים:** `FriendsHubScreen.tsx:114-168` · getters מ-`useTradeRoomsStore.ts:107-118` + `useAnonAdviceStore.ts:94-98` · **אמת:** אף מספר על אנשים אחרים.

### A6 · תגמול-הודעה-ראשונה-ביום על כרטיס החדרים  ‹addictive · med · S › ← quick win
- `sendMessage` כבר מעניק `DAILY_FIRST_MESSAGE_COINS+XP` אבל בלתי-נראה. צ'יפ "הודעה ראשונה היום = +X" → "נאסף היום ✓".
- **קבצים:** `TradeRoomsCard.tsx:49-125` · `useTradeRoomsStore.ts:148-167`

### A7 · תגובות/לייקים אמיתיים לתיק שלך  ‹addictive · med · S›
- כשתיק isSelf מקבל תגובה/לייק אמיתי — "X הגיבו לתיק שלך". רק אינטראקציות אמיתיות.
- **קבצים:** `PortfolioShareCard.tsx:442-461` · `usePortfolioShareStore.ts:24-52`

### A8 · סולם-מיילסטונים להזמנות עם פס-התקדמות אמיתי  ‹addictive · med · M›
- `referredCount` אמיתי אך שטוח → סולם 1→3→5 עם פס + תגמול-מדרגה עולה. כל המספרים מ-`referredFriends` האמיתי.
- **קבצים:** `ReferralCard.tsx:125-204` · `useReferralStore.ts`

### A9 · כפתור-פנטזי פרימיום: סטטי → מצב-חי אמיתי  ‹addictive · med · M›
- להזרים מצב-אמת מהחנות (בחרת השבוע? נעילה בעוד Xh?) — טיימר-שבועי אמיתי + picks אמיתיים, לא ספירת-משתתפים מומצאת.
- **קבצים:** `PremiumFantasyButton.tsx:23-131` · `useFantasyStore.ts:100-120`

---

## שלב 2 — נגישות (accessible)
### תנאי-סף
### C0 · מצבי-ריק כנים אחרי הסרת ה-seed  ‹accessible · high · M›
- ברגע שמסירים seed — העמוד יתרוקן. לכל תת-מוצר מצב-ריק כן + CTA יחיד ("היו הראשונים לפתוח דיון" / "שאלו את הקהילה" / "שתפו תיק"). **תנאי-סף שהסרת-הפִבּרוּק לא תהרוג את ההמרה.** מפוזר לכל vertical.
- **קבצים:** `TradeRoomsCard.tsx:127-237` · `AnonAdviceHeroCard.tsx:209-324` · `PortfolioShareCard.tsx:593-647`

### Quick wins נגישות (high impact / S effort)
- **C1 · ניגודיות TEXT_FAINT #9ca3af נכשל AA** (high/S) — לכהות ל-#6b7280 לטקסט נושא-מידע. `PortfolioShareCard.tsx:21,100,166,208,222,270`
- **C2 · GoldCoinIcon בלי תווית** (high/M) — לעטוף כל צמד מספר+מטבע ב-accessibilityLabel "1,200 מטבעות". `FriendsLeaderboardCard.tsx:261-281` · `AnonAdviceHeroCard.tsx:335-375` · `GoldCoinIcon.tsx`
- **C3 · צ'יפ פרסים בייעוץ נקרא כרסיסים** (high/S) — accessibilityLabel אחד "30 מטבעות על פוסט, 15 על תגובה". `AnonAdviceHeroCard.tsx:335-375`
- **C4 · מונה "לא-נקרא" בחדרים לא מוכרז** (high/S) — `${room.name}, ${unread} הודעות חדשות`. `TradeRoomsCard.tsx:55,135`
- **C5 · טוסטים/מודרציה לא מוכרזים** (high/S) — accessibilityLiveRegion='polite' + role='alert'. `PortfolioShareCard.tsx:549-568,571-590`

### שאר נגישות (med/low)
- **C6 · יעדי-מגע <44px אהבתי/הגב** (med/S) — hitSlop. `PortfolioShareCard.tsx:325-352,353-369`
- **C7 · יעדי-מגע כותרת-חדרים + טווחי-ת"א** (med/S) — hitSlop={8}. `TradeRoomsCard.tsx:52-63` · `Ta35ForecastCard.tsx:176-186,323-333`
- **C8 · PollBar role על View לא-לחיץ** (med/M) — להסיר role מהטרום-הצבעה. `CrowdWisdomCard.tsx:59,88,259`
- **C9 · Ta35 חסר maxFontSizeMultiplier** (med/S) — {1.2}. `Ta35ForecastCard.tsx:136-137,193,219-221,225-228`
- **C10 · FinnCue חותך משפט שארק** (med/S) — numberOfLines={2}+maxFont{1.3}. `FinnCue.tsx:92-105`
- **C11 · שורות לוח-אלופים לא מקובצות** (med/M) — accessibilityLabel מרוכז. `FriendsLeaderboardCard.tsx:222-283,286-316`
- **C12 · טקסט-שאלה חסר maxFont** (med/S) — {1.3}. `CrowdWisdomCard.tsx:316-329` · `AnonAdviceHeroCard.tsx:263-276`
- **C13 · מונה לייקים בתיק יבש** (med/S) — "24 אהבו". `PortfolioShareCard.tsx:292-314`
- **C14 · צ'יפ-שעון מקוצר** (low/S) — "נותרו 5 שעות עד הסגירה". `Ta35ForecastCard.tsx:139-142`
- **C15 · שדה-תגובה בלי label + Send בלי role** (low/S). `PortfolioShareCard.tsx:410-433`
- **C16 · רדיו-טווחים בלי radiogroup** (low/S). `Ta35ForecastCard.tsx:172-197`

---

## דירוג לפי impact/effort
1. **P0 קודם** (חוסמי-KPI): P0-1 (דלף-כלכלה) → P0-2 → P0-3 → P0-4 → P0-5 → P0-6.
2. **Quick wins high-impact/S:** C1, C3, C4, C5, A6.
3. **High-impact/M ליבת-רטנשן:** A1, A5, A3, A2, A4, C0, C2.
4. **Med:** A7, A8, A9, C6-C13.
5. **Low:** C14-C16.

---

## באטצ'י-מימוש — קבוצות-קבצים דיסְיוֹנקטיות (בנייה מקבילית ללא קונפליקט)

**Prereq (קטן, קודם לכל):** `GoldCoinIcon.tsx` — לסמן את האייקון כ-`importantForAccessibility='no'` (דקורטיבי). אחרי זה כל batch עוטף בצד-הקריאה שלו. קובץ יחיד, לא נגוע במקום אחר.

### BATCH 1 — חכמת-המונים + תחזית ת"א  ‹מקבילי›
קבצים: `CrowdWisdomCard.tsx` · `Ta35ForecastCard.tsx` · `crowd-question/crowdQuestionsData.ts` · `crowd-question/useCrowdQuestionStore.ts` · `crowd-wisdom/components/AccuracyHeroCard.tsx` · `crowd-wisdom/components/StreakHeroCard.tsx` · `crowd-wisdom/lib/computeVerdict.ts`
פריטים: **P0-4**, A1, A2, A3, C8, C9, C12(crowd), C14, C16, C7(ת"א-part)

### BATCH 2 — ייעוץ-אנונימי  ‹מקבילי›
קבצים: `AnonAdviceHeroCard.tsx` · `anon-advice/anonAdviceData.ts` · `anon-advice/useAnonAdviceStore.ts`
פריטים: **P0-5**, A4, C0(anon), C2(anon call-site), C3, C12(anon) · + getter קריאה-בלבד ל-A5

### BATCH 3 — חדרי-מסחר  ‹מקבילי›
קבצים: `TradeRoomsCard.tsx` · `trade-rooms/useTradeRoomsStore.ts`
פריטים: **P0-3**, A6, C0(tr), C4, C7(tr-part) · + getter קריאה-בלבד ל-A5

### BATCH 4 — שיתוף-תיקים  ‹מקבילי›
קבצים: `PortfolioShareCard.tsx` · `portfolio-share/usePortfolioShareStore.ts` · `portfolio-share/portfolioShareData.ts`
פריטים: **P0-6**, A7, C0(pf), C1, C5, C6, C13, C15

### BATCH 5 — פנטזי + לוח-אלופים + הזמנות  ‹מקבילי›
קבצים: `fantasy-league/fantasyData.ts` · `fantasy-league/useFantasyStore.ts` · `PremiumFantasyButton.tsx` · `FriendsLeaderboardCard.tsx` · `friends/useFriendsStore.ts` · `friends/friendsData.ts` · `ReferralCard.tsx` · `social/useReferralStore.ts`
פריטים: **P0-1**, **P0-2**, A8, A9, C2(leaderboard call-site), C11

### BATCH 6 — אינטגרציה  ‹קבצים דיסְיוֹנקטיים; תלוי-לוגית בגטרים מ-2/3 → להריץ אחריהם›
קבצים: `FriendsHubScreen.tsx` · `FinnCue.tsx`
פריטים: A5 (רצועת "השבוע שלך"), C10

**הערה על דיסְיוֹנקטיות:** פריטי-הנגישות החוצי-קבצים (C0/C2/C7/C12) פוצלו — כל edit הולך ל-vertical שמחזיק את הקובץ. הגטרים ל-A5 נכתבים בתוך batch 2/3 (שממילא עורכים את אותם stores ב-P0), ו-batch 6 רק *קורא* אותם ועורך קובץ ייחודי. כך אין קובץ בשני batchים.
