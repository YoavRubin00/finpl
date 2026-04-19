/** PRD 34, AI Personalization Engine types */

export type TelemetryEventType =
  | 'quiz_answer'
  | 'sim_decision'
  | 'module_complete'
  | 'chapter_complete'
  | 'shop_browse'
  | 'hearts_depleted'
  | 'chest_unlock'
  | 'iap_dismissed'
  | 'iap_accepted';

/** Monetization signal types for AI profiling */
export type MonetizationSignalType = Extract<
  TelemetryEventType,
  'shop_browse' | 'hearts_depleted' | 'chest_unlock' | 'iap_dismissed' | 'iap_accepted'
>;

export interface TelemetryEvent {
  type: TelemetryEventType;
  moduleId: string;
  correct: boolean | null;
  /** ms the user spent on the interaction */
  durationMs: number;
  timestamp: number;
  meta?: Record<string, string | number | boolean>;
}

export type PersonaLabel =
  | 'Risk-Averse'
  | 'Risk-Curious'
  | 'Balanced'
  | 'Conservative'
  | 'Aggressive';

export type MonetizationVector =
  | 'Impulse Buyer'
  | 'Status Seeker'
  | 'Anxious/Needs Security'
  | 'Frugal/Value Driven'
  | 'Unknown';

export type RecommendedAction =
  | 'UNLOCK_CRYPTO_NODE'
  | 'UNLOCK_TAX_NODE'
  | 'UNLOCK_ADVANCED_INVESTING'
  | 'INCREASE_DIFFICULTY'
  | 'DECREASE_DIFFICULTY'
  | 'TRIGGER_TARGETED_IAP';

/** When to trigger a monetization offer */
export type MonetizationTrigger =
  | 'after_failure'
  | 'after_win'
  | 'shop_browse'
  | 'hearts_depleted'
  | 'streak_at_risk'
  | 'chapter_complete';

/** A personalized IAP offer the DynamicIAPService can display */
export interface MonetizationOffer {
  trigger: MonetizationTrigger;
  bundleKey: string;
  headline: string;
  subtext: string;
  urgency: 'low' | 'medium' | 'high';
}

/** Full monetization context produced by the LLM / mock analysis */
export interface MonetizationContext {
  vector: MonetizationVector;
  offers: MonetizationOffer[];
}

export interface AIProfile {
  persona: PersonaLabel;
  personaShift: string | null;
  knowledgeGaps: string[];
  monetizationVector: MonetizationVector;
  monetizationContext: MonetizationContext;
  recommendedActions: RecommendedAction[];
  updatedAt: number;
}
