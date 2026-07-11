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
  | 'payslip'
  | 'lesson-report';

export type AppEvent =
  // ── Onboarding ─────────────────────────────────────────────────────────
  | { name: 'onboarding_started'; props?: Record<string, never> }
  | { name: 'onboarding_step_completed'; props: { step_name: string; next_step?: string; mode?: 'new' | 'redo' } }
  | { name: 'onboarding_completed'; props: { duration_sec?: number; total_steps?: number } }
  // screen-1 dream-question easy-exit experiment (onboarding_dream_easy_exit).
  // `dream_step_shown` fires on every DreamStep mount so we can finally measure
  // Q1 conversion in isolation (onboarding_step_completed('dream') is partial —
  // the first-sim path skips the standalone dream step). `dream_easy_exit_tapped`
  // fires when a user takes the low-commitment exit (records financialDream=null).
  | { name: 'dream_step_shown'; props: { easy_exit_enabled: boolean } }
  | { name: 'dream_easy_exit_tapped'; props?: Record<string, never> }
  | { name: 'signup_gate_shown'; props: { source: 'post_onboarding_questions' | 'lesson_gate' | string } }
  | { name: 'signup_gate_method_clicked'; props: { method: 'apple' | 'google' | 'email' | 'guest'; source: string } }
  | { name: 'signup_gate_skipped'; props: { source: string } }
  | { name: 'signup_gate_abandoned'; props: { source: string; time_open_ms?: number } }

  // ── Lesson / Module ────────────────────────────────────────────────────
  // SCHEMA UNIFICATION (Yoav 11.7): the emitters historically sent module_id
  // (raw captureEvent) while this registry declared lesson_id — dashboards
  // built on either key missed the other's rows. Both events now carry BOTH
  // keys with the same value, plus the props the emitters already send
  // (module_variant / learning_mode), so every existing insight keeps working
  // and new queries can standardize on module_id.
  | { name: 'lesson_started'; props: { lesson_id?: string; module_id?: string; chapter_id?: string | null; is_replay?: boolean; entry_source?: 'map_tap' | 'auto_advance' | 'deeplink'; module_variant?: string } }
  | { name: 'lesson_quiz_question_answered'; props: { lesson_id: string; question_index: number; is_correct: boolean; attempt?: number; combo_at_answer?: number } }
  | { name: 'lesson_completed'; props: { lesson_id?: string; module_id?: string; chapter_id?: string | null; duration_ms?: number; completed_at_phase?: string; correct_count?: number; total_questions?: number; is_first_lesson?: boolean; max_combo?: number; lesson_xp_multiplier?: number; learning_mode?: string; module_variant?: string } }
  | { name: 'lesson_exited_early'; props: { lesson_id: string; chapter_id?: string; reason: 'back_button' | 'navigation' | 'app_background'; phase?: string } }
  | { name: 'module_unlocked'; props: { module_id: string; chapter_id?: string; trigger?: 'completion' | 'pro_subscribe' | 'manual' } }
  | { name: 'chapter_completed'; props: { chapter_id: string; total_modules?: number } }
  // ── Topic-tree (R6-R8 architecture) ───────────────────────────────────
  // The topic-tree learning method (learningMode: 'topic-tree') fires one
  // `topic_completed` per chip. Before this the new method emitted NO learning
  // events at all — invisible to every PostHog learning metric. Module-level
  // completion still fires `lesson_completed` (with learning_mode:'topic-tree')
  // from TopicTreeAccordion's 70% gate, so NSM / retention / streak insights
  // keep aggregating uniformly across both the legacy and topic-tree methods.
  //
  // The funnel reads:
  //   topic_chip_tapped  →  topic_completed  →  (after 70% of chips)  lesson_completed
  // `via` on topic_completed splits the path that produced the completion:
  //   'chip'       — user tapped the chip directly and ran that single phase
  //   'continuous' — phase was crossed inside a "למידה רציפה" autopilot run
  | { name: 'topic_chip_tapped'; props: { module_id: string; topic_id: string; topic_kind: string; chapter_id?: string; recommended?: boolean } }
  // Fired when a chip's CONTENT actually renders (lesson phase entered) — the
  // missing "viewed" half of the per-chip funnel (ים 2026-07-02). Reading
  // topic_viewed → topic_completed per topic_kind exposes exactly WHICH chip
  // loses the ~35% of lesson-entrants who never reach the chest.
  | { name: 'topic_viewed'; props: { module_id: string; topic_id: string; topic_kind: string; chapter_id?: string; via?: 'chip' | 'continuous' } }
  | { name: 'topic_completed'; props: { module_id: string; topic_id: string; topic_kind: string; chapter_id?: string; via?: 'chip' | 'continuous' } }
  // "למידה רציפה" — the autopilot/master-style flow runs the whole module
  // as one linear lesson, stamping each phase into useTopicProgressStore as
  // it goes. Compare D1/D7 retention + completion of users who took this
  // route vs those who broke the module down chip-by-chip.
  | { name: 'continuous_run_started'; props: { module_id: string; chapter_id?: string; chips_already_done?: number; chips_total?: number } }
  | { name: 'continuous_run_completed'; props: { module_id: string; chapter_id?: string; duration_ms?: number } }
  | { name: 'continuous_run_exited'; props: { module_id: string; chapter_id?: string; phase: string; chips_marked_this_run?: number; duration_ms?: number } }
  // Chest reveal lifecycle. Single chest at the 70% threshold (the 100%
  // master chest was retired). DoN is offered on a 25% roll per open; the
  // quit CTA is offered on a 30% roll for mod-0-2+ — both rolls are
  // emitted on the corresponding _offered events for cohort splits.
  | { name: 'chest_opened'; props: { module_id: string; chapter_id?: string; rarity: 'common' | 'rare' | 'epic' | 'mythic'; xp: number; coins: number; offered_don: boolean; offered_quit: boolean; reveal_variant?: 'mystery' | 'legacy' } }
  | { name: 'chest_cta_tapped'; props: { module_id: string; chapter_id?: string; cta: 'continue' | 'finish_module' | 'quit'; quit_label?: string } }
  | { name: 'chest_don_resolved'; props: { module_id: string; chapter_id?: string; outcome: 'kept' | 'doubled' | 'lost'; base_coins: number } }
  // Chest LIFECYCLE trio (ChatGPT P0 audit, Yoav 11.7) — makes the first-win
  // observable end-to-end. `chest_earned` = the grant DECIDED (threshold
  // stamped, rewards granted); `chest_presented` = the celebration modal
  // ACTUALLY RENDERED (fired from inside ChestCelebrationModal — the event
  // that would have caught the 8-10.7 white-screen bug in an hour: earned
  // high + presented zero = the reward is painted over); `chest_closed` =
  // the user dismissed/continued out. chest_opened (above) stays the NSM
  // completion metric — unchanged.
  | { name: 'chest_earned'; props: { module_id: string; source: 'inline' | 'accordion' } }
  | { name: 'chest_presented'; props: { module_id: string; source: 'inline' | 'accordion' } }
  | { name: 'chest_closed'; props: { module_id: string; source: 'inline' | 'accordion'; cta?: string } }
  // Stable activation marker — fires exactly once per user, the moment the
  // mod-0-1 threshold stamps (either chest path). Decouples the activation
  // read from chest_opened's shape so module/threshold changes never
  // silently redefine the funnel.
  | { name: 'activation_reached'; props: { module_id: string; via: 'inline_chest' | 'accordion_chest' } }
  // Screenshot → portfolio import (Yoav 11.7): the user imports their REAL
  // portfolio from an investing-app screenshot into the community composer.
  | { name: 'portfolio_screenshot_import_started'; props: Record<string, never> }
  | { name: 'portfolio_screenshot_import_succeeded'; props: { positions_count: number; broker?: string } }
  | { name: 'portfolio_screenshot_import_failed'; props: Record<string, never> }
  // mod-0-1 walkthrough prompt — fires once. Lets us tie subsequent
  // retention to whether the user opted into the tour or skipped it.
  | { name: 'walkthrough_prompt_shown'; props: { module_id: string } }
  | { name: 'walkthrough_prompt_choice'; props: { module_id: string; choice: 'tour' | 'continue' } }

  // ── Pearl ──────────────────────────────────────────────────────────────
  | { name: 'pearl_opened'; props: { after_module_id: string; next_module_id?: string; chapter_id?: string; game_key?: string; stages_count: number; has_profile_question?: boolean; has_unique_bundle?: boolean } }
  | { name: 'pearl_stage_completed'; props: { after_module_id: string; stage_kind: string; stage_index: number; stages_count: number } }
  | { name: 'pearl_completed'; props: { after_module_id: string; next_module_id?: string; chapter_id?: string; stages_count: number; time_to_complete_ms?: number } }
  | { name: 'pearl_dismissed'; props: { after_module_id: string; chapter_id?: string; stage_kind?: string; stage_index?: number; stages_count?: number; time_open_ms?: number } }
  | { name: 'pearl_skipped'; props: { after_module_id: string; chapter_id?: string } }
  | { name: 'pearl_skipped_to_next_module'; props: { module_id: string; current_chapter_id?: string } }
  | { name: 'pearl_cta_shown'; props: { after_module_id: string; chapter_id?: string; cta_kind: 'referral' | 'trading' | 'whatsapp'; effective_kind: 'referral' | 'trading' | 'whatsapp'; cta_variant?: string } }
  | { name: 'pearl_cta_tapped'; props: { after_module_id: string; chapter_id?: string; cta_kind: 'referral' | 'trading' | 'whatsapp'; destination_url?: string; cta_variant?: string } }
  | { name: 'pearl_cta_dismissed'; props: { after_module_id: string; chapter_id?: string; cta_kind: 'referral' | 'trading' | 'whatsapp'; time_open_ms?: number; cta_variant?: string } }
  // In-app CTA nudge popups (bridge / invite) — Bar's cloud copy, A/B by cta_variant.
  | { name: 'cta_nudge_shown'; props: { surface: 'bridge_modal' | 'invite_modal'; cta_variant?: string } }
  | { name: 'cta_nudge_tapped'; props: { surface: 'bridge_modal' | 'invite_modal'; cta_variant?: string } }

  // ── Bridge ─────────────────────────────────────────────────────────────
  | { name: 'bridge_viewed'; props: { category?: string; coins_at_view?: number; benefits_in_category?: number; came_from_deeplink_tab?: boolean } }
  | { name: 'bridge_tab_switched'; props: { from_category: string; to_category: string; coins_at_switch?: number } }
  // NOTE: fired via raw captureEvent in BridgeScreen (not track()), so this type
  // is documentation only — but it MUST mirror the real payload, or a future
  // migration to track() would silently rename props and break the dashboards.
  // The monetization dashboard breaks down by `can_afford` (was wrongly typed
  // `can_afford_coins` here — Yoav 2026-06-15 PostHog audit).
  | { name: 'bridge_benefit_tapped'; props: { benefit_id: string; partner_name?: string; category?: string; cost_coins?: number; coins_at_tap?: number; can_afford?: boolean; is_pro?: boolean; is_available?: boolean; already_redeemed?: boolean } }
  | { name: 'bridge_redeem_confirmed'; props: { benefit_id: string; partner_name?: string; partner_type?: string; cost_coins?: number; user_email?: string | null } }
  | { name: 'bridge_redeem_failed'; props: { benefit_id: string; partner_name?: string; reason: string } }
  | { name: 'bridge_partner_url_opened'; props: { benefit_id: string; partner_name?: string } }
  | { name: 'bridge_partner_returned'; props: { benefit_id: string; partner_name?: string; partner_type?: string } }

  // ── App-store rating prompt (in-app, active users, post-chest) ──────────
  | { name: 'rate_prompt_shown'; props: { trigger: 'module_complete'; module_id: string; completed_modules: number } }
  | { name: 'rate_prompt_cta_tapped'; props: { action: 'open_store' | 'later'; store?: 'ios' | 'android'; module_id?: string } }
  | { name: 'rate_sentiment_selected'; props: { sentiment: 'positive' | 'negative'; module_id?: string } }
  | { name: 'rate_review_requested'; props: { available: boolean; module_id?: string } }
  | { name: 'rate_feedback_submitted'; props: { text?: string; module_id?: string } }

  // ── Pro / Subscription / Pricing ───────────────────────────────────────
  | { name: 'pro_gate_shown'; props: { feature: ProGateFeature } }
  | { name: 'pro_gate_cta_clicked'; props: { feature: ProGateFeature } }
  | { name: 'pro_gate_dismissed'; props: { feature: ProGateFeature; via: 'close_x' | 'continue_text' | 'backdrop' | 'system' } }
  | { name: 'paywall_viewed'; props: { paywall: 'subscription_pricing' | 'coin_bundle' | 'gem_bundle' | 'starter_pack' | string; source?: string; bundle_id?: string; pack_id?: string; is_minor?: boolean } }
  | { name: 'paywall_dismissed'; props: { paywall: string; source?: string; bundle_id?: string; pack_id?: string } }
  | { name: 'trial_started'; props: { plan: string; price?: string; trial_days?: number; source?: string } }
  | { name: 'subscription_purchased'; props: { plan: string; price?: string; trial_days?: number; source?: string } }
  | { name: 'subscription_cancelled_at_checkout'; props?: Record<string, never> }
  | { name: 'subscription_purchase_failed'; props: { error_message: string; error_code?: string; platform?: string } }
  // Diagnostic (Moni 2026-06-13): is the purchase even POSSIBLE? Fires once per
  // pricing visit when the RevenueCat offering resolves to 'ready' (a buyable
  // CTA) or 'unavailable' (no packages → the CTA degrades to a silent "נסה שוב"
  // and the user CANNOT buy). A high `unavailable` rate means the ₪0 is broken
  // offerings, not behavioral. App Review 2.1a already hit this path in sandbox.
  | { name: 'paywall_cta_state'; props: { state: 'ready' | 'unavailable'; source?: string } }

  // ── Store / Shop / Purchases ───────────────────────────────────────────
  | { name: 'shop_screen_viewed'; props: { coins: number; gems: number; is_pro: boolean } }
  | { name: 'shop_item_tapped'; props: { item_id: string; item_type?: string; category?: string; cost_value?: number; cost_currency?: 'coins' | 'gems' | 'ils'; can_afford?: boolean } }
  | { name: 'shop_gem_exchange_tapped'; props: { gems_cost: number; coins_reward: number; can_afford: boolean } }
  | { name: 'purchase_initiated'; props: { bundle_id: string; bundle_type: 'starter_pack' | 'gem_bundle' | 'coin_bundle' | string; price_ils?: number | null; real_money?: boolean; source?: string } }
  | { name: 'purchase_completed'; props: { bundle_id: string; bundle_type: string; coins?: number; gems?: number; price_ils?: number; real_money?: boolean; avatars?: number } }
  | { name: 'purchase_failed'; props: { bundle_id: string; bundle_type?: string; reason?: string; error_message?: string } }
  | { name: 'purchase_cancelled'; props: { bundle_id: string; bundle_type: string } }

  // ── WhatsApp community ─────────────────────────────────────────────────
  // The "join the WhatsApp community" CTA appears in several places (the
  // in-lesson/pearl FeedWhatsAppNudgeCard, the More screen, and the welcome
  // email). `source` splits which surface drove the join so we can see
  // whether in-game or email is the stronger acquisition channel for the
  // community. The welcome-email tap is captured server-side (api/email/
  // wa-click.ts) with the same event name + source:'welcome_email'.
  | { name: 'whatsapp_cta_shown'; props: { source: 'pearl_feed' | 'more_screen' | 'friends_hub' } }
  | { name: 'whatsapp_cta_tapped'; props: { source: 'pearl_feed' | 'more_screen' | 'welcome_email' | 'friends_hub' } }
  | { name: 'instagram_cta_tapped'; props: { source: 'more_screen' | string } }

  // ── Community portfolio feed (server-backed 2026-07-03) ────────────────────
  | { name: 'portfolio_shared_server'; props: { picks: number } }
  | { name: 'portfolio_rated'; props: { stars: number } }
  | { name: 'pf_feed_viewed'; props: { count: number } }

  // ── Crowd wisdom · votes & bets (predictions) ──────────────────────────
  // The highest-frequency friends-page action, previously DARK — no event
  // fired at ANY vote/bet site, so crowd-wisdom engagement was unmeasurable.
  // `is_bet` splits a coin-staked prediction from a free vote; `bet_amount`
  // is the stake when is_bet. Fired client-side from every crowd-wisdom entry
  // point (poll vote, slider lock, bet placement) so it catches rich-id votes
  // that never reach the server /vote endpoint (which only accepts a/b).
  | { name: 'crowd_vote_submitted'; props: { question_id: string; choice_id: string; is_bet: boolean; bet_amount?: number; surface: 'crowd_wisdom' | 'slider_forecast' | string; category?: string } }

  // ── Social-action umbrella (North Star enabler) ────────────────────────
  // One event fired at every REAL social action so the friends-page KPI
  // (share of active users doing a social action) reads a single clean event
  // instead of a fragile OR of many per-feature events. `action_type` slices
  // by kind. Fired ALONGSIDE the per-feature event at each site.
  | { name: 'social_action'; props: { action_type: 'crowd_vote' | 'crowd_bet' | 'slider_forecast' | 'referral_share' | 'portfolio_share' | 'friend_request' | 'whatsapp' | string; surface?: string } }

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
  // Fires when energy hits 0 and the out-of-energy modal opens (false→true
  // transition only, not on every blocked action while already at 0). Powers
  // the weekly "ran out of energy" user count on the YOAVS dashboard. The
  // out-of-energy modal impression itself only goes to the bandit server, so
  // this dedicated event is the single PostHog source. Yoav 2026-06-21.
  | { name: 'energy_depleted'; props?: { source?: 'lesson' | 'chat' | string } }
  // The energy-refill screen (out-of-energy modal). Impression + which of the
  // three refill options the user tapped. Yoav 2026-06-22.
  | { name: 'energy_refill_modal_shown'; props?: Record<string, never> }
  | { name: 'energy_refill_option_tapped'; props: { option: 'ad' | 'shop' | 'pro' } }

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
  | { name: 'notification_banner_dismissed'; props: { source: 'permission' | 'tools_discovery' | 'streak_at_risk' | 'no_freeze_upsell' | string; tool_key?: string } }

  // ── Notification OS-permission result ──────────────────────────────────
  // Fires from useNotificationStore.requestPermission — the SINGLE choke point
  // for every permission request (the top permission banner, the Breaking-News
  // empty state, Settings). `granted` is the actual OS decision; `prompted` is
  // whether the system dialog was really shown (false = an already-granted
  // reconciliation, NOT a user choice). `source` is the entry point. This is
  // what measures the true opt-in RATE (granted ÷ prompted) — distinct from
  // `notification_banner_action`, which only means "tapped אשר".
  | { name: 'notification_permission_result'; props: { granted: boolean; prompted: boolean; source?: string } }

  // ── D1 return hook (next-day retention) — Yoav 2026-06-28 ──────────────
  // Fix for the new-user D1 catch-22: when notification permission is granted we
  // arm the daily morning/streak reminders IMMEDIATELY (not on the next app open
  // a churning user never reaches). Plus a small next-day return reward on D1.
  | { name: 'next_day_reminder_scheduled'; props: { source?: string } }
  | { name: 'day1_return_reward_shown'; props: { coins: number } }
  | { name: 'day1_return_reward_claimed'; props: { coins: number; freezes?: number } }

  // ── Push attribution + appointment-setting (RETENTION-PLAN 2026-07-02) ──
  // `push_opened` fires when the user taps an OS notification. Until this
  // event existed push taps were completely dark — open-rate per channel and
  // D1-attribution to a specific reminder were unmeasurable.
  | { name: 'push_opened'; props: { channel?: string; screen?: string; entrypoint?: 'cold_start' | 'listener' } }
  // The permission primer's time-chip choice ("מתי להזכיר?") — the
  // appointment hour (0-23, local) picked BEFORE the OS dialog opened.
  | { name: 'reminder_time_selected'; props: { hour: number; source?: string } }

  // ── Day-0 exit ritual + shark wager (RETENTION-PLAN 2026-07-02 §2.4) ────
  // The end-of-first-session "נתראה מחר" moment: tomorrow's promise + the
  // shark's commitment wager (escrow 50 → return tomorrow → 150). One offer
  // per lifetime; resolution by IL calendar day. KPI (אודרי): accept-rate AND
  // D7 of losers vs holdout — if losing churns people, the switch goes off.
  | { name: 'day0_exit_ritual_shown'; props: { streak: number } }
  | { name: 'streak_wager_offered'; props: { stake: number; payout: number } }
  | { name: 'streak_wager_accepted'; props: { stake: number; payout: number } }
  | { name: 'streak_wager_declined'; props: { stake: number; payout: number } }
  | { name: 'streak_wager_resolved'; props: { outcome: 'won' | 'lost'; stake: number; payout: number } }

  // ── Tomorrow chest (RETENTION-SPRINT 2026-07-06) ─────────────────────────
  // The day-2 appointment mechanic: a module/welcome chest today arms a
  // sealed chest that opens the next Israel day (map card + landing ceremony
  // that deep-links into the next lesson). DELIBERATELY separate from
  // `chest_opened` — chest_opened uniques ARE the learning-completion NSM
  // (chest_completion_metric); reusing it here would silently inflate the
  // module-completion dashboards with return-ritual opens.
  | { name: 'tomorrow_chest_armed'; props: { source: string; opens_on: string } }
  | { name: 'tomorrow_chest_ready_shown'; props: { trigger: 'auto' | 'card_tap'; day_gap: number } }
  | { name: 'tomorrow_chest_opened'; props: { day_gap: number; coins: number; match_coins?: number; xp: number; rarity: string; armed_source?: string; chain_day?: number } }
  | { name: 'tomorrow_chest_cta_tapped'; props: { cta: 'continue_lesson' | 'later'; next_module_id?: string } }
  // Burned unclaimed after the 48h ready-window (overnight-interest economics,
  // מוני 8.7) — measures how many day-2 appointments are missed entirely.
  | { name: 'tomorrow_chest_expired'; props: { opens_on: string; armed_on: string } };

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
