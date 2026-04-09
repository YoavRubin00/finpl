# PRD 6: מנגנוני השימור של המשחק (Retention Loops) 🎁

## Introduction
בהשראת מכניקות מהמשחק "Clash Royale", הפיצ'ר נועד לייצר סיבות חזקות למשתמשים לחזור לאפליקציה בכל יום (Retention). הקונספט מבוסס על "תיבות" (Chests) שהמשתמש מרוויח ופותח, וכן "גלגל המזל" (Daily Spin) בכניסה יומית. המטרה היא להוסיף רובד עמוק של גיימיפיקציה, חוסר ודאות חיובי (הגרלות/פרסים) ואפשרות לקנות עוד מטבעות או לשדרג את החוויה.

## Goals
- **שימור משתמשים (Retention):** מנגנון Daily Spin שמעודד כניסה יומית לקבלת פרס.
- **הדרגתיות ותגמול מבוסס זמן (Time-based Rewards):** תיבות שמתקבלות כפרס (למשל בסיום שלב) – פתיחתן דורשת המתנה עם טיימר ספירה לאחור, מה שמייצר ציפייה ותמריץ לחזור לאפליקציה מאוחר יותר.
- **כלכלת משחק (Game Economy):** יצירת מעגל שבו המשתמש מרוויח מטבעות מקריאת תוכן/תיבות, ומשתמש בהם בחנות (Store) לקניית הטבות או "פתיחה מהירה" של תיבות.
- **חוויה ויזואלית:** מנגנוני פתיחה קסומים ומהנים (אנימציות של פתיחת תיבה, סיבוב גלגל).

## User Stories

### US-001: Retention Data Types & Store (Zustand)
**Description:** As a developer, I want to manage the user's inventory of chests, daily spin availability, and coin packages in the global store.

**Acceptance Criteria:**
- [x] Create `Chest` type (id, name, rarity: 'common' | 'rare' | 'epic', unlockTimeMinutes, status: 'locked' | 'unlocking' | 'ready')
- [x] Create `DailySpin` state (lastSpinDate: string | null) 
- [x] Add mock data for the user's current chest slots (4 slots maximum).
- [x] Create store actions: `startUnlockingChest`, `openReadyChest` (grants coins), `spinDailyWheel`, and crucially `grantChest` (adds a new locked chest to an empty slot, e.g. after completing a level).
- [x] Typecheck passes

### US-002: מסך גלגל המזל / בונוס יומי (Daily Spin UI)
**Description:** As a user, I want a fun spinning wheel or daily reward popup when I open the app for the first time that day, so I can win random prizes.

**Acceptance Criteria:**
- [x] Create `DailySpinModal` (or Screen) component.
- [x] Display a visual "Wheel of Fortune" or 3 face-down cards to pick from.
- [x] Pressing "Spin" / "Pick" starts a CSS/Framer-motion animation revealing a random reward (e.g., 50 Coins, 1 Rare Chest).
- [x] Once completed, update the store's `lastSpinDate` to prevent spinning again today.
- [x] Styling fits the Neon/Cyber-Finance theme.
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-003: אזור התיבות במסך הבית (Home Screen Chest Inventory)
**Description:** As a user, I want to see my current chests on the Home Screen alongside my streaks, start unlocking them, and see the countdown timers.

**Acceptance Criteria:**
- [x] Add `ChestsRow` component to the main Home Screen, positioned near or below the Steaks/Progress UI.
- [x] Display up to 4 chest slots. Empty slots show a placeholder ("Complete levels to earn chests").
- [ ] Locked chest: Tapping opens a prompt to "Start Unlocking" (triggers `startUnlockingChest`).
- [ ] Unlocking chest: Displays a live countdown timer until it is ready (e.g. "01:59:59").
- [ ] Ready chest: Tapping plays an opening animation and grants rewards, then clears the slot.
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-004: החנות הוירטואלית (Virtual Store UI)
**Description:** As a user, I want a store screen where I can spend real money (mocked) to buy more coins or buy special chests directly.

**Acceptance Criteria:**
- [ ] Create `ShopScreen` component (can be a separate tab or accessible from profile).
- [ ] Display packages of coins (e.g., "Handful of Coins: 100 for $0.99", "Chest of Coins: 1000 for $4.99" etc.).
- [ ] Display an option to buy an "Epic Chest" directly with premium currency/cash (mock purchase).
- [ ] Tapping a purchase button shows a mock success alert and adds the coins/chests to the user's store.
- [ ] Typecheck passes
- [ ] Verify changes work in browser

## Non-Goals
- Real in-app purchases (IAP) integration with App Store/Google Play (MVP is visually mocking the flow).
- Server-side time validation for chests (MVP trust client-side time/store for countdowns).
- Complex physics-based 3D wheel animations (simple 2D rotation/framer-motion is enough).

## Technical Notes
- **Timers:** Use standard `setInterval` or React hooks (like `useEffect` with timeouts) to handle the chest countdown logic in the UI based on timestamps saved in Zustand.
- **Animations:** Use `framer-motion` (on Web) / `react-native-reanimated` or `moti` (if installed) to make the chest open and spin wheel feel rewarding and bouncy.
- **RTL Support:** Design must be Right-To-Left (RTL) ready.
