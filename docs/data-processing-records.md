# Data Processing Records (DPR) — FinPlay

**מסמך פנימי. לא לפרסום.**
**גרסה:** 1.0
**תאריך עדכון אחרון:** 03/06/2026
**אחראי:** יואב רובין (founder + DPO זמני)
**עו"ד פרטיות חיצוני:** טרם מונה

---

## 1. מטרת המסמך

מסמך זה מתעד את כל זרימות המידע האישי באפליקציית FinPlay, כנדרש לפי **חוק הגנת הפרטיות תיקון 13 (08/2025)**. הוא משמש כ-DPR (Data Processing Records) פנימי ובסיס ל-PIA (Privacy Impact Assessment) חיצוני שיבוצע ב-Q3 2026.

---

## 2. מאגרי מידע (Data Stores)

### 2.1 Client-side stores

| Store | Engine | Encryption | סוג מידע | רגישות |
|---|---|---|---|---|
| `useAuthStore` | MMKV | none | profile (displayName, financialDream, financialGoal, knowledgeLevel, ageGroup, birthYear, learningTime, learningStyle, dailyGoalMinutes) | בינוני |
| `useFinancialProfileStore` | MMKV | none | monthlySalaryGross, monthlyTaxPaid, creditPoints, maritalStatus, kidsCount | **גבוה (מידע רגיש מיוחד — מצב כלכלי)** |
| `useTermsStore` | MMKV | none | acceptedVersion, acceptedAt | נמוך |
| `useEconomyStore` | MMKV | none | xp, coins, gems, hearts | נמוך |

**TODO (Phase 2):** הפעלת `encryptionKey` ב-MMKV עבור `useFinancialProfileStore` (כדאי גם ל-`useAuthStore` אם הוא מכיל birthYear של קטין).

### 2.2 Server-side stores (Neon Postgres)

| Table | מטרה | רגישות |
|---|---|---|
| `user_profiles` | account basics: displayName, email, isPro, level, xp, coins | נמוך-בינוני |
| `module_progress` | התקדמות לימודית | נמוך |
| `ai_mentor_usage` | מונים של שיחות AI per user | נמוך |
| `paper_portfolio`, `paper_trades` | סימולציית מסחר (לא כסף אמיתי) | נמוך |
| `bridge_clicks` | קליקים על שותפי השקעות (Bridge) | בינוני |
| `breaking_news_tracked`, `breaking_news_summaries` | מניות שמשתמש עוקב אחריהן | נמוך |
| `user_stats` | נתוני engagement | נמוך |
| `crowd_question_votes`, `coin_events`, `referrals`, `dividend_collections` | פעילות in-app | נמוך |
| `user_feedback`, `support_messages` | פניות תמיכה | בינוני (תוכן free-text) |
| `bandit_variants` | A/B test bucketing | נמוך |
| `daily_news_challenge` | תוכן (לא user-specific) | לא רלוונטי |

**מה לא נשמר ב-Neon:**
- `birthYear`, `financialGoal`, `financialDream`, `knowledgeLevel`, `ageGroup` — נשארים ב-MMKV בלבד.
- `monthlySalaryGross` וכל ה-financial profile — local only.

---

## 3. זרימות מידע חיצוניות (Third-Party Data Flows)

### 3.1 Google Gemini (LLM) — דרך `/api/ai/chat`, `/api/ai/insights`, `/api/ai/banner-tip`, `/api/daily-news-challenge`
- **מה נשלח:** systemPrompt + messages (יכול לכלול financialGoal, displayName, level, lastModuleName).
- **רגישות:** בינוני-גבוה (פרופיל אישי מקובץ).
- **מיקום עיבוד:** Google data centers (אזור לא מוגדר).
- **בסיס משפטי:** הסכמה ב-Terms (כללי). **לא מספיק לפי תיקון 13.** דרושה הסכמה פרטנית — TODO ב-P0-4.

### 3.2 Anthropic Claude — דרך `/api/ai/chat-stream` (אם פעיל)
- **מה נשלח:** systemPrompt + messages.
- **רגישות:** בינוני-גבוה.
- **מיקום עיבוד:** Anthropic data centers (US-East primarily).
- **בסיס משפטי:** כמו 3.1.

### 3.3 Payslip Analyzer — `/api/payslip/analyze`
- **מה נשלח:** **תמונת תלוש שכר מלאה** (PDF/image) ל-Gemini.
- **רגישות:** **גבוה מאוד** (מידע כלכלי מפורט).
- **שמירה:** **לא נשמרת** ב-Neon אחרי העיבוד. רק תוצאה מקובצת נשארת זמנית בזיכרון של ה-client.
- **בסיס משפטי:** **חסר.** דרושה הסכמה מפורשת לפני העלאת תלוש. TODO ב-P0-4 + P1-1.

### 3.4 RevenueCat — מנויים
- **מה נשלח:** anonymous appUserId (לא PII). status המנוי.
- **רגישות:** נמוך (אין PII).
- **מיקום:** RevenueCat infrastructure (US).
- **בסיס משפטי:** סטנדרט מסחרי — Terms.

### 3.5 PostHog — Analytics
- **מה נשלח:** events anonymous + distinctId (hashed). פרופיל user properties (level, xp, isPro).
- **רגישות:** נמוך-בינוני.
- **מיקום:** PostHog EU cluster.
- **בסיס משפטי:** legitimate interest + Terms.

### 3.6 Tavily — חיפוש חדשות (cron DNC + breaking-news)
- **מה נשלח:** query strings בלבד (תיקרים פיננסיים). אין user data.
- **רגישות:** לא רלוונטי.

