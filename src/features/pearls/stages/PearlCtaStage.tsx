import React from 'react';

import { FeedReferralNudgeCard } from './cards/FeedReferralNudgeCard';
import { FeedTradingNudgeCard } from './cards/FeedTradingNudgeCard';
import { useAuthStore } from '../../auth/useAuthStore';

export type PearlCtaKind = 'referral' | 'trading';

interface PearlCtaStageProps {
  isActive: boolean;
  onContinue: () => void;
  /** Which CTA to surface — picked by PearlSheet via a moduleId hash so each
   *  pearl gets a stable, varied destination across the chapter (some
   *  Friends, some Bridge). */
  kind: PearlCtaKind;
}

/**
 * Mid-pearl Call-To-Action stage. Wraps the restored finfeed CTA cards
 * (FeedReferralNudgeCard / FeedTradingNudgeCard) — these were the polished
 * video-driven CTAs from the old feed surface; we don't re-build them, we
 * just thread them through the pearl pager.
 *
 * Both cards take an `onContinue` we wire to the pearl's stage-advance so
 * a "המשך" link inside the card moves the user to the next stage without
 * taking the CTA. Tapping the CTA still navigates out (router.push) AND
 * fires onContinue, so when the user returns from the destination the pearl
 * is on the next stage rather than the same CTA.
 *
 * Trading CTA is dropped to Referral for minors (no Bridge access).
 */
export function PearlCtaStage({ isActive, onContinue, kind }: PearlCtaStageProps): React.ReactElement {
  const ageGroup = useAuthStore((s) => s.profile?.ageGroup ?? null);
  const isMinor = ageGroup === 'minor';

  // Bridge isn't reachable for minors anywhere else in the app; route them
  // to the referral CTA instead so the mid-pearl stage always has a real
  // destination.
  const effectiveKind: PearlCtaKind = kind === 'trading' && isMinor ? 'referral' : kind;

  if (effectiveKind === 'trading') {
    return <FeedTradingNudgeCard isActive={isActive} onContinue={onContinue} />;
  }
  return <FeedReferralNudgeCard isActive={isActive} onContinue={onContinue} />;
}
