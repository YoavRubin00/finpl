// ─────────────────────────────────────────────────────────────────────────────
// READ FIRST (boot review, 20.11): on devices this is AsyncStorage, not MMKV.
// The installed react-native-mmkv is v4, which exports createMMKV() and no
// `MMKV` class, so `new MMKV(...)` below always throws, mmkvUnavailable is set
// and every call falls back to AsyncStorage. readStringSync() therefore always
// returns null, every persisted store hydrates asynchronously, and nothing in
// the app can rely on a synchronous first-frame read.
// Switching to MMKV is a follow-up for a device-tested native release, not an
// OTA: getItem() below moves keys from AsyncStorage into MMKV and deletes them
// from AsyncStorage (a one-way migration of all persisted user state that an
// OTA rollback would strand), and the v4 instance API differs (createMMKV,
// remove() instead of delete()).
// ─────────────────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

type MMKVInstance = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
  clearAll?: () => void;
};

let mmkvInstance: MMKVInstance | null = null;
let mmkvUnavailable = false;

function getMmkv(): MMKVInstance | null {
  if (mmkvUnavailable) return null;
  if (mmkvInstance) return mmkvInstance;
  if (Platform.OS === 'web') {
    mmkvUnavailable = true;
    return null;
  }
  try {
    const { MMKV } = require('react-native-mmkv');
    mmkvInstance = new MMKV({ id: 'finpl-zustand' }) as MMKVInstance;
    return mmkvInstance;
  } catch {
    mmkvUnavailable = true;
    return null;
  }
}

/**
 * Synchronous read for the FIRST render of a cold open (e.g. the economy
 * snapshot that stops the header's flash-of-zero). MMKV-only: returns null on
 * web / when MMKV is unavailable — callers must fall back to the async path.
 */
export function readStringSync(name: string): string | null {
  const m = getMmkv();
  if (!m) return null;
  try {
    return m.getString(name) ?? null;
  } catch {
    return null;
  }
}

export const zustandStorage: StateStorage = {
  getItem: async (name) => {
    const m = getMmkv();
    if (!m) {
      return AsyncStorage.getItem(name);
    }
    const hot = m.getString(name);
    if (hot != null) return hot;
    const legacy = await AsyncStorage.getItem(name);
    if (legacy != null) {
      m.set(name, legacy);
      AsyncStorage.removeItem(name).catch(() => {});
    }
    return legacy;
  },
  setItem: async (name, value) => {
    const m = getMmkv();
    if (!m) {
      await AsyncStorage.setItem(name, value);
      return;
    }
    m.set(name, value);
  },
  removeItem: async (name) => {
    const m = getMmkv();
    if (!m) {
      await AsyncStorage.removeItem(name);
      return;
    }
    m.delete(name);
    AsyncStorage.removeItem(name).catch(() => {});
  },
};

/**
 * Account deletion: drop everything the app persisted on this device, in both
 * stores (MMKV when available, and AsyncStorage, which also holds the stores
 * from before MMKV and the keys written directly, e.g. a pending invite).
 * Throws only if AsyncStorage itself fails.
 */
export async function clearAllPersistedState(): Promise<void> {
  const m = getMmkv();
  if (m && typeof m.clearAll === 'function') {
    try { m.clearAll(); } catch { /* fall through to AsyncStorage */ }
  }
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys);
}
