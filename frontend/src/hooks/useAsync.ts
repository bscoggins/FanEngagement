import { useState, useEffect, useCallback } from 'react';
import { parseApiError } from '../utils/errorUtils';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UseAsyncResult<T> extends AsyncState<T> {
  execute: () => Promise<void>;
  reset: () => void;
}

/**
 * Hook for managing async operations with loading, error, and data states
 * 
 * @param asyncFunction - The async function to execute (should be memoized with useCallback to avoid re-execution)
 * @param immediate - Whether to execute immediately on mount (default: true)
 * @returns AsyncState with execute and reset functions
 * 
 * @example
 * // Wrap in useCallback to prevent re-execution
 * const fetchData = useCallback(() => usersApi.getAll(), []);
 * const { data, loading, error, execute } = useAsync(fetchData);
 * 
 * // Or use immediate: false and call execute manually
 * const { data, loading, error, execute } = useAsync(() => usersApi.getAll(), false);
 */
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = true
): UseAsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    
    try {
      const result = await asyncFunction();
      setState({ data: result, loading: false, error: null });
    } catch (err) {
      const errorMessage = parseApiError(err);
      setState({ data: null, loading: false, error: errorMessage });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // asyncFunction not in deps - caller must ensure stability

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate]); // execute not in deps to prevent re-execution on inline functions

  return { ...state, execute, reset };
}
