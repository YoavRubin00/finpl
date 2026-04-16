# PRD: Retention Loops — Streak Repair + Hearts Refill (דואו)

**Status:** Active  
**Source:** דואו audit 2026-04-16  
**Scope:** Strengthen existing retention mechanics that are present-but-weak. Based on Duolingo A/B-tested patterns.

**NOT in scope:** Leagues (see `src/features/arena/PRD_Duolingo_Leagues_DEFERRED.md` — separate 1-2 week feature).

---

## User Stories

### US-001 — Streak Freeze Celebration Modal
- [x] Target: `src/features/streak/` (new component) + `src/features/economy/useEconomyStore.ts`
- **Problem:** When Streak Freeze auto-consumes (gap=2 day), nothing visible happens. Silent save = no emotional payoff = no gratitude = no retention lift.
- **Fix:** On next app open after a freeze-save, show modal:
  - Finn/Captain Shark avatar (empathic pose)
  - "Finn הציל לך את הרצף 🥶❄️"
  - "עכשיו נשארו לך X מגיני רצף. שמור אותם טוב."
  - CTA: "המשך ללמוד" + secondary "קנה עוד מגינים" (shop link)
- Track a `pendingFreezeSaveAck: boolean` flag on the store; set true when freeze consumed, clear when modal dismissed.
- **Acceptance:**
  - [x] Modal component created with Finn + Hebrew copy
  - [x] Triggered on first app-open after freeze-save
  - [x] Typecheck passes

### US-002 — "Out of Freezes" Upsell Banner
- [x] Target: `src/features/pyramid/DuoLearnScreen.tsx` (banner component) + hearts/streak UI
- **Problem:** Users with streak ≥ 7 and 0 freezes have no visible warning / upsell. Breaking a 30-day streak is the #1 churn event.
- **Fix:** Persistent banner (dismissible per-day) above lesson list:
  - Show when `streakDays >= 7 && streakFreezes === 0`
  - Copy: "רצף של X ימים! כדאי שיהיה לך מגן רצף למקרה חירום"
  - CTA: "קנה מגן (50 מטבעות)" → shop direct
- Dismissible with "כבר יש לי" → hides for 24h
- **Acceptance:**
  - [x] Banner component with conditional render
  - [x] 24h dismiss state persisted
  - [x] Typecheck passes

### US-003 — Auto-grant Streak Freeze at 7-day milestone
- [x] Target: `src/features/streak/StreakCelebrationScreen.tsx` + `useEconomyStore.ts`
- **Problem:** `StreakCelebrationScreen` celebrates 7/30/100 milestones but gives only XP/coins. Auto-granting a freeze at 7 days = "welcome to the club" reward = strong retention hook.
- **Fix:** On 7-day milestone, also call `addStreakFreezes(1)`. Update celebration modal to show "+1 מגן רצף" as one of the rewards.
- Also: add 365-day milestone (currently missing).
- **Acceptance:**
  - [x] 7-day milestone grants 1 free streak freeze
  - [x] Celebration modal shows the freeze reward
  - [x] 365-day milestone added
  - [x] Typecheck passes

### US-004 — Streak Repair (day-after-break offer)
- [ ] Target: new component in `src/features/streak/` + `useEconomyStore.ts`
- **Problem:** When a streak breaks, it's gone silently. Duolingo offers "repair it for X" — recovers ~10% of lapsers.
- **Fix:** On first open after a break (streak was ≥ 3 days):
  - Modal: "הרצף שלך (X ימים) נשבר 💔. נחזיר אותו?"
  - Option A: "החזר בתשלום מטבעות" (200 coins — cost-gated to what user has)
  - Option B: "החזר דרך הצפייה בפרסומת" (ad → restore)
  - Option C: "לא, אתחיל מחדש"
