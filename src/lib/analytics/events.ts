// src/lib/analytics/events.ts
//
// Type-safe PostHog event registry.
//
// Why this exists:
//   `captureEvent('foo', { ... })` is too permissive — the name is a free string
//   and props are `any`. The code drifts from PostHog reality (events with typos,
//   props that disagree across call sites, missing baseline context like is_pro).
//   This registry forces every event through a discriminated union so the
//   compiler catches name mismatches AND props are typed per-event.
//
// Two layers:
//   1. `track({ name, props })` — every wrapped event auto-receives the
//      baseline person/session context (`is_pro`, `is_guest`, `age_group`,
//      `streak_days`, `coins`, `gems`, `xp`, `app_version`). Feature code does
//      NOT pass these — they're read from query-client + auth store at fire time.
//   2. Raw `captureEvent` from `lib/posthog` stays available for SDK events
//      we don't own (Application Backgrounded, $exception, etc.) and for the
//      handful of low-level events where the baseline can't be read (e.g.
//      `auth_token_invalid` fires from `api/client.ts` before stores hydrate).

import { captureEvent, type EventProperties } from '../posthog';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { queryClient } from '../queryClient';
import { economyQueryKey } from '../../features/economy/useEconomy';
import { streakQueryKey } from '../../features/economy/useStreak';
import { subscriptionQueryKey } from '../../features/subscription/useSubscription';
import type { Economy } from '../api/economy';
import type { StreakState } from '../api/streak';
import type { SubscriptionState } from '../api/subscription';
import { getAppVersion } from '../version';

// ─────────────────────────────────────────────────────────────────────────────
// Stage 1 event registry — 6 funnels the user asked to track
// ─────────────────────────────────────────────────────────────────────────────
//
// Adding more events later (Stages 2+3 — Referral, Shop, Tools, etc.) just
// means appending to this union. The discriminated `name` is what makes
// `track()` type-check the props against the right shape automatically.

export type ProGateFeature =
  | 'simulator'
  | 'arena'
  | 'chat'
  | 'aiInsights'
  | 'saved_items'
  | 'breaking-news'
  | 'shark-voice'
  | 'analyst-quick'
  | 'analyst-deep'
  | 'payslip';

