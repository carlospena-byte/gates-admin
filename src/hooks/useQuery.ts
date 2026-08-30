import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiError, ApiResult } from "@/services";

/**
 * State for queries
 */
export interface QueryState<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  isSuccess: boolean;
}

export interface UseQueryOptions<T> {
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
}

/**
 * Hook for data fetching with automatic cleanup and refetching
 */
export function useQuery<T>(
  queryFn: () => Promise<ApiResult<T>>,
  options: UseQueryOptions<T> = {},
) {
  const { enabled = true, onSuccess, onError } = options;

  const [state, setState] = useState<QueryState<T>>({
    data: null,
    error: null,
    isLoading: enabled,
    isRefetching: false,
    isError: false,
    isSuccess: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Store queryFn in a ref to avoid re-running effect when it changes
  const queryFnRef = useRef(queryFn);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  // Update refs when values change
  useEffect(() => {
    queryFnRef.current = queryFn;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  });

  const fetchData = useCallback(async (isRefetch = false) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setState((prev) => ({
      ...prev,
      isLoading: !isRefetch,
      isRefetching: isRefetch,
      error: null,
    }));

    try {
      const result = await queryFnRef.current();

      // Only update state if component is still mounted and request wasn't aborted
      if (isMountedRef.current && !abortController.signal.aborted) {
        if (result.success) {
          setState({
            data: result.data,
            error: null,
            isLoading: false,
            isRefetching: false,
            isError: false,
            isSuccess: true,
          });
          onSuccessRef.current?.(result.data);
        } else {
          setState({
            data: null,
            error: result.error,
            isLoading: false,
            isRefetching: false,
            isError: true,
            isSuccess: false,
          });
          onErrorRef.current?.(result.error);
        }
      }

      return result;
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      if (isMountedRef.current && !abortController.signal.aborted) {
        const apiError = error as ApiError;
        setState({
          data: null,
          error: apiError,
          isLoading: false,
          isRefetching: false,
          isError: true,
          isSuccess: false,
        });
        onErrorRef.current?.(apiError);
      }
    }
  }, []); // No dependencies - uses refs instead

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Initial fetch - runs when enabled changes
  useEffect(() => {
    if (enabled) {
      fetchData();
      return;
    }

    // When disabled, ensure we don't show a perpetual loading state.
    setState((prev) => ({
      ...prev,
      isLoading: false,
      isRefetching: false,
    }));
  }, [enabled, fetchData]); // Depend on both enabled AND fetchData

  // Cleanup on unmount. Also re-arm on (re)mount: React StrictMode's dev-only
  // mount→unmount→mount cycle runs this cleanup once without a real unmount,
  // which would otherwise leave isMountedRef stuck at false forever and
  // silently drop the state update from the in-flight fetch.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    refetch,
  };
}
