# PRD Log — FinPL Full Roadmap

Master tracking document for all PRDs. Ralph Loop methodolo (Plan > Act > Verify > Refine).
Aligned with Feature Roadmap (`.gemini/antigravity/brain/.../feature_roadmap.md`).

---

## Foundation (PRD 1-6) — COMPLETED

### PRD 1: Economy Foundation
**Status:** COMPLETED
**Scope:** Dual-token store (XP + Coins +Streak), persistence, progression logic.
**Dir:** `src/features/economy/`, `src/constants/economy.ts`, `src/utils/progression.ts`

### PRD 2: FinFeed (TikTok-Style Homךe Feed)
**Status:** COMPLETED
**Scope:** Vertical swipeable lesson cards, neon-gaming branding.
**Dir:** `src/features/finfeed/`

### PRD 3: Visual Pyramid (Progression UI)
**Status:** COMPLETED
**Scope:** 5-layer pyramid driven by XP from useEconomyStore.
**Dir:** `src/features/pyramid/`

### PRD 4: Arena (Daily Challenges + Leaderboard)
**Status:** COMPLETED
**Scope:** 3 daily challenges, coin rewards, local leaderboard.
**Dir:** `src/features/arena/`

### PRD 5: Shop (Coin Spending)
**Status:** COMPLETED
**Scope:** Purchasable items, atomic spendCoins, confirm modal.
**Dir:** `src/features/shop/`

### PRD 6: Identity & Onboarding
**Status:** COMPLETED
**Scope:** Auth flow, ProfilingFlow (age + persona + goal), EconomyHeader, AuthGuard.
**Dir:** `src/features/auth/`, `src/features/onboarding/`, `src/components/ui/EconomyHeader.tsx`

---

## Content & Features (PRD 7-23) — MOSTLY COMPLETED

### PRD 7-11: Chapter Content (1-5)
**Status:** COMPLETED (all 29 modules written)
- Ch1 הישרדות (9 modules) — `src/features/chapter-1-content/`
- Ch2 ביטחון (5 modules) — `src/features/chapter-2-content/`
- Ch3 יציבות (4 modules) — `src/features/chapter-3-content/`
- Ch4 צמיחה (6 modules) — `src/features/chapter-4-content/`
- Ch5 עצמאות (5 modules) — `src/features/chapter-5-content/`

### PRD 12-13: Wisdom Flashes
**Status:** COMPLETED
**Scope:** Financial wisdom + psychology-based flashes, favorites system.
**Dir:** `src/features/wisdom-flashes/`

### PRD 14: Subscription / Paywall
**Status:** COMPLETED
**Dir:** `src/features/subscription/`

### PRD 17: Arena Redesign — Learning Page Gamification
**Status:** COMPLETED
**Dir:** `src/features/pyramid/`

### PRD 18: Simulation — Snowball Debt (mod-1-3)
**Status:** COMPLETED
**Dir:** `src/features/chapter-1-content/simulations/`

### PRD 19: Simulation — Compound Interest (mod-1-4)
**Status:** COMPLETED
**Dir:** `src/features/chapter-1-content/simulations/`

### PRD 22: פינבוט — Companion Bot
**Status:** COMPLETED
**Dir:** `src/features/chat/`

### PRD 23: Clash Royale UI Overhaul
**Status:** COMPLETED (US-001 to US-015 done)
**Scope:** Diamond backgrounds, gold borders, Supercell buttons, sparkle effects, text shadows.
**Dir:** `src/features/ux-overhaul/PRD23_ClashRoyaleUI.md`
**Components:** DiamondBackground, GoldBorderCard, BannerRibbon, SupercellButton, GoldCircleBadge, SparkleOverlay

### PRD 29: Tactile Sims, Premium Polish & 3D
**Status:** COMPLETED ✅ (US-001 ✅, US-002 ✅, US-003 ✅)
**Scope:** Skia interactive graphs with scrubber + haptics, glassmorphism overlays (expo-blur), 3D holographic arena badges (expo-sensors gyroscope), skeleton loaders.
**Dir:** `src/features/ux-overhaul/PRD29_TactileSims.md`
**Components:** SkiaInteractiveChart, GlassOverlay, HolographicCard, use3DTilt, SkeletonLoader, FeedSkeleton

