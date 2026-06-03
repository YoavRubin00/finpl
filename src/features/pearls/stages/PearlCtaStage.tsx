import React, { useEffect } from 'react';

import { FeedReferralNudgeCard } from './cards/FeedReferralNudgeCard';
import { FeedTradingNudgeCard } from './cards/FeedTradingNudgeCard';
import { FeedWhatsAppNudgeCard } from './cards/FeedWhatsAppNudgeCard';
import { useAuthStore } from '../../auth/useAuthStore';
import { track } from '../../../lib/analytics/events';

export type PearlCtaKind = 'referral' | 'trading' | 'whatsapp';

interface PearlCtaStageProps {
  isActive: boolean;
  onContinue: () => void;
  /** Finalize the pearl in-place without navigating. Called by the card
   *  when the user TAPS the CTA (before its own router.push / openURL)
   *  so the pearl is marked completed and the sheet closed BEFORE the
   *  card hands the user off to the destination. Avoids the prior
   *  unfixed bug where tapping a CTA on the final stage left the pearl
   *  marked unlocked-forever. */
  onTapCta: () => void;
  /** Which CTA to surface — picked by PearlSheet via a moduleId hash so each
   *  pearl gets a stable, varied destination across the chapter (some
   *  Friends, some Bridge, some WhatsApp community). */
  kind: PearlCtaKind;
  /** Pearl-scoped context, threaded down to the cards so they can fire
   *  pearl_cta_tapped / pearl_cta_dismissed with the right module attribution. */
  afterModuleId: string;
  chapterId?: string;
}

/**
 * Mid-pearl Call-To-Action stage. Wraps the restored finfeed CTA cards
 * (FeedReferralNudgeCard / FeedTradingNudgeCard / FeedWhatsAppNudgeCard) —
 * the first two were the polished video-driven CTAs from the old feed
 * surface; the WhatsApp card was added 2026-06-01 to nudge users into the
 * community channel for retention. We don't re-build them, we just thread
 * them through the pearl pager.
 *
 * All three cards take an `onContinue` we wire to the pearl's stage-advance
 * so a "המשך" link / background tap inside the card moves the user to the
 * next stage without taking the CTA. Tapping the CTA still navigates out
 * (router.push / Linking.openURL) AND fires onContinue, so when the user
 * returns from the destination the pearl is on the next stage rather than
 * the same CTA.
 *
 * Trading CTA is dropped to Referral for minors (no Bridge access).
 * WhatsApp is fine for all ages (the channel itself is age-appropriate).
 */
export function PearlCtaStage({ isActive, onContinue, onTapCta, kind, afterModuleId, chapterId }: PearlCtaStageProps): React.ReactElement {
  const ageGroup = useAuthStore((s) => s.profile?.ageGroup ?? null);
  const isMinor = ageGroup === 'minor';

  // Bridge isn't reachable for minors anywhere else in the app; route them
  // to the referral CTA instead so the mid-pearl stage always has a real
  // destination.
  const effectiveKind: PearlCtaKind = kind === 'trading' && isMinor ? 'referral' : kind;

  // One-shot pearl_cta_shown fire when the stage becomes active. Captures
  // both the picked kind (deterministic hash) AND the effective kind (post
  // minor-redirect) so PostHog can attribute the visit to either as needed.
  useEffect(() => {
    if (!isActive) return;
    try {
      track({
        name: 'pearl_cta_shown',
        props: {
          after_module_id: afterModuleId,
          chapter_id: chapterId,
          cta_kind: kind,
          effective_kind: effectiveKind,
        },
      });
    } catch { /* non-fatal */ }
  }, [isActive, afterModuleId, chapterId, kind, effectiveKind]);

  const cardProps = { isActive, onContinue, onTapCta, afterModuleId, chapterId } as const;
  if (effectiveKind === 'trading') return <FeedTradingNudgeCard {...cardProps} />;
  if (effectiveKind === 'whatsapp') return <FeedWhatsAppNudgeCard {...cardProps} />;
  return <FeedReferralNudgeCard {...cardProps} />;
}
