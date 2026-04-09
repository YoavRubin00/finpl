# PRD 14: מודל תמחור — Free & Pro 💎

## 🌟 הקדמת הפיצ'ר
FinPlay עובד על מודל **Freemium** בדיוק כמו Duolingo — חינם וזמין לכולם, עם שכבת Pro ששולחנית את החוויה לרמה הבאה. המטרה: לא לנעול תוכן קריטי, אלא ליצור חוויה כל כך טובה שהמשתמש **ירצה** לשדרג. ה-Pro לא "פותח דלתות נעולות" — הוא **מוריד חיכוך ומוסיף על חוויה שכבר מעולה**.

---

## 🆓 Free Tier (חינמי)

### מה נכלל:
| פיצ'ר | פירוט |
|---|---|
| ✅ כל 5 הפרקים (25+ מודולים) | גישה מלאה לכל התוכן הלימודי: פלאשכרטיסים, קוויזים, הקדמות אינטראקטיביות |
| ✅ סימולציות משחק | "שר התקציב" וכל הסימולציות העתידיות |
| ✅ מבזקי חכמה | ציטוטים ותובנות פסיכולוגיות (PRD 12-13) |
| ✅ מערכת XP ומטבעות | צבירת ניסיון, רמות, ומטבעות |
| ✅ פירמידה פיננסית | מסע בין 5 השכבות |
| ✅ סטריקים | מעקב רצף יומי |
| ❤️ 5 לבבות (חיים) ביום | טעית בקוויז? מפסיד לב. נגמרו? מחכים או משדרגים |
| 🔄 1 חזרה על מודול ביום | אפשר לשחק שוב מודול אחד ביום (כדי לשפר ציון) |
| 📊 סיכום שבועי בסיסי | "למדת 3 מודולים השבוע" |
| 🎯 אתגר יומי 1 | אתגר יומי אחד (בלבד) |

### הגבלות Free:
| הגבלה | הסבר |
|---|---|
| ❤️ מערכת לבבות | 5 לבבות ביום. כל תשובה שגויה = -1 לב. נגמרו → צריך לחכותיו או לשדרג |
| ⏱️ טיימר מילוי לבבות | לב חוזר כל 4 שעות (או דילוג ב-Pro) |
| 🔒 חזרות מוגבלות | רק חזרה אחת על מודול ביום כדי לשפר ציון |
| 🚫 ללא מועדפי חכמה | אי אפשר לשמור מבזקי חכמה למועדפים |
| 📊 סיכום בסיסי בלבד | בלי Analytics מעמיקים |

---

## 💎 Pro Tier — $7.99/חודש (₪29.90)

> *"FinPlay Pro — תלמד בלי גבולות, תשחק בלי הפסקות"*

### מה נכלל (מעבר ל-Free):
| פיצ'ר Pro | פירוט |
|---|---|
| ♾️ לבבות אינסופיים | אף פעם לא נתקעים. טעיתם? ממשיכים ללמוד בלי הפסקה |
| 🔄 חזרות ללא הגבלה | שחקו כל מודול כמה פעמים שרוצים, בכל רגע |
| 📊 Analytics מתקדם | דשבורד אישי: נקודות חוזק/חולשה, גרף התקדמות, השוואה לשבועות קודמים |
| ⭐ מועדפי חכמה | שמירת ציטוטים ותובנות + מסך גלריה |
| 🏆 אתגרים יומיים בונוס | 3 אתגרים יומיים (במקום 1) עם תגמולי XP כפולים |
| 🎨 ערכות נושא בלעדיות | סקינים לפירמידה ולפרופיל (Neon Purple, Gold Rush, Matrix Green) |
| 🚀 בוסט XP | ×1.5 XP על כל פעולה (למידה מהירה יותר של רמות) |
| 📤 שיתוף מבזקי חכמה | יצירת תמונה ממותגת ושיתוף בסושיאל |
| 🔔 ללא פרסומות | (לכשיהיו — Pro יהיה תמיד נקי) |
| 💬 סיכום AI חודשי | סיכום חודשי אישי של ההתקדמות עם המלצות (עתידי) |

---

## 💰 מבנה תמחור

| תוכנית | מחיר | חיסכון |
|---|---|---|
| **חודשי** | $7.99/חודש (₪29.90) | — |
| **שנתי** | $59.99/שנה (₪219.90) | **חיסכון של 37%** ⭐ |
| **משפחתי (עתידי)** | $99.99/שנה (עד 5 משתמשים) | — |

### Trial:
- **7 ימי ניסיון חינם** ל-Pro בהרשמה ראשונה
- אתם מקבלים badge מיוחד "🔰 Pro Trial" שנשאר גם אם לא משדרגים

---

## User Stories (טכניות)

### US-001: Subscription State & Store
**Description:** As a developer, I want a global subscription store to track user tier so features can gate on Free vs Pro.

**Acceptance Criteria:**
- [ ] Create `useSubscriptionStore.ts` (Zustand + persist)
- [ ] State: `tier: 'free' | 'pro'`, `expiresAt: string | null`, `trialUsed: boolean`
- [ ] Action: `upgradeToPro()`, `downgradeToFree()`, `isProActive(): boolean`
- [ ] Persistence via AsyncStorage
- [ ] Typecheck passes

### US-002: Hearts System (Free Tier)
**Description:** As a free user, I have 5 hearts per day. Wrong quiz answers cost 1 heart. When hearts run out, I must wait or upgrade.

