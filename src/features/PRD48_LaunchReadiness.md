# PRD 48 — Launch Readiness Plan

## מטרה
להביא את FinPlay למצב מוכן להעלאה לחנויות (App Store + Google Play).
סדר עדיפויות: קריטי → חשוב → נחמד שיהיה.

---

## שלב 1: מוכנות טכנית בסיסית (קריטי — לפני כל build)

### US-001: App Branding & Assets
- [x] הוספת `icon` (1024×1024 PNG) ל-app.json ✅
- [x] הוספת `splash` screen (1284×2778 PNG) ל-app.json ✅
- [x] הוספת `adaptiveIcon` לאנדרואיד (foreground + background) ✅
- [x] שינוי `name` ב-app.json מ-"FinPL" ל-"FinPlay" ✅
- [x] הוספת description ב-app.json ✅

### US-002: Build Optimization
- [x] יצירת `.easignore` להקטנת ה-archive מ-678MB ✅
- [x] בדיקה שה-build עובר אחרי ה-easignore
- [x] העברת 29 סרטוני וידאו ל-CDN (Cloudflare R2) — הקטנה מ-775MB ל-~450MB ✅
- [x] הוספת `assets/video/` ו-`assets/infographics/archive/` ל-.easignore ✅

### US-003: Security — הסרת credentials מהלקוח
- [x] הסרת `EXPO_PUBLIC_DATABASE_URL` מ-.env (חושף DB URL!) ✅
- [x] העברת כל קריאות DB דרך API routes (ראה שלב 2) ✅
- [x] וידוא ש-`.env` נמצא ב-`.gitignore` ✅

### US-004: תנאי שימוש ומדיניות פרטיות
- [x] עדכון מסך תנאי שימוש (app/(auth)/terms.tsx) — 8 סעיפים מלאים
- [x] יצירת דף web סטטי לתנאי שימוש (חובה לחנויות — URL ציבורי) ✅
- [x] הוספת קישור Privacy Policy ל-app.json (`expo.ios.infoPlist.NSPrivacyPolicyURL`) ✅

---

## שלב 2: API Layer (חשוב — לפני שחרור לציבור)

### US-005: Expo API Routes
הקמת שכבת API בין הלקוח לבין Neon DB:
- [x] `app/api/auth/verify+api.ts` — אימות Google/Apple token, יצירת/אחזור user ✅
- [x] `app/api/sync/profile+api.ts` — sync פרופיל משתמש (כולל XP/coins/gems) ✅
- [x] `app/api/sync/progress+api.ts` — sync התקדמות מודולים ✅
- [x] `app/api/trading/quote+api.ts` — proxy למחירי Yahoo Finance ✅
- ~~`app/api/sync/inventory+api.ts`~~ — נמחק (2026-05-01): היה dead-code, הקליינט סנכרן XP/coins/gems על `user_profiles` דרך `/api/sync/profile`. הטבלה הופלה.

### US-006: Client-side migration
- [x] החלפת קריאות ישירות ל-DB בקריאות fetch ל-API routes ✅
- [x] עדכון `src/db/sync/*.ts` לעבוד דרך API ✅
- [x] הסרת `@neondatabase/serverless` מהלקוח (רק בצד שרת) ✅

---

## שלב 3: Google OAuth Production (חשוב)

### US-007: Google Cloud Console
- [x] Web Client ID — מוגדר (847177819309-...) ✅
- [x] iOS Client ID — מוגדר ✅
- [x] Android Client ID — מוגדר + SHA-1 של preview keystore ✅
- [x] הגדרת OAuth Consent Screen ✅
- [x] הוספת redirect URI ל-Web Client: `https://auth.expo.io/@yrubin00/finpl` ✅
- [x] Publish OAuth app ל-Production ✅ (כבר In Production)
- **לפני עלייה לחנויות:**
  - [ ] Android: להוסיף SHA-1 של Google Play App Signing (`48:0A:4A:E5:36:DD:CE:9D:F9:46:13:D1:85:F2:05:78:75:BD:27:7F`) — ליצור Android OAuth client נוסף ב-Google Cloud Console עם package name `yrubin.finpl`
  - [ ] iOS: להוסיף Apple Team ID ב-Google Cloud Console (דילגנו — אופציונלי בפיתוח, נדרש ב-production).
  - [ ] OAuth Verification — לא צפוי להיות נדרש (רק email/profile scopes), אבל לבדוק.
