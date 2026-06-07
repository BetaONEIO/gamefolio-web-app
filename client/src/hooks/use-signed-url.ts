import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiRequest } from '@/lib/queryClient';

const signedUrlCache = new Map<string, { url: string; expires: number }>();
const CACHE_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiry
const URL_EXPIRY = 60 * 60 * 1000; // 1 hour

function isSupabaseStorageUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('gamefolio-media') || url.includes('gamefolio-assets') || url.includes('gamefolio-name-tags');
}

function getCachedSignedUrl(originalUrl: string): string | null {
  const cached = signedUrlCache.get(originalUrl);
  if (cached && cached.expires > Date.now() + CACHE_BUFFER) {
    return cached.url;
  }
  signedUrlCache.delete(originalUrl);
  return null;
}

function setCachedSignedUrl(originalUrl: string, signedUrl: string): void {
  signedUrlCache.set(originalUrl, {
    url: signedUrl,
    expires: Date.now() + URL_EXPIRY
  });
}

export function clearSignedUrlCache(originalUrl?: string): void {
  if (originalUrl) {
    signedUrlCache.delete(originalUrl);
  } else {
    signedUrlCache.clear();
  }
}

// ---- Request coalescing ----
// Multiple components requesting different URLs around the same time get
// merged into a single batch POST to /api/media/signed-urls. This dramatically
// cuts request count when a feed mounts many video/avatar components at once.

const BATCH_WINDOW_MS = 15;
const MAX_BATCH_SIZE = 50;

const inflight = new Map<string, Promise<string>>();
let pendingResolvers = new Map<string, (url: string) => void>();
let pendingQueue: string[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flushBatch() {
  flushTimer = null;
  if (pendingQueue.length === 0) return;

  const urls = pendingQueue;
  const resolvers = pendingResolvers;
  pendingQueue = [];
  pendingResolvers = new Map();

  // Server caps batch at 50; chunk if necessary.
  const chunks: string[][] = [];
  for (let i = 0; i < urls.length; i += MAX_BATCH_SIZE) {
    chunks.push(urls.slice(i, i + MAX_BATCH_SIZE));
  }

  // Resolve a caller without poisoning the cache. The original URL is returned
  // so the UI still has *something*, but we DO NOT cache it — otherwise a
  // transient backend blip would lock private media to a broken URL for an
  // hour and prevent retry.
  const resolveOnly = (url: string, value: string) => {
    resolvers.get(url)?.(value);
    inflight.delete(url);
  };

  // Resolve and cache (only used when the server returned a real signed URL).
  const resolveAndCache = (url: string, signed: string) => {
    setCachedSignedUrl(url, signed);
    resolvers.get(url)?.(signed);
    inflight.delete(url);
  };

  for (const chunk of chunks) {
    fetch('/api/media/signed-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: chunk }),
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to get signed URLs');
        const data = await res.json();
        const map: Record<string, string> = data.signedUrls || {};
        for (const url of chunk) {
          const signed = map[url];
          if (signed && signed !== url) {
            resolveAndCache(url, signed);
          } else {
            // Server didn't return a signed URL — let consumers render the
            // original but allow a fresh fetch attempt next time.
            resolveOnly(url, url);
          }
        }
      })
      .catch(() => {
        // Network/server failure — fall back without caching, so the next
        // mount can retry instead of being stuck for an hour.
        for (const url of chunk) resolveOnly(url, url);
      });
  }
}

function batchedFetchSignedUrl(url: string): Promise<string> {
  const existing = inflight.get(url);
  if (existing) return existing;

  const promise = new Promise<string>((resolve) => {
    pendingResolvers.set(url, resolve);
  });
  inflight.set(url, promise);
  pendingQueue.push(url);

  if (!flushTimer) {
    flushTimer = setTimeout(flushBatch, BATCH_WINDOW_MS);
  }
  return promise;
}

export function useSignedUrl(publicUrl: string | undefined | null) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!publicUrl) {
      setSignedUrl(null);
      return;
    }

    if (!isSupabaseStorageUrl(publicUrl)) {
      setSignedUrl(publicUrl);
      return;
    }

    const cached = getCachedSignedUrl(publicUrl);
    if (cached) {
      setSignedUrl(cached);
      return;
    }

    setSignedUrl(null);
    setIsLoading(true);
    setError(null);

    let cancelled = false;
    batchedFetchSignedUrl(publicUrl)
      .then((url) => {
        if (cancelled) return;
        setSignedUrl(url);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setSignedUrl(publicUrl);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [publicUrl]);

  const finalUrl = useMemo(() => {
    if (!publicUrl) return null;
    if (!isSupabaseStorageUrl(publicUrl)) return publicUrl;
    return signedUrl;
  }, [publicUrl, signedUrl]);

  return { signedUrl: finalUrl, isLoading, error };
}

export function useSignedUrls(publicUrls: (string | undefined | null)[]) {
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const pendingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const validUrls = publicUrls.filter((url): url is string =>
      !!url && isSupabaseStorageUrl(url)
    );

    if (validUrls.length === 0) return;

    const urlsToFetch: string[] = [];
    const newSignedUrls = new Map(signedUrls);

    for (const url of validUrls) {
      const cached = getCachedSignedUrl(url);
      if (cached) {
        newSignedUrls.set(url, cached);
      } else if (!pendingRef.current.has(url)) {
        urlsToFetch.push(url);
        pendingRef.current.add(url);
      }
    }

    if (urlsToFetch.length > 0) {
      setIsLoading(true);

      Promise.all(urlsToFetch.map(batchedFetchSignedUrl))
        .then((signed) => {
          urlsToFetch.forEach((url, i) => {
            newSignedUrls.set(url, signed[i]);
          });
          setSignedUrls(new Map(newSignedUrls));
        })
        .catch(console.error)
        .finally(() => {
          for (const url of urlsToFetch) {
            pendingRef.current.delete(url);
          }
          setIsLoading(false);
        });
    } else if (newSignedUrls.size !== signedUrls.size) {
      setSignedUrls(newSignedUrls);
    }
  }, [publicUrls.join(',')]);

  const getSignedUrl = useCallback((publicUrl: string | undefined | null): string | null => {
    if (!publicUrl) return null;
    if (!isSupabaseStorageUrl(publicUrl)) return publicUrl;
    return signedUrls.get(publicUrl) || getCachedSignedUrl(publicUrl) || null;
  }, [signedUrls]);

  return { signedUrls, getSignedUrl, isLoading };
}

export async function fetchSignedUrl(publicUrl: string): Promise<string> {
  if (!publicUrl || !isSupabaseStorageUrl(publicUrl)) {
    return publicUrl;
  }

  const cached = getCachedSignedUrl(publicUrl);
  if (cached) return cached;

  try {
    return await batchedFetchSignedUrl(publicUrl);
  } catch (error) {
    console.error('Error fetching signed URL:', error);
    return publicUrl;
  }
}

export async function fetchSignedUrls(publicUrls: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const urlsToFetch: string[] = [];

  for (const url of publicUrls) {
    if (!url || !isSupabaseStorageUrl(url)) {
      if (url) results.set(url, url);
      continue;
    }

    const cached = getCachedSignedUrl(url);
    if (cached) {
      results.set(url, cached);
    } else {
      urlsToFetch.push(url);
    }
  }

  if (urlsToFetch.length > 0) {
    try {
      const signed = await Promise.all(urlsToFetch.map(batchedFetchSignedUrl));
      urlsToFetch.forEach((url, i) => results.set(url, signed[i]));
    } catch (error) {
      console.error('Error fetching signed URLs:', error);
    }
  }

  return results;
}