export type AppEvent =
  // ── Onboarding ─────────────────────────────────────────────────────────
  | { name: 'onboarding_started'; props?: Record<string, never> }
  | { name: 'onboarding_step_completed'; props: { step_name: string; next_step?: string; mode?: 'new' | 'redo' } }
  | { name: 'onboarding_completed'; props: { duration_sec?: number; total_steps?: number } }
  | { name: 'signup_gate_shown'; props: { source: 'post_onboarding_questions' | 'lesson_gate' | string } }
  | { name: 'signup_gate_method_clicked'; props: { method: 'apple' | 'google' | 'email' | 'guest'; source: string } }
  | { name: 'signup_gate_skipped'; props: { source: string } }
  | { name: 'signup_gate_abandoned'; props: { source: string; time_open_ms?: number } }

  // ── Lesson / Module ────────────────────────────────────────────────────
  | { name: 'lesson_started'; props: { lesson_id: string; chapter_id?: string; is_replay?: boolean; entry_source?: 'map_tap' | 'auto_advance' | 'deeplink' } }
  | { name: 'lesson_quiz_question_answered'; props: { lesson_id: string; question_index: number; is_correct: boolean; attempt?: number } }
  | { name: 'lesson_completed'; props: { lesson_id: string; chapter_id?: string; duration_ms?: number; completed_at_phase?: string; correct_count?: number; total_questions?: number; is_first_lesson?: boolean } }
  | { name: 'lesson_exited_early'; props: { lesson_id: string; chapter_id?: string; reason: 'back_button' | 'navigation' | 'app_background'; phase?: string } }
  | { name: 'module_unlocked'; props: { module_id: string; chapter_id?: string; trigger?: 'completion' | 'pro_subscribe' | 'manual' } }
  | { name: 'chapter_completed'; props: { chapter_id: string; total_modules?: number } }
  // The topic-tree learning method (learningMode: 'topic-tree') fires one
  // `topic_completed` per chip. Before this the new method emitted NO learning
  // events at all — invisible to every PostHog learning metric. Module-level
  // completion still fires `lesson_completed` (with learning_mode:'topic-tree')
  // from TopicTreeAccordion's 70% gate, so NSM / retention / streak insights
  // keep aggregating uniformly across both the legacy and topic-tree methods.
  | { name: 'topic_completed'; props: { module_id: string; topic_id: string; topic_kind: string; chapter_id?: string } }

  // ── Pearl ──────────────────────────────────────────────────────────────
  | { name: 'pearl_opened'; props: { after_module_id: string; next_module_id?: string; chapter_id?: string; game_key?: string; stages_count: number; has_profile_question?: boolean; has_unique_bundle?: boolean } }
  | { name: 'pearl_stage_completed'; props: { after_module_id: string; stage_kind: string; stage_index: number; stages_count: number } }
  | { name: 'pearl_completed'; props: { after_module_id: string; next_module_id?: string; chapter_id?: string; stages_count: number; time_to_complete_ms?: number } }
  | { name: 'pearl_dismissed'; props: { after_module_id: string; chapter_id?: string; stage_kind?: string; stage_index?: number; stages_count?: number; time_open_ms?: number } }
  | { name: 'pearl_skipped'; props: { after_module_id: string; chapter_id?: string } }
  | { name: 'pearl_skipped_to_next_module'; props: { module_id: string; current_chapter_id?: string } }
  | { name: 'pearl_cta_shown'; props: { after_module_id: string; chapter_id?: string; cta_kind: 'referral' | 'trading' | 'whatsapp'; effective_kind: 'referral' | 'trading' | 'whatsapp' } }
  | { name: 'pearl_cta_tapped'; props: { after_module_id: string; chapter_id?: string; cta_kind: 'referral' | 'trading' | 'whatsapp'; destination_url?: string } }
  | { name: 'pearl_cta_dismissed'; props: { after_module_id: string; chapter_id?: string; cta_kind: 'referral' | 'trading' | 'whatsapp'; time_open_ms?: number } }

  // ── Bridge ─────────────────────────────────────────────────────────────
  | { name: 'bridge_viewed'; props: { category?: string; coins_at_view?: number; benefits_in_category?: number; came_from_deeplink_tab?: boolean } }
  | { name: 'bridge_tab_switched'; props: { from_category: string; to_category: string; coins_at_switch?: number } }
  | { name: 'bridge_benefit_tapped'; props: { benefit_id: string; partner_name?: string; category?: string; can_afford_coins?: boolean } }
  | { name: 'bridge_redeem_confirmed'; props: { benefit_id: string; partner_name?: string; partner_type?: string; cost_coins?: number; user_email?: string | null } }
  | { name: 'bridge_redeem_failed'; props: { benefit_id: string; partner_name?: string; reason: string } }
  | { name: 'bridge_partner_url_opened'; props: { benefit_id: string; partner_name?: string } }
  | { name: 'bridge_partner_returned'; props: { benefit_id: string; partner_name?: string; partner_type?: string } }

  // ── Pro / Subscription / Pricing ───────────────────────────────────────
  | { name: 'pro_gate_shown'; props: { feature: ProGateFeature } }
  | { name: 'pro_gate_cta_clicked'; props: { feature: ProGateFeature } }
  | { name: 'pro_gate_dismissed'; props: { feature: ProGateFeature; via: 'close_x' | 'continue_text' | 'backdrop' | 'system' } }
  | { name: 'paywall_viewed'; props: { paywall: 'subscription_pricing' | 'coin_bundle' | 'gem_bundle' | 'starter_pack' | string; source?: string; bundle_id?: string; pack_id?: string; is_minor?: boolean } }
  | { name: 'paywall_dismissed'; props: { paywall: string; source?: string; bundle_id?: string; pack_id?: string } }
  | { name: 'trial_started'; props: { plan: string; price?: string; trial_days?: number; source?: string } }
  | { name: 'subscription_purchased'; props: { plan: string; price?: string; trial_days?: number; source?: string } }
  | { name: 'subscription_cancelled_at_checkout'; props?: Record<string, never> }
  | { name: 'subscription_purchase_failed'; props: { error_message: string } }

  // ── Store / Shop / Purchases ───────────────────────────────────────────
  | { name: 'shop_screen_viewed'; props: { coins: number; gems: number; is_pro: boolean } }
  | { name: 'shop_item_tapped'; props: { item_id: string; item_type?: string; category?: string; cost_value?: number; cost_currency?: 'coins' | 'gems' | 'ils'; can_afford?: boolean } }
  | { name: 'shop_gem_exchange_tapped'; props: { gems_cost: number; coins_reward: number; can_afford: boolean } }
  | { name: 'purchase_initiated'; props: { bundle_id: string; bundle_type: 'starter_pack' | 'gem_bundle' | 'coin_bundle' | string; price_ils?: number | null; real_money?: boolean } }
  | { name: 'purchase_completed'; props: { bundle_id: string; bundle_type: string; coins?: number; gems?: number; price_ils?: number; real_money?: boolean; avatars?: number } }
  | { name: 'purchase_failed'; props: { bundle_id: string; bundle_type?: string; reason?: string; error_message?: string } }
  | { name: 'purchase_cancelled'; props: { bundle_id: string; bundle_type: string } }

  // ── Referral / Friends ─────────────────────────────────────────────────
  | { name: 'referral_screen_viewed'; props: { has_code: boolean; friends_count: number; dividend_available: number; already_collected_today: boolean } }
  | { name: 'referral_link_copied'; props: { code: string } }
  | { name: 'referral_link_shared'; props: { code: string } }
  | { name: 'referral_dividend_collected'; props: { coin_amount: number; friends_count: number } }
  | { name: 'referral_refresh_tapped'; props: { friends_count: number } }

  // ── Tools (Financial Tools hub) ────────────────────────────────────────
  | { name: 'tool_opened'; props: { tool_key: string } }
  | { name: 'tool_used'; props: { tool_key: string; threshold_seconds: number } }

  // ── News Challenge ─────────────────────────────────────────────────────
  | { name: 'news_challenge_viewed'; props: { question_count?: number; news_date?: string } }
  | { name: 'news_challenge_question_answered'; props: { question_index: number; is_correct: boolean } }
  | { name: 'news_challenge_completed'; props: { correct_count: number; total_questions: number; reward_xp?: number; reward_coins?: number } }
  | { name: 'news_challenge_chat_opened'; props: { question_index: number } }
  | { name: 'daily_challenge_completed'; props: { challenge_type: 'news' | 'dilemma' | 'investment' | string; correct_count?: number; total_questions?: number } }

  // ── Daily / Engagement ────────────────────────────────────────────────
  | { name: 'daily_active_day'; props: { date_il: string; streak: number; longest_streak: number } }
  // Fires ONLY when streak actually grew (prev → new). Distinct from
  // `daily_active_day` (which fires every active day, including streak=1
  // resets). `is_milestone` lights up at 2/7/14/30/100/365. `reached_two`
  // is the user's first-ever transition to a streak ≥ 2 — drives the
  // "holding a streak (≥ 2)" cohort the rest of the metric stack reads.
  | { name: 'streak_extended'; props: { prev_streak: number; new_streak: number; longest_streak: number; is_milestone: boolean; reached_two: boolean } }

  // ── Bandit (Thompson sampling experiments) ────────────────────────────
  // Fires once per component instance when useBandit() locks a variant.
  // Mirrors setPersonProperties({ bandit_variant__<exp>: <variantId> }) so
  // Hog funnels for ANY downstream event can be sliced by variant via the
  // person property — that's the audit-log half of the same signal.
  | { name: 'bandit_variant_assigned'; props: { experiment_id: string; variant_id: string; variant_label?: string; uniform_sampling: boolean } }

  // ── Legal / Terms re-consent ────────────────────────────────────────────
  | { name: 'terms_reaccepted'; props: { from_version: string | null; to_version: string } }

  // ── Daily News Challenge — recap page (June 2026 Duo polish) ────────────
  | { name: 'news_recap_viewed'; props: { date_key: string; perfect: boolean; streak: number } }
  | { name: 'news_recap_closed'; props: { date_key: string; time_open_ms: number } }

  // ── Top notification banners (permission, tools-discovery, streak-at-risk, no-freeze) ──
  // Wired June 2026 after a visibility gap — we had no PostHog signal for whether
  // banners were rendering or being interacted with. `source` identifies which
  // wrapper fired the event so funnels can split by banner type.
  | { name: 'notification_banner_shown'; props: { source: 'permission' | 'tools_discovery' | 'streak_at_risk' | 'no_freeze_upsell' | string; tool_key?: string } }
  | { name: 'notification_banner_action'; props: { source: 'permission' | 'tools_discovery' | 'streak_at_risk' | 'no_freeze_upsell' | string; tool_key?: string } }
  | { name: 'notification_banner_dismissed'; props: { source: 'permission' | 'tools_discovery' | 'streak_at_risk' | 'no_freeze_upsell' | string; tool_key?: string } };