### PRD 15: FinFeed TikTok Overhaul
**Status:** COMPLETED
**Scope:** All-chapter hooks (5 chapters), seeded daily shuffle, TikTok-style autoplay (no play button), wisdom flashes in feed, comics + hooks with CTA buttons, viewabilityConfig as useRef.
**Dir:** `src/features/finfeed/`

### "עוד" Tab + FinFeed Floating Button
**Status:** COMPLETED
**Scope:** Replaced fantasy tab in bottom nav with "עוד" hub. MoreScreen contains: פנטזי ליג (🚧), סימולטור השקעות, חדשות (🚧), פריטים שמורים, הגדרות, הזמן חבר, קהילת WhatsApp, משפטי, יציאה מהחשבון. Floating Grid3X3 button on FinFeedScreen (left:16, bottom:90).
**Files:** `app/(tabs)/more.tsx`, `src/features/more/MoreScreen.tsx`
**Rule:** All future features enter "עוד" — not the main tab bar.

### Other completed features:
- **The Bridge** — reward redemption — COMPLETED
- **Friends Clash** — multiplayer quiz battles — COMPLETED
- **Shop** — COMPLETED
- **Chest System (basic)** — COMPLETED
- **Hearts/Lives System** — PARTIAL
- **Budget Minister Sim** — COMPLETED

---

## Phase 1: Chapter 1 Simulators (PRD 24) — COMPLETED

**Status:** COMPLETED (all 9 sims done, 25/25 US complete)
**PRD:** `src/features/chapter-1-content/simulations/PRD24_Ch1_RemainingSims.md`
**Progress:** `src/features/chapter-1-content/simulations/progress24.txt`

| # | Module | Sim Name | Status |
|---|--------|----------|--------|
| 5 | לקרוא תלוש שכר | נינג'ה תלוש (Payslip Ninja) | DONE |
| 6 | הלוואות צרכניות | מירוץ מכוניות (Car Loan Race) | DONE |
| 7 | עמלות ומיקוח | קרב הבנקאי (Bank Fee Combat) | DONE |
| 8 | מלכודות שיווקיות | מירוץ עגלות (Shopping Cart Race) | DONE |
| 9 | קרן חירום | טרמפולינה (Emergency Fund) | DONE |

---

## Phase 2: Chapter 2 Simulators (PRD 25) — COMPLETED

**Status:** COMPLETED (25/25 US complete)
**PRD:** `src/features/chapter-2-content/simulations/PRD25_Ch2_Sims.md`
**Progress:** `src/features/chapter-2-content/simulations/progress25.txt`

| # | Module | Sim Name | Type | Status |
|---|--------|----------|------|--------|
| 10 | דירוג אשראי | בנה את הציון | Credit score events | DONE |
| 11 | נקודות זיכוי | פאזל התלוש | Tax credit puzzle | DONE |
| 12 | פנסיה | מרוץ הפרישה | Two runner race | DONE |
| 13 | קרן השתלמות | המגרסה | Tax grinder comparison | DONE |
| 14 | ביטוחים | מגן הביטוח | Insurance obstacle course | DONE |

---

## Phase 3: Chapter 3 Simulators (PRD 26) — COMPLETED

**Status:** COMPLETED (20/20 US complete)
**PRD:** `src/features/chapter-3-content/simulations/PRD26_Ch3_Sims.md`
**Progress:** `src/features/chapter-3-content/simulations/progress26.txt`

| # | Module | Sim Name | Type | Status |
|---|--------|----------|------|--------|
| 15 | אינפלציה | מירוץ הקניות | Race against rising prices | DONE |
| 16 | פסיכולוגיה | מדד הפאניקה | Hold button during panic | DONE |
| 17 | קופת גמל | מסלול המכשולים | Investment obstacle course | DONE |
| 18 | רובו אדוויזור | שגר ושכח | Build portfolio, watch sim | DONE |

---

## Phase 4: Chapter 4 Simulators (PRD 27) — COMPLETED

**Status:** COMPLETED (30/30 US complete)
**PRD:** `src/features/chapter-4-content/simulations/PRD27_Ch4_Sims.md`
**Progress:** `src/features/chapter-4-content/simulations/progress27.txt`

