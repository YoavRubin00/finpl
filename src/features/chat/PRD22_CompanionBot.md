# PRD 22 - פינבוט: הדמות המלווה האישית 🤖🦉🦁🌺

## Introduction
שדרוג מלא של ה-ChatScreen מבוט גנרי לדמות מלווה **חיה ומונפשת** שהמשתמש בחר באונבורדינג.
הבוט לא נותן ייעוץ פיננסי — הוא **מחנך**. הוא מכיר את כל החומר שנלמד באפליקציה (5 פרקים, 24+ מודולים), עוקב אחרי ההתקדמות של המשתמש, ומציע שאלות נפוצות בהתאם לחומר האחרון שנלמד.

כל דמות מדברת בסגנון ייחודי ומונפשת באמצעות **Lottie animations** עם state machine: idle, talking, thinking. הדמות יושבת בראש המסך ומגיבה בזמן אמת לשיחה — פה זז כשמדברת, מחווה חשיבה כשמחכים לתשובה.

## Goals
- דמות מלווה מונפשת (Lottie) עם מצבים: idle, talking, thinking
- הפיכת הבוט מכלי גנרי לדמות אישית עם אופי ייחודי
- שאלות מוצעות דינמיות לפי החומר האחרון שהמשתמש למד
- הזנת כל הידע הפיננסי מ-5 הפרקים ל-system prompt
- הבוט לא נותן ייעוץ פיננסי — רק מלמד ומסביר מושגים
- עברית מלאה בכל רכיב

## User Stories

### US-001: Install Lottie and create companion animation assets
**Description:** As a developer, I want Lottie set up and placeholder animation files for each companion so the animated avatar can render.

**Acceptance Criteria:**
- [x] Install `lottie-react-native` and `@lottiefiles/dotlottie-loader` (or `lottie-react-native` standalone)
- [x] Create `assets/lottie/` directory with 4 Lottie JSON files — one per companion:
  - `warren-buffett.json` — wise owl/old man character
  - `moshe-peled.json` — bold lion/Israeli character
  - `rachel.json` — calm flower/gentle character
  - `robot.json` — sleek robot character
- [x] Each file must contain at minimum 3 labeled animation segments (markers): `idle` (looping breathing/sway), `talking` (mouth/gesture movement), `thinking` (hand on chin/loading)
- [x] For MVP: download 4 free character Lottie files from LottieFiles.com that match the personalities, or create simple placeholder animations. Each must have at least idle and talking segments defined by frame ranges.
- [x] Typecheck passes

### US-002: Define types and companion personality data
**Description:** As a developer, I want TypeScript interfaces and personality configurations for each companion so the bot adapts its tone and animation per character.

**Acceptance Criteria:**
- [x] Create `chatTypes.ts` in `src/features/chat/`
- [x] Define `CompanionAnimationState`: `'idle' | 'talking' | 'thinking'`
- [x] Define `CompanionAnimationConfig`: `lottieSource: string` (require path to JSON), `idleFrames: [number, number]`, `talkingFrames: [number, number]`, `thinkingFrames: [number, number]`
- [x] Define `CompanionPersonality` interface: `id: CompanionId`, `name: string`, `emoji: string`, `tone: string`, `greeting: string`, `placeholder: string`, `animation: CompanionAnimationConfig`
- [x] Define `ChatSuggestion` interface: `text: string`, `moduleId: string | null`
- [x] Typecheck passes

### US-003: Create companion personality data and curriculum knowledge base
**Description:** As a developer, I want a data file with each companion's unique speaking style, animation config, and a summary of all financial knowledge taught in the app.

**Acceptance Criteria:**
- [x] Create `chatData.ts` in `src/features/chat/`
- [x] Export `COMPANION_PERSONALITIES` — one entry per companion with animation config:
  - `warren-buffett`: חכם, סבלני, אנלוגיות מהשקעות, סבא חכם. placeholder: "שאל את וורן על כסף..."
  - `moshe-peled`: ישראלי, ישיר, תכל'סי, סלנג. placeholder: "יאללה, שאל אותי..."
  - `rachel`: רגועה, חמה, מעודדת, סבלנית. placeholder: "ספר לי מה מטריד אותך..."
  - `robot`: אנליטי בלבד, מספרים, תמציתי. placeholder: "הכנס שאלה פיננסית..."
- [x] Export `CURRICULUM_KNOWLEDGE` — מחרוזת טקסט שמסכמת את כל 24+ המודולים ב-5 פרקים (נושאים וקונספטים, לא flashcards מלאים)
- [x] Export `getContextualSuggestions(completedModules: string[], currentChapterId: string)` — מחזירה 3 שאלות רלוונטיות לחומר האחרון שנלמד
- [x] Typecheck passes

### US-004: Build system prompt engine with companion personality + learning context
**Description:** As a developer, I want a smart system prompt builder that combines the companion's personality, the user's progress, and the full curriculum knowledge.

