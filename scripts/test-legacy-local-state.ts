// scripts/test-legacy-local-state.ts
// Run: npx tsx scripts/test-legacy-local-state.ts
import { readLegacyLocalState } from '../src/lib/auth/legacyLocalState';

let failed = 0;
function check(cond: boolean, label: string): void {
  if (cond) console.log(`PASS: ${label}`);
  else { console.error(`FAIL: ${label}`); failed++; }
}

class MockStorage {
  store = new Map<string, string>();
  async getItem(key: string) { return this.store.get(key) ?? null; }
  set(key: string, value: string) { this.store.set(key, value); }
}

(async () => {
  {
    const s = new MockStorage();
    const result = await readLegacyLocalState(s);
    check(Object.keys(result).length === 0, 'empty storage yields empty result');
  }

  {
    const s = new MockStorage();
    s.set('economy-store', JSON.stringify({
      state: { xp: 1500, coins: 800, gems: 25, virtualBalance: 120000 },
      version: 0,
    }));
    const result = await readLegacyLocalState(s);
    check(result.profile?.xp === 1500, 'economy: xp read');
    check(result.profile?.coins === 800, 'economy: coins read');
    check(result.profile?.gems === 25, 'economy: gems read');
    check(result.profile?.virtualBalance === 120000, 'economy: virtualBalance read');
  }

  {
    const s = new MockStorage();
    s.set('subscription-storage', JSON.stringify({
      state: { tier: 'pro', status: 'active' },
    }));
    const result = await readLegacyLocalState(s);
    check(result.profile?.isPro === true, 'subscription: tier=pro maps to isPro=true');
  }

  {
    const s = new MockStorage();
    s.set('subscription-storage', JSON.stringify({ state: { tier: 'basic', status: 'inactive' } }));
    const result = await readLegacyLocalState(s);
    check(result.profile?.isPro === false, 'subscription: tier=basic maps to isPro=false');
  }

  {
    const s = new MockStorage();
    s.set('auth-store-v2', JSON.stringify({
      state: {
        email: 'a@b.com',
        profile: {
          companionId: 'warren-buffett',
          financialGoal: 'fire',
          knowledgeLevel: 'intermediate',
          avatarId: 'a1',
        },
      },
    }));
    const result = await readLegacyLocalState(s);
    check((result.profile?.preferences as { companionId: string })?.companionId === 'warren-buffett', 'auth: preferences extracted');
  }

  {
    const s = new MockStorage();
    s.set('chapter-store', JSON.stringify({
      state: {
        progress: {
          'ch-1': { completedModules: ['m1', 'm2'], moduleQuizScores: { m1: 80, m2: 95 } },
        },
      },
      version: 2,
    }));
    const result = await readLegacyLocalState(s);
    check(Array.isArray(result.modules), 'chapter: modules array produced');
    check((result.modules ?? []).some((m) => m.moduleId === 'm1' && m.status === 'completed'), 'chapter: m1 completed');
    check((result.modules ?? []).some((m) => m.moduleId === 'm2' && m.bestScore === 95), 'chapter: m2 bestScore=95');
  }

  {
    const s = new MockStorage();
    s.set('economy-store', JSON.stringify({ state: { currentStreak: 5, longestStreak: 12 } }));
    const result = await readLegacyLocalState(s);
    check(result.profile?.currentStreak === 5, 'economy: currentStreak read');
    check(result.profile?.longestStreak === 12, 'economy: longestStreak read');
  }

  {
    const s = new MockStorage();
    s.set('economy-store', '{not valid json');
    const result = await readLegacyLocalState(s);
    check(result.profile === undefined, 'corrupted economy store skipped without throwing');
  }

  if (failed > 0) { console.error(`${failed} tests failed.`); process.exit(1); }
  console.log('All legacy-local-state tests passed.');
})();