| # | Module | Sim Name | Type | Status |
|---|--------|----------|------|--------|
| 19 | שוק ההון 101 | סליידר הסיכון | Allocate stocks/bonds | DONE |
| 20 | קסם המדדים | מדד לייב | S&P 500 fast-forward | DONE |
| 21 | תעודות סל | בנה את הסל | Choose ETFs | DONE |
| 22 | פקודות מסחר | סימולטור מסחר | Market/Limit/Stop Loss | DONE |
| 23 | דיבידנדים | עץ הדיבידנדים | Eat vs reinvest | DONE |
| 24 | פיזור | מנהל התיקים | Portfolio manager | DONE |

---

## Phase 5: Chapter 5 Simulators (PRD 28) — COMPLETED ✅

**PRD:** `src/features/chapter-5-content/simulations/PRD28_Ch5_Sims.md`
**Progress:** All 25/25 US complete + browser verified

| # | Module | Sim Name | Type | Status |
|---|--------|----------|------|--------|
| 25 | FIRE | מחשבון החופש | Savings rate → retirement age | ✅ DONE |
| 26 | משכנתא ונדל"ן | משחקי הנדל"ן | Mortgage mix + events | ✅ DONE |
| 27 | REIT | בעל הבית הווירטואלי | REIT sector picker | ✅ DONE |
| 28 | תכנון פרישה | מחשבון הפרישה | Lump sum vs annuity | ✅ DONE |
| 29 | צוואות | עץ המשפחה | Beneficiaries sim | ✅ DONE |

---

## Phase 6: PRD 21 — Unified Gamification & Emotional UX ("Fin-conomy" + Lottie)

**Status:** COMPLETED ✅
**Dir:** `src/features/retention-loops/PRD21_UnifiedGamification.md`

| # | Feature | Description |
|---|---------|-------------|
| 1 | GlobalWealthHeader | Hearts, Coins, Gems, Streak — replaces fragmented headers |
| 2 | Gems Economy | Gem display + sinks (skip chest timer, premium avatar) |
| 3 | Hearts/Lives UX | Heart break animation, OutOfHeartsModal + PRO upsell |
| 4 | Unified Chest Flow | Chest → slot animation, gem-to-open, slot handling |
| 5 | Streak Multiplier | 7-day streak = +10% chest drops, visual bonus |
| 6 | XP → Level System | Level ring, level-up celebrations |
| 7 | Emotional UX: Lottie | "Finn" mascot animations (Idle, Celebration, Empathy, Thinking) |
| 8 | Emotional UX: Feedback | Haptics & Bounce (`withSpring`) on quiz buttons, dynamic flows |

---

### PRD 29a: MacroEvents Mini-Game ("UP or DOWN?")
**Status:** COMPLETED ✅
**Scope:** Feed card mini-game — historical market events, UP/DOWN guess, reveal animation, XP/Coin rewards, streak bonus, score pill.
**Dir:** `src/features/macro-events/`
**Files:** `types.ts`, `macroEventsData.ts` (20 events), `useMacroEventStore.ts`, `MacroEventCard.tsx`
**Integration:** `FeedItem` union + `FinFeedScreen` pool (up to 3 unanswered events per session)

---

## Phase 7: Premium Polish, New Features & Social

