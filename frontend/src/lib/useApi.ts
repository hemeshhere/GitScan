import { useState, useEffect } from "react";

// Generic data-fetching hook
export function useApi<T>(
  fetcher: () => Promise<T | null>,
  deps: unknown[] = []
): { data: T | null; loading: boolean; error: boolean; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetcher().then(result => {
      if (cancelled) return;
      setData(result);
      setLoading(false);
      if (result === null) setError(true);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const refetch = () => setTick(t => t + 1);

  return { data, loading, error, refetch };
}