// ─────────────────────────────────────────────────────────────────────────────
// Baseline properties — attached to every wrapped event
// ─────────────────────────────────────────────────────────────────────────────
//
// Read from sync stores + react-query cache. None of these throw if a store
// hasn't hydrated yet — they fall back to safe defaults so the event still
// fires (better a `null` field than a dropped event).

export interface BaselineProperties {
  is_pro: boolean;
  is_guest: boolean;
  has_completed_onboarding: boolean;
  age_group: string | null;
  streak_days: number | null;
  longest_streak: number | null;
  coins: number | null;
  gems: number | null;
  xp: number | null;
  app_version: string;
}

export function baselineProperties(): BaselineProperties {
  let auth: ReturnType<typeof useAuthStore.getState> | null = null;
  let economy: Economy | null = null;
  let streak: StreakState | null = null;
  let subscription: SubscriptionState | null = null;

  try { auth = useAuthStore.getState(); } catch { /* store not hydrated */ }
  try { economy = queryClient.getQueryData<Economy | null>(economyQueryKey) ?? null; } catch { /* no cache */ }
  try { streak = queryClient.getQueryData<StreakState | null>(streakQueryKey) ?? null; } catch { /* no cache */ }
  try { subscription = queryClient.getQueryData<SubscriptionState | null>(subscriptionQueryKey) ?? null; } catch { /* no cache */ }

  return {
    is_pro: subscription?.isPro === true,
    is_guest: auth?.isGuest === true,
    has_completed_onboarding: auth?.hasCompletedOnboarding === true,
    age_group: auth?.profile?.ageGroup ?? null,
    streak_days: streak?.currentStreak ?? null,
    longest_streak: streak?.longestStreak ?? null,
    coins: economy?.coins ?? null,
    gems: economy?.gems ?? null,
    xp: economy?.xp ?? null,
    app_version: getAppVersion(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type-safe event emitter. Auto-injects baseline context so every event lands
 * with `is_pro`, `is_guest`, `age_group`, `streak_days`, `coins`, `gems`,
 * `xp`, `app_version`. Per-event props from the discriminated union override
 * baseline keys if they collide (they shouldn't — baseline keys are namespaced
 * to be distinct from per-event props).
 *
 * Usage:
 *   track({ name: 'pearl_opened', props: { after_module_id: 'mod-0-2', stages_count: 4 } })
 *
 * vs. the older pattern (still valid for SDK / low-level events):
 *   captureEvent('auth_token_invalid', { endpoint: '/api/sync/economy' })
 */
export function track<E extends AppEvent>(event: E): void {
  const baseline = baselineProperties();
  // Per-event props win over baseline on key collision so a future event that
  // needs to override (e.g. a server-pushed `is_pro` snapshot) can do so.
  const merged: EventProperties = { ...baseline, ...(event.props ?? {}) };
  captureEvent(event.name, merged);
}
