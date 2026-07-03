import React, { useEffect } from "react";
import { useBandit } from "../bandit/useBandit";
import { StreakClubEntryCard } from "./StreakClubEntryCard";

/**
 * Day-0 lounge A/B holdout (Yoav 2026-07-03).
 *
 * Mounted ONLY for mod-0-1-chest completers (see DuoLearnScreen) — so the
 * `day0_lounge` experiment population is exactly "0-1 chest completers", per
 * Yoav's spec. The bandit splits them ~50/50: the `show` arm renders the lounge
 * badge (treatment), the `hide` arm renders nothing (control holdout). Return is
 * measured BY ARM via the person-property `bandit_variant__day0_lounge` that
 * useBandit writes — the bandit dashboard breaks down D1/D7 return by arm.
 *
 * Both arms fire `bandit_variant_assigned` on mount (useBandit), so the holdout
 * is measurable; the impression is only recorded for the arm that actually shows
 * the badge. Reversible: pin the winning arm in banditConfig once we have the read.
 */
export function Day0LoungeBanditGate({
  streak,
  hasUnseenToday,
  onPress,
}: {
  streak: number;
  hasUnseenToday: boolean;
  onPress: () => void;
}): React.ReactElement | null {
  const { payload, trackImpression } = useBandit("day0_lounge");

  useEffect(() => {
    if (payload.show) trackImpression();
  }, [payload.show, trackImpression]);

  if (!payload.show) return null;
  return <StreakClubEntryCard streak={streak} hasUnseenToday={hasUnseenToday} onPress={onPress} />;
}
