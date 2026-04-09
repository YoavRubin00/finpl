# PRD — FinPL: Financial Literacy Platform

**Version:** 0.1
**Date:** 2026-03-05
**Status:** Draft

---

## 1. Overview

FinPL is a mobile-first financial literacy app that teaches personal finance through gamified micro-lessons and challenges. Users earn XP by completing educational content and Coins by completing real-world financial tasks. Both currencies drive a progression system that keeps users engaged and builds lasting financial habits.

---

## 2. Problem Statement

Most adults lack foundational personal finance skills — budgeting, investing, debt management — because traditional financial education is dry, inaccessible, or too abstract. Existing apps focus on tracking (Mint, YNAB) but not teaching. FinPL closes that gap with learn-by-doing, game-style feedback loops.

---

## 3. Target Users

| Segment | Description |
|---|---|
| Young Adults (18–30) | First job, student loans, no investing experience |
| Career Changers | New income, need to re-plan finances |
| Parents | Teaching kids about money, want a shared learning tool |

Primary persona: **Maya, 24**, first full-time job, has no savings, wants to start investing but doesn't know where to begin.

---

## 4. Core Concepts

### 4.1 Dual-Token Economy

| Token | How Earned | How Spent | Can Be Purchased? |
|---|---|---|---|
| **XP** | Lessons, quizzes, streaks, daily tasks, challenges | Unlocks pyramid layers and badges | No |
| **Coins** | Daily task completion, challenges, streak milestones | Shop items, hints, streak freezes, cosmetics | Yes (optional IAP) |

These two currencies are intentionally separate:
- XP reflects **knowledge and effort** — it cannot be bought.
- Coins reflect **engagement and reward** — they can optionally be purchased to reduce friction.

### 4.1.1 Streak System

- A **streak** increments each day the user completes their daily task.
- Missing a day resets the streak to 1 (unless a Streak Freeze item is active).
- Consecutive streaks award a XP bonus that scales with streak length: `10 XP × streak count`.
- `completeDailyTask()` is idempotent — triggering it multiple times per day has no effect.

### 4.2 Levels & Progression (Financial Competence Pyramid)

User level is derived solely from cumulative XP and maps to a **5-layer pyramid**:

| Level | XP Required | Pyramid Layer | Topic Focus |
|---|---|---|---|
| 0 | 0 | 1 — Survival & Control | Cash flow, emergency fund, payslip reading |
| 1 | 100 | 2 — Safety & Protection | Insurance, debt management |
| 2 | 250 | 3 — Stability & Habits | Budgeting, saving plans |
| 3 | 450 | 4 — Growth | Passive investing, compound interest |
| 4 | 700 | 5 — Freedom | Portfolio construction, tax optimization |
| 5 | 1000 | Max | All content unlocked, cosmetics, legacy badges |

- Level and layer are always **derived** from XP, never stored separately.
- Each level unlocks new lesson categories in the Pyramid screen and cosmetic profile items.

### 4.3 Lessons

- Short-form content (2–5 min per lesson).
- Format: Text + illustration, followed by a 3–5 question quiz.
- Correct answers award XP; streak bonuses apply for consecutive correct answers.
- Lesson categories: Budgeting, Saving, Debt, Investing, Taxes, Insurance.

### 4.4 Challenges

- Real-world financial tasks users self-report completing (e.g., "Set up an emergency fund", "Review your subscriptions").
- Completing a challenge awards Coins and a smaller XP bonus.
- Challenges are time-boxed (daily, weekly, monthly).

### 4.5 Shop

- Users spend Coins on:
  - Hint tokens (reveal one answer during a quiz)
  - Streak freeze (protect streak for one missed day)
  - Profile cosmetics (avatars, badge frames)
- No pay-to-win mechanics: shop items do not grant XP.

---

## 5. Features

### MVP (v0.1)

| Feature | Screen | Description | Priority |
|---|---|---|---|
| Onboarding | `(auth)/onboarding` | Goal selection, initial XP award | P0 |
| FinFeed | `(tabs)/index` | Vertical TikTok-style lesson feed | P0 |
| Pyramid | `(tabs)/learn` | Structured lessons by layer, lock/unlock state | P0 |
| Lesson Player | `lesson/[id]` | Full-screen text + quiz flow, XP award on completion | P0 |
| Economy Store | `useEconomyStore` | XP, Coins, Streak — persisted via AsyncStorage | P0 |
| Arena | `(tabs)/arena` | Daily challenges (Coin reward) + leaderboard | P1 |
| Shop | `shop/` | Coin spend catalog (hints, streak freeze, cosmetics) | P1 |
| Profile | `(tabs)/profile` | Level, pyramid layer, badges, streak, XP history | P1 |

### Post-MVP

- Social features: leaderboard, challenge sharing
- In-app purchases (Coin packs)
- Push notifications for streak reminders
- Adaptive lesson recommendations based on quiz performance
- Educator mode: parents or teachers assign lessons to groups

---

## 6. Technical Requirements

### 6.1 Platform

- React Native via Expo (iOS and Android)
- File-based routing via Expo Router

### 6.2 State

- Zustand for all client state
- Dual-token economy managed in `useCurrencyStore`
- All stores persisted via AsyncStorage (`zustand/middleware/persist`)

### 6.3 Styling

- NativeWind (Tailwind CSS for React Native)
- Single design token config in `tailwind.config.js`
- No inline styles or `StyleSheet.create` except for animations

### 6.4 TypeScript

- `strict: true` throughout
- No `any` types
- Shared domain types defined in `src/types/`

### 6.5 Backend

- Neon (serverless PostgreSQL) for user data, lesson content, and challenge definitions
- Auth: to be determined (likely Expo + Clerk or Supabase Auth)

---

## 7. Success Metrics

| Metric | Target (90 days post-launch) |
|---|---|
| Day-7 retention | > 30% |
| Lessons completed per active user/week | > 3 |
| Average session length | > 4 min |
| Streak > 7 days (% of active users) | > 20% |

---

## 8. Out of Scope (v0.1)

- Real financial account linking (Plaid integration)
- AI-generated personalized advice
- Web version
- Multiplayer / real-time features
- In-app purchases

---

## 9. Open Questions

1. What authentication provider best fits Expo + Neon? (Clerk vs. Supabase Auth vs. custom JWT)
2. Should lesson content be stored in the database or bundled as static JSON for offline-first support?
3. What is the Coin-to-IAP exchange rate if/when purchases are added?
4. How do we handle challenge verification — fully self-reported, or can we integrate with external data (bank APIs)?
