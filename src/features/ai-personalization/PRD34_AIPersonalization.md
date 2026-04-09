# PRD 34: AI Personalization Engine (The "FinBrain")

## Overview
To provide a truly next-generation educational experience, FinPlay will use an internal Large Language Model (LLM) agent to continuously analyze the user's answers, interactions, and behavior. Instead of a static learning path, the app will adapt dynamically—unlocking secret modules, adjusting difficulty, and tailoring the UI to the user's specific financial persona and knowledge gaps.

## Goal
Build the **FinBrain Engine**: a centralized system that collects interaction telemetry (quiz answers, simulator choices, time spent), feeds it to an LLM for analysis, and uses the resulting insights to mutate the app's state (unlocking paths, changing content types).

## Architecture

### 1. Telemetry Collection (`useAITelemetryStore.ts`)
- **Data Points:**
  - Quiz answers (correct/incorrect, time taken).
  - Simulator decisions (e.g., risk appetite in the Risk Simulator, investment choices in the ETF builder).
  - Profiling data from onboarding (Age, Goal).
- **Batching:** Telemetry is batched and sent to the AI processing layer after significant milestones (e.g., finishing a chapter or failing a module 3 times).

### 2. The LLM Analysis Layer
- **Prompting Strategy:** System prompts will instruct the LLM to act as a "Financial Behavioral Analyst".
- **Input:** The batched telemetry JSON.
- **Output (Structured JSON):**
  - `persona_shift`: (e.g., "From Risk-Averse to Risk-Curious")
  - `knowledge_gaps`: Array of topics the user struggles with (e.g., ["Compound Interest", "Tax Brackets"]).
  - `monetization_vector`: The user's psychological spending trigger (e.g., "Impulse Buyer", "Status Seeker", "Anxious/Needs Security").
  - `recommended_actions`: Array of app state mutations (e.g., `UNLOCK_MODULE_X`, `INCREASE_DIFFICULTY`, `TRIGGER_TARGETED_IAP`).

### 3. Dynamic App Mutations
Based on the LLM's output, the app will perform the following dynamic changes:
- **Targeted Monetization (Dynamic IAP):** The AI identifies the user's psychological trigger. It dynamically injects personalized purchase offers—for example, popping up a "Safety Net Bundle" (Gems + Lives) for an anxious user who just failed, or an exclusive "Platinum Avatar" for a competitive user who just won a Duel.
- **Secret Modules:** Unlock hidden "Bonus Modules" matching the user's specific weaknesses or advanced interests (e.g., if the user maxes out the risk simulator, unlock a "Crypto Advanced" module).
- **Dynamic UI/UX:** Change the "Finn" mascot's default behavior and dialogue to match the user's need (e.g., more supportive if they fail often, more challenging and sarcastic if they breeze through).
- **Personalized Feed:** Adjust the `FinFeedScreen` algorithm to heavily prioritize TikTok-style videos and flashes that address the identified `knowledge_gaps`.

## User Stories

### US-001: Telemetry Data Pipeline
**Description:** As the system, I need to silently collect user decisions in quizzes and simulators to build a behavioral profile.
**Acceptance Criteria:**
- [x] Create `useAITelemetryStore.ts`.
- [x] Hook into `completeModule`, `submitQuiz`, and simulator results to log data.

### US-002: AI Profile Analysis
**Description:** As a user, my financial profile should evolve based on my actions, analyzed by an AI.
**Acceptance Criteria:**
- [x] Create a backend edge function (or mock service for now) that takes telemetry and calls an LLM (e.g., OpenAI API) with a structured prompt.
- [x] The LLM must return a standardized JSON profile update.
- [x] Store the updated "AI Profile" in the user's local/cloud state.

### US-003: Dynamic Content Unlocking
**Description:** As a user, if I show specific behavior, the app should magically reveal new content specifically for me.
**Acceptance Criteria:**
- [x] Update `ChapterMapScreen` to support "Hidden/Dynamic" nodes.
- [x] When the AI Profile outputs a specific trigger (e.g., `UNLOCK_CRYPTO_NODE`), render the new module on the map with a special glowing animation.
- [x] Adjust the Feed algorithm to inject items matching the new AI Profile tags.

### US-004: AI-Driven Monetization Engine
**Description:** As the business, I want the AI to analyze the user's psychological profile and trigger the most effective monetization offer at the perfect emotional moment to maximize revenue.
**Acceptance Criteria:**
- [x] Add `monetization_vector` to the LLM JSON schema.
- [x] Update `useAITelemetryStore` to track monetization signals (e.g., time spent looking at the shop, reactions to running out of hearts, frequent chest unlocks).
- [x] Create a `DynamicIAPService` that customizes the copy and timing of Gem bundle popups based on the user's AI profile (triggering FOMO, Status, or Security based on the user).

## Execution Rules
- Start with a mocked LLM response for frontend development (US-001 and US-003).
- The actual LLM integration (US-002) should be done server-side securely to avoid leaking API keys.
- Monetization prompts (US-004) must feel native to the gamified experience and not purely like ads.
