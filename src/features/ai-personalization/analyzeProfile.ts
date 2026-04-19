/**
 * PRD 34, US-002: Mock AI Profile Analysis
 *
 * Takes batched telemetry events and returns a structured AIProfile.
 * Currently uses deterministic heuristics instead of a real LLM call.
 * The real LLM integration will be server-side (edge function) in a future iteration.
 */
import type {
  TelemetryEvent,
  AIProfile,
  PersonaLabel,
  MonetizationVector,
  MonetizationContext,
  MonetizationOffer,
  RecommendedAction,
} from './types';

/** Simulate network latency so callers handle async correctly */
const MOCK_LATENCY_MS = 300;

function derivePersona(events: TelemetryEvent[]): PersonaLabel {
  const simEvents = events.filter((e) => e.type === 'sim_decision');
  if (simEvents.length === 0) return 'Balanced';

  const riskMeta = simEvents.filter(
    (e) => e.meta?.['riskLevel'] === 'high' || e.meta?.['riskLevel'] === 'aggressive',
  );
  const riskRatio = riskMeta.length / simEvents.length;

  if (riskRatio > 0.6) return 'Aggressive';
  if (riskRatio > 0.3) return 'Risk-Curious';
  if (riskRatio < 0.1) return 'Risk-Averse';
  return 'Balanced';
}

function deriveKnowledgeGaps(events: TelemetryEvent[]): string[] {
  const quizEvents = events.filter((e) => e.type === 'quiz_answer');
  if (quizEvents.length === 0) return [];

  /** Group by moduleId and compute accuracy */
  const byModule = new Map<string, { total: number; correct: number }>();
  for (const ev of quizEvents) {
    const entry = byModule.get(ev.moduleId) ?? { total: 0, correct: 0 };
    entry.total += 1;
    if (ev.correct) entry.correct += 1;
    byModule.set(ev.moduleId, entry);
  }

  const gaps: string[] = [];
  for (const [moduleId, stats] of byModule) {
    if (stats.total >= 2 && stats.correct / stats.total < 0.5) {
      gaps.push(moduleId);
    }
  }
  return gaps;
}

function deriveMonetizationVector(events: TelemetryEvent[]): MonetizationVector {
  const completions = events.filter((e) => e.type === 'module_complete');

  /** Monetization signals give strong behavioral hints */
  const shopBrowses = events.filter((e) => e.type === 'shop_browse').length;
  const heartsDepleted = events.filter((e) => e.type === 'hearts_depleted').length;
  const chestUnlocks = events.filter((e) => e.type === 'chest_unlock').length;
  const iapDismissals = events.filter((e) => e.type === 'iap_dismissed').length;
  const iapAccepts = events.filter((e) => e.type === 'iap_accepted').length;

  /** Users who repeatedly visit the shop and unlock chests are impulse buyers */
  if (shopBrowses >= 3 || chestUnlocks >= 2) return 'Impulse Buyer';

  /** Users who accept IAPs and have high accuracy seek status */
  const quizEvents = events.filter((e) => e.type === 'quiz_answer');
  const correctRatio =
    quizEvents.length > 0
      ? quizEvents.filter((e) => e.correct).length / quizEvents.length
      : 0;

  if (iapAccepts >= 1 && correctRatio > 0.7) return 'Status Seeker';

  /** Users who run out of hearts and dismiss offers feel anxious */
  if (heartsDepleted >= 2 || (heartsDepleted >= 1 && iapDismissals >= 2)) {
    return 'Anxious/Needs Security';
  }

  /** Users who dismiss everything are value-driven */
  if (iapDismissals >= 3 && iapAccepts === 0) return 'Frugal/Value Driven';

  /** Fallback to completion-speed heuristic when no monetization signals exist */
  if (completions.length === 0) return 'Unknown';

  const avgDuration =
    completions.reduce((sum, e) => sum + e.durationMs, 0) / completions.length;

  if (correctRatio > 0.85 && avgDuration < 60_000) return 'Status Seeker';
  if (avgDuration < 30_000) return 'Impulse Buyer';
  if (avgDuration > 120_000) return 'Anxious/Needs Security';
  return 'Frugal/Value Driven';
}

