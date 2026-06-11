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

export function ForceUpdateGate(): React.JSX.Element | null {
  const [config, setConfig] = useState<AppConfig | null>(null);

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
  const current = getAppVersion();
  if (compareVersions(current, config.minSupportedVersion) >= 0) return null;

  return <ForceUpdateScreen config={config} currentVersion={current} />;
}
