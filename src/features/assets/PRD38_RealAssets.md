# PRD 38: Real Assets — Physical Income-Generating Portfolio

## Overview
המשך ישיר ל-PRD 37. לאחר שהמשתמש הבין את המושג "נכסים מניבים" דרך הפניית חברים,
הוא יכול כעת לרכוש **נכסים ממשיים וירטואליים** (דירה, חנות, אנרגיה סולארית, REIT וכו׳)
עם המטבעות שצבר. כל נכס מניב תשואה יומית ברורה שמוצגת בכניסה לאפליקציה ובפרופיל.

**מטרה חינוכית:** ללמד השקעה בנכסים מניבים, תשואה על הון, ו-ROI בצורה חיה ומוחשית.

---

## נכסי הרשימה (6 סוגים)

| # | נכס | עלות (מטבעות) | תשואה יומית | מושג שנלמד |
|---|-----|---------------|-------------|------------|
| 1 | 🏠 דירה להשכרה | 5,000 | 2.5% / חודש → ~4.2 ביום | שכר דירה, תשואת נדל"ן |
| 2 | 🏪 חנות מסחרית | 3,200 | 3% / חודש → ~3.2 ביום | נדל"ן מסחרי, תזרים עסקי |
| 3 | ☀️ פאנלים סולאריים | 1,800 | 1.8% / חודש → ~1.1 ביום | אנרגיה מתחדשת, נכס ייצורי |
| 4 | 🏢 קרן נדל"ן (REIT) | 2,500 | 2.2% / חודש → ~1.8 ביום | REIT, פיזור בנדל"ן |
| 5 | 📊 תיק דיבידנדים | 1,500 | 1.5% / חודש → ~0.75 ביום | מניות דיבידנד, הכנסה פסיבית |
| 6 | 🏦 אג"ח ממשלתי | 800 | 0.8% / חודש → ~0.21 ביום | אג"ח, נכס בטוח-סיכון נמוך |

### מנגנון שדרוג
- כל נכס ניתן לשדרג (tier 1 → 2 → 3) תמורת עלות מטבעות נוספת
- שדרוג מגדיל תשואה יומית ב-50% לכל רמה
- דירה T1: אחד חדר | T2: 2 חדרים | T3: פנטהאוז

---

## Data Model

```typescript
// src/features/assets/realAssetsTypes.ts

export interface RealAsset {
  id: string;
  name: string;
  emoji: string;
  type: 'real_estate' | 'commercial' | 'energy' | 'reit' | 'dividend' | 'bond';
  tier: 1 | 2 | 3;
  baseCost: number;          // מחיר קנייה (מטבעות)
  upgradeCost: number;       // עלות שדרוג לרמה הבאה
  dailyYield: number;        // תשואה יומית בסיסית (מטבעות)
  descriptionHebrew: string; // הסבר חינוכי
  conceptTag: string;        // מושג שנלמד (e.g. "REIT", "דיבידנד")
  purchasedAt?: number;      // timestamp
  lastCollectedAt?: number;  // timestamp
}

export interface RealAssetsState {
  ownedAssets: Record<string, RealAsset>; // assetId → asset
  totalDailyIncome: number;               // סכום כל התשואות היומיות
  lifetimeEarned: number;                 // סה"כ שהרוויח מנכסים

  // Actions
  purchaseAsset: (assetId: string) => boolean;
  upgradeAsset: (assetId: string) => boolean;
  collectDailyIncome: () => void;
  canCollectToday: () => boolean;
  pendingIncome: () => number;
}
```

---

## User Stories

### US-001: Asset Catalog & Purchase
**קבצים:** `realAssetsTypes.ts`, `realAssetsData.ts`, `useRealAssetsStore.ts`
**Acceptance Criteria:**
- [x] Create `src/features/assets/realAssetsTypes.ts` with `RealAsset` + `RealAssetsState`
- [x] Create `src/features/assets/realAssetsData.ts` with 6 assets (3 tiers each)
- [x] Create `src/features/assets/useRealAssetsStore.ts` (Zustand + AsyncStorage persist)
- [x] `purchaseAsset()` deducts coins from `useEconomyStore` if sufficient
- [x] `upgradeAsset()` deducts upgrade cost and bumps tier + dailyYield
- [x] `canCollectToday()` uses ISO date key (resets every 24h)
- [x] `pendingIncome()` = hours since last collection × hourly rate
- [x] TypeScript passes