function deriveMonetizationContext(
  vector: MonetizationVector,
  persona: PersonaLabel,
): MonetizationContext {
  const offers: MonetizationOffer[] = [];

  switch (vector) {
    case 'Impulse Buyer':
      offers.push({
        trigger: 'after_win',
        bundleKey: 'flash_gem_pack',
        headline: 'מבצע בזק! 💎',
        subtext: 'חבילת 500 ג׳מס ב-50% הנחה, רק עכשיו',
        urgency: 'high',
      });
      offers.push({
        trigger: 'hearts_depleted',
        bundleKey: 'extra_lives',
        headline: 'אל תפסיק עכשיו!',
        subtext: '5 לבבות + 100 ג׳מס במחיר מיוחד',
        urgency: 'high',
      });
      break;
    case 'Status Seeker':
      offers.push({
        trigger: 'after_win',
        bundleKey: 'platinum_avatar',
        headline: 'אווטאר פלטינום 👑',
        subtext: 'בלעדי למנצחים, תבלוט מכולם',
        urgency: 'medium',
      });
      offers.push({
        trigger: 'chapter_complete',
        bundleKey: 'elite_badge_bundle',
        headline: 'חבילת אלופים',
        subtext: 'תגים בלעדיים + מסגרת זהב לפרופיל',
        urgency: 'medium',
      });
      break;
    case 'Anxious/Needs Security':
      offers.push({
        trigger: 'after_failure',
        bundleKey: 'safety_net_bundle',
        headline: 'רשת ביטחון 🛡️',
        subtext: 'לבבות + ג׳מס כדי שתמיד תהיה מוגן',
        urgency: 'medium',
      });
      offers.push({
        trigger: 'streak_at_risk',
        bundleKey: 'streak_shield',
        headline: 'שמור על הסטריק!',
        subtext: 'מגן סטריק ל-48 שעות',
        urgency: 'high',
      });
      break;
    case 'Frugal/Value Driven':
      offers.push({
        trigger: 'chapter_complete',
        bundleKey: 'value_mega_pack',
        headline: 'חבילת ערך מקסימלי',
        subtext: 'הכי הרבה תמורה, חסכוני ומשתלם',
        urgency: 'low',
      });
      break;
    default:
      break;
  }

  /** Competitive personas get an extra status offer */
  if (persona === 'Aggressive' && vector !== 'Status Seeker') {
    offers.push({
      trigger: 'after_win',
      bundleKey: 'champion_bundle',
      headline: 'חבילת אלוף 🏆',
      subtext: 'בוסט XP כפול + אווטאר בלעדי',
      urgency: 'medium',
    });
  }

  return { vector, offers };
}

function deriveActions(
  persona: PersonaLabel,
  gaps: string[],
  vector: MonetizationVector,
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  if (persona === 'Aggressive' || persona === 'Risk-Curious') {
    actions.push('UNLOCK_CRYPTO_NODE');
  }
  if (gaps.length >= 3) {
    actions.push('DECREASE_DIFFICULTY');
  }
  if (gaps.length === 0) {
    actions.push('INCREASE_DIFFICULTY');
    actions.push('UNLOCK_ADVANCED_INVESTING');
  }

  /** Trigger targeted IAP when vector is known */
  if (vector !== 'Unknown') {
    actions.push('TRIGGER_TARGETED_IAP');
  }

  return actions;
}

/**
 * Analyze batched telemetry events and return a structured AIProfile.
 *
 * Currently a **mock**, uses simple heuristics.
 * Replace the body with a real edge-function call in a future iteration.
 */
export async function analyzeProfile(events: TelemetryEvent[]): Promise<AIProfile> {
  /** Simulate async latency */
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

  const persona = derivePersona(events);
  const knowledgeGaps = deriveKnowledgeGaps(events);
  const monetizationVector = deriveMonetizationVector(events);
  const monetizationContext = deriveMonetizationContext(monetizationVector, persona);
  const recommendedActions = deriveActions(persona, knowledgeGaps, monetizationVector);

  return {
    persona,
    personaShift: null,
    knowledgeGaps,
    monetizationVector,
    monetizationContext,
    recommendedActions,
    updatedAt: Date.now(),
  };
}
