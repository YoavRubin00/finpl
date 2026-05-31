# AI Follow-up Questions — Design

**Date:** 2026-05-31
**Feature area:** `src/features/chat`

## Problem
The two suggestion chips at the bottom of the AI chat ([ChatScreen.tsx](../../../src/features/chat/ChatScreen.tsx), `suggestions.slice(0, 2)`) are static contextual defaults. They never change as the conversation progresses, so they stop being relevant after the first exchange.

## Goal
After each completed AI reply, generate two fresh follow-up questions tailored to that answer and crossfade them into the two bottom chips. The questions must **not** appear in the chat transcript — only the chip labels change. The default chips remain until the user gets their first real answer.

## Approach (decided)
- **Generation:** a separate, lightweight call after the reply finishes streaming (chosen over inline markers / a static bank for reliability — it can't pollute the visible reply).
- **Tap action:** unchanged — tapping a chip fills the input box so the user can edit/send.

## Design

### 1. `src/features/chat/generateFollowups.ts` (new)
- Reuses the existing `/api/ai/chat` endpoint via `streamChatRequest` — **no backend change / no new deploy**.
- System prompt instructs: output ONLY a JSON array of exactly 2 short Hebrew follow-up questions (≤ ~6 words each), nothing else.
- One user turn carries the last question + last answer as context.
- `maxOutputTokens: 120`; own `AbortController` so a rapid next send cancels stale generation.
- Accumulates streamed text, tolerantly parses a JSON array of strings, validates exactly 2 non-empty trimmed strings.
- **Any failure (network/parse/abort/wrong shape) → resolves `null`.** Never throws, never blocks the chat.

### 2. ChatScreen wiring
- New state `dynamicSuggestions: ChatSuggestion[] | null` (null ⇒ show default `suggestions.slice(0,2)`).
- Chips render from `dynamicSuggestions ?? suggestions.slice(0,2)`.
- After a **successful** reply in both `sendMessage` and the lifeline auto-send effect, fire `generateFollowups(lastQ, lastA, systemPrompt)`. On a valid result → `setDynamicSuggestions([{text:q1,moduleId:null},{text:q2,moduleId:null}])`.
- Skip generation when the reply errored or the user just hit the daily quota (upgrade-prompt turn).
- A ref holds the follow-up `AbortController`; aborted on a new send and on unmount.

### 3. Smooth swap
Each chip label wrapped in a keyed `Animated.View` (key = question text) with `entering={FadeIn.duration(350)}` / `exiting={FadeOut}`. Changing text fades old out, new in. The `?` expand button and trending-questions row are untouched.

## Behavior
| Moment | Chips |
|---|---|
| First load / greeting | Default contextual chips |
| After answer #1 | Crossfade to 2 AI follow-ups for that answer |
| After answer #N | Crossfade again |
| Offline / parse fail / quota hit | No change, no error, no flicker |

## Cost
One ~120-token extra call per answered message.

## Out of scope
Backend changes, the trending-questions row, the `?` toggle, tap-to-send.
