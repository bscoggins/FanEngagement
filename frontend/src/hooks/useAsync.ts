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
 * @param asyncFunction - The async function to execute
 * @param immediate - Whether to execute immediately on mount (default: true)
 * @returns AsyncState with execute and reset functions
 * 
 * @example
 * const { data, loading, error, execute } = useAsync(() => usersApi.getAll());
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
  }, [asyncFunction]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return { ...state, execute, reset };
}
