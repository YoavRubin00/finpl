import React, { useCallback, useEffect } from 'react';
import { useTutorialStore } from '../../../stores/useTutorialStore';
import { ToolTutorialOverlay } from '../../financial-tools/components/ToolTutorialOverlay';
import { FRIENDS_HUB_TUTORIAL_STEPS } from '../data/friendsHubTutorialSteps';
import { captureEvent } from '../../../lib/posthog';

/**
 * First-visit Captain Shark tour of the friends hub.
 *
 * Renders on top of FriendsHubScreen until the user finishes or X-dismisses
 * (both persist the seen-flag — never interrupts twice). Gated on store
 * hydration: friends is a root tab, so without the guard the overlay could
 * flash for returning users before the persisted flag loads.
 */
export function FriendsHubTutorialMount(): React.ReactElement | null {
  const hydrated = useTutorialStore((s) => s._hydrated);
  const hasSeen = useTutorialStore((s) => s.hasSeenFriendsHubIntro);
  const markSeen = useTutorialStore((s) => s.markFriendsHubIntroSeen);
  const show = hydrated && !hasSeen;

  useEffect(() => {
    if (!show) return;
    try {
      captureEvent('friends_hub_tutorial_viewed');
    } catch { /* analytics must never block the tour */ }
  }, [show]);

  const handleSeen = useCallback(
    (completed: boolean) => {
      markSeen();
      try {
        captureEvent('friends_hub_tutorial_done', { completed });
      } catch { /* ignore */ }
    },
    [markSeen],
  );

  if (!show) return null;
  return <ToolTutorialOverlay steps={FRIENDS_HUB_TUTORIAL_STEPS} onSeen={handleSeen} />;
}
