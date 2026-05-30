# FinPlay — External Review Brief
**גרסה:** v1.2.4 · **תאריך:** 2026-05-30 · **שפת המוצר:** עברית (RTL)
**מטרת המסמך:** לתת לסוקר חיצוני (אדם / ChatGPT / מבקר UX) הקשר מספק כדי לבקר את המוצר, לזהות חולשות, ולהציע שיפורים/כלים חדשים.

> אם אתה ה-GPT שמקבל את זה — קרא הכל. בסוף יש בלוק "מה אנחנו רוצים ממך" עם השאלות המדויקות.

---

## 1. The One-Pager (תקציר)

**מה זה FinPlay?**
אפליקציית מובייל (iOS + Android, React Native / Expo) שמלמדת ישראלים — בעיקר Gen-Z — חינוך פיננסי דרך משחק. לא קורס. לא ספר. **משחק** בז'אנר של Duolingo × Clash Royale × TikTok.

**הפוזישן:**
> "אנחנו לא מלמדים אותך כלכלה. אנחנו הופכים אותך לשחקן שמנצח בכסף."

**הגיבור** הוא המשתמש. **קפטן שארק** הוא הקפטן שמראה את המים — חבר, לא מורה. שובב, אמפתי, ישיר. בלי ז'רגון, בלי חליפות, בלי לוקצ'ר.

**מבנה גיימי:**
פירמידה של 5 שכבות → 5 פרקים → 29 מודולות → לכל מודולה: כרטיסיות לימוד + קוויז + סימולציה אינטראקטיבית. גיימינג-נון ברמת Supercell.

**מודל עסקי:** Freemium (Basic חינם עם מגבלות יומיות / Pro ~₪29 בחודש לגישה לא-מוגבלת + AI Insights + תכנים נעולים). PRO IAP דרך App Store / Google Play + RevenueCat.

**Tech stack:** React Native 0.83 · Expo SDK 55 · TypeScript Strict · Zustand · NativeWind · Skia · Reanimated · Neon Postgres + Drizzle ORM · Vercel API routes · Sentry · PostHog · Firebase Analytics.

---

## 2. הקהל

**ICP (Ideal Customer Profile):**
- ישראלי/ת, גיל 16-30 (פוקוס 18-25)
- דור Z / מילניאלס צעיר, סטודנט/ית / סטרט-ג'וב / משוחרר/ת
- מבלה ב-Instagram, TikTok, Wolt, Cal
- "לא מבין/ה בכסף" אבל לא רוצה להישאר ככה
- לא נכנס/ת לקורס "ידע פיננסי" משעמם
- מצפה לאסתטיקה גבוהה, אנימציות, רטט, מהירות

**Pain points שאנחנו פותרים:**
1. ידע פיננסי בישראל = או חשבונאות יבשה או "טיקטוקי טריידינג" שקרי
2. אנשים בני 22 פותחים חשבון בנק ולא יודעים מה זה ריבית דריבית
3. אין לאן ללכת ללמוד "מה זה קרן השתלמות / פנסיה / קופת גמל" בלי משעמם
4. תכניות חיסכון נראות כמו 1995

---

## 3. ה-Voice של המותג (קצר)

ראה `docs/BRAND.md` לעומק. עיקרים:

- **קפטן שארק** מדבר אישית → גוף שני יחיד, נטול מין (מהמילון: "שלך", שמות פעולה, ניסוח עקיף). למה? לא נחשוף מין כי הקהל מעורב.
- **המערכת** מדברת לכלל → גוף שני רבים ("בואו", "אתם", "שלכם").
- **משפט קצר. נקודה. מטרה.** מקסימום 15 מילים ב-UI copy.
- **גיימינג > פיננסי.** "תיק" במקום "פורטפוליו". "תשימו את הכסף לעבוד בשבילכם" במקום "השקעות חכמות".
- **מטאפורות ים:** "מים שקטים", "תפסו בשיניים", "קצף בים".
- **לא:** מורה, מטיף, מאיים, פטרוני, חליפה.

---

## 4. ארכיטקטורת המוצר — מבט-על

### 4.1 מבנה ניווט (Tab Bar בתחתית, 5 כפתורים)
1. **השקעות** (Investments / Trading Hub) — paper trading, fantasy league
2. **למידה** (Learn / Pyramid) — Duolingo-style map עם 5 פרקים × מודולות
3. **בית** (Index / FinFeed) — פיד TikTok-סטייל, אנכי, swipe-up
4. **חברים** (Friends Clash) — דואלים, חברים, squad battles
5. **צ׳אט** (Chat) — קפטן שארק כ-AI mentor

