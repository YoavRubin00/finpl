# PRD: הגשר (The Bridge) 🌉

## Introduction
פיצ'ר "הגשר" הוא המקום שבו העולם הווירטואלי של *FinPlay* פוגש את העולם האמיתי. זהו אזור המרת המטבעות (Coins) שהמשתמש צבר דרך למידה והצלחה במשחק, להטבות ממשיות בעולם האמיתי: פתיחת חשבונות בנק בתנאים מועדפים, שוברים, הנחות, ייעוץ אישי ועוד. הפיתוח מיועד ל-MVP, מבוסס לקוח בלבד בשלב זה (Mock data) וללא שמירה במסד נתונים אמיתי.

## Goals
- **תמריץ (Incentive):** לתת למשתמש סיבה מוחשית וברת-השגה להמשיך ללמוד, לשחק ולצבור מטבעות.
- **חוויה ויזואלית מרהיבה (Design & Vibe):** עיצוב "גשר" שמשדר הליכה אל עבר "עתיד טוב", התקדמות, עושר והצלחה. אסתטיקה של Cyber-Finance, גלאם וניאון.
- **גמישות (Flexibility):** תצוגה גנרית של הטבות שניתן לעדכן בצורה דינמית בהמשך באמצאות Mock Data.

## User Stories

### US-001: Bridge Data Types & Store (Zustand)
**Description:** As a developer, I want to define the types and store structure for the Bridge rewards so that the UI can consume them correctly.

**Acceptance Criteria:**
- [x] Create `Benefit` type (id, title, description, costCoins, isAvailable)
- [x] Add temporary mock benefits array to standard store or constants
- [x] Create simple store actions to deduct coins when purchasing a benefit
- [x] Typecheck passes

### US-002: מסך הבית של הגשר (The Bridge Dashboard UI)
**Description:** As a user, I want to see the bridge background and my coin balance so that I know where I am and what I have.

**Acceptance Criteria:**
- [x] Create new Screen/Route for The Bridge
- [x] Add futuristic bridge background element (CSS/NativeWind) or mascot
- [x] Display Current Balance of Coins clearly using Zustand store
- [x] Navigation back to main app works
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-003: תצוגת כרטיסי הטבה (Generic Benefits Catalog UI)
**Description:** As a user, I want to see a list of available benefits and their costs.

**Acceptance Criteria:**
- [x] Render grid of benefit cards using mock data
- [x] Each card shows title, cost, and visually indicates if affordable (disabled state if cost > balance)
- [x] Add progress bar in disabled cards showing how many coins are missing
- [x] Styled with Glassmorphism and Neon accents
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-004: תהליך ההמרה / רכישה (Redemption Flow UI)
**Description:** As a user, I want to click on a benefit to purchase it with my coins.

**Acceptance Criteria:**
- [x] Clicking available card opens a Modal
- [x] Modal shows confirmation button "חצה את הגשר - והמר עכשיו!"
- [x] Upon confirmation, deduct coins from store
- [x] Close modal and show simple success toast/alert
- [x] Typecheck passes
- [x] Verify changes work in browser

## Non-Goals
- Real backend API integration
- Connecting to actual banking APIs
- Complex 3D animations (sticking to standard CSS/Framer capabilities for MVP)
- Real email delivery for vouchers

## Technical Notes
- **Animation:** Use `framer-motion` (web) or equivalent standard animations for smooth modal transitions.
- **State Management:** Use existing Zustand store logic (or create a localized slice) for user coins to deduct balances immediately.
- **RTL Support:** Design must be Right-To-Left (RTL) out of the box.
