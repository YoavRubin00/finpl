# PRD 5: אתגר חברים (Friends Clash) ⚔️

## Introduction
פיצ'ר "אתגר חברים" (Friends Clash) נועד לעודד תחרותיות בריאה בין משתמשים. משתמש מקבל הזמנה לאתגר מול חבר (או משתמש אקראי) שבו עליהם להתחרות מי משיג יותר נקודות/מטבעות בזמן מוגבל (למשל 24 שעות). האפיון פה מתייחס ספציפית למסך קבלת ההזמנה לאתגר (Invitation Modal/Screen) בהשראת משחקים כמו Duolingo, מותאם לשפת העיצוב של FinPlay (ניאון, Cyber-Finance).

## Goals
- **מעורבות חברתית (Social Engagement):** יצירת טריגר למשתמש להתחיל סשן למידה בגלל תחרות.
- **תחושת דחיפות (Urgency):** תצוגת טיימר ספירה לאחור הממחיש שזמן האתגר מוגבל.
- **UI/UX מלהיב:** מסך הזמנה ברור שבו מוצגים האווטרים של שני השחקנים מתעמתים זה מול זה (Versus).

## User Stories

### US-001: Clash Data Types & Store (Zustand)
**Description:** As a developer, I want to define the types and store structure for the Friends Clash so that the UI can be populated with dynamic data like opponent name and time left.

**Acceptance Criteria:**
- [x] Create `ClashInvite` type (id, opponentName, opponentAvatarPath, endTime, status: 'pending' | 'active')
- [x] Add a mock active invitation to the Zustand store state (e.g., opponentName: 'Joshua', 22 hours left)
- [x] Create a store action `startClash(id: string)` that changes the status from 'pending' to 'active'
- [x] Typecheck passes

### US-002: מסך הזמנה לאתגר (Clash Invitation UI)
**Description:** As a user, I want to see a visually appealing popup/screen when I am challenged, showing who challenged me and how much time is left to accept.

**Acceptance Criteria:**
- [x] Create new component `ClashInvitationModal` (or Screen)
- [x] Top header shows centered text "Friends Clash" with an 'X' close button on the corner.
- [x] Main title reads: "New Friends Clash with [OpponentName]!" (e.g., "אתגר חדש מול יונתן!")
- [x] Below title: An orange/neon countdown timer indicating "22 HOURS LEFT" (or dynamic based on store) with a clock icon.
- [x] Layout showing two Avatars facing each other: The user's avatar vs. the opponent's avatar.
- [x] Styling follows FinPlay dark/neon theme (Neon accents vs. the flat colors in the reference).
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-003: כפתור התחלת האתגר (Start Clash Action)
**Description:** As a user, I want a clear call to action to start the clash so I can begin competing.

**Acceptance Criteria:**
- [x] Add a large, prominent primary button at the bottom: "START FRIENDS CLASH" (או "התחל אתגר!").
- [x] Clicking the button calls the `startClash` store action.
- [x] Clicking the button closes/dismisses the modal and shows a success toast/alert ("האתגר התחיל!").
- [x] Typecheck passes
- [x] Verify changes work in browser

## Non-Goals
- Real-time multiplayer synchronization
- Actual backend API integration for finding friends
- Complex animations for avatars (static images are fine for MVP)
- Leaderboard or post-clash results screen (Out of scope for this specific PRD)

## Technical Notes
- **Avatars:** Use placeholder images from `assets/images/` or simple colored shapes with initials if avatars aren't ready.
- **Timer:** For the MVP, a static string (e.g., "22 HOURS LEFT") or a simple `setInterval` decrement is sufficient.
- **RTL Support:** Design must be Right-To-Left (RTL) ready, but "Friends Clash" branding can remain in English if preferred.
