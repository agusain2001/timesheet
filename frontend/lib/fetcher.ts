/**
 * API Fetcher - Centralized HTTP client with error handling
 */

import { env } from "./env";

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message?: string,
  ) {
    super(message || `API Error: ${status} ${statusText}`);
    this.name = "ApiError";
  }
}

interface FetchOptions extends RequestInit {
  timeout?: number;
  token?: string | null;
  responseType?: "json" | "blob";
}

/**
 * Fetch data from API with automatic error handling and timeout
 */
export async function fetchData<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const {
    timeout = env.apiTimeout,
    token,
    headers = {},
    responseType = "json",
    ...fetchOptions
  } = options;

  // Properly join base URL and endpoint
  const baseUrl = env.apiUrl.endsWith('/') ? env.apiUrl.slice(0, -1) : env.apiUrl;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
    });

    if (!response.ok) {
      throw new ApiError(
        response.status,
        response.statusText,
        `Failed to fetch ${endpoint}`,
      );
    }

    if (responseType === "blob") {
      return response.blob() as unknown as Promise<T>;
    }

    // 204 No Content (or empty body) — nothing to parse
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return undefined as unknown as T;
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new ApiError(0, "Network Error", "Unable to connect to the server");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Async data fetching hook
 * Handles loading, error, and data states automatically
 */
import { useEffect, useState, useRef } from "react";

interface UseAsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

export function useAsync<T>(
  fn: () => Promise<T>,
  deps?: React.DependencyList,
): UseAsyncState<T> {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    error: null,
    loading: true,
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const execute = async () => {
      try {
        const result = await fn();
        if (isMountedRef.current) {
          setState({ data: result, error: null, loading: false });
        }
      } catch (err) {
        if (isMountedRef.current) {
          setState({
            data: null,
            error: err instanceof Error ? err : new Error(String(err)),
            loading: false,
          });
        }
      }
    };

    execute();

    return () => {
      isMountedRef.current = false;
    };
  }, deps);

  return state;
}

/**
 * Refetch function helper for manual retries
 */
export async function retryFetch<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000,
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayMs * Math.pow(2, i)),
        );
      }
    }
  }

  throw lastError || new Error("Max retries exceeded");
}
