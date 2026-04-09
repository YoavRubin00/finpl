# PRD 29 - Wisdom Flashes: Market & Company Events Mini-Game 🌍📉📈

## Introduction
A new interactive mini-game integrated directly into the **Wisdom Flashes** system. 
Players are presented with a real historical macroeconomic event or a major single-company milestone. A stylized stock chart shows the market leading up to the exact date of the event. The player must guess: **How did the market (or specific stock) react? (UP 📈 or DOWN 📉)**.
After guessing, the chart completes its animation, revealing the true historical aftermath, followed by a short explanation of *why* it happened.

## Design Philosophy — "Million Dollar App"
- **Aesthetic**: Deep blue/purple gradient backgrounds (like the reference image), crisp white text, neon accents for the chart line.
- **The Chart**: A glowing `react-native-reanimated` SVG line chart. It draws from past to the event date and pauses with a glowing dot.
- **Buttons**: Two large, satisfying bottom cards: 
  - `[ 📉 למטה (DOWN) ]` - with a red gradient sparkline.
  - `[ 📈 למעלה (UP) ]` - with a green gradient sparkline.
- **The Reveal**: When pressed, the button depresses with `heavyHaptic`. The chart instantly shoots rightward (up or down) revealing the exact market reaction. If correct: `successHaptic` and Confetti. If wrong: `errorHaptic` and screen shake.
- **Integration**: Placed transparently inside the existing Wisdom Flashes engine so it can randomly pop up between lessons or in the Feed.

## Data Structure

### US-001: Define types inside `wisdom-flashes`
**Acceptance Criteria:**
- [ ] Create `macroEventsTypes.ts` 
- [ ] `MacroMarket`: 'S&P 500' | 'Oil' | 'Bitcoin' | 'Gold' | 'USD/ILS' | 'Real Estate' | 'Apple' | 'Tesla' | 'NVIDIA' | 'BP' | 'Volkswagen'
- [ ] `MacroEvent`: 
  - `id`: string
  - `dateLabel`: string (e.g., "August 2015", "January 2007")
  - `description`: string (Hebrew)
  - `question`: string (Hebrew - e.g., "איך הגיבו מניות הגז הישראליות?", "איך הגיבה מניית אפל?")
  - `targetMarket`: string
  - `actualDirection`: 'up' | 'down'
  - `chartBefore`: number[] (10 data points before event)
  - `chartAfter`: number[] (5 data points after event)
  - `lesson`: string (Hebrew - brief explanation of why the market reacted this way)
- [ ] Typecheck passes

