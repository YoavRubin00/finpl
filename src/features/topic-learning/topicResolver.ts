import type { Module } from '../chapter-1-content/types';
import type { Topic, TopicKind } from './types';
import { TOPIC_ICONS, TOPIC_LABELS } from './topic-icons';
import { getDilemma } from '../shark-dilemma/dilemmasData';
import { getGameForModule, isSimReplacedByGame } from './moduleGameMap';
import { getCoupleDilemmaForModule } from '../couple-dilemma/coupleDilemmas';
import { getPodcastForModule } from '../podcast-segment/podcasts';
import { getRecallSet } from '../sentence-exercise/sentenceData';

/**
 * Canonical order — mirrors LessonFlowScreen's normal flow. The hook
 * video and tutorial-video chip were RETIRED in R5 ("רק האינטרו של
 * שארק"): the hook still plays inside the legacy intro phase, and the
 * mid-lesson explainer video is filtered out of the cards loop
 * entirely so the user never sees a foreign video card. Sim is
 * separately ordered via SIM_FIRST_ORDER.
 */
// R5.5 — orders mirror the master LessonFlowScreen flow:
//   intro → (sim if SIM_FIRST) → cards → tutorial-video → recall →
//     podcast → couple-dilemma → quiz → infographic → post-video
// tutorial-video sits right after cards because the legacy flashcards
// loop traditionally renders the explainer card mid-stack; pulling it
// out as its own chip keeps the visit order familiar (Yoav:
// "לשמור על המיקום שלו לפי הסדר שכרגע בגרסה במאסטר").
// R5.12 (2026-06-10): `post-video` retired as a chip per Yoav — the
// celebration/fun Finn video now plays INLINE mid-quiz inside
// LessonFlowScreen (`funVideoShownRef`), not as a standalone phase.
// User rule: "כל הסרטוני פאן והדברים בלי ערך למידה, שיכנסו בין דברים
// בתוך תת מודולה" — fun-only assets get embedded into another chip's
// flow, not surfaced as their own chip.
// R5.13 (2026-06-10): `infographic` retired as a chip per Yoav (the
// light-bulb illustration is being folded into another flow, same way
// `post-video` was in R5.12). User asked "את הנורה? שיהיה חלק." —
// drop the chip, smooth the trail.
// R5.14 (2026-06-10): `game` chip added after `sim` per Yoav — the
// sandbox/sim is the open-ended explorer, the game is a scored short
// game from the inter-module-games registry. Both surface when present;
// in CANONICAL they sit late next to sim, in SIM_FIRST they sit at the
// top alongside sim so the play surfaces lead.
const CANONICAL_ORDER: TopicKind[] = [
  'intro',
  'cards',
  'tutorial-video',
  'recall',
  'podcast',
  'couple-dilemma',
  'quiz',
  'sim',
  'game',
  'shark-dilemma',
];

const SIM_FIRST_ORDER: TopicKind[] = [
  'intro',
  'sim',
  'game',
  'cards',
  'tutorial-video',
  'recall',
  'podcast',
  'couple-dilemma',
  'quiz',
  'shark-dilemma',
];

function buildTopic(kind: TopicKind, moduleId: string, order: number): Topic {
  return {
    id: `${moduleId}:${kind}`,
    moduleId,
    kind,
    titleHe: TOPIC_LABELS[kind],
    iconAsset: TOPIC_ICONS[kind],
    defaultOrder: order,
  };
}

/** Mirrors LessonFlowScreen's SIM_FIRST_MODULES set (line 170 of that
 *  file). Keep in sync manually when modules opt into sim-first. The
 *  topic tree uses this to bump sim earlier in the canonical order. */
const SIM_FIRST_MODULE_IDS = new Set([
  'mod-0-2', 'mod-1-1', 'mod-2-12', 'mod-2-13',
  'mod-3-18', 'mod-4-20', 'mod-4-22', 'mod-4-23',
  'mod-4-27', 'mod-4-b4',
]);

export interface ResolveTopicsOptions {
  /** When true, sim becomes a "core early" topic rather than late.
   *  When undefined, the resolver decides automatically by checking
   *  the module's id against the SIM_FIRST set. */
  simFirst?: boolean;
}

/**
 * Derive the discrete topic list from a module's existing optional fields.
 * Add-only: a future TopicKind requires touching this resolver plus the
 * two sibling files (`types`, `topic-icons`). No data migration needed —
 * modules without the source field simply skip that topic.
 */
/**
 * Decide whether a module should render as a topic-tree accordion or
 * fall through to the legacy LessonFlowScreen. R6 Epic 1 default is
 * topic-tree for everything — `learningMode === 'linear-flow'` is the
 * explicit opt-out. Modules with too few resolved topics (< 2) fall
 * back so we never surface an empty accordion.
 */
export function shouldUseTopicTree(module: Module): boolean {
  if (module.learningMode === 'linear-flow') return false;
  return resolveTopics(module).length >= 2;
}

