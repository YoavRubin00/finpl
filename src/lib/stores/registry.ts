// src/lib/stores/registry.ts
interface ResettableStore {
  getState(): { reset: () => void };
}

interface LocalStoreRef {
  storageKey: string | null;
  reset: () => void;
}

const registry = new Map<string, LocalStoreRef>();

export function registerLocalStore(
  name: string,
  store: ResettableStore,
  storageKey: string | null,
): void {
  registry.set(name, {
    storageKey,
    reset: () => store.getState().reset(),
  });
}

export function resetAllLocalStores(): void {
  for (const ref of registry.values()) {
    try { ref.reset(); }
    catch { /* swallow — one store failing should not block sign-out */ }
  }
}

export function getLocalStorageKeys(): string[] {
  return Array.from(registry.values())
    .map((r) => r.storageKey)
    .filter((k): k is string => k !== null);
}
