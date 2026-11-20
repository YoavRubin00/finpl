// scripts/test-local-only-stores.ts
// Run: npx tsx scripts/test-local-only-stores.ts
//
// src/lib/stores/localOnlyStores.ts: (1) the list matches the code, i.e. every
// persisted zustand store that is NOT in the sign-out registry is on it, so an
// account deletion empties it in memory; (2) the reset waits for a store that
// is still loading from storage, then leaves it at its initial state, in
// memory and in storage, with its actions working. Uses the real zustand
// persist middleware with an in-memory async storage. No React Native.
import fs from 'node:fs';
import path from 'node:path';
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { LOCAL_ONLY_STORES, resetLoadedStore, type LocalOnlyStore } from '../src/lib/stores/localOnlyStores';

let failed = 0;
let passed = 0;
function check(cond: boolean, label: string, detail?: unknown): void {
  if (cond) {
    passed++;
    console.log(`PASS: ${label}`);
  } else {
    failed++;
    console.error(`FAIL: ${label}${detail !== undefined ? `  → ${JSON.stringify(detail)}` : ''}`);
  }
}

const ROOT = path.resolve(__dirname, '..');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

async function main(): Promise<void> {
  // ═══ (1) The list matches the code ═══
  const PERSIST_IMPORT = /import\s*(?:type\s*)?\{[^}]*\bpersist\b[^}]*\}\s*from\s*['"]zustand\/middleware['"]/;
  const unregistered = new Set<string>();
  for (const file of [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'app'))]) {
    const text = fs.readFileSync(file, 'utf8');
    if (!PERSIST_IMPORT.test(text) || !/\bpersist\s*\(/.test(text)) continue;
    if (/\bregisterLocalStore\s*\(/.test(text)) continue;
    unregistered.add(path.relative(path.join(ROOT, 'src'), file).replace(/\\/g, '/').replace(/\.(ts|tsx)$/, ''));
  }
  const listed = new Set(LOCAL_ONLY_STORES.map((s) => s.file));
  const missing = [...unregistered].filter((f) => !listed.has(f)).sort();
  const extra = [...listed].filter((f) => !unregistered.has(f)).sort();
  check(missing.length === 0, 'every persisted store outside the sign-out registry is on the list', missing);
  check(extra.length === 0, 'every listed store exists, persists and is outside the registry', extra);
  check(LOCAL_ONLY_STORES.length === 16 && listed.size === 16, 'the list has the 16 stores the review found', LOCAL_ONLY_STORES.length);
  for (const { file } of LOCAL_ONLY_STORES) {
    const src = ['.ts', '.tsx'].map((ext) => path.join(ROOT, 'src', file + ext)).find((p) => fs.existsSync(p));
    const loader = LOCAL_ONLY_STORES.find((s) => s.file === file)!.load.toString();
    if (!src) { check(false, `${file}: file exists`); continue; }
    const exportName = /m\.(use[A-Za-z]+)/.exec(loader)?.[1] ?? '';
    check(new RegExp(`export const ${exportName}\\b`).test(fs.readFileSync(src, 'utf8')) && loader.includes(file),
      `${file}: the loader imports this file and its exported store (${exportName})`);
  }

  // ═══ (2) The reset, with the real persist middleware ═══
  const disk = new Map<string, string>();
  let readDelayMs = 0;
  const storage: StateStorage = {
    getItem: async (name) => { await sleep(readDelayMs); return disk.get(name) ?? null; },
    setItem: async (name, value) => { disk.set(name, value); },
    removeItem: async (name) => { disk.delete(name); },
  };
  interface NetWorth { total: number; items: string[]; add: (item: string) => void }
  const makeStore = (name: string, skipHydration = false) =>
    create<NetWorth>()(
      persist(
        (set) => ({ total: 0, items: [], add: (item) => set((s) => ({ items: [...s.items, item], total: s.total + 1 })) }),
        { name, storage: createJSONStorage(() => storage), skipHydration },
      ),
    );
  const saved = (total: number, items: string[]) => JSON.stringify({ state: { total, items }, version: 0 });

  {
    // Loading from disk takes a while: the reset must wait for it, or the late
    // load would bring the deleted user's data back after the reset.
    disk.set('nw-slow', saved(912_000, ['apartment', 'pension']));
    readDelayMs = 40;
    const store = makeStore('nw-slow');
    check(!store.persist.hasHydrated(), 'setup: the store is still loading from disk');
    await resetLoadedStore(store, 1000);
    await sleep(80); // anything late would land here
    const s = store.getState();
    check(s.total === 0 && s.items.length === 0, 'a store still loading: waited for the load, then reset to the initial state', { total: s.total, items: s.items });
    const onDisk = JSON.parse(disk.get('nw-slow') ?? 'null');
    check(onDisk?.state?.total === 0 && onDisk.state.items.length === 0, 'and the old data is not on disk any more (the initial state was written over it)', onDisk);
    s.add('new');
    check(store.getState().items.join() === 'new', 'its actions still work after the reset');
  }
  {
    disk.set('nw-loaded', saved(5, ['x']));
    readDelayMs = 0;
    const store = makeStore('nw-loaded');
    await sleep(10);
    check(store.persist.hasHydrated() && store.getState().total === 5, 'setup: a loaded store holding data');
    await resetLoadedStore(store, 1000);
    check(store.getState().total === 0 && store.getState().items.length === 0, 'a loaded store: reset to the initial state');
  }
  {
    disk.set('nw-never', saved(7, ['y']));
    const store = makeStore('nw-never', true); // never loads on its own
    const started = Date.now();
    await resetLoadedStore(store, 60);
    const ms = Date.now() - started;
    check(store.getState().total === 0 && ms >= 50 && ms < 1000, 'a store that never finishes loading: reset after the cap, no hang', { ms });
  }
  {
    const broken = {
      persist: { hasHydrated: () => true, onFinishHydration: () => () => {} },
      getInitialState: () => ({}),
      setState: () => { throw new Error('boom'); },
    } as unknown as LocalOnlyStore;
    let threw = false;
    try { await resetLoadedStore(broken, 50); } catch { threw = true; }
    check(!threw, 'a store that throws on reset never breaks the wipe');
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
