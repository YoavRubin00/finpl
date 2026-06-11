/**
 * Per-module short-game assignment. Source of truth for which game (if
 * any) surfaces under a module's `game` chip in the topic tree.
 *
 * Two registries:
 *  - `MODULE_GAME_MAP` — game added ALONGSIDE sim (sandbox + scored game)
 *  - `MODULE_SIM_REPLACEMENT_GAME` — game REPLACES the sim chip entirely
 *    (Yoav R6 2026-06-10: "במושגי יסוד פיננסים אין ארגז חול, אז תשים
 *    במקומו איזה משחק"). The resolver suppresses 'sim' for any module
 *    listed here.
 *
 * The 6 inter-module games live in `src/features/inter-module-games/`
 * and `src/features/finfeed/minigames/`:
 *   - budget-ninja   — recurring spend vs. saving cuts
 *   - bullshit-swipe — legit ad / scam ad swipe
 *   - cashout-rush   — when to exit a position
 *   - fomo-killer    — resist FOMO buy chats
 *   - higher-lower   — compare two financial numbers
 *   - price-slider   — guess a market price
 */
export type ShortGameId =
  | 'budget-ninja'
  | 'bullshit-swipe'
  | 'cashout-rush'
  | 'fomo-killer'
  | 'higher-lower'
  | 'price-slider';

/** Module id → short-game id, added ALONGSIDE the sim chip. */
const MODULE_GAME_MAP: Record<string, ShortGameId> = {
  // mod-1-1 (ריבית דריבית) — higher-lower is a natural fit per Yoav:
  // "איזה חיסכון גדל יותר ב-25 שנה" style comparisons.
  'mod-1-1': 'higher-lower',
  // mod-0-2 (מה זה בכלל כסף) — Yoav 2026-06-11 reinstated: the merchant
  // (barter) sim is the real sandbox here, but price-slider also lives
  // alongside as a quick scored game. Both chips surface in the tree
  // ("העלמת את המשחק שהיה עם הסוחרים. צריך להחזיר אותו").
  'mod-0-2': 'price-slider',
};

/** Module id → short-game id that REPLACES the sim chip. The sim isn't
 *  rendered as its own chip for modules in this map; the game stands
 *  in for it. Use for modules whose "sim" is really a matching
 *  exercise rather than an open-ended sandbox (chapter 0 mostly). */
const MODULE_SIM_REPLACEMENT_GAME: Record<string, ShortGameId> = {
  // Chapter 0 — financial fundamentals. The legacy `simConcept` is a
  // matching exercise ("מתאימים מושגים"), not a real sandbox, so the
  // tree surfaces a scored short-game in its place. mod-0-2 was moved
  // OUT of this map (back into MODULE_GAME_MAP) to restore the barter
  // sim alongside the price-slider game.
  'mod-0-1': 'higher-lower',
  'mod-0-1b': 'higher-lower',
  'mod-0-3': 'price-slider',
  'mod-0-4': 'budget-ninja',
  'mod-0-5': 'cashout-rush',
};

export function getGameForModule(moduleId: string): ShortGameId | null {
  return MODULE_GAME_MAP[moduleId] ?? MODULE_SIM_REPLACEMENT_GAME[moduleId] ?? null;
}

/** True iff the module's `sim` chip should be SUPPRESSED in favor of
 *  the replacement game. The game itself surfaces via `getGameForModule`. */
export function isSimReplacedByGame(moduleId: string): boolean {
  return Boolean(MODULE_SIM_REPLACEMENT_GAME[moduleId]);
}
