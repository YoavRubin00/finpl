import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

type MMKVInstance = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
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
