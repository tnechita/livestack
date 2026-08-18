import { useState, useEffect, useCallback, useRef } from 'react';

export function useData(fetchFn, deps = [], options = {}) {
  const { autoFetch = true, initialData = null } = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);
  const requestGeneration = useRef(0);

  const refetch = useCallback(async () => {
    const requestId = ++requestGeneration.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (requestId !== requestGeneration.current) return result;
      setData(result);
      return result;
    } catch (err) {
      if (requestId !== requestGeneration.current) return undefined;
      setError(err.message);
    } finally {
      if (requestId === requestGeneration.current) setLoading(false);
    }
  }, deps);

  useEffect(() => {
    requestGeneration.current += 1;
    setData(initialData);
    setError(null);
    setLoading(autoFetch);
    if (autoFetch) refetch();
    return () => {
      requestGeneration.current += 1;
    };
  }, [refetch, autoFetch]);

  return { data, loading, error, refetch, setData };
}

export function usePolling(fetchFn, intervalMs = 30000, deps = []) {
  const result = useData(fetchFn, deps);

  useEffect(() => {
    const timer = setInterval(() => result.refetch(), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, result.refetch]);

  return result;
}
