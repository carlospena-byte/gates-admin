import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiResult, ApiError } from "@/services";

/**
 * State for async operations
 */
export interface AsyncState<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

/**
 * Hook for managing async operations with automatic cleanup
 */
export function useAsync<T>(
  asyncFunction: (signal: AbortSignal) => Promise<ApiResult<T>>,
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const execute = useCallback(
    async () => {
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setState({
        data: null,
        error: null,
        isLoading: true,
        isError: false,
        isSuccess: false,
      });

      try {
        const result = await asyncFunction(abortController.signal);

        // Only update state if component is still mounted and request wasn't aborted
        if (isMountedRef.current && !abortController.signal.aborted) {
          if (result.success) {
            setState({
              data: result.data,
              error: null,
              isLoading: false,
              isError: false,
              isSuccess: true,
            });
          } else {
            setState({
              data: null,
              error: result.error,
              isLoading: false,
              isError: true,
              isSuccess: false,
            });
          }
        }

        return result;
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === "AbortError") {
          return { success: false, error: { message: "Request aborted" } } as ApiResult<T>;
        }

        if (isMountedRef.current && !abortController.signal.aborted) {
          const apiError = error as ApiError;
          setState({
            data: null,
            error: apiError,
            isLoading: false,
            isError: true,
            isSuccess: false,
          });
        }

        throw error;
      }
    },
    [asyncFunction],
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}