- [ ] בדיקת Google Sign-In על מכשיר אמיתי

---

## שלב 4: Quality & Polish (מומלץ)

### US-008: Error Handling
- [x] ErrorBoundary גלובלי עם מסך שגיאה יפה ✅
- [x] טיפול ב-network errors (הודעה "אין חיבור לאינטרנט") ✅
- [x] Sentry integration (expo-sentry) — error tracking ✅

### US-009: Performance
- [x] Lazy loading למסכי סימולציה (React.lazy) ✅
- [x] אופטימיזציה של Lottie — רק לטעון מה שצריך ✅
- [ ] בדיקת memory usage על מכשיר אמיתי

### US-009b: DB Sync Smoke-Tests (אחרי deploy של schema fix 2026-05-01)
- [ ] סיים שיעור אחד על מכשיר אמת ובדוק שנכנסה שורה ל-`coin_events` (source='lesson')
- [ ] סיים daily quest ובדוק שנכנסה שורה ל-`coin_events` (source='daily-quest')
- [ ] רישום קוד הזמנה (קליינט A) → מימוש (קליינט B) → בדוק שנכנסה שורה ל-`referrals`
- [ ] גביית דיבידנד → בדוק שורה ב-`dividend_collections`

### US-010: Text Visibility Pass
- [x] Chapter 2 sims — white text + shadows ✅
- [x] Chapter 3 sims — white text + shadows ✅
- [x] Chapter 4 sims — white text + shadows ✅
- [x] Chapter 5 sims — white text + shadows ✅
- [x] Chapter 1 sims — white text + shadows ✅
- [x] S grade color fix — `#a78bfa` → `#ffffff` (all 8 Ch1 sims) ✅
- [x] Grade letter textShadow — all 11 sim files (Ch1 + Ch2) ✅

### US-010b: Navigation Fix
- [x] Back button fix — 7 files, 9 instances of hardcoded `router.replace` → `router.canGoBack()` ✅
- [x] Streak RTL exclamation mark fix ✅

### US-011: ProWelcomeScreen Ocean Redesign
- [x] Ocean background + confetti + Finn mascot ✅

---

## שלב 5: חנויות — Submission (כשמוכנים)

### US-012: App Store (iOS)
- [ ] Apple Developer Account ($99/שנה) — פתיחת חשבון
- [ ] Production build: `eas build -p ios --profile production`
- [ ] סקרינשוטים (6.7" + 5.5") — 3-5 מסכים
- [ ] תיאור קצר (30 תווים) + תיאור מלא
- [ ] קטגוריה: Education / Finance
- [ ] Age Rating: 12+ (financial content)
- [ ] Submit: `eas submit -p ios`

### US-013: Google Play (Android)
- [x] Google Play Developer Account ($25 חד-פעמי) ✅
- [x] אימות טלפון ✅
- [ ] Production build: `eas build -p android --profile production`
- [ ] AAB file upload (EAS מייצר AAB אוטומטית)
- [ ] סקרינשוטים + Feature graphic (1024×500)
- [ ] Data Safety form (מבוסס על סעיף 5 בתנאי שימוש)
- [ ] Internal Testing track → Open Beta → Production

---

## שלב 6: RevenueCat + IAP (לפני מוניטיזציה)

