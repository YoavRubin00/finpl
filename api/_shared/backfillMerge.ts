// api/_shared/backfillMerge.ts
export interface ServerProfile {
  xp: number; coins: number; gems: number;
  currentStreak: number; longestStreak: number;
  virtualBalance: string;
  isPro: boolean;
  preferences: Record<string, unknown> | null;
}
export interface LocalProfile {
  xp?: number; coins?: number; gems?: number;
  currentStreak?: number; longestStreak?: number;
  virtualBalance?: number;
  isPro?: boolean;
  preferences?: Record<string, unknown> | null;
}
export interface ServerModuleProgress {
  moduleId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  bestScore: number;
  xpEarned: number;
}
export interface LocalModuleProgress {
  moduleId: string;
  status?: 'not_started' | 'in_progress' | 'completed';
  bestScore?: number;
  xpEarned?: number;
  moduleName?: string;
}

function maxNum(a: number | undefined, b: number | undefined): number {
  const av = typeof a === 'number' ? a : 0;
  const bv = typeof b === 'number' ? b : 0;
  return Math.max(av, bv);
}

export function mergeProfile(server: ServerProfile, local: LocalProfile): ServerProfile {
  const out: ServerProfile = { ...server };

  out.xp = maxNum(server.xp, local.xp);
  out.coins = maxNum(server.coins, local.coins);
  out.gems = maxNum(server.gems, local.gems);
  out.currentStreak = maxNum(server.currentStreak, local.currentStreak);
  out.longestStreak = maxNum(server.longestStreak, local.longestStreak);

  const serverVb = parseFloat(server.virtualBalance);
  const localVb = typeof local.virtualBalance === 'number' ? local.virtualBalance : -Infinity;
  out.virtualBalance = (Math.max(serverVb, localVb)).toString();

  out.isPro = server.isPro || local.isPro === true;

  if (server.preferences === null && local.preferences !== undefined && local.preferences !== null) {
    out.preferences = local.preferences;
  }

  return out;
}

const STATUS_RANK: Record<ServerModuleProgress['status'], number> = {
  not_started: 0,
  in_progress: 1,
  completed: 2,
};

export function mergeModule(
  server: ServerModuleProgress | undefined,
  local: LocalModuleProgress,
): ServerModuleProgress {
  const localStatus = local.status ?? 'not_started';
  if (!server) {
    return {
      moduleId: local.moduleId,
      status: localStatus,
      bestScore: local.bestScore ?? 0,
      xpEarned: local.xpEarned ?? 0,
    };
  }
  const status = STATUS_RANK[localStatus] > STATUS_RANK[server.status] ? localStatus : server.status;
  return {
    moduleId: server.moduleId,
    status,
    bestScore: maxNum(server.bestScore, local.bestScore),
    xpEarned: maxNum(server.xpEarned, local.xpEarned),
  };
}
