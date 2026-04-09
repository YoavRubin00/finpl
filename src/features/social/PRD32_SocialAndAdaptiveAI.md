# PRD 32: Social Progression & Adaptive AI Learning (Phase 7)

## Overview
This PRD outlines the mechanics designed to drive long-term retention, viral growth, and personalization. Drawing from the success of gaming and social platforms, we are introducing competitive social mechanics (Duels and Squads), a premium Referral ecosystem, and highly personalized, empathetic AI assistance to guide the user.

## Goal
1. Shift motivation from purely intrinsic to **extrinsic social pressure** through Squad Battles, Duels, and a Viral Referral Network.
2. Provide a **safe psychological space** for asking "stupid" financial questions.
3. Use **Adaptive AI** to close knowledge gaps precisely when the user fails.

## User Stories

### US-001: 1v1 Rapid Duels
**Description:** As a user, I want to challenge my friends to quick, synchronous or asynchronous financial knowledge duels to show off my progress.

**Acceptance Criteria:**
- [x] Create a `DuelsScreen` where users can invite friends or matchmake.
- [x] Implement a fast-paced timer-based quiz mechanic (e.g., 60 seconds to answer as many questions as possible).
- [x] Award standard Economy Tokens (Coins, small amount of Gems) upon winning.
- [x] Track Duel Win/Loss ratio on the user's Profile.

### US-002: Squad Battles (Group Leaderboards)
**Description:** As a user, I want to join a squad (e.g., my army unit, university) and contribute to our collective score against other squads.

**Acceptance Criteria:**
- [x] Create a `Squads` hub.
- [x] Allow users to create or join a Squad via invite code.
- [x] Aggregate XP from all squad members into a Weekly Squad Score.
- [x] Distribute a weekly "Squad Chest" reward based on the squad's tier and ranking.

### US-003: The Digital Chatbot Mentor (WhatsApp Style)
**Description:** As a user, I am intimidated by formal finance. I want to chat with an AI mentor in an interface that feels as casual and private as WhatsApp.

**Acceptance Criteria:**
- [x] Overhaul existing `chat` logic to resemble a standard messaging app (messages, typing indicators, read receipts).
- [x] Ensure the prompt persona is "Non-judgmental, casual, empathetic mentor".
- [x] Add context-awareness: The AI should know which chapter/module the user is currently on and pre-fill suggested questions (e.g., "I saw you just finished the Mortgage module. Have any questions about interest rates?").

### US-004: Adaptive AI - Failure Recovery
**Description:** As a user, if I fail a concept multiple times, the app should realize I don't understand and explain it differently, not just penalize me.

**Acceptance Criteria:**
- [x] Log specific `tags` or `concepts` of questions a user gets wrong consistently across module attempts.
- [x] Before the user completely fails out or loses all hearts, trigger an AI "Lifeline" intervention.
- [x] The AI generates a customized, simplified explanation (via OpenAI/Anthropic API integration) targeting specifically the failed gap.

### US-005: The "Wealth Network" (Refer a Friend Gamification)
**Description:** As a business, I want the referral system to feel like a high-end status game rather than a cheap invite link, driving massive viral growth and monetizing the user's social network.

**Acceptance Criteria:**
- [x] Add an "Invite Friends" hub in the Profile or Arena.
- [x] **Tiered Rewards:** When a referred friend finishes the Onboarding, the inviter receives a "Diamond Chest" (showering Gems via Lottie animation).
- [x] **Status Unlocks:** 3 referrals unlock a "Gold Investor" Avatar Frame. 5 unlocks a 3D Holographic "Whale" Badge.
- [x] **Passive Income Mechanic (The "Dividend"):** The inviter receives a passive "XP Dividend" (e.g., 5% of whatever XP their invited friends earn each week), constantly encouraging them to push their friends to keep learning.
- [x] Show a visual "Network Tree" displaying the avatars of friends the user brought into the platform.

## Execution Considerations
- Social features will require migrating from `AsyncStorage` to a proper Cloud Backend (e.g., Neon DB / Supabase) to handle sync and live states.
- AI features must be securely proxied through an edge function to protect API keys.