### US-014: RevenueCat — קוד מוכן, קונפיגורציה חסרה
**מה קיים:**
- [x] SDK מותקן (`react-native-purchases` v9.12.0) ✅
- [x] שכבת שירות: `src/services/revenueCat.ts` (configure, purchase, restore, entitlements) ✅
- [x] State management: `useSubscriptionStore.ts` (Pro, hearts, usage gating) ✅
- [x] Webhook handler: `app/api/webhooks/revenuecat+api.ts` (gems + Pro update ב-DB) ✅
- [x] UI: IAPModal (gems) + PricingScreen (subscriptions) ✅

**מה חסר — קונפיגורציה:**
- [ ] הוספת API keys ל-.env: `EXPO_PUBLIC_RC_APPLE_KEY`, `EXPO_PUBLIC_RC_GOOGLE_KEY`
- [ ] הוספת `EXPO_PUBLIC_RC_WEBHOOK_SECRET` ל-.env
- [x] תיעוד כל ה-RC keys ב-.env.example ✅
- [x] Service Account נוצר ב-Google Cloud (`revenuecat-integration@finplay-490620.iam.gserviceaccount.com`) ✅
- [x] Service Account הוסף ל-Google Play Console עם 3 הרשאות (הצגת נתונים פיננסיים, ניהול הזמנות ומינויים, הצגת פרטי אפליקציה) ✅
- [ ] העלאת Service Account JSON ל-RevenueCat (Apps & providers → Service Account Credentials JSON)
- [ ] הגדרת Webhook URL בדשבורד RevenueCat (Project Settings > Webhooks)
- [ ] יצירת `pro` entitlement בדשבורד RevenueCat
- [ ] יצירת "default" offering עם monthly + annual packages
- [ ] שיפור אבטחת webhook (HMAC signature במקום Bearer token פשוט)

### US-015: מוצרים בחנויות
- [ ] Google Play: יצירת 6 consumable products (gems) עם IDs תואמים: `finplay_gems_80` עד `finplay_gems_14000`
- [ ] Google Play: יצירת 2 subscription products (Pro monthly + annual)
- [ ] App Store: אותו דבר — 6 consumables + 2 subscriptions
- [ ] חיבור Product IDs ב-RevenueCat ל-App Store / Google Play
- [ ] בדיקת sandbox purchases על מכשיר אמיתי

---

## סדר ביצוע מומלץ

```
עכשיו    → US-001 (branding) + US-002 (easignore) + US-004 (terms web)
השבוע    → US-005 + US-006 (API layer)
הבא      → US-007 (Google OAuth prod) + US-008 (error handling)
לפני שחרור → US-012 + US-013 (store submission)
כשיהיה API → US-014 + US-015 (payments)
```

---

## מצב נוכחי — מה עובד

| רכיב | סטטוס |
|-------|--------|
| 29 שיעורים (5 פרקים) | ✅ עובד |
| 29 סימולציות | ✅ עובד |
| FinFeed (TikTok feed) | ✅ עובד |
| Arena (אתגרים יומיים) | ✅ עובד |
| Shop + Gems | ✅ עובד (ללא סליקה אמיתית) |
| Chat Bot (FinBot) | ✅ עובד |
| Trading Hub (paper) | ✅ עובד |
| Fantasy League | ✅ עובד |
| Social (Duels, Squads) | ✅ עובד |
| Streak + Retention | ✅ עובד |
| Google OAuth | ✅ In Production. לפני חנויות: SHA-1 של Play App Signing + iOS Team ID |
| Cloud Sync | ✅ עובד (API routes). schema drift תוקן 2026-05-01 |
| AI Mentor usage tracking | ⚠️ AsyncStorage בלבד — `ai_mentor_usage` בטבלה ריקה, לא חוצה מכשירים |
| Paper Trading persistence | ⚠️ Zustand persist בלבד — `paper_portfolio`/`paper_trades` ריקים, לא חוצה מכשירים |
| תשלומים | ⚠️ קוד מוכן, Service Account מוכן. חסר: העלאת JSON ל-RC, הגדרת webhook, מוצרים בחנויות |
| App Store/Play | ❌ עדיין לא הוגש |
