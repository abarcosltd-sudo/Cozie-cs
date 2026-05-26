import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";

/**
 * App-wide query client.
 *
 *  - Defaults to 30s staleTime so HMR / nav doesn't refetch obsessively.
 *  - Retries network errors twice, but not 4xx (those won't get better on retry).
 *  - 401 is handled centrally by api.ts's onUnauthorized hook; we don't retry it.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          if (error.status >= 400 && error.status < 500) return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
