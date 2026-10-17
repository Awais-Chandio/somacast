import { useCallback, useEffect, useState } from 'react';

export type Load<T> =
  | { phase: 'loading' }
  | { phase: 'error'; error: string }
  | { phase: 'ready'; data: T; loadedAt: Date };

// Runs an async load, again on reload(). A newer load always wins over an older one.
export function useLoad<T>(load: () => Promise<T>) {
  const [state, setState] = useState<Load<T>>({ phase: 'loading' });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    load()
      .then(
        data =>
          alive && setState({ phase: 'ready', data, loadedAt: new Date() }),
      )
      .catch(
        e =>
          alive &&
          setState({
            phase: 'error',
            error: e instanceof Error ? e.message : String(e),
          }),
      );
    return () => {
      alive = false;
    };
  }, [load, tick]);
  const reload = useCallback(() => setTick(t => t + 1), []);
  return { state, reload };
}
