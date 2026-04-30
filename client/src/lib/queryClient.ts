import { QueryClient, QueryFunction } from "@tanstack/react-query";
import {
  clearTokens,
  getAccessToken,
  getAccessTokenSync,
  getRefreshToken,
  setTokens,
} from "./auth-token";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Single-flight refresh: if multiple requests 401 at once, only one network
// refresh runs and the rest await the same promise.
let inflightRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (inflightRefresh) return inflightRefresh;
  const refresh = await getRefreshToken();
  if (!refresh) return null;

  inflightRefresh = (async () => {
    try {
      const res = await fetch("/api/auth/token/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
        credentials: "include",
      });
      if (!res.ok) {
        await clearTokens();
        return null;
      }
      const data = (await res.json()) as {
        accessToken?: string;
        refreshToken?: string;
      };
      if (!data.accessToken || !data.refreshToken) {
        await clearTokens();
        return null;
      }
      await setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      // Don't clear tokens on a transient network error — only on a real auth
      // failure (handled above). The next request will retry.
      return null;
    } finally {
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
}

async function authedFetch(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  const token = (await getAccessToken()) ?? getAccessTokenSync();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  let res = await fetch(url, { ...init, headers, credentials: "include" });

  if (res.status === 401 && (await getRefreshToken())) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders = new Headers(init.headers ?? {});
      retryHeaders.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(url, {
        ...init,
        headers: retryHeaders,
        credentials: "include",
      });
    }
  }

  return res;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  if (url === "POST" || url === "GET" || url === "PUT" || url === "PATCH" || url === "DELETE") {
    throw new Error(`Invalid apiRequest usage: expected (method, url, data), got (${method}, ${url}, ...)`);
  }
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};

  const res = await authedFetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Handle query parameters if they exist in the queryKey
    let url = queryKey[0] as string;
    const params = queryKey[1] as Record<string, any> | undefined;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, value.toString());
      });

      url += (url.includes('?') ? '&' : '?') + searchParams.toString();
    }

    const res = await authedFetch(url, { method: "GET" });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