**Hidden routes (מנו 'עוד' או deep-links):**
- ארנה (Daily Challenges + Leaderboard)
- חנות (Coins + Gems IAP)
- פרופיל
- סימולטור / Fantasy / Avatars / Saved Items / Settings ועוד

### 4.2 הפירמידה (Pyramid Progression)
המוצר הקונספטואלי הליבתי. 5 שכבות, אנלוגי ל-Maslow:

| שכבה | פרק | תוכן | מודולות |
|---|---|---|---|
| 1 | הישרדות | תקציב, חיסכון, הלוואות, תלוש, עמלות, קרן חירום | 9 |
| 2 | ביטחון | דירוג אשראי, פנסיה, קרן השתלמות, ביטוחים | 5 |
| 3 | יציבות | אינפלציה, פסיכולוגיית שוק, רובו, קופת גמל | 4 |
| 4 | צמיחה | שוק ההון 101, מדדים, ETFs, פקודות, דיבידנדים, פיזור | 6 |
| 5 | עצמאות | FIRE, נדל"ן, REIT, תכנון פרישה, צוואות | 5 |
| **סה"כ** | | | **29** |

המשתמש מתקדם לפי XP. כל מודולה = כרטיסיות לימוד (6) + קוויז + סימולציה.

### 4.3 הכלכלה (Economy)
מנוע משאבים כפול-משולש:

| משאב | מקור | שימוש | אנלוגיה |
|---|---|---|---|
| **XP** | למידה, פעילות, סטריקים | רמות + פתיחת פרקים | Duolingo XP |
| **Coins** | משימות יומיות, קוויזים, צ'סטים | חנות (avatars, boosters, נדל"ן וירטואלי) | Clash Coins |
| **Gems** | IAP + Achievements ספציפיים | פתיחת צ'סטים מיידית, פריטים נדירים | Premium currency |
| **Hearts** | רגן 5h/heart (מקס 5) | טעויות בקוויז שורפות ❤️ | Duolingo Hearts |
| **Streak** | יום פעילות → +1 | מכפיל XP, צ'סטים מיוחדים | Snapchat Streak |

**רמות:** Level 0-5. ספים: [0, 400, 1000, 2000, 4000, 7000] XP.
**מיפוי:** Level → Pyramid layer (Lv 4+ → שכבת חופש 5).

### 4.4 תוכן יומי (Daily loop)
1. **Daily Login Bonus** — +15 XP, סטריק +1
2. **Daily Quest** — 1-3 משימות (קוויז, סימולציה, פיד) → +20 XP +300 coins
3. **Daily News Challenge** (PRD 49) — 2 כותרות חדשותיות עם chip-מילוי-חסר. Gen-Z Hebrew, AI-generated (Gemini), citations + historical example. הצ'אט פנימי עם AI mentor על כל כותרת.
4. **Daily Quiz / Macro Event** — UP/DOWN guess על אירוע מאקרו היסטורי (פיד)
5. **Arena Challenges** — 3 challenges/יום (Basic) או unlimited (Pro)

### 4.5 ה-FinFeed (Home)
פיד אנכי TikTok-סטייל. סוגי כרטיסים מעורבבים (seeded daily shuffle):
- ✅ Video — clip לימודי (29 וידאו ב-CDN Cloudflare R2)
- ✅ Comic — חוויה ויזואלית, hook ל-CTA
- ✅ Quote — ציטוט פיננסי על אינפוגרפיק
- ✅ Module Hook — preview של מודולה עם כפתור "לימוד עכשיו"
- ✅ Simulator Card — preview של סימולציה
- ✅ Scenario Card — דילמה אינטראקטיבית
- ✅ Macro Event — UP/DOWN guess על אירוע היסטורי
- ✅ Wisdom Flash — flashes פסיכולוגיה/פיננסי
- ✅ Live Market / Live News
- ✅ Premium Learning Card
- ✅ Shark Feedback / Referral Nudge / Trading Nudge

### 4.6 הסימולטורים (29)
לכל מודולה — סימולציה אינטראקטיבית, לרוב Skia + Reanimated. 6 archetypes:
- Slider+Graph (Compound, Risk, S&P, FIRE, Retirement)
- Drag & Classify (Budget, Payslip Ninja, Tax Credits)
- Obstacle Course (Minus Trap, Shopping Cart, Insurance, Inflation, Investment)
- Growing Object (Snowball Debt, Car Interest, Tax Grinder, Dividend Tree)
- Timed Reaction (Bank Combat, Panic Index)
- Builder/Allocator (ETF, Portfolio, REIT, Family Estate, Mortgage, Trade, Robo)

