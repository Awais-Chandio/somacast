import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Check } from 'lucide-react';
import { copy, modes, type Copy, type Mode } from '@somacast/core';

// Space / Earth wording for the console (REQ-019). Only words change; no data or rule reads the mode.
// Not saved: a fresh page opens in Space.
type CopyState = { mode: Mode; words: Copy; setMode: (m: Mode) => void };

const CopyContext = createContext<CopyState>({
  mode: 'space',
  words: copy.space,
  setMode: () => {},
});

export function CopyProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('space');
  const value = useMemo(() => ({ mode, words: copy[mode], setMode }), [mode]);
  return <CopyContext.Provider value={value}>{children}</CopyContext.Provider>;
}

export const useCopy = (): CopyState => useContext(CopyContext);

// "Space / Earth" toggle in the header. The pressed button shows a tick and a fill, not just a colour.
export function ModeToggle() {
  const { mode, setMode } = useCopy();
  return (
    <div className="mode-toggle" role="group" aria-label="Wording">
      {modes.map(m => (
        <button
          key={m}
          type="button"
          aria-pressed={m === mode}
          onClick={() => setMode(m)}
        >
          {m === mode && <Check size={16} aria-hidden="true" />}
          {copy[m].modeName}
        </button>
      ))}
    </div>
  );
}