**Acceptance Criteria:**
- [x] Create `buildChatPrompt.ts` in `src/features/chat/`
- [x] Function `buildSystemPrompt` receives: `displayName`, `profile (UserProfile)`, `companionId`, `completedModules (string[])`, `currentChapterId`
- [x] The prompt must include:
  - Companion personality and speaking style
  - User context (name, goal, knowledge level, age)
  - Full curriculum knowledge so the bot can answer questions about ANY module
  - Learning progress: which modules completed, which chapter active
  - Clear instruction: "אתה מחנך פיננסי, לא יועץ השקעות. הסבר מושגים ועקרונות, אל תמליץ על מוצרים ספציפיים."
  - Instruction to tailor answers to the last module studied
- [x] Typecheck passes

### US-005: Build animated companion avatar component with Lottie state machine
**Description:** As a player, I want to see my companion character animated at the top of the chat — breathing when idle, gesturing when talking, thinking when waiting for a response.

**Acceptance Criteria:**
- [x] Create `CompanionAvatar.tsx` in `src/features/chat/`
- [x] Component receives `companionId: CompanionId` and `animationState: CompanionAnimationState`
- [x] Renders Lottie animation using `lottie-react-native`:
  - `idle`: loops continuously (default state, gentle breathing/sway)
  - `thinking`: plays when bot is loading response (hand on chin, loading dots)
  - `talking`: plays when bot message is being "typed out" / just arrived (mouth moves, gestures)
- [x] Transitions between states are smooth (use `progress` animated value or segment play)
- [x] Avatar container: circular frame (120x120) with glowing border matching companion color, deep shadow, dark bg
- [x] Companion name displayed below avatar in bold Hebrew text
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-006: Redesign ChatScreen with animated companion and premium chat UI
**Description:** As a player, I want the full chat experience to feel like talking to a living character — the companion is animated at the top, messages flow below like subtitles.

**Acceptance Criteria:**
- [x] Rewrite `ChatScreen.tsx` with new layout:
  - **Top section (30%)**: `CompanionAvatar` centered, companion name + "הדמות המלווה שלך" subtitle
  - **Chat section (70%)**: scrollable messages below
  - Avatar state syncs to chat: idle (no activity) → thinking (waiting for API) → talking (message just arrived, 3 seconds) → back to idle
- [x] Bot messages: dark card with violet right border (RTL), companion emoji mini-avatar
- [x] User messages: violet gradient bubble on left (RTL)
- [x] Animated typing indicator: three dots with staggered bouncing scale
- [x] Messages enter with slide-in spring animation
- [x] First-time greeting: companion's personal greeting from `COMPANION_PERSONALITIES` + companion in talking state
- [x] All text in Hebrew with RTL
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-007: Dynamic contextual suggestions based on learning progress
**Description:** As a player, I want the suggested questions to be about the material I just studied.

**Acceptance Criteria:**
- [x] Replace static `SUGGESTION_PROMPTS` with dynamic suggestions from `getContextualSuggestions()`
- [x] Read `completedModules` and `currentChapterId` from `useChapterStore`
- [x] Show 3 suggestion pills that change based on last completed module
- [x] Fallback to general suggestions if no modules completed yet
- [x] Suggestion chips: glow border, horizontal scroll, tap fills input
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-008: Premium input bar with companion-aware placeholder and glow
**Description:** As a player, I want a premium input bar with glowing focus state and a placeholder in the companion's voice.

**Acceptance Criteria:**
- [x] Input bar: dark bg with animated violet focus border glow (borderColor #3f3f46 → #7c3aed on focus, reanimated)
- [x] Send button: pulse animation when text is entered (scale loop 1 → 1.1 → 1)
- [x] Placeholder text from companion's `placeholder` field in `COMPANION_PERSONALITIES`
- [x] Typecheck passes
- [x] Verify changes work in browser

## Non-Goals
- שמירת היסטוריית שיחות בין סשנים (אפשר בעתיד)
- TTS / קול אמיתי של הדמות
- 3D אווטרים (Ready Player Me / Three.js) — Lottie 2D מספיק ל-MVP
- שיחה מרובת שפות (עברית בלבד)
- יצירת אנימציות Lottie מאפס (נשתמש ב-LottieFiles.com או פלייסהולדרים)

## Technical Notes
- **Lottie**: `lottie-react-native` — עובד על iOS, Android, ו-Web. קבצי JSON קלים (~50-200KB per character)
- **Animation state machine**: frame ranges per state. Use `LottieView`'s `progress` prop with `useAnimatedProps` for smooth transitions, or `play(startFrame, endFrame)` API
- **API**: Google Gemini 2.0 Flash (קיים) — `EXPO_PUBLIC_GOOGLE_AI_API_KEY`
- **State management**: `useChapterStore` for progress, `useAuthStore` for companionId
- **Animations**: `react-native-reanimated` for message animations + typing indicator; `lottie-react-native` for companion avatar
- **Curriculum in prompt**: text summary, NOT raw flashcard data (too long)
- **maxOutputTokens**: 512 — the bot should be concise
- **RTL**: `{ writingDirection: 'rtl', textAlign: 'right' }` everywhere
- **Lottie files source**: Download from LottieFiles.com — search for "owl character", "lion character", "girl character", "robot character". Edit frame ranges in code to match the downloaded file's keyframes.