**Visual standard:** OCEAN_CHAPTER_PALETTE (כחול-תכלת אוקיינוס), Lottie icons, single-page layout, GlowCard + FadeInDown אנימציות, RTL.
**Mods 3-16, 4-21, 4-24, 5-26, 5-27, 5-28, 5-29 נעולים מאחורי PRO**.

### 4.7 חברתיות
- **Friends Clash** — דואלים 1v1 בקוויזים
- **Squads** — squad battles, leaderboard
- **Fantasy League + Stock Draft** — תחרות שבועית של תיק 5 מניות, קטגוריות (Value, Growth, Tech)
- **Refer-a-Friend** — 5% coin dividend מחבר שצרפת (Passive Income / Referral Assets)
- **Real Assets** — קניית נכסים וירטואליים (דירה, חנות, REIT) ב-coins → תשואה יומית
- **The Bridge** — מערכת המרה של reward לערך אמיתי (כרטיסי קפה / קופונים)

### 4.8 AI Personalization (FinBrain)
שכבת telemetry + LLM analysis:
- **קלט:** quiz answers, simulator decisions, time spent, onboarding profile
- **LLM:** Gemini (via `@ai-sdk/google`) → JSON structured output:
  - `persona_shift` — מהל זמן
  - `knowledge_gaps[]`
  - `monetization_vector` — "Impulse Buyer" / "Status Seeker" / "Anxious"
  - `recommended_actions[]` — UNLOCK_MODULE_X / INCREASE_DIFFICULTY / TRIGGER_TARGETED_IAP
- **שימושים:**
  - Targeted IAP — Safety Net Bundle לחרדה, Platinum Avatar לתחרותיים
  - Secret Modules — Crypto Advanced למי שמיקס Risk Simulator
  - Dynamic Finn — תגובות המסקוט מתאימות לסטייל המשתמש
  - Personalized Feed — סדר התוכן מבוסס gaps

### 4.9 התראות (Notifications)
- **Daily streak** ב-20:00
- **Chest ready** — צ'סט מוכן לפתיחה
- **Friend challenge** — מישהו אתגר אותך
- **Re-engagement** — קפטן שארק "סתם ישבתי כאן לבד וחיכיתי..."
- Banner inline בפיד מבקש הרשאות

---

## 5. מודל המונטיזציה

### 5.1 ה-Free vs Pro Matrix

| פיצ'ר | Basic (חינם) | Pro (~₪29/חודש) |
|---|---|---|
| FinFeed (פיד לימודי) | מלא | מלא |
| Pyramid (פרקים) | מלא | מלא |
| Arena | 3 challenges/יום | unlimited |
| Simulator | 3 sessions/יום | unlimited |
| AI Companion Chat | 3 הודעות/יום | unlimited |
| AI Insights | ❌ | ✅ |
| Saved Items (סימניות) | ❌ | ✅ |
| Daily News Challenge | חופשי | + פתיחת צ'סט PRO |
| Pro-locked sims (7 מתוכן 29) | ❌ | ✅ |
| Premium Avatars | חלק | הכל |

### 5.2 IAP נוסף (חוץ מ-Pro Sub)
- **Gem Bundles** — 100 / 500 / 1500 gems
- **Starter Pack** (PRD: docs/STARTER_PACK_IAP_SETUP.md) — חבילת onboarding
- **Daily Deals** — Clash Royale style (חנות יומית מתחלפת)

### 5.3 Friction / Upsell Triggers
- **OutOfHeartsModal** — נגמרו חיים → "השדרגו ל-PRO" (אין יותר practice-to-refill / coin-refill — הוסרו בקומיט אחרון)
- **Post mod-0-4 paywall** — חד-פעמי בין מודולה ראשונה לשנייה
- **Pro-locked sim tap** → UpgradeModal
- **AI Insights tab tap** → UpgradeModal
- **GlobalUpgradeModal** (Zustand) — נשלף ע"י כל מצב friction

---

## 6. Tech Stack מלא