| # | PRD | Feature | Description | Status |
|---|-----|---------|-------------|--------|
| 1 | PRD 23 remaining | Clash Royale UI Polish | US-011→015 (ChapterMap, Shop, Profile, Arena restyle) | COMPLETED ✅ |
| 2 | PRD 29a | MacroEvents Mini-Game | UP/DOWN historical market events in Wisdom Flashes + Feed | COMPLETED ✅ |
| 3 | PRD 29b | Tactile Sims & Skia | Revolut-style Skia graphs, glassmorphism, 3D holographic badges | COMPLETED ✅ |
| 4 | PRD 30 | Trading Hub | Paper-trading, daily close prices (not real-time), 14 assets | ✅ DONE |
| 5 | PRD 31 | Fantasy League | Stock portfolio competition (depends on PRD 30) | ✅ DONE — 14 iterations complete |
| 6 | PRD 32 | Social mechanics & Viral Loops | 1v1 Duels, Squad Battles, WhatsApp AI Mentor, Adaptive Lifeline, Refer-a-Friend | COMPLETED ✅ |
| 7 | PRD 33 | Monetization & Shop IAP | Real-money Gem bundles, premium routing, Lottie purchases | COMPLETED ✅ |
| 8 | PRD 35 | Neon DB + Drizzle ORM | Cloud sync — user_profiles, module_progress, inventory via Neon HTTP | COMPLETED ✅ |
| 9 | PRD 34 | AI Personalization Engine | LLM analysis of telemetry to adapt UX, unlock secret modules | COMPLETED ✅ |
| 11 | PRD 36 | Avatar System (v2) | Enhanced: Step 1 picker, login/register display, expanded shop library | ✅ DONE |
| 12 | PRD 37 | Passive Income (Referral Assets) | 5% coin dividend from friends, AssetsScreen, educational framing | ✅ DONE |
| 13 | PRD 38 | Real Assets Portfolio | Buy virtual apartments/stores/REITs with game coins, daily yield, home splash | ✅ DONE |
| 14 | PRD 39 | Character Animations & UX Moments | Pro upgrade popup (global Zustand), streak reveal, quiz-start popup — all with Finn Lottie | ✅ DONE |
| 15 | — | UX Polish Session | Bug fixes: shop crash, MacroEvent reveal, chat chips, BudgetGame overflow, LessonFlow chest order, Duolingo-style PyramidScreen | ✅ DONE |
| 16 | PRD 30 upgrade | Investment Simulator Upgrade | Magnificent 7 + volatility ratings + educational tooltips + game-money investing | ✅ DONE (already in code) |
| 17 | PRD 43 | Monetization Boost | PRO-locked sims (6) + Daily Deals in Shop (Clash Royale style) | ✅ DONE |
| 18 | PRD 42 | Fantasy Stock Draft | Weekly 5-stock draft across categories (Value, Growth, Tech, etc.) | ✅ DONE |
| 10 | — | Push Notifications | Daily streak (20:00), chest ready, friend challenge — expo-notifications + Zustand | ✅ DONE |
| 19 | PRD 44 | Smart Chat Bot | צ'אט בוט חכם: מזהה מודולה אחרונה שהושלמה, מציע 2 שאלות נפוצות מותאמות per module, מעודד שימוש. 29 modules × 2 שאלות = 58 presets | ✅ DONE |
| 20 | PRD 45 | Settings & Activation | הפיכת כל הרכיבים ב"עוד" לפעילים: הדלקת התראות (expo-notifications), מסך הגדרות מלא עם Lottie, ניהול פרופיל, שפה, התראות, אבטחה | ✅ DONE |
| 21 | PRD 46 | Saved Content (PRO) | שמירת תכנים באפליקציה — פיצ'ר PRO: סימון שיעורים/סימולציות/פיד כ"שמור", עמוד "פריטים שמורים" ב"עוד" עם תג PRO (Lottie Pro Animation), גישה מהירה לתוכן שנשמר | ✅ DONE |
| 22 | PRD 47 | Simulator Visual Overhaul | 29 סימולציות — מעבר ל-OCEAN_CHAPTER_PALETTE, הסרת Image→LottieIcon, single-page layout, GlowCard+FadeInDown, RTL Hebrew | ✅ DONE |
| 23 | PRD 48 | Launch Readiness | App branding, .easignore, API layer, Google OAuth prod, store submission, RevenueCat | IN PROGRESS |
| 24 | PRD 49 | Daily News Flash Quiz | בוסטר חדשות — auto-fetch macro data (BOI, Alpha Vantage), AI quiz generation (Gemini), feed integration, real citations + historical examples | ✅ DONE |
| 27 | PRD 51 | User Preference Model | מודל שמנתח את העדפות המשתמש והפרופיל שלו ומתאים לו את הפיד, התוכן והאתגרים — כולל למידה מהתנהגות (מודולות שהושלמו, דירוגי ארנה, זמני שימוש) | NOT STARTED |
| 25 | — | Scenario Lab Live Chart | SVG portfolio chart in sim phase + market benchmark line | ✅ DONE |
| 26 | — | Flying Reward Animation | Coins/XP particles fly from center to header via bezier curves on economy store change | ✅ DONE |

---

## Execution Order

