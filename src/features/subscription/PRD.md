# PRD: Subscription & PayPlus Payment Integration

## Introduction
Add a two-tier subscription model (Basic / Pro) with PayPlus payment gateway integration. Basic users get access to all features with daily limits. Pro users ($8/month) unlock unlimited simulator access and AI-powered insights. Includes a free trial period, webhook-based status sync, and a polished pricing screen.

## Goals
- Monetize the app with a clear, fair freemium model
- Integrate PayPlus as the payment gateway for recurring billing
- Persist subscription status in Neon DB with webhook sync
- Gate Pro features (unlimited simulator, AI insights) behind subscription
- Provide a smooth upgrade/downgrade experience

## Feature Differences

| Feature | Basic (Free) | Pro ($8/month) |
|---------|-------------|----------------|
| FinFeed (lessons) | Full access | Full access |
| Pyramid progression | Full access | Full access |
| Arena challenges | 3 per day | Unlimited |
| Shop (coins) | Full access | Full access |
| Simulator | 3 sessions/day | Unlimited |
| AI Companion chat | 5 messages/day | Unlimited |
| AI Insights | Not available | Full access |
| XP & Coins earning | Normal rates | Normal rates |

## User Stories

### US-001: Subscription schema & types
**Description:** As a developer, I want subscription data types and DB schema so that subscription state can be persisted.

**Acceptance Criteria:**
- [x] Create `src/features/subscription/types.ts` with `SubscriptionTier` (`basic` | `pro`), `SubscriptionStatus` (`active` | `trialing` | `canceled` | `expired`), and `Subscription` interface (userId, tier, status, startDate, endDate, trialEnd, payPlusCustomerId)
- [x] Create Neon DB migration: `subscriptions` table with columns matching the interface
- [x] Add `subscription_tier` column to existing users table (default `basic`)
- [x] Typecheck passes

### US-002: Subscription Zustand store
**Description:** As a developer, I want a local subscription store so the app can check tier status without network calls.

**Acceptance Criteria:**
- [x] Create `src/features/subscription/useSubscriptionStore.ts` with Zustand + persist
- [x] Store holds: `tier`, `status`, `trialEnd`, `endDate`
- [x] Expose selectors: `isPro`, `isTrialing`, `canAccessFeature(feature)`
- [x] Feature gate helper checks daily usage counts vs tier limits
- [x] Typecheck passes

### US-003: Usage tracking store
**Description:** As a developer, I want to track daily feature usage so Basic users are limited correctly.

**Acceptance Criteria:**
- [x] Add daily usage counters to subscription store: `simulatorUsesToday`, `arenaChallengesToday`, `chatMessagesToday`
- [x] Counters reset at midnight (local time)
- [x] `incrementUsage(feature)` action increments counter
- [x] `canUse(feature)` returns boolean based on tier + current count
- [x] Limits: simulator=3, arena=3, chat=5 for Basic; unlimited for Pro
- [x] Typecheck passes

### US-004: PayPlus API integration (backend)
**Description:** As a developer, I want server-side PayPlus integration so we can create payment links and process subscriptions.

**Acceptance Criteria:**
- [x] Create `src/features/subscription/payplus.ts` with PayPlus API client
- [x] Function `createPaymentLink(userId, plan)` calls PayPlus recurring charge API, returns payment URL
- [x] Function `cancelSubscription(userId)` cancels recurring charge via PayPlus API
- [x] PayPlus API key stored in environment variable (never hardcoded)
- [x] Typecheck passes

### US-005: PayPlus webhook handler
**Description:** As a developer, I want a webhook endpoint so PayPlus can notify us of payment events.

**Acceptance Criteria:**
- [x] Create webhook handler that accepts PayPlus IPN/webhook POST
- [x] Handle events: `payment_success`, `payment_failure`, `subscription_canceled`
- [x] On success: update `subscriptions` table (status=active, extend endDate)
- [x] On cancel: set status=canceled, keep endDate (user stays Pro until period ends)
- [x] On failure: set status=expired if past endDate
- [x] Validate webhook signature for security
- [x] Typecheck passes

### US-006: Pricing screen UI
**Description:** As a user, I want to see a clear pricing page comparing Basic and Pro so I can decide whether to upgrade.

**Acceptance Criteria:**
- [x] Create `src/features/subscription/PricingScreen.tsx`
- [x] Two cards side by side: Basic (Free) and Pro ($8/month)
- [x] Each card lists included features with check/cross icons
- [x] Pro card has "Start Free Trial" CTA button (neon-violet gradient)
- [x] Basic card has "Current Plan" or "Downgrade" label based on status
- [x] Gaming-Neon dark theme (#09090b background, neon-violet accents)
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-007: Payment flow (PayPlus redirect)
**Description:** As a user, I want to tap "Start Free Trial" and be redirected to PayPlus checkout so I can subscribe.

**Acceptance Criteria:**
- [x] Tapping CTA calls `createPaymentLink` and opens PayPlus URL in in-app browser
- [x] On return from PayPlus, app checks subscription status
- [x] Success: update local store to Pro, show success toast
- [x] Failure: show error message, remain on pricing screen
- [x] Loading state shown while creating payment link
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-008: Feature gating UI
**Description:** As a Basic user, I want to see clear feedback when I hit a daily limit so I know why and how to upgrade.

**Acceptance Criteria:**
- [x] When Basic user hits simulator limit: show modal "You've used 3/3 simulations today. Upgrade to Pro for unlimited access"
- [x] Modal has "Upgrade" button (navigates to pricing) and "OK" dismiss button
- [x] Same pattern for arena (3/3) and chat (5/5) limits
- [x] Pro users never see limit modals
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-009: Subscription management screen
**Description:** As a Pro user, I want to manage my subscription (view status, cancel) from my profile.

**Acceptance Criteria:**
- [ ] Add "Subscription" section to ProfileScreen
- [ ] Shows current plan, status, next billing date
- [ ] "Cancel Subscription" button with confirmation dialog
- [ ] After cancel: shows "Active until [endDate]" message
- [ ] Basic users see "Upgrade to Pro" button instead
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-010: Navigation & tab integration
**Description:** As a user, I want to access the pricing page from the app navigation.

**Acceptance Criteria:**
- [ ] Add route `app/(tabs)/pricing.tsx` that renders PricingScreen
- [ ] Add pricing icon/tab or accessible via profile screen
- [ ] Deep link support: `finpl://pricing`
- [ ] Typecheck passes
- [ ] Verify changes work in browser

## Non-Goals
- In-app purchases via App Store / Google Play (PayPlus only for now)
- Annual billing plan (monthly only for MVP)
- Multiple Pro tiers (single Pro tier only)
- Coin purchasing with real money (coins remain earned-only)
- Admin dashboard for subscription management
- Refund handling (manual process for now)

## Technical Notes
- **PayPlus API**: Use PayPlus recurring payments API. Docs: https://www.payplus.co.il
- **Webhook security**: Validate PayPlus webhook signatures to prevent spoofing
- **Neon DB**: Already integrated — add `subscriptions` table alongside existing schema
- **Trial period**: 7-day free trial, no charge until trial ends
- **Timezone**: Daily usage resets at midnight in user's local timezone
- **Existing stores**: `useEconomyStore` (XP/Coins) remains unchanged — subscription is separate concern
- **Environment variables**: PayPlus API key, secret key, terminal UID stored in `.env`