- Only offered ONCE per break. Track `lastRepairOfferedAt`.
- Only offered if previous streak was ≥ 3 days.
- Restore logic: set `streakDays` back to previous value, reset `lastDailyTaskDate` to now.
- **Acceptance:**
  - [ ] Repair modal component + store method `repairStreak(source: 'coins' | 'ad')`
  - [ ] One-shot per break, gated on previous streak ≥ 3
  - [x] Typecheck passes

### US-005 — Change Hearts refill from 4h to 5h
- [x] Target: `src/features/subscription/useSubscriptionStore.ts:28`
- **Problem:** `HEART_REFILL_MS = 4 * 60 * 60 * 1000`. Duolingo A/B tested 4h/5h/6h and found **5h is the sweet spot** — aligns with overnight + after-school windows, creates natural anticipation without frustration.
- **Fix:** `HEART_REFILL_MS = 5 * 60 * 60 * 1000`
- **Acceptance:**
  - [x] Constant updated to 5 hours
  - [x] Typecheck passes

### US-006 — Practice-to-Refill (complete old lesson → heart)
- [ ] Target: `src/features/subscription/HeartsUI.tsx` (`OutOfHeartsModal`) + lesson-completion handler
- **Problem:** `OutOfHeartsModal` currently offers ad / coins / gem / Pro. Missing: "תרגל שיעור ישן וקבל לב" — this is Duo's #2 heart surface and reinforces mastery (pedagogically valuable).
- **Fix:**
  - Add option to `OutOfHeartsModal`: "תרגל שיעור שכבר סיימת → +1 לב"
  - On selection, navigate to random completed lesson
  - On lesson complete with no new XP (because already completed), grant `+1 heart`
  - Rate-limit: max 2 practice-refills per day
- **Acceptance:**
  - [ ] Practice option added to OutOfHeartsModal
  - [ ] Practice flow grants +1 heart on completion
  - [ ] Daily rate limit enforced
  - [x] Typecheck passes

### US-007 — Personalize notification time by lastDailyTaskDate
- [ ] Target: `src/features/notifications/useFinnNotificationScheduler.ts:61`
- **Problem:** Hardcoded 20:00 send time. Users who learn at 12:00 or 22:00 get notifications at the wrong time.
- **Fix:**
  - Track average hour-of-day of `lastDailyTaskDate` from last 14 days
  - Schedule daily reminder 2h before that average (nudges into habit window)
  - Fallback to 20:00 if insufficient data (<7 days of activity)
- **Acceptance:**
  - [ ] Personalized send hour based on user's learning pattern
  - [ ] Graceful fallback to 20:00 for new users
  - [x] Typecheck passes

### US-008 — Feed dailyGoalMinutes into notification tone
- [ ] Target: `src/features/onboarding/ProfilingFlow.tsx` (already collects) + `src/features/notifications/finnNotificationCopy.ts`
- **Problem:** `dailyGoalMinutes` is collected in onboarding (Q7) but never influences notifications.
- **Fix:** Add copy variants keyed by goal:
  - Casual (5-10 min): warm, low-pressure ("נתחיל עם 5 דקות? 🐟")
  - Regular (15 min): default current tone
  - Serious (20+ min): performance-focused ("יום חסר — נחזור למסלול")
- **Acceptance:**
  - [ ] 3 tone variants wired via `selectCopyForGoal(goalMinutes)`
  - [ ] Each notification trigger uses the variant matching user profile
  - [x] Typecheck passes

### US-009 — Add 23:00 "save your streak" fallback notification
- [ ] Target: `src/features/notifications/useFinnNotificationScheduler.ts`
- **Problem:** If user skipped the primary evening notification, no last-chance 23:00 reminder. Duolingo's 23:00 fallback lifts retention +14%.
- **Fix:**
  - Schedule second notification at 23:00 IF `lastDailyTaskDate !== today`
  - Copy: "רצף של X ימים... שעה אחרונה לשמור עליו 🕚"
  - Cancel if user logs a session before 23:00
- **Acceptance:**
  - [ ] 23:00 fallback notification scheduled
  - [ ] Auto-cancel if session logged same-day
  - [x] Typecheck passes