### 3.7 AdMob (Google Ads) — מודעות
- **מה נשלח:** device ID, ad ID, geo (גס).
- **רגישות:** בינוני (tracking).
- **בסיס משפטי:** ATT prompt ב-iOS, Tracking Transparency. TODO: הוספת TFUA flag לקטינים (16-17).

### 3.8 Facebook SDK — אטריביושן + לוגים
- **מה נשלח:** events של install/signup/purchase.
- **רגישות:** בינוני (cross-app tracking).
- **בסיס משפטי:** ATT prompt. **חשיפת tracking** כבר מוגדרת ב-iOS privacyManifests.

### 3.9 Resend — אימיילים (welcome, daily)
- **מה נשלח:** email + תוכן template.
- **רגישות:** נמוך.

### 3.10 Apple Sign-In / Google Sign-In
- **מה נשלח:** OIDC token ל-Supabase Auth.
- **רגישות:** נמוך (זה ה-auth).

---

## 4. תקופות שמירה (Retention)

| סוג מידע | תקופת שמירה | סיבה |
|---|---|---|
| `user_profiles` | כל עוד החשבון פעיל | חוויית משתמש |
| `module_progress` | כל עוד החשבון פעיל | התקדמות לימודית |
| `paper_trades` | 12 חודשים אחרונים | למידה היסטורית |
| `support_messages` | 24 חודשים אחרונים | חוק העברת מידע + תקנות צרכן |
| `ai_mentor_usage` | 90 ימים | מונים, לא תוכן |
| `bridge_clicks` | 24 חודשים | פיננסים + tax records |
| MMKV (כל ה-local) | עד `account delete` | בלעדית בשליטת המשתמש |
| LLM logs (Gemini/Anthropic) | לפי המדיניות שלהם — לרוב 30 יום | חיצוני |

**מימוש מחיקה:** `/api/account/delete` (TODO ב-P1-3) — clean wipe מ-Neon + cascading delete של כל הטבלאות לפי `user_id`.

---

## 5. זכויות המשתמש (תיקון 13)

| זכות | מימוש נוכחי | מצב | TODO |
|---|---|---|---|
| **זכות עיון** (סע' 13) | לא קיים endpoint | ❌ | P1-3 — `/api/account/export` |
| **זכות תיקון** (סע' 14) | profile screen settings (חלקי) | ⚠️ | להרחיב |
| **זכות מחיקה** (תיקון 13) | לא קיים | ❌ | P1-3 — `/api/account/delete` |
| **זכות הצטרפות / הסכמה** | TermsReconsentGate | ⚠️ | Terms blanket — לא פרטני |
| **זכות התנגדות לעיבוד** | לא קיים | ❌ | P0-4 — AI consent banner |
| **זכות לדעת מי המאגר** | חלקי ב-Terms | ⚠️ | LegalScreen הוא כתובת הגעה |

---

## 6. אבטחת מידע (תקנות 2017)

### Tier הנדרש: **בינוני** (יותר מ-100k רשומים)

| דרישה | מצב נוכחי | TODO |
|---|---|---|
| Encryption-at-rest | Neon: ✅ (ברירת מחדל ב-Pro tier). MMKV: ❌ | P2-3 — MMKV encryption key |
| Encryption-in-transit | ✅ HTTPS עם TLS 1.2+ (Vercel) | — |
| Access control | API keys ב-env, אין user-level audit logs | P2-4 — logs middleware |
| Backup | Neon ברירת מחדל (7 ימי PITR) | — |
| Incident response | אין מסמך פורמלי | P2-2 — חלק מ-PIA |
| מנהל אבטחה (DPO) | יואב, **לא פורמלי** | P2-1 |

---

## 7. אירועים שדורשים דיווח לרשות הגנת הפרטיות

לפי תיקון 13, יש לדווח על:

1. דליפת מידע אישי של > 1,000 משתמשים.
2. דליפת מידע רגיש (פיננסי, רפואי, מין, אמונה) של > 100 משתמשים.
3. כל פגיעה משמעותית באבטחה.

**איש קשר לדיווח (TODO):** איש קשר ל-Privacy Protection Authority (`mishpat.gov.il/PPA`) — יואב.

---

## 8. ספקי משנה (Data Processors)

| ספק | מה הוא מעבד | DPA חתום | מצב |
|---|---|---|---|
| Neon (DB) | All server-side | ✅ (Standard DPA) | OK |
| Vercel (hosting) | All API calls | ✅ (Standard DPA) | OK |
| Google (Gemini) | LLM prompts | ⚠️ Standard ToS, אין enterprise DPA | TODO — לבחון Google Cloud DPA |
| Anthropic (Claude) | LLM prompts | ⚠️ Standard ToS | TODO |
| RevenueCat | subscription data | ✅ | OK |
| PostHog | analytics | ✅ EU DPA | OK |
| Resend | emails | ✅ | OK |
| Supabase (auth) | OIDC tokens | ✅ | OK |
| Tavily | search queries | ⚠️ Standard ToS | OK (אין PII) |

---

## 9. גרסאות והיסטוריה

| גרסה | תאריך | שינוי | מבצע |
|---|---|---|---|
| 1.0 | 03/06/2026 | מסמך ראשוני נכתב לאחר זיהוי פערים בביקורת משפטית | יואב |

---

## 10. אישור והפצה

מסמך זה נכתב על ידי **יואב רובין** ביום **03/06/2026** במסגרת ביקורת compliance עצמית.
- **אישור עו"ד פרטיות:** טרם — TODO ב-Q3 2026 (PIA).
- **הפצה:** founders + DPO (גם יואב). לא לפרסום ציבורי.
