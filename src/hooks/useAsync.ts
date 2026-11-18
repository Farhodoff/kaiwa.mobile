import { useCallback, useEffect, useRef, useState } from 'react';

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/**
 * Tiny data-loading hook: runs `loader` whenever `deps` change (or on reload),
 * exposes loading / error states. State updates happen only in async callbacks,
 * keeping the effect body free of synchronous `setState` calls.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: React.DependencyList): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Keep the latest loader in a ref without touching refs during render.
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let alive = true;
    loaderRef
      .current()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
        setLoaded(true);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'Nomaʼlum xatolik');
        setLoaded(true);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => {
    setLoaded(false);
    setError(null);
    setTick((t) => t + 1);
  }, []);

  return { data, loading: !loaded && !error, error, reload };
}
