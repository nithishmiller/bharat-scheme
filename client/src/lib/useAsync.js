import { useCallback, useEffect, useRef, useState } from 'react';

// Runs fn on mount/deps change. Returns {data, error, loading, reload, setData}.
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const seq = useRef(0);
  const run = useCallback(() => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then(
      (data) => id === seq.current && setState({ data, error: null, loading: false }),
      (error) => id === seq.current && setState({ data: null, error, loading: false }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); return () => { seq.current++; }; }, [run]);
  const setData = useCallback((data) => setState((s) => ({ ...s, data })), []);
  return { ...state, reload: run, setData };
}
export const listOf = (r, key = 'schemes') => (Array.isArray(r) ? r : r?.[key] || []);