export function resolveTopics(module: Module, opts: ResolveTopicsOptions = {}): Topic[] {
  const simFirst = opts.simFirst ?? SIM_FIRST_MODULE_IDS.has(module.id);
  const order = simFirst ? SIM_FIRST_ORDER : CANONICAL_ORDER;
  const present = new Map<TopicKind, boolean>();

  if (module.interactiveIntro?.trim()) present.set('intro', true);
  if (module.flashcards?.length) present.set('cards', true);
  // R5.5 redux (Yoav 2026-06-16): the standalone "סרטון הסבר" chip is BACK.
  // After the 2026-06-11 retirement the embedded explainer video (e.g.
  // ribit-darbit.mp4 in mod-1-1) effectively VANISHED — the cards loop never
  // surfaced it and there was no chip to reach it. Gate the chip on a real
  // videoUri flashcard so it only appears where a video actually exists; the
  // cards chip filters videos out (cardFilter=non-video) so it's not shown
  // twice. Currently: mod-1-1 + two chapter-0 modules.
  if (module.flashcards?.some((fc) => typeof fc.videoUri === 'string' && fc.videoUri.length > 0)) {
    present.set('tutorial-video', true);
  }
  // Recall chip surfaces only when a real recall set exists in
  // sentenceData.ts (Yoav 2026-06-12: "במושגי יסוד פיננסיים - המשך, לא
  // קיים בואו נתרגל. תוריד אותו מהמפת למידה"). Earlier the chip was
  // gated on `module.flashcards?.length` only — modules with cards but
  // no recall set (e.g. mod-0-1b) showed an empty chip that auto-
  // completed on tap. Gating on getRecallSet hides the chip cleanly.
  // Require a NON-EMPTY recall set — a set with zero prompts would render an
  // empty interactive-recall screen that auto-completes (the chip just turns
  // green on tap with no real content). mod-0-2 / mod-0-1b have no set at all,
  // so they're already excluded; this also guards future empty sets.
  if ((getRecallSet(module.id)?.prompts?.length ?? 0) > 0) present.set('recall', true);
  // Yoav 2026-06-11: same bug shape as couple-dilemma — the podcast
  // chip never appeared in mod-0-3 ("הגנב השקוף אינפלציה") and other
  // podcast modules because `module.podcast` is never set on chapter
  // data. The actual mapping lives in MODULE_TO_PODCAST (podcasts.ts).
  if (module.podcast || getPodcastForModule(module.id)) present.set('podcast', true);
  // R6 fix: `module.coupleDilemma` is never set on chapter data — the
  // segments live in a separate registry (`COUPLE_DILEMMAS`) keyed by
  // moduleId. Yoav 2026-06-10 caught the missing chip in financial
  // fundamentals ("העלמת את הסרטון דילמה הזוגית"). The registry is
  // the source of truth.
  if (getCoupleDilemmaForModule(module.id)) present.set('couple-dilemma', true);
  if (module.quizzes?.length) present.set('quiz', true);
  // R6 — `isSimReplacedByGame` suppresses the sim chip for modules
  // whose "sim" is really a matching exercise (chapter 0 mostly).
  // Yoav: "במושגי יסוד פיננסים אין ארגז חול, אז תשים במקומו איזה משחק".
  if (module.simConcept && !isSimReplacedByGame(module.id)) {
    present.set('sim', true);
  }
  if (getGameForModule(module.id)) present.set('game', true);
  // `infographic` retired in R5.13 (folded into another flow, same as
  // post-video before it). `post-video` retired in R5.12. Keep no
  // unconditional sets here — only kinds that survive as chips get set
  // above based on real module data.
  // Shark-dilemma surfaces only when the module has data in
  // src/features/shark-dilemma/dilemmasData.ts (mod-1-1 does).
  if (getDilemma(module.id)) present.set('shark-dilemma', true);

  // Chat surfaces on every module (Yoav R6 2026-06-10) — gated only on
  // the topic-tree having any other content at all. Single source of
  // truth for "module has tree" + "chat is always there".
  if (present.size > 0) present.set('chat', true);

  const out: Topic[] = [];
  order.forEach((kind, idx) => {
    // `chat` is positioned by the post-process below — skip it in the
    // ordered pass so it doesn't double up.
    if (kind === 'chat') return;
    if (present.get(kind)) out.push(buildTopic(kind, module.id, idx));
  });

  // R6 — pin `chat` to the second-to-last slot, regardless of which
  // other kinds survived. Yoav: "שהצאט תמיד יהיה אחד לפני אחרון
  // במפת למידה היעודית של כל מודולה". Re-stamps defaultOrder on all
  // following chips so the sort downstream stays stable.
  if (present.get('chat') && out.length >= 1) {
    const insertAt = Math.max(0, out.length - 1);
    const chatTopic = buildTopic('chat', module.id, insertAt);
    out.splice(insertAt, 0, chatTopic);
    out.forEach((t, i) => { t.defaultOrder = i; });
  }

  return out;
}
