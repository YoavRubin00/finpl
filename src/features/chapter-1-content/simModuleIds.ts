/**
 * The set of module ids that have a real simulator in `SimulatorLoader`'s
 * `SIM_LOADERS` map. Kept as a tiny, zero-dependency module (no React, no
 * inline `require()`s) so the pure data resolver (`topicResolver`) can gate
 * the `sim` chip on "a simulator actually exists" WITHOUT importing the heavy
 * SimulatorLoader (which would pull every sim's deps into the resolver and
 * risk a circular import).
 *
 * MUST stay in sync with `SIM_LOADERS` in `./SimulatorLoader.tsx`. A
 * `__DEV__` assertion there warns if the two ever drift.
 */
export const SIM_MODULE_IDS: ReadonlySet<string> = new Set<string>([
  // Chapter 0
  'mod-0-2', 'mod-0-3', 'mod-0-4',
  // Chapter 1
  'mod-1-1', 'mod-1-2', 'mod-1-3', 'mod-1-4', 'mod-1-5',
  'mod-1-6', 'mod-1-7', 'mod-1-8', 'mod-1-9',
  // Chapter 2
  'mod-2-10', 'mod-2-11', 'mod-2-12', 'mod-2-13', 'mod-2-14',
  // Chapter 3
  'mod-3-15', 'mod-3-16', 'mod-3-17', 'mod-3-18',
  // Chapter 4
  'mod-4-19', 'mod-4-20', 'mod-4-21', 'mod-4-22', 'mod-4-23', 'mod-4-24',
  'mod-4-25', 'mod-4-26', 'mod-4-27', 'mod-4-28', 'mod-4-29', 'mod-4-30',
  // Chapter 4 — Graham bonus
  'mod-4-b1', 'mod-4-b2', 'mod-4-b3', 'mod-4-b4',
  // Chapter 5
  'mod-5-25', 'mod-5-26', 'mod-5-27', 'mod-5-28', 'mod-5-29', 'mod-5-30',
]);

/** True iff the module has a real simulator loader (renderable `sim` chip). */
export function hasSim(moduleId: string): boolean {
  return SIM_MODULE_IDS.has(moduleId);
}
