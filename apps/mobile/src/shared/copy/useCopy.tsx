import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { copy, type Copy, type Mode } from '@somacast/core';
import { asyncModeStorage, type ModeStorage } from './modeStorage';

// Space / Earth wording for the whole app (REQ-019). Only words change; no logic reads the mode.
// Kept above the sign-in gate, so the choice survives sign-out. Saved on the phone: the app opens
// in the last chosen mode (Space the first time, or if storage fails).
export type CopyState = { mode: Mode; words: Copy; setMode: (m: Mode) => void };

// Without a provider (most tests) everything reads in Space wording.
const CopyContext = createContext<CopyState>({
  mode: 'space',
  words: copy.space,
  setMode: () => {},
});

export function CopyProvider({
  initial = 'space',
  storage = asyncModeStorage,
  children,
}: {
  initial?: Mode;
  storage?: ModeStorage;
  children: ReactNode;
}) {
  const [mode, setModeState] = useState<Mode>(initial);
  const chosen = useRef(false); // a tap before the saved mode loads wins

  useEffect(() => {
    let alive = true;
    storage.load().then(saved => {
      if (alive && saved && !chosen.current) setModeState(saved);
    });
    return () => {
      alive = false;
    };
  }, [storage]);

  const setMode = useCallback(
    (m: Mode) => {
      chosen.current = true;
      setModeState(m);
      storage.save(m);
    },
    [storage],
  );

  const value = useMemo(
    () => ({ mode, words: copy[mode], setMode }),
    [mode, setMode],
  );
  return <CopyContext.Provider value={value}>{children}</CopyContext.Provider>;
}

export const useCopy = (): CopyState => useContext(CopyContext);
