import { useRef, useCallback, useEffect } from 'react';

/**
 * Returns a `safeTimeout` function that works like setTimeout
 * but auto-clears all pending timers when the component unmounts.
 */
export function useTimeoutCleanup() {
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    };
  }, []);

  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
    return id;
  }, []);

  return safeTimeout;
}
