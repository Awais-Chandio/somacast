import { isMode, type Mode } from '@somacast/core';

// Remembers the Space / Earth choice in this browser. localStorage can be missing or throw
// (private mode, blocked site data), so every read and write is guarded: a failed read means
// Space, a failed write just is not remembered.

const KEY = 'somacast.mode';

type KeyValue = Pick<Storage, 'getItem' | 'setItem'>;

function browserStorage(): KeyValue | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadMode(storage: KeyValue | null = browserStorage()): Mode {
  try {
    const saved = storage?.getItem(KEY);
    return isMode(saved) ? saved : 'space';
  } catch {
    return 'space';
  }
}

export function saveMode(
  mode: Mode,
  storage: KeyValue | null = browserStorage(),
): void {
  try {
    storage?.setItem(KEY, mode);
  } catch {
    // not remembered; the console still works in the chosen mode
  }
}
