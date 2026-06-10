/**
 * Per-module short-game assignment. Source of truth for which game (if
 * any) surfaces under a module's `game` chip in the topic tree.
 *
 * The 6 inter-module games live in `src/features/inter-module-games/`
 * and `src/features/finfeed/minigames/`:
 *   - budget-ninja   — recurring spend vs. saving cuts
 *   - bullshit-swipe — legit ad / scam ad swipe
 *   - cashout-rush   — when to exit a position
 *   - fomo-killer    — resist FOMO buy chats
 *   - higher-lower   — compare two financial numbers
 *   - price-slider   — guess a market price
 *
 * R5.14 (2026-06-10) — populate per module as Yoav curates matches.
 * For now: empty. Modules with no entry surface only the `sim` (sandbox)
 * chip, not a game chip (Yoav's rule: "אם לא אז שיהיה רק סימולטור").
 */
export type ShortGameId =
  | 'budget-ninja'
  | 'bullshit-swipe'
  | 'cashout-rush'
  | 'fomo-killer'
  | 'higher-lower'
  | 'price-slider';

/** Module id → short-game id. Add entries only when the game's mechanic
 *  genuinely fits the module's concept. Leaving a module out is
 *  preferred over a forced fit. */
const MODULE_GAME_MAP: Record<string, ShortGameId> = {
  // mod-1-1 (ריבית דריבית) — no game in the current set fits compound
  // interest naturally. Sim (sandbox) alone for now.
};

export function getGameForModule(moduleId: string): ShortGameId | null {
  return MODULE_GAME_MAP[moduleId] ?? null;
}
