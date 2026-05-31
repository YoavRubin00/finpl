import React, { useCallback, useState } from 'react';

import { useAuthStore } from '../auth/useAuthStore';
import { CURRENT_TERMS_VERSION } from '../../lib/legal/termsVersion';
import { useTermsStore } from './useTermsStore';
import { TermsUpdateModal } from './TermsUpdateModal';

/**
 * Mount-anywhere gate that blocks the app for existing users whose accepted
 * terms version is older than CURRENT_TERMS_VERSION. New users (who haven't
 * completed onboarding yet) see nothing — they accept the latest version
 * naturally at signup.
 *
 * After the user accepts, the modal closes and they return to whichever screen
 * was underneath. No navigation reset.
 */
export function TermsReconsentGate(): React.ReactElement | null {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const acceptedVersion = useTermsStore((s) => s.acceptedVersion);

  const stale =
    acceptedVersion === null || acceptedVersion < CURRENT_TERMS_VERSION;

  const shouldGate = isAuthenticated && hasCompletedOnboarding && stale;

  const [dismissed, setDismissed] = useState(false);

  const handleAccepted = useCallback(() => {
    setDismissed(true);
  }, []);

  if (!shouldGate || dismissed) return null;

  return <TermsUpdateModal visible onAccepted={handleAccepted} />;
}