### US-002: Curate 20 Historical Market & Company Events
**Acceptance Criteria:**
- [ ] Create `macroEventsData.ts` with 20 meticulously chosen events every investor should know (mix of macro and single companies):
  1. **Sep 2008 Lehman Brothers Collapse**: S&P 500 -> DOWN 📉 (The Great Recession triggers global panic).
  2. **Nov 2020 Pfizer COVID Vaccine**: Zoom/Peloton -> DOWN 📉, Travel/S&P 500 -> UP 📈 (End of stay-at-home era).
  3. **Aug 2015 Zohr Gas Field Discovery (Egypt)**: Israeli Gas Stocks -> DOWN 📉 (Lost export monopoly).
  4. **Feb 2022 Russia Invades Ukraine**: Global Wheat & Oil -> UP 📈 (Supply chain shock).
  5. **Jun 2016 Brexit Vote**: British Pound (GBP) -> DOWN 📉 (Uncertainty ruins currency).
  6. **Jan 2021 GameStop Squeeze**: GME Stock -> UP 📈 (Retail vs Wall Street).
  7. **1973 OPEC Oil Embargo**: Oil Prices -> UP 📈 (Geopolitical weaponization of energy).
  8. **Oct 1987 Black Monday**: S&P 500 -> DOWN 📉 (Famous 22% single-day crash, algos gone wrong).
  9. **Sep 2001 9/11 Attacks**: Airline Stocks -> DOWN 📉, Defense -> UP 📈.
  10. **Mar 2020 Saudi-Russia Price War**: Oil Prices -> DOWN 📉 (Went briefly negative).
  11. **Dec 2017 CME Bitcoin Futures Launch**: Bitcoin -> DOWN 📉 (Marked the exact top of the 2017 bubble).
  12. **Mar 2023 Silicon Valley Bank Collapse**: Bank Stocks -> DOWN 📉 (Worst bank failure since 2008).
  13. **Jan 2007 Steve Jobs reveals the iPhone**: Apple Stock -> UP 📈 (The beginning of the smartphone revolution).
  14. **Sep 2015 Volkswagen "Dieselgate"**: VW Stock -> DOWN 📉 (Caught cheating on emissions tests).
  15. **Apr 2010 Deepwater Horizon Spill**: BP Stock -> DOWN 📉 (Massive environmental and PR disaster).
  16. **May 2023 NVIDIA drops explosive AI earnings**: NVIDIA Stock -> UP 📈 (The spark that ignited the AI boom).
  17. **Aug 2018 Elon Musk tweets "Funding secured at $420"**: Tesla Stock -> UP 📈 (Initial rally before the SEC sued him).
  18. **Aug 2011 US Credit Rating Downgrade**: Gold -> UP 📈 (Investors flee to ultimate safe haven).
  19. **Nov 2022 OpenAI opens ChatGPT to the public**: Microsoft Stock -> UP 📈 (MSFT's early investment paid off big).
  20. **May 2010 Flash Crash**: S&P 500 -> DOWN 📉 (Trillion dollars wiped out in 36 minutes, then recovered).
- [ ] Provide realistic dummy `chartBefore` and `chartAfter` sparkline arrays for each event.

### US-003: Core UI Component `MacroEventFlash.tsx`
**Acceptance Criteria:**
- [ ] Fullscreen layout with beautiful blue/indigo gradient background (`expo-linear-gradient`).
- [ ] Top: Event description text in clean white Hebrew typography.
- [ ] Middle: SVG animated line chart. Draws left-to-right holding at the `dateLabel`. Glowing dot at the current date.
- [ ] Middle-Bottom: The question "איך הגיבו מחירי ה-X?"
- [ ] Bottom: Two large horizontal cards (or side-by-side squares):
  - **DOWN** card: Red sparkline SVG, text "למטה", red tint on press.
  - **UP** card: Green sparkline SVG, text "למעלה", green tint on press.
- [ ] All elements enter out of thin air using `FadeInUp` and `FadeInDown` from Reanimated.

### US-004: Game Logic & Animation Engine
**Acceptance Criteria:**
- [ ] User selects UP or DOWN.
- [ ] Immediately lock buttons.
- [ ] Chart magically completes its drawing (`chartAfter` data points are appended). Line turns Green if it went UP, Red if it went DOWN.
- [ ] If guess == `actualDirection`:
  - Success haptic.
  - Confetti explosion.
  - +15 XP / +10 Coins awarded via `useEconomyStore`.
- [ ] If guess != `actualDirection`:
  - Error haptic.
  - Screen shake effect.
- [ ] After 1.5 seconds, slide up a bottom-sheet / modal with the `lesson` text explaining the *Why*.
- [ ] "המשך" (Continue) button dismisses the flash and returns to the app flow.

### US-005: Integration into Wisdom Flashes Engine
**Acceptance Criteria:**
- [ ] Ensure `MacroEventFlash` can be triggered via the existing Wisdom Flashes registry.
- [ ] Add it to the random pool of flashes shown at the end of modules or periodically in the FinFeed.

## Technical Requirements
- UI should perfectly mimic the reference image provided by the user.
- Build pure SVG paths animated via `reanimated` for the charts (no heavy chart libraries required, simple `Path` and `interpolatePath` or animated `strokeDashoffset` is perfect).
- Strict RTL standard.
