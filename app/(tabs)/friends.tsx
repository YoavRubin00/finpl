import React, { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { FriendsHubScreen } from '../../src/features/friends-hub/FriendsHubScreen';
import { captureEvent } from '../../src/lib/posthog';

// 20s-dwell value qualifier (Yoav 2026-07-03): a friends visit counts as VALUE
// only when the user actually stays ~20s on the page — an engaged visit, not a
// bounce/pass-through. Fires `friends_engaged` once per focused visit; leaving
// and returning re-arms it. Analytics-only: the raw /friends $screen entry was
// over-counting the value metrics, so the NSM/value tiles will read THIS event
// (not raw entries) once it's collecting.
const FRIENDS_DWELL_MS = 20_000;

export default function FriendsTab(): React.ReactElement {
  const isFocused = useIsFocused();
  const firedRef = useRef(false);
  useEffect(() => {
    if (!isFocused) {
      firedRef.current = false;
      return;
    }
    if (firedRef.current) return;
    const startedAt = Date.now();
    const t = setTimeout(() => {
      firedRef.current = true;
      try {
        captureEvent('friends_engaged', { dwell_ms: Date.now() - startedAt });
      } catch {
        /* non-fatal */
      }
    }, FRIENDS_DWELL_MS);
    return () => clearTimeout(t);
  }, [isFocused]);

  return <FriendsHubScreen />;
}