// src/lib/auth/secureStore.ts
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'finplay_auth_token';
const BACKFILL_FLAG_KEY = 'finplay_backfill_v1_done';

interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
const webStorage = (): WebStorageLike | undefined =>
  (globalThis as Record<string, unknown>)['localStorage'] as WebStorageLike | undefined;

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { webStorage()?.setItem(key, value); } catch { /* ignore */ }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}
async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return (webStorage()?.getItem(key) as string | null) ?? null; } catch { return null; }
  }
  return SecureStore.getItemAsync(key);
}
async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { webStorage()?.removeItem(key); } catch { /* ignore */ }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const tokenStore = {
  get: () => getItem(TOKEN_KEY),
  set: (value: string) => setItem(TOKEN_KEY, value),
  clear: () => deleteItem(TOKEN_KEY),
};

export const backfillFlag = {
  isDone: async () => (await getItem(BACKFILL_FLAG_KEY)) === '1',
  markDone: () => setItem(BACKFILL_FLAG_KEY, '1'),
  reset: () => deleteItem(BACKFILL_FLAG_KEY),
};
