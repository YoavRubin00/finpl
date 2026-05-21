// src/lib/auth/legacyLocalState.ts
export interface LegacyLocalState {
  profile?: {
    xp?: number; coins?: number; gems?: number;
    currentStreak?: number; longestStreak?: number;
    virtualBalance?: number;
    isPro?: boolean;
    preferences?: Record<string, unknown>;
  };
  modules?: Array<{ moduleId: string; status?: 'completed' | 'in_progress'; bestScore?: number; xpEarned?: number; moduleName?: string }>;
}

export interface StorageReader {
  getItem(key: string): Promise<string | null>;
}

function safeParse(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return null; }
}

function getState(raw: string | null): Record<string, unknown> | null {
  const parsed = safeParse(raw);
  if (!parsed) return null;
  if (typeof parsed.state === 'object' && parsed.state !== null) {
    return parsed.state as Record<string, unknown>;
  }
  return parsed;
}

function num(x: unknown): number | undefined {
  return typeof x === 'number' && Number.isFinite(x) ? x : undefined;
}

export async function readLegacyLocalState(storage: StorageReader): Promise<LegacyLocalState> {
  const out: LegacyLocalState = {};

  const economy = getState(await storage.getItem('economy-store'));
  if (economy) {
    out.profile = out.profile ?? {};
    out.profile.xp = num(economy.xp);
    out.profile.coins = num(economy.coins);
    out.profile.gems = num(economy.gems);
    out.profile.currentStreak = num(economy.currentStreak);
    out.profile.longestStreak = num(economy.longestStreak);
    out.profile.virtualBalance = num(economy.virtualBalance);
  }

  const subscription = getState(await storage.getItem('subscription-storage'));
  if (subscription) {
    out.profile = out.profile ?? {};
    out.profile.isPro = subscription.tier === 'pro' && subscription.status === 'active';
  }

  const auth = getState(await storage.getItem('auth-store-v2'));
  if (auth && typeof auth.profile === 'object' && auth.profile !== null) {
    out.profile = out.profile ?? {};
    out.profile.preferences = auth.profile as Record<string, unknown>;
  }

  const chapter = getState(await storage.getItem('chapter-store'));
  if (chapter && typeof chapter.progress === 'object' && chapter.progress !== null) {
    const modules: LegacyLocalState['modules'] = [];
    for (const chapterEntry of Object.values(chapter.progress as Record<string, unknown>)) {
      if (typeof chapterEntry !== 'object' || chapterEntry === null) continue;
      const c = chapterEntry as Record<string, unknown>;
      const completedModules = Array.isArray(c.completedModules) ? c.completedModules : [];
      const scores = (typeof c.moduleQuizScores === 'object' && c.moduleQuizScores !== null)
        ? c.moduleQuizScores as Record<string, number>
        : {};
      const completedSet = new Set(completedModules.filter((m): m is string => typeof m === 'string'));
      const allModuleIds = new Set([...completedSet, ...Object.keys(scores)]);
      for (const moduleId of allModuleIds) {
        modules.push({
          moduleId,
          status: completedSet.has(moduleId) ? 'completed' : 'in_progress',
          bestScore: num(scores[moduleId]),
        });
      }
    }
    if (modules.length > 0) out.modules = modules;
  }

  return out;
}