```text
Phase 1   →  PRD 24 (Ch1 sims 5-9)               ✅ DONE
Phase 2   →  PRD 25 (Ch2 sims 10-14)              ✅ DONE
Phase 3   →  PRD 26 (Ch3 sims 15-18)              ✅ DONE
Phase 4   →  PRD 27 (Ch4 sims 19-24)              ✅ DONE
Phase 5   →  PRD 28 (Ch5 sims 25-29)              ✅ DONE
Phase 6   →  PRD 21 (Unified Gamification + Finn)  ✅ DONE
Phase 7a  →  PRD 23 remaining (US-011–015)         ✅ DONE
Phase 7b  →  PRD 29a MacroEvents (Wisdom Flashes)  ✅ DONE (5/5 US — MacroEventCard + store + 20 events)
Phase 7c  →  PRD 29b Tactile Sims + 3D Holographic ✅ DONE (SkeletonLoader + FeedSkeleton added)
Phase 7d  →  PRD 33 Shop Monetization & IAP         ✅ DONE — Gem bundles, IAP modal, friction routing
Phase 7e  →  PRD 35 Cloud Sync (Neon/Drizzle)       ✅ DONE — user_profiles/module_progress/inventory synced
Phase 8   →  PRD 34 AI Personalization Engine       ✅ DONE — FinBrain, telemetry, analyzeProfile, DynamicIAPService
Phase 8b  →  PRD 36 Avatar System (v2)              ✅ DONE — v1 + Step 1 reorder + Login/Register + new Shop avatars
Phase 8c  →  PRD 37 Passive Income (Referral)       ✅ DONE — all 4 US complete
Phase 9   →  PRD 38 Real Assets Portfolio           ✅ DONE — all 5 US complete
Phase 9b  →  UX Polish Session                      ✅ DONE — shop crash, MacroEvent reveal, chat chips, BudgetGame, LessonFlow chest, Duolingo PyramidScreen
Phase 10  →  PRD 39 Character Animation Moments     ✅ DONE — QuizStartPopup, GlobalUpgradeModal (Zustand), StreakReveal
Phase 11  →  PRD 30 Upgrade: Investment Simulator   ✅ DONE — already in TradingHub (volatility, edu tags, game-money)
Phase 12  →  PRD 31 Fantasy League                  ✅ DONE — all 14 iterations complete
Phase 13  →  Push Notifications                     ✅ DONE — streak/chest/challenge, expo-notifications, Zustand store
Phase 14  →  PRD 40 Duo-Style Migration             ✅ DONE — Adaptive Theme (useTheme hook), 3D buttons, Snake Path, all screens dark-mode ready
Phase 15  →  PRD 41 Notification UI Banner          ✅ DONE — NotificationPermissionBanner integrated in FinFeedScreen
Phase 16  →  PRD 43 Monetization Boost              ✅ DONE — PRO sim gates + Daily Deals
Phase 17  →  PRD 44 Smart Chat Bot                  ✅ DONE — Context-aware FAQ per module
Phase 18  →  PRD 45 Settings & Activation           ✅ DONE — All "More" items active + Settings screen
Phase 19  →  PRD 46 Saved Content (PRO)             ✅ DONE — Bookmark system for PRO users
Phase 20  →  PRD 42 Fantasy Stock Draft             ✅ DONE — 4 US, full draft flow + weekly cycle
Phase 21  →  PRD 47 Simulator Visual Overhaul       ✅ DONE — 29 sims, ocean palette + Lottie + GlowCard
Phase 22  →  Scenario Lab Live Chart               ✅ DONE — SVG portfolio chart + market benchmark
Phase 23  →  Flying Reward Animation               ✅ DONE — bezier particle flight to header
Phase 24  →  PRD 48 Launch Readiness               IN PROGRESS — app branding done, ErrorBoundary + ProWelcome next
Phase 25  →  PRD 49 Daily News Flash Quiz          ✅ DONE — BOI/Alpha Vantage data, Gemini AI quizzes, 20 fallbacks, citations + historical examples
Phase 26  →  PRD 50 Infographic Design Language    IN PROGRESS — mod-1-4 complete (7/7), mod-1-2 partial (2/7)
Phase 27  →  PRD 51 User Preference Model          NOT STARTED — ניתוח העדפות + פרופיל → התאמת תוכן
```

---

## PRD 50: שפה עיצובית אינפוגרפית — הטמעה מלאה באפליקציה

