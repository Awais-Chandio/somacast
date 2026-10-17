import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { copy, type Copy, type Mode } from '@somacast/core';

// Space / Earth wording for the whole app (REQ-019). Only words change; no logic reads the mode.
// Kept above the sign-in gate, so the choice survives sign-out. Not saved: the app opens in Space.
export type CopyState = { mode: Mode; words: Copy; setMode: (m: Mode) => void };

// Without a provider (most tests) everything reads in Space wording.
const CopyContext = createContext<CopyState>({
  mode: 'space',
  words: copy.space,
  setMode: () => {},
});

export function CopyProvider({
  initial = 'space',
  children,
}: {
  initial?: Mode;
  children: ReactNode;
}) {
  const [mode, setMode] = useState<Mode>(initial);
  const value = useMemo(() => ({ mode, words: copy[mode], setMode }), [mode]);
  return <CopyContext.Provider value={value}>{children}</CopyContext.Provider>;
}

export const useCopy = (): CopyState => useContext(CopyContext);