### US-002: AssetsScreen — נכסים ממשיים Section
**קבצים:** `AssetsScreen.tsx`
**Acceptance Criteria:**
- [x] Add **"נכסים ממשיים"** section to `AssetsScreen.tsx` between section 1 and 2
- [x] Catalog grid: 6 asset cards, each showing emoji, name, daily yield, cost
- [x] Card states: "קנה" (unowned) | "בעלותך ✓" (owned) | "שדרג ↑" (owned, upgradeable)
- [x] Tapping "קנה" → confirm modal with educational description + coin cost
- [x] After purchase: card animates to "owned" state (green glow border)
- [x] Show upgrade path progress (T1 → T2 → T3 dots)
- [x] Collect button at top: "💰 גבה הכנסה יומית — +X מטבעות"

### US-003: Daily Income Card on Home (PyramidScreen)
**קבצים:** `PyramidScreen.tsx`, `src/features/assets/DailyIncomeCard.tsx`
**Acceptance Criteria:**
- [x] Create `DailyIncomeCard.tsx` component
- [x] Shows only if user owns ≥1 real asset
- [x] Displays: total pending income + animated coin counter
- [x] "גבה עכשיו" button that calls `collectDailyIncome()` and shows reward pop
- [x] Placed **above** the arena list, below `GlobalWealthHeader`
- [x] If nothing to collect: shows "🌙 הכנסה הבאה בעוד X שעות"
- [x] Uses `GlowCard` with `glowColor="#facc15"` (gold)

### US-004: Dividend Pill in ProfileScreen (upgrade to include Real Assets)
**קבצים:** `ProfileScreen.tsx`
**Acceptance Criteria:**
- [x] Extend the existing assets navigation pill to show:
  `"💼 נכסים: +X ביום · Y מצטבר"`
- [x] Reads from `useRealAssetsStore` (totalDailyIncome) + `useReferralStore` (totalDividendCoins)
- [x] Spring animation when income changed since last view
- [x] Tapping navigates to `/assets`

### US-005: Post-Streak Income Splash (כניסה לאפליקציה)
**קבצים:** `src/features/assets/PostStreakIncomeSplash.tsx`, `app/(tabs)/index.tsx` or `PyramidScreen.tsx`
**Acceptance Criteria:**
- [x] Create `PostStreakIncomeSplash.tsx` — a bottom sheet / overlay
- [x] Shows once per day on first app open (after streak reveal)
- [x] Displays: Lottie `Money.json` + "הכנסה מאתמול: +X מטבעות 🎉"
- [x] If user has no assets: shows teaser "קנה נכס ראשון → הרוויח בזמן שישנת"
- [x] Calls `collectDailyIncome()` automatically and awards coins
- [x] Generic placeholder animation until user provides custom one
- [x] Dismiss: "תודה!" button or tap outside

---

## Architecture

```
src/features/assets/
├── PRD37_PassiveIncome.md      (existing)
├── PRD38_RealAssets.md         (this file)
├── AssetsScreen.tsx            (extend with real assets section)
├── realAssetsTypes.ts          (NEW)
├── realAssetsData.ts           (NEW — 6 assets × 3 tiers)
├── useRealAssetsStore.ts       (NEW — Zustand + persist)
├── DailyIncomeCard.tsx         (NEW — for PyramidScreen)
└── PostStreakIncomeSplash.tsx  (NEW — daily first-open splash)
```

**Store connections:**
- `useRealAssetsStore` → `useEconomyStore.addCoins()` on collection
- `useRealAssetsStore` → `useEconomyStore.spendCoins()` on purchase
- `ProfileScreen` reads `totalDailyIncome` from `useRealAssetsStore`
- `PyramidScreen` shows `DailyIncomeCard` if `ownedAssets` not empty

---

## Pre-existing TS errors (safe to ignore):
- FeedSidebar.tsx — CLASH.primary does not exist
- useClashStore.ts — XPSource mismatch
- GlassOverlay.tsx — expo-blur not found

---

## Execution Order (Ralph Loops)
1. US-001 — Types + Data + Store (tightly coupled, one loop)
2. US-002 — AssetsScreen extension
3. US-003 — DailyIncomeCard in PyramidScreen
4. US-004 — ProfileScreen pill upgrade
5. US-005 — PostStreakIncomeSplash

## Educational Parallels (inline in UI)
| נכס | מושג | מה נלמד |
|-----|------|---------|
| דירה | נדל"ן להשקעה | תשואה על שכר דירה, מינוף |
| חנות | נדל"ן מסחרי | תזרים מזומנים עסקי |
| פאנלים | אנרגיה ירוקה | נכס ייצורי, ROI על תשתית |
| REIT | קרן נדל"ן | פיזור סיכון, נזילות vs. נדל"ן ישיר |
| דיבידנדים | מניות דיבידנד | הכנסה פסיבית ממניות |
| אג"ח | מכשיר חוב ממשלתי | סיכון-תשואה, נכס בטוח |
