/**
 * Per-pearl unique content map.
 *
 * Each entry binds a SOURCE module id (the module the pearl sits AFTER) to a
 * topic-matched bundle of: one Lifestyle video + one Concept + 1-3 swipe-ad
 * ids + one scenario (Dilemma or Investment). The PearlSheet renders the
 * unique-bundle flow when ANY of these is set:
 *
 *   Video → Concept → Swipe → Scenario → Game
 *
 * Pearls without an entry here (mod-0-1 + anything not yet curated) keep the
 * legacy single daily-pick stage + game.
 *
 * IDs reference:
 *   - videoId       -> finn-life-N in inter-module-break/lifestyleVideoConfig.ts
 *   - conceptId     -> concept-N in daily-concepts/dailyConceptsData.ts
 *   - swipeIds      -> bs-X or lg-X in inter-module-games/bullshit-swipe/bullshitAdsData.ts
 *   - scenarioId    -> dilemma-N or invest-N (depending on scenarioPool)
 *
 * Edit cadence: curate new pearls here as you ship modules. Unknown ids are
 * silently dropped at runtime (no crash) but a topical mismatch makes the
 * pearl feel generic — please match concept titles to module titles.
 */

import { DAILY_CONCEPTS } from '../daily-concepts/dailyConceptsData';
import { BULLSHIT_ADS } from '../inter-module-games/bullshit-swipe/bullshitAdsData';
import { DILEMMA_SCENARIOS } from '../daily-challenges/dilemma-data';
import { LIFESTYLE_VIDEOS } from '../inter-module-break/lifestyleVideoConfig';

export type ScenarioPool = 'dilemma' | 'investment';

export interface PearlBundle {
  videoId?: string;
  conceptId?: string;
  swipeIds?: readonly string[];
  scenarioId?: string;
  scenarioPool?: ScenarioPool;
}

// ---------------------------------------------------------------------------
// Fallback bundle — when a pearl doesn't have an explicit curated entry
// below, we still want it to render the unique-bundle flow rather than fall
// back to the generic daily-pick (which felt "generic" to users who had seen
// the curated pearls). The fallback picks deterministically by a hash of the
// moduleId so each pearl always shows the SAME content, and two different
// pearls don't collide on the same concept/video.
// ---------------------------------------------------------------------------

const ALL_CONCEPT_IDS: string[] = DAILY_CONCEPTS.map((c) => c.id);
const ALL_SWIPE_IDS: string[] = BULLSHIT_ADS.map((a) => a.id);
const ALL_DILEMMA_IDS: string[] = DILEMMA_SCENARIOS.map((d) => d.id);
const ALL_VIDEO_IDS: string[] = LIFESTYLE_VIDEOS.map((v) => v.id);

