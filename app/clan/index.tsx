import React, { useEffect, useState } from 'react';
import { useSquadsStore } from '../../src/features/social/useSquadsStore';
import { ClanHubScreen } from '../../src/features/clan/ClanHubScreen';
import { ClanOnboardingScreen } from '../../src/features/clan/ClanOnboardingScreen';

function seedDemoClan(): void {
  const state = useSquadsStore.getState();
  if (!state.squad) {
    state.createSquad('קלאן FinPlay 🛡️');
  }
}

export default function ClanIndex(): React.ReactElement {
  const squad = useSquadsStore((s) => s.squad);
  // On native (MMKV) hydration is synchronous, so hasHydrated() is already true.
  // On web (AsyncStorage) it is false until the async read resolves.
  const [hydrated, setHydrated] = useState(() => useSquadsStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) {
      seedDemoClan();
      return;
    }
    // Web path: wait for rehydration to finish, THEN seed
    const unsub = useSquadsStore.persist.onFinishHydration(() => {
      seedDemoClan();
      setHydrated(true);
    });
    return () => unsub();
  }, [hydrated]);

  // Blank while waiting for hydration (usually < 1 frame on fast storage)
  if (!hydrated && !squad) return <></>;

  return squad ? <ClanHubScreen /> : <ClanOnboardingScreen />;
}
