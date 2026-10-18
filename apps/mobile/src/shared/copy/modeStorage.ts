import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import { isMode, type Mode } from '@somacast/core';

// Remembers the Space / Earth choice on this phone. Storage failures never reach the screen:
// a failed load means Space, a failed save just is not remembered.
export type ModeStorage = {
  load: () => Promise<Mode | null>;
  save: (mode: Mode) => Promise<void>;
};

const KEY = 'mode';
let prefs: ReturnType<typeof createAsyncStorage> | null = null;

export const asyncModeStorage: ModeStorage = {
  async load() {
    try {
      prefs ??= createAsyncStorage('somacast-prefs');
      const saved = await prefs.getItem(KEY);
      return isMode(saved) ? saved : null;
    } catch {
      return null;
    }
  },
  async save(mode) {
    try {
      prefs ??= createAsyncStorage('somacast-prefs');
      await prefs.setItem(KEY, mode);
    } catch {
      // not remembered; the app still works in the chosen mode
    }
  },
};
