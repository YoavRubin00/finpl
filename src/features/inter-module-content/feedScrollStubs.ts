/**
 * Stubs for legacy feed-scroll helpers. The FinFeed screen is being
 * removed in favor of in-lesson content; these no-ops preserve the
 * call sites (notifications, daily quests, dilemma celebration) without
 * dispatching any action. Safe to delete once all call sites are pruned.
 */
export function setPendingFeedScroll(_index: number): void {
  // intentionally empty
}

export function setPendingFeedScrollById(_id: string): void {
  // intentionally empty
}