**Status:** IN PROGRESS
**Plan file:** `.claude/plans/deep-prancing-eagle.md`

### Context
במודולה 1-4 (ריבית דריבית) בנינו שפה עיצובית אינפוגרפית פרימיום שאושרה. רקע אוקיינוס כהה `#0c1929`, צבעי כחול (`#0ea5e9`, `#0369a1`, `#38bdf8`, `#e0f2fe`), סגנון תלת-מימדי יוקרתי, RTL עברית. המטרה: להרחיב לכל 34 המודולות + ציטוטים + כרטיסי פיד + רכיבים נוספים.

### Phases

**פאזה 1 — אינפוגרפיקות מודולות (238 תמונות)**
- 34 מודולות × (6 כרטיסיות + 1 סיכום) = 238 תמונות
- עדיפות: יחידה 1 (63) → יחידה 2 (35) → יחידה 3 (28) → יחידה 4 (42) → יחידה 5 (35)
- סטטוס: mod-1-4 מושלם (7/7), mod-1-2 חלקי (2/7), שאר לא התחילו

**פאזה 2 — ציטוטים ומבזקי חכמה (~50 תמונות)**
- `FeedQuoteItem.tsx` — אינפוגרפיקות רקע לציטוטים בפיד
- `WisdomPopupCard.tsx` — רקע אינפוגרפי למבזקי חכמה

**פאזה 3 — כרטיסי פיד (~20 תמונות)**
- `MacroEventCard.tsx` — אינפוגרפיקות קטגוריאליות לאירועים מאקרו
- `FeedScenarioCard.tsx` — header ויזואלי לסצנריו
- `FeedModuleHookCard.tsx` — preview מהסיכום

**פאזה 4 — תיקון צבעי סימולציות (קוד בלבד)**
- 19 מסכי סימולציה עם צבעים לא אחידים → palette כחול אוקיינוס

**פאזה 5 — רכיבים נוספים (~15 תמונות)**
- פרופיל (דשבורד ויזואלי), חנות (בנדלים), empty states, streak celebration

### Key Files
- `src/features/chapter-1-content/FlashcardInfographic.tsx` — מיפוי כרטיסיות→תמונות
- `src/features/chapter-1-content/LessonFlowScreen.tsx` — SUMMARY_MAP + פלואו
- `src/features/chapter-[N]-content/chapter[N]Data.ts` — data עם `isComic: true`
- `assets/infographics/mod-X-Y/` — תיקיות תמונות

### Generation
- כלי: NotebookLM CLI (`notebooklm generate infographic`)
- Rate limit: ~2-3 per batch, 5-10 min cooldown
- Post-processing: crop sides 3%, bottom 5%, top 1%, resize 1024×1024

Total: **25 simulators** + 6 gamification features + polish + social/AI mechanics.

---

## Simulator Architecture Patterns

6 reusable archetypes that most sims fall into:

| Archetype | Sims | Shared Component |
|---|---|---|
| Slider + Graph | Compound(4), Risk(19), S&P(20), FIRE(25), Retirement(28) | `<SliderSimulator>` |
| Drag & Classify | Budget(1), Ninja Payslip(5), Tax Credits(11) | `<DragClassifyGame>` |
| Obstacle Course | MinusTrap(2), Shopping Cart(8), Insurance(14), Inflation(15), Investment(17) | `<ObstacleCourseGame>` |
| Growing Object | Snowball(3), Car Interest(6), Tax Grinder(13), Dividend Tree(23) | `<GrowthVisualization>` |
| Timed Reaction | Bank Combat(7), Panic Index(16) | `<TimedReactionGame>` |
| Builder/Allocator | ETF(21), Portfolio(24), REIT(27), Family(29), Mortgage(26), Trade(22), Robo(18) | `<AllocationBuilder>` |

---

## Architecture Notes
- **Simulation pattern**: types → data → hook → screen → integration
- **CLASH theme**: visual standard — `import { CLASH } from '@/constants/theme'`
- **Shared components**: DiamondBackground, GoldBorderCard, BannerRibbon, SupercellButton, GoldCircleBadge, SparkleOverlay
- **Pre-existing TS errors**: FeedSidebar.tsx, useClashStore.ts — known, ignore
- **Ralph prompt**: `BASE/ralph-prompt.txt` — update per PRD
