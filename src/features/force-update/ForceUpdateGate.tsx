// Global gate mounted in app/_layout.tsx that renders <ForceUpdateScreen />
// when, and only when, the user's bundle is below the remote-configured
// minSupportedVersion. The gate itself returns null while the fetch is in
// flight so the rest of the app boots normally — the gate only "decides"
// once the config resolves. If the decision is "block", the modal pops on
// top of everything else.

import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { fetchAppConfig, type AppConfig } from '../../lib/appConfig';
import { getAppVersion, compareVersions } from '../../lib/version';
import { ForceUpdateScreen } from './ForceUpdateScreen';
import { useEconomyUIStore } from '../economy/useEconomyUIStore';

/** New-install grace window (calendar days) during which the wall never
 *  shows. A brand-new user runs whatever version the store GAVE them minutes
 *  ago — often below minSupportedVersion during a staged rollout, when the
 *  store may not even offer the newer build to their device yet (wall →
 *  store → no update → dead loop). Walling them right after onboarding
 *  killed activation in the 2026-07-04..06 campaign (min=1.4.3: new users
 *  on 1.4.1/1.4.2 hit the wall at the exact mod-0-1 moment; their mod-0-1
 *  rate fell to 28-38% vs the 45% baseline). After the grace they're day-3
 *  returners — invested enough to survive the update ask, and the store has
 *  propagated. Veterans (first active long ago) are walled as before. */
const NEW_INSTALL_GRACE_DAYS = 2;

function isWithinNewInstallGrace(activeDates: string[]): boolean {
  if (activeDates.length === 0) return true; // first minutes of a fresh install
  let first = activeDates[0];
  for (const d of activeDates) if (d < first) first = d;
  const firstMs = new Date(`${first}T00:00:00Z`).getTime();
  if (!Number.isFinite(firstMs)) return false;
  return Date.now() - firstMs < NEW_INSTALL_GRACE_DAYS * 24 * 60 * 60 * 1000;
}

export function ForceUpdateGate(): React.JSX.Element | null {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const activeDates = useEconomyUIStore((s) => s.activeDates);

  useEffect(() => {
    // Force-update is a native-app concept (there's no App/Play Store build to
    // install on web). On web `nativeApplicationVersion` is null → getAppVersion
    // returns "0.0.0" → the gate would wrongly block every web session. Skip it.
    if (Platform.OS === 'web') return;
    let cancelled = false;
    fetchAppConfig()
      .then((c) => {
        if (!cancelled) setConfig(c);
      })
      .catch(() => {
        // fetchAppConfig is already fail-open — it returns a DISABLED_DEFAULT
        // on error. This catch is just a safety net against a future refactor.
        if (!cancelled) setConfig(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!config?.enabled) return null;
  // Activation shield: never wall a new install in its first days (see
  // NEW_INSTALL_GRACE_DAYS above). Time-based (not milestone-based) so the
  // wall can't pop mid-session right on top of the first-chest celebration.
  if (isWithinNewInstallGrace(activeDates)) return null;
  const current = getAppVersion();
  if (compareVersions(current, config.minSupportedVersion) >= 0) return null;

  return <ForceUpdateScreen config={config} currentVersion={current} />;
}
