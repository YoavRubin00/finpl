import { getApiBase } from '../apiBase';

interface UpsertModuleProgressData {
  moduleId: string;
  moduleName?: string;
  status?: string;
  quizScore?: number;
  quizAttempts?: number;
  bestScore?: number;
  xpEarned?: number;
}

/**
 * Upsert a module_progress row via API route.
 * Fire-and-forget — caller should not await in UI-critical paths.
 */
export async function upsertModuleProgress(
  authId: string,
  data: UpsertModuleProgressData,
): Promise<void> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/sync/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authId, ...data }),
  });

  if (!res.ok) {
    throw new Error(`sync/progress POST failed: ${res.status}`);
  }
}

/**
 * Fetch all module progress rows for a user via API by authId.
 * Returns an empty array if user not found or no progress.
 */
export async function fetchModuleProgress(authId: string) {
  const base = getApiBase();
  const res = await fetch(
    `${base}/api/sync/progress?authId=${encodeURIComponent(authId)}`,
  );

  if (!res.ok) {
    throw new Error(`sync/progress GET failed: ${res.status}`);
  }

  const json = (await res.json()) as { ok: boolean; progress: Record<string, unknown>[] };
  return json.progress ?? [];
}
