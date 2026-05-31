import React, { useCallback, useState } from 'react';

import { useAuthStore } from '../auth/useAuthStore';
import { CURRENT_TERMS_VERSION } from '../../lib/legal/termsVersion';
import { useTermsStore } from './useTermsStore';
import { TermsUpdateModal } from './TermsUpdateModal';

/**
 * Mount-anywhere gate that blocks the app ONLY for *existing* users whose
 * previously-accepted terms version is older than CURRENT_TERMS_VERSION.
 *
 * Users with `acceptedVersion === null` are brand-new installs — they accept
 * the latest version naturally inside onboarding, so the gate must NOT fire
 * for them (otherwise they get the "we updated the terms" modal on a fresh
 * download, which is confusing and incorrect).
 *
 * Stale ⇔ "I accepted some PREVIOUS version, and it's older than the current
 * one." `null` = no previous version = not stale.
 *
 * After the user accepts, the modal closes and they return to whichever screen
 * was underneath. No navigation reset.
 */
export function TermsReconsentGate(): React.ReactElement | null {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const acceptedVersion = useTermsStore((s) => s.acceptedVersion);

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
