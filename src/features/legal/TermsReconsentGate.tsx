import React, { useCallback, useEffect, useState } from 'react';

import { useAuthStore } from '../auth/useAuthStore';
import { CURRENT_TERMS_VERSION } from '../../lib/legal/termsVersion';
import { useTermsStore } from './useTermsStore';
import { TermsUpdateModal } from './TermsUpdateModal';

/** Sentinel terms version stamped on legacy sessions that arrive here with
 *  `acceptedVersion === null`. Must be lexically < CURRENT_TERMS_VERSION so
 *  the staleness check fires and the re-consent modal appears. The format
 *  matches real terms versions (YYYY-MM-DD) so a future maintainer reading
 *  MMKV sees a coherent value, not a sentinel string. */
const LEGACY_TERMS_SENTINEL = '2026-05-01';

/**
 * Mount-anywhere gate for the "we updated the terms" modal.
 *
 * Goal: every authenticated user with completed onboarding sees the modal
 * exactly once per terms version, regardless of how they arrived (fresh
 * signup, OAuth login into an existing account on a clean device, build
 * update from a pre-versioning install, etc). Brand-new signups must NOT
 * see it (they consented during onboarding to the current version already).
 *
 * Five session shapes land here:
 *
 *   1. Brand-new signup (email/guest→register) — `completeOnboarding` /
 *      `convertGuestToUser` calls `pinTermsForNewUser` synchronously inside
 *      the same action that flips `hasCompletedOnboarding`. By the time
 *      this gate's effect runs, `acceptedVersion === CURRENT_TERMS_VERSION`.
 *      → No modal.
 *
 *   2. OAuth login into an EXISTING account on a fresh install — `signIn`
 *      does NOT pin terms (correct: existing accounts may need re-consent).
 *      Lands with `acceptedVersion === null`.
 *      → Backfill effect sets the legacy sentinel → modal fires.
 *
 *   3. Pre-versioning install updating to a build with this gate — the
 *      persisted MMKV blob has no `acceptedVersion`. Same as case 2.
 *      → Backfill effect sets the legacy sentinel → modal fires.
 *
 *   4. Existing user who already accepted CURRENT_TERMS_VERSION — version
 *      string equals current. Staleness check returns false.
 *      → No modal.
 *
 *   5. Existing user who accepted a PRIOR terms version (post-versioning) —
 *      version string is older than current. Staleness check returns true.
 *      → Modal fires.
 *
 * After the user accepts, the modal closes and they return to whichever
 * screen was underneath. No navigation reset.
 */
export function TermsReconsentGate(): React.ReactElement | null {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const acceptedVersion = useTermsStore((s) => s.acceptedVersion);

  // Legacy backfill — cases 2 and 3 above. Runs after render, so atomic
  // updates in `completeOnboarding` / `convertGuestToUser` (case 1) have
  // already flipped `acceptedVersion` to CURRENT before this conditional
  // evaluates, and the brand-new-signup path silently skips it.
  useEffect(() => {
    if (isAuthenticated && hasCompletedOnboarding && acceptedVersion === null) {
      useTermsStore.getState().accept(LEGACY_TERMS_SENTINEL);
    }
  }, [isAuthenticated, hasCompletedOnboarding, acceptedVersion]);

  const stale =
    acceptedVersion !== null && acceptedVersion < CURRENT_TERMS_VERSION;

  const shouldGate = isAuthenticated && hasCompletedOnboarding && stale;

  const [dismissed, setDismissed] = useState(false);

  const handleAccepted = useCallback(() => {
    setDismissed(true);
  }, []);

  if (!shouldGate || dismissed) return null;

  return <TermsUpdateModal visible onAccepted={handleAccepted} />;
}
