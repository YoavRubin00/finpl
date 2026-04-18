/**
 * Spontaneous Dancing Shark — variety injection
 *
 * Returns `true` for a deterministic subset of days (default ~15%) so the
 * regular standing Shark in long-lived surfaces (welcome card, quests sheet
 * intro) is occasionally replaced with the dancing variant. The same user
 * sees the same answer on the same calendar day, so the surprise feels
 * intentional rather than glitchy.
 *
 * Use sparingly — Duolingo's mascot variety guidance: max one "spontaneous"
 * surface per screen, no more than ~1 in 7 sessions per surface.
 *
 * @param probability — chance per day. Default 0.15 (~1 in 7 days).
 * @param seedExtra — extra entropy so two different surfaces don't both flip
 *                     on the same day (avoids "everywhere is dancing today").
 */
export function useSpontaneousDancing(probability = 0.15, seedExtra = ''): boolean {
  // Day-stable seed: same user, same day → same answer.
  const day = Math.floor(Date.now() / 86_400_000);
  const seed = `${day}|${seedExtra}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const r = (hash % 10000) / 10000;
  return r < probability;
}