### Client
- React Native **0.83.6**, React **19.2**, Expo **SDK 55**, expo-router 55
- TypeScript 5.9 **strict** — `any` אסור
- Zustand 5 (persist + MMKV via זוסטנד storage)
- NativeWind 4 (Tailwind RN)
- @shopify/react-native-skia (גרפים, אנימציות, holographic)
- react-native-reanimated 4 + worklets
- @lottiefiles/dotlottie + lottie-react-native (Finn mascot)
- @shopify/flash-list 2 (פיד מהיר)
- expo-audio (sounds), expo-haptics (touch feedback)
- expo-sensors (gyroscope ל-3D tilt)
- react-native-purchases (RevenueCat)
- react-native-google-mobile-ads + react-native-fbsdk-next (advertising)
- posthog-react-native + session-replay (analytics + UX)
- @sentry/react-native (errors)
- @react-native-firebase/analytics (events)
- expo-notifications, expo-secure-store, expo-clipboard

### Backend
- **Expo API routes** (`app/api/**/+api.ts`) דרך Vercel
- **@neondatabase/serverless** + Drizzle ORM (Neon Postgres HTTP)
- **Vercel Blob storage** (תמונות)
- **Cloudflare R2** (29 וידאו, ~325MB)
- **Resend** (transactional email)
- **AI**: @ai-sdk/google (Gemini), Higgsfield API (תמונות brand-styled לחדשות יומיות)
- **External data**: BOI (בנק ישראל) macro, Alpha Vantage (מניות), Yahoo Finance (quote proxy)
- **Auth**: Google OAuth (expo-auth-session), Apple Sign-In, Email/Password

### DevOps
- EAS Build (Expo Application Services)
- GitHub Pages (privacy policy)
- Vercel (API routes + analytics + speed insights)
- workflows: dev → master (push to dev first; merge to master for release)

---

## 7. הסטטוס היום (Launch Readiness)

**PRD 48 — Launch Readiness:** ~85% מהדרך.
✅ App branding, .easignore, Vercel API layer, Neon migration, ErrorBoundary, Sentry, lazy loading
✅ Privacy policy hosted, terms screen
✅ OAuth web/iOS/Android client IDs מוגדרים
🚧 Remaining: SHA-1 של Google Play Signing, Apple Team ID ב-GCP, ProWelcome screen polish, DB sync smoke-tests על מכשיר אמיתי

**גרסה נוכחית:** 1.2.4 (1.0 לא הופצה — אנחנו בפיתוח אקטיבי לקראת launch)
**משתמשים:** Internal Beta / TestFlight בלבד (לפני שיווק)

---

## 8. תוכן (היקף קיים)

- **29 מודולות לימוד** מלאות (כרטיסיות + קוויזים + סימולציות) — כתובות מאפס בעברית, RTL, voice של קפטן שארק
- **29 סימולציות** אינטראקטיביות (לא מיני-משחקים — חוויות פיננסיות אמיתיות)
- **20+ Macro Events** היסטוריים ל-mini-game UP/DOWN
- **29 קליפי וידאו** ב-CDN
- **~58 FAQ presets** מותאמים פר-מודולה לצ'אט הבוט
- **בנק התראות** (notifications copy) עם קפטן שארק
- **20 fallback news challenges** + cron יומי לעדכון אוטומטי

---

## 9. הדברים שהיינו רוצים שתבקר/שתבקרי

### 9.1 ביקורת מוצרית
1. **Pyramid metaphor** — האם המבנה הזה (Maslow פיננסי) מתחבר לקהל Gen-Z או נשמע "Boomer"? יש metaphor יותר חזק?
2. **Daily loop** — האם יש יותר מדי "דברים יומיים" (Login + Quest + News + Macro + Streak + Arena)? משתמש Gen-Z יסבול את העומס או יזרום איתו?
3. **Pro positioning** — ₪29/חודש לגיל 18-25 בישראל. נכון? יותר נמוך? Annual plan?
4. **Hearts mechanic** — Duolingo דחה את זה לאחרונה (lives gentle mode). האם להחזיק/לרכך/למחוק?
5. **TikTok feed in finance app** — האם זה ברור או מבלבל ביחס לפירמידה? אנשים יודעים איפה ה-"main loop"?

### 9.2 ביקורת UX
6. **Tab bar עם 5 כפתורים** + הסתרת חלק מהפיצ'רים ב"עוד" — האם זה מבלבל? איך לבעלי discoverability?
7. **כמות הפיצ'רים** (Arena, Fantasy, Trading Hub, Real Assets, Friends Clash, Chat, Wisdom Flashes, Saved Items, Bridge, Avatars, Referral, Daily News...) — האם זה רוחב מאשים או רוחב עוצמתי? Cut list?
8. **Captain Shark voice** — קרא את `docs/BRAND.md`. האם הטון פוגע נכון בקהל Gen-Z ישראלי? איפה נופלים?
9. **RTL + עברית** — מה pain points שאתה רואה ב-UI עברי באפליקציה גיימית כזו?

