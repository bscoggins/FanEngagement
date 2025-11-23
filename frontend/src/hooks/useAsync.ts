import { useState, useEffect, useCallback } from 'react';

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
      let errorMessage = 'An unexpected error occurred';
      
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: any; status?: number } };
        // Try to extract meaningful error message
        if (axiosError.response?.data) {
          const data = axiosError.response.data;
          // Handle RFC 7807 ProblemDetails format
          if (data.detail) {
            errorMessage = data.detail;
          } else if (data.title) {
            errorMessage = data.title;
          } else if (data.errors) {
            // Handle validation errors
            const firstError = Object.values(data.errors)[0];
            if (Array.isArray(firstError) && firstError.length > 0) {
              errorMessage = firstError[0];
            }
          } else if (data.message) {
            errorMessage = data.message;
          } else if (data.Error) {
            errorMessage = data.Error;
          }
        } else if (axiosError.response?.status === 404) {
          errorMessage = 'Resource not found';
        } else if (axiosError.response?.status === 403) {
          errorMessage = 'Access denied';
        } else if (axiosError.response?.status === 401) {
          errorMessage = 'Unauthorized';
        }
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = (err as { message: string }).message;
      }
      
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