function hashModuleId(moduleId: string): number {
  let h = 0;
  for (let i = 0; i < moduleId.length; i++) {
    h = (h * 31 + moduleId.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Returns a deterministic bundle for any moduleId. Used ONLY when the
 * explicit curated entry below is missing. Stable per moduleId — the same
 * pearl always shows the same content, but two different pearls hash to
 * different slots so the visible content does differ across pearls.
 */
export function fallbackBundleFor(moduleId: string): PearlBundle {
  const h = hashModuleId(moduleId);
  const swipe1 = ALL_SWIPE_IDS[h % ALL_SWIPE_IDS.length];
  const swipe2 = ALL_SWIPE_IDS[(h + 3) % ALL_SWIPE_IDS.length];
  return {
    videoId: ALL_VIDEO_IDS[h % ALL_VIDEO_IDS.length],
    conceptId: ALL_CONCEPT_IDS[h % ALL_CONCEPT_IDS.length],
    swipeIds: swipe1 === swipe2 ? [swipe1] : [swipe1, swipe2],
    scenarioId: ALL_DILEMMA_IDS[h % ALL_DILEMMA_IDS.length],
    scenarioPool: 'dilemma',
  };
}

export const PEARL_CONTENT_MAP: Record<string, PearlBundle> = {
  // ─── Chapter 0 ─────────────────────────────────────────────────────────
  // mod-0-1 — INTENTIONALLY OMITTED. User requirement: unique bundles start
  // from the second module's pearl onward. The pearl after mod-0-1 keeps the
  // legacy daily-pick flow (a single rotating concept) + profile-question
  // backstop + game.

  'mod-0-2': {
    // 'מה זה בכלל כסף?' (game: higher-lower)
    videoId: 'finn-life-treasure',
    conceptId: 'concept-2', // אינפלציה — primes the "money loses value" idea
    swipeIds: ['bs-zero-interest'],
    scenarioId: 'dilemma-1',
    scenarioPool: 'dilemma',
  },
  'mod-0-3': {
    // 'הגנב השקוף: אינפלציה' (game: budget-ninja)
    videoId: 'finn-life-eilat-beach',
    conceptId: 'concept-39', // ריבית ריאלית — direct follow-up to inflation
    swipeIds: ['lg-bank-deposit', 'bs-tama-guaranteed'],
    scenarioId: 'dilemma-2',
    scenarioPool: 'dilemma',
  },
  'mod-0-4': {
    // 'כמה נכנס וכמה יוצא' (game: cashout-rush)
    videoId: 'finn-life-eilat-mall-shop',
    conceptId: 'concept-13', // תזרים מזומנים
    swipeIds: ['bs-mlm-passive'],
    scenarioId: 'dilemma-3',
    scenarioPool: 'dilemma',
  },

  // ─── Chapter 1 ─────────────────────────────────────────────────────────
  'mod-1-1': {
    // 'ריבית דריבית' (game: higher-lower)
    videoId: 'finn-life-paris-cafe',
    conceptId: 'concept-1', // ריבית דריבית — perfect topic match
    swipeIds: ['lg-etf-sp500'],
    scenarioId: 'invest-1',
    scenarioPool: 'investment',
  },
  'mod-1-2': {
    // 'מלכודת המינוס' (game: investment)
    videoId: 'finn-life-yacht',
    conceptId: 'concept-46', // התחייבות vs נכס
    swipeIds: ['bs-crypto-2x'],
    scenarioId: 'dilemma-4',
    scenarioPool: 'dilemma',
  },
  'mod-1-3': {
    // 'אשראי' (game: bullshit-swipe)
    videoId: 'finn-life-eilat-mall-shop',
    conceptId: 'concept-9', // דירוג אשראי — perfect topic match
    swipeIds: ['lg-bank-deposit', 'bs-zero-interest'],
    scenarioId: 'dilemma-5',
    scenarioPool: 'dilemma',
  },
  'mod-1-4': {
    // 'תזרים ותקציב' (game: myth)
    videoId: 'finn-life-treasure',
    conceptId: 'concept-3', // תקציב 50/30/20 — perfect topic match
    swipeIds: ['bs-excel-algorithm'],
    scenarioId: 'invest-2',
    scenarioPool: 'investment',
  },
  'mod-1-6': {
    // 'הלוואות צרכניות' (game: dilemma)
    videoId: 'finn-life-eilat-mall-ice',
    conceptId: 'concept-33', // ריבית פריים
    swipeIds: ['bs-tama-guaranteed'],
    scenarioId: 'dilemma-6',
    scenarioPool: 'dilemma',
  },
  'mod-1-7': {
    // 'עמלות' (game: price-slider)
    videoId: 'finn-life-paris-cafe',
    conceptId: 'concept-29', // עמלות נסתרות — perfect topic match
    swipeIds: ['bs-forex-signals'],
    scenarioId: 'dilemma-7',
    scenarioPool: 'dilemma',
  },
  'mod-1-8': {
    // 'מלכודות שיווקיות' (game: crash)
    videoId: 'finn-life-festival',
    conceptId: 'concept-43', // אפקט עיגון
    swipeIds: ['bs-daytrading-nocourse', 'bs-nft-insider'],
    scenarioId: 'dilemma-8',
    scenarioPool: 'dilemma',
  },

  // ─── Chapter 2 ─────────────────────────────────────────────────────────
  'mod-2-10': {
    // 'דירוג אשראי' (game: video)
    videoId: 'finn-life-eilat-mall-ice',
    conceptId: 'concept-9', // דירוג אשראי — perfect
    swipeIds: ['lg-parent-pension', 'bs-zero-interest'],
    scenarioId: 'invest-3',
    scenarioPool: 'investment',
  },
  'mod-2-11': {
    // 'נקודות זיכוי' (game: myth)
    videoId: 'finn-life-gym-flex',
    conceptId: 'concept-31', // נקודות זיכוי במס — perfect
    swipeIds: ['lg-gov-bond'],
    scenarioId: 'invest-4',
    scenarioPool: 'investment',
  },
  'mod-2-12': {
    // 'פנסיה' (game: investment)
    videoId: 'finn-life-valt-hottub',
    conceptId: 'concept-12', // קרן פנסיה — perfect
    swipeIds: ['lg-pension-fund', 'lg-parent-pension'],
    scenarioId: 'invest-5',
    scenarioPool: 'investment',
  },

  // ─── Chapter 3 ─────────────────────────────────────────────────────────
  'mod-3-16': {
    // 'הפסיכולוגיה של הכסף' (game: dilemma)
    videoId: 'finn-life-nyc-rooftop',
    conceptId: 'concept-44', // אפקט יציבות (Status Quo Bias)
    swipeIds: ['bs-crypto-2x', 'bs-nft-insider'],
    scenarioId: 'dilemma-9',
    scenarioPool: 'dilemma',
  },
  'mod-3-17': {
    // 'קופת גמל להשקעה' (game: crash)
    videoId: 'finn-life-valt-ski',
    conceptId: 'concept-47', // פטור מס לקופת גמל להשקעה — perfect
    swipeIds: ['lg-gemel-investment'],
    scenarioId: 'invest-6',
    scenarioPool: 'investment',
  },

  // ─── Chapter 4 ─────────────────────────────────────────────────────────
  'mod-4-19': {
    // 'שוק ההון' (game: investment)
    videoId: 'finn-life-nyc-rooftop',
    conceptId: 'concept-5', // מדד S&P 500
    swipeIds: ['lg-etf-sp500'],
    scenarioId: 'invest-7',
    scenarioPool: 'investment',
  },
  'mod-4-21': {
    // 'תעודות סל, ETF' (game: crash)
    videoId: 'finn-life-eilat-dolphins',
    conceptId: 'concept-7', // ETF, קרן סל — perfect
    swipeIds: ['lg-index-fund', 'lg-etf-sp500'],
    scenarioId: 'invest-8',
    scenarioPool: 'investment',
  },
  'mod-4-26': {
    // 'פלטפורמות מסחר' (game: myth)
    videoId: 'finn-life-valt-apres',
    conceptId: 'concept-37', // תיק 60/40
    swipeIds: ['bs-daytrading-nocourse'],
    scenarioId: 'invest-9',
    scenarioPool: 'investment',
  },
  'mod-4-22': {
    // 'פקודות מסחר' (game: dilemma)
    videoId: 'finn-life-gym-flex',
    conceptId: 'concept-11', // פיזור סיכונים
    swipeIds: ['bs-forex-signals'],
    scenarioId: 'dilemma-10',
    scenarioPool: 'dilemma',
  },

  // ─── Chapter 5 ─────────────────────────────────────────────────────────
  'mod-5-25': {
    // 'יציאה לחופש כלכלי' (game: higher-lower)
    videoId: 'finn-life-eilat-beach',
    conceptId: 'concept-30', // FIRE, עצמאות כלכלית — perfect
    swipeIds: ['lg-index-fund'],
    scenarioId: 'invest-10',
    scenarioPool: 'investment',
  },
  'mod-5-26': {
    // 'נדל"ן ומשכנתא' (game: price-slider)
    videoId: 'finn-life-paris-cafe',
    conceptId: 'concept-25', // נדל"ן מניב
    swipeIds: ['lg-gov-bond'],
    scenarioId: 'invest-11',
    scenarioPool: 'investment',
  },
};