### 9.3 ביקורת מונטיזציה
10. **AI Personalization → Targeted IAP** — אתי? המוצר מנצל חרדה למכור "Safety Bundle"? איך לעשות את זה בלי לחצות קווים?
11. **PRO gating לוגי** — האם 7 סימולציות PRO-locked + AI Insights + Saved Items + Unlimited Arena = משכנע לקנייה? מה חסר?
12. **The Bridge** (המרת coins לערך אמיתי) — האם זה מנגנון "casino-lite" שיסבך אותנו רגולטורית?
13. **Real Assets + Passive Income from referrals** — האם זה דומה מדי ל-MLM / referral schemes שמופללים בחנויות?

### 9.4 ביקורת תוכן
14. **תוכן פיננסי בעברית לדור Z** — חסר נושא? יש נושא שיהיה controversial? Crypto? Forex? Options?
15. **Captain Shark כ-AI mentor** — איזה risk יש בלתת AI לדבר על כסף עם קטינים פוטנציאליים?
16. **Compliance** — אנחנו לא יועצי השקעות. איך נשמור על הקו הזה כשמשתמש שואל "מה לקנות"?

### 9.5 ביקורת טכנית/אסטרטגית
17. **React Native + Expo** מול native — מספיק לתחושת פרימיום ברף Supercell?
18. **Neon + Drizzle + Vercel API routes** — סקייל? עלות? מה ייפול קודם?
19. **AI cost** — Gemini calls על כל user telemetry בקנה מידה גדול. איך לאופטם?
20. **GTM** — אנחנו מוכנים ל-launch או חסרים founder/community/content מנוע?

### 9.6 כלים חדשים — מה היית מוסיף/מוסיפה?
21. איזה **3 פיצ'רים חדשים** היו מקפיצים את הvalue ל-Gen-Z?
22. איזה פיצ'ר היית **קוצץ עכשיו** כדי להבהיר את ה-positioning?
23. איזה **AI agent** היה מועיל פנימית (לצוות שלנו / לאוטומציה של תוכן/שיווק/בדיקות)?
24. איזה **integration חיצוני** היה מעצים אותנו (Bank API, Payment, Social, Investment broker)?

---

## 10. רפרנסים — אם רוצה לצלול עמוק

- **`CLAUDE.md`** — סטנדרטים הנדסיים (TypeScript strict, Zustand, NativeWind, folder structure)
- **`docs/BRAND.md`** — voice המלא + טבלת מין דקדוקי + מטאפורות ים + דוגמאות חיות
- **`src/features/PRD_LOG.md`** — log של 50+ PRDs (Phases 1-27, ראה מי הושלם ומי IN PROGRESS)
- **`docs/finplay-terms-and-privacy.md`** — תנאי שימוש מלאים
- **`docs/STARTER_PACK_IAP_SETUP.md`** — מבנה ה-IAP

---

## 11. Quick Stats לעין-של-ביקורת

| מדד | ערך |
|---|---|
| גודל קוד | ~50+ features, מאות קבצי TSX |
| מודולות תוכן | 29 (5 פרקים) |
| סימולציות | 29 אינטראקטיביות |
| API routes | 16+ קטגוריות תחת `app/api/` |
| Stores (Zustand) | 30+ |
| גרסת מוצר | 1.2.4 (Pre-Launch) |
| TypeScript | Strict (no `any`) |
| תמיכה | iOS + Android + Web (Web פחות מתועדף) |

---

## 12. מה אנחנו רוצים ממך — TL;DR לסוקר

> אם אתה GPT שמקבל את זה: בבקשה אל תיתן לי "מה נהדר באפליקציה". **תשבור אותה.**
>
> 1. **תזהה את 3 הנקודות העיקריות שאני לא רואה** — בלוויית, UX, מונטיזציה.
> 2. **תפסול לי לפחות 2 פיצ'רים** ותסביר למה.
> 3. **תציע 3 כלים חדשים** שיתאימו לפוזישן (Gen-Z, פיננסי, גיימי, ישראלי).
> 4. **תזהה compliance risks** ספציפיים לישראל (חוק יועצי השקעות, חוק הגנת הצרכן, GDPR/קטינים).
> 5. **תן ציון 0-10** לכל אחד מאלה: vision, positioning, monetization, UX, technical, GTM-readiness.
> 6. **תגיד לי במשפט אחד** — אם הייתי משקיע, הייתי מוציא צ'ק? למה כן/לא?

תודה. — יואב, מייסד FinPlay.
