// scripts/test-backfill-merge.ts
// Run: npx tsx scripts/test-backfill-merge.ts
import { mergeProfile, mergeModule } from '../api/_shared/backfillMerge';
import type { ServerProfile, LocalProfile, ServerModuleProgress, LocalModuleProgress } from '../api/_shared/backfillMerge';

let failed = 0;
function check(cond: boolean, label: string): void {
  if (cond) console.log(`PASS: ${label}`);
  else { console.error(`FAIL: ${label}`); failed++; }
}

const baseServer: ServerProfile = {
  xp: 1000, coins: 500, gems: 10,
  currentStreak: 3, longestStreak: 7,
  virtualBalance: '100000', isPro: false,
  preferences: null,
};

{
  const local: LocalProfile = { xp: 500, coins: 600 };
  const merged = mergeProfile(baseServer, local);
  check(merged.xp === 1000, 'xp never decreases below server');
  check(merged.coins === 600, 'coins takes MAX of local/server');
  check(merged.gems === 10, 'gems unchanged when no local value');
}

{
  const local: LocalProfile = { virtualBalance: 150000 };
  const merged = mergeProfile(baseServer, local);
  check(merged.virtualBalance === '150000', 'virtualBalance takes MAX (as string)');
}

{
  const local: LocalProfile = { virtualBalance: 50000 };
  const merged = mergeProfile(baseServer, local);
  check(merged.virtualBalance === '100000', 'virtualBalance: server kept if higher');
}

{
  const local: LocalProfile = { isPro: true };
  const merged = mergeProfile(baseServer, local);
  check(merged.isPro === true, 'isPro: local true upgrades server');
}
{
  const serverPro: ServerProfile = { ...baseServer, isPro: true };
  const local: LocalProfile = { isPro: false };
  const merged = mergeProfile(serverPro, local);
  check(merged.isPro === true, 'isPro: server true never downgraded by local false');
}

{
  const local: LocalProfile = { preferences: { companionId: 'warren-buffett' } };
  const merged = mergeProfile(baseServer, local);
  check(JSON.stringify(merged.preferences) === '{"companionId":"warren-buffett"}', 'preferences set when server null');
}
{
  const serverWithPrefs: ServerProfile = { ...baseServer, preferences: { companionId: 'graham' } };
  const local: LocalProfile = { preferences: { companionId: 'buffett' } };
  const merged = mergeProfile(serverWithPrefs, local);
  check((merged.preferences as { companionId: string }).companionId === 'graham', 'preferences: server kept when present');
}

{
  const local: LocalModuleProgress = { moduleId: 'm1', status: 'completed', bestScore: 80, xpEarned: 50 };
  const merged = mergeModule(undefined, local);
  check(merged.status === 'completed', 'module: local-only completed → completed');
  check(merged.bestScore === 80, 'module: local-only bestScore preserved');
}
{
  const server: ServerModuleProgress = { moduleId: 'm1', status: 'completed', bestScore: 95, xpEarned: 60 };
  const local: LocalModuleProgress = { moduleId: 'm1', status: 'in_progress', bestScore: 70, xpEarned: 30 };
  const merged = mergeModule(server, local);
  check(merged.status === 'completed', 'module: server completed never regresses');
  check(merged.bestScore === 95, 'module: bestScore MAX (server higher)');
  check(merged.xpEarned === 60, 'module: xpEarned MAX (server higher)');
}
{
  const server: ServerModuleProgress = { moduleId: 'm1', status: 'in_progress', bestScore: 50, xpEarned: 10 };
  const local: LocalModuleProgress = { moduleId: 'm1', status: 'completed', bestScore: 80, xpEarned: 50 };
  const merged = mergeModule(server, local);
  check(merged.status === 'completed', 'module: local completed promotes from server in_progress');
  check(merged.bestScore === 80, 'module: bestScore MAX (local higher)');
  check(merged.xpEarned === 50, 'module: xpEarned MAX (local higher)');
}

if (failed > 0) {
  console.error(`${failed} tests failed.`);
  process.exit(1);
}
console.log('All backfill-merge tests passed.');