**Acceptance Criteria:**
- [ ] Add `hearts: number` (max 5), `lastHeartRefill: string` to store
- [ ] `useHeart()` → decrements by 1; returns false if 0 left
- [ ] Hearts refill 1 every 4 hours (max 5), or instantly with Pro
- [ ] Pro users always return `hearts = Infinity` (bypass system)
- [ ] Show hearts count in `LessonFlowScreen` header
- [ ] When hearts = 0, show "Out of Hearts" modal with upgrade CTA
- [ ] Typecheck passes

### US-003: Paywall / Upgrade Screen
**Description:** As a free user, I want to see a beautiful upgrade screen that shows me what Pro offers when I hit a limitation.

**Acceptance Criteria:**
- [ ] Create `PaywallScreen.tsx` — full-screen modal with feature comparison
- [ ] Design: dark premium feel, gold/purple accents, animated feature list
- [ ] Show pricing options (monthly + annual with savings badge)
- [ ] "Start 7-Day Free Trial" CTA button
- [ ] "Restore Purchase" link
- [ ] Can be triggered from: hearts modal, settings, profile badge
- [ ] Typecheck passes

### US-004: Pro Badge & Visual Indicators
**Description:** As a Pro user, I want visual indicators throughout the app showing my premium status.

**Acceptance Criteria:**
- [ ] 💎 Pro badge next to username in profile
- [ ] ♾️ icon replacing hearts counter for Pro users
- [ ] Gold border glow on profile card
- [ ] "Pro" label on pyramid screen
- [ ] Typecheck passes

### US-005: Feature Gating Utility
**Description:** As a developer, I want a simple utility to check feature access so I can gate Pro features throughout the app.

**Acceptance Criteria:**
- [ ] Create `useProFeature(featureName: ProFeature): { allowed: boolean; showPaywall: () => void }`
- [ ] Define `ProFeature` type: `'unlimited-hearts' | 'unlimited-replays' | 'analytics' | 'favorites' | 'bonus-challenges' | 'themes' | 'xp-boost' | 'share-wisdom'`
- [ ] When `allowed = false` and user tries, automatically trigger paywall
- [ ] Typecheck passes

### US-006: Revenue Cat / In-App Purchase Integration (Phase 2)
**Description:** As a product owner, I want real payment processing for subscriptions.

**Acceptance Criteria:**
- [ ] Integrate `react-native-purchases` (RevenueCat SDK)
- [ ] Configure products in App Store Connect + Google Play Console
- [ ] Handle subscription lifecycle: purchase, renewal, cancellation, expiry
- [ ] Restore purchases on new devices
- [ ] Webhook for server-side receipt validation (future)
- [ ] **Note:** Phase 1 can use a mock/toggle for development

---

## 🎨 Design & Aesthetic Guidelines

### Paywall Screen:
- **Background:** Deep dark gradient (#0a0a0f → #1a0a2e)
- **Hero:** Animated diamond/crown icon with particle effects
- **Feature List:** Checkmarks with glow animation on scroll-in
- **CTA Button:** Gold gradient (#f59e0b → #d97706), large, with "sparkle" micro-animation
- **Annual Plan:** Highlighted with a "Best Value" badge ribbon
- **Social Proof:** "הצטרפו ל-10,000+ שחקנים שכבר שידרגו" (placeholder)

### Hearts UI:
- **Full Heart:** ❤️ red (#ef4444) with subtle pulse
- **Empty Heart:** 🩶 gray (#3f3f46)
- **Zero Hearts Modal:** Dramatic red overlay + crying emoji + timer til next heart + big purple "Go Pro" button

### Pro Badge:
- **Badge:** 💎 with gold ring border, subtle shine animation
- **Profile Glow:** Gold `shadowColor: '#f59e0b'` with `shadowRadius: 12`

---

## 📊 Psychology & Conversion Strategy (à la Duolingo)

### Why this model works:

1. **אל תנעל תוכן** — כל התוכן הלימודי פתוח. המשתמש לא מרגיש "בניגוד". הוא מרגיש שהוא מקבל הרבה בחינם.

2. **לבבות = חיכוך מתוזמן** — בדיוק כמו Duolingo. הלבבות לא מונעים למידה, הם מאטים אותה. המשתמש שרוצה ללמוד עכשיו מרגיש את ה"כאב" ומשדרג.

3. **XP Boost = FOMO** — "אם הייתי Pro, הייתי כבר ברמה 15 במקום 10". משחק על הפסיכולוגיה של ההתקדמות.

4. **Trial = Hook** — 7 ימים בחינם לחוות את ה"חלק" של Pro. אחרי שמתרגלים ללבבות אינסופיים, קשה לחזור.

5. **שנתי = Anchor** — מראים קודם את החודשי ($7.99) ואז את השנתי ($4.99/חודש = חיסכון 37%). ה-Anchor effect עובד מעולה.

---

## Non-Goals
- מערכת לקופונים / קודי הנחה (לא בגרסה ראשונה)
- תוכנית Enterprise / B2B
- תשלום עבור תכנים ספציפיים (אין IAP לתוכן בודד)
- מערכת מינויים בצד שרת (Phase 1 = client-side only)

## Technical Notes
- **Phase 1:** Mock subscription — toggle ב-store בין `free` ו-`pro` לפיתוח ובדיקות
- **Phase 2:** RevenueCat SDK (`react-native-purchases`) לתשלומים אמיתיים
- **Persistence:** Zustand + AsyncStorage לשמירת סטטוס מנוי
- **Hearts Timer:** שימוש ב-`setInterval` + `Date.now()` לחישוב זמן מילוי לבבות
- **Feature Gating:** Hook מרכזי `useProFeature` שמחזיר `allowed` + `showPaywall`
- **Analytics Events:** `subscription_start`, `subscription_cancel`, `paywall_shown`, `paywall_dismissed`, `hearts_depleted`
