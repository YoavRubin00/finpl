// src/lib/auth/backfill.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readLegacyLocalState } from './legacyLocalState';
import { postBackfillV1 } from '../api/migrate';
import { queryClient } from '../queryClient';
import { profileQueryKey } from '../../features/auth/useProfile';
import { progressQueryKey } from '../../features/chapter-1-content/useProgress';
import { captureEvent } from '../posthog';

// Complete list of legacy keys; the wipe step uses this AFTER backfill succeeds.
// Audited as of 2026-05-21 — finalize during P0 review by grepping the codebase
// for `persist({ name: …` and reconciling.
export const LEGACY_KEYS_V0: string[] = [
  'auth-store-v2',
  'subscription-storage',
  'economy-store',
  'chapter-store',
  'user-stats-store',
  'arena-store',
  'trading-store',
  'daily-quiz-store',
  'daily-quests-store',
  'referral-store',
  'saved-items-store',
  'fantasy-store',
  'duels-store',
  'squads-store',
  'crowd-question-store',
  'daily-concept-store',
  'daily-log-store',
  'daily-challenges-store',
  'wisdom-store',
  'retention-store',
  'scenario-lab-store',
  'macro-event-store',
  'myth-store',
  'clash-store',
  'adaptive-store',
  'ai-telemetry-store',
  'weekly-insight-store',
  'real-assets-store',
  'monetization-intent-store',
  'notifications-store',
  'bandit-store',
  'tutorial-store',
  'nudge-queue-store',
  'audio-store',
  'news-quiz-store',
  'fun-store',
  'lifestyle-break-store',
  'trading-hub-ui-store',
  'market-mission-store',
  'bridge-store',
  'diamond-hands-cooldown-store',
];

export async function runBackfillV1(): Promise<void> {
  const local = await readLegacyLocalState(AsyncStorage);

  if (!local.profile && !local.modules) {
    return;
  }

  const moduleCount = Array.isArray(local.modules) ? local.modules.length : 0;
  captureEvent('backfill_started', { hasProfile: !!local.profile, moduleCount });

  const startMs = Date.now();
  try {
    const response = await postBackfillV1({
      profile: local.profile,
      modules: local.modules,
    });

    queryClient.setQueryData(profileQueryKey, response.profile);
    queryClient.setQueryData(progressQueryKey, response.progress);

    captureEvent('backfill_succeeded', { durationMs: Date.now() - startMs });

    await AsyncStorage.multiRemove(LEGACY_KEYS_V0).catch(() => { /* swallow */ });
  } catch (err) {
    captureEvent('backfill_failed', { reason: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
