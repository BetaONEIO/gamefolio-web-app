import { useEffect, useState } from 'react';

export interface NftMetadata {
  tokenId: number;
  name?: string;
  image?: string | null;
  description?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  [key: string]: unknown;
}

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const BATCH_WINDOW_MS = 20;
const MAX_BATCH_SIZE = 20; // server cap
const MAX_CACHE_ENTRIES = 500; // LRU bound to prevent unbounded growth
const FETCH_TIMEOUT_MS = 15_000; // hung-request watchdog

// Map preserves insertion order — re-inserting on hit gives LRU semantics.
const cache = new Map<number, { value: NftMetadata | null; expires: number }>();
const inflight = new Map<number, Promise<NftMetadata | null>>();
let pendingResolvers = new Map<number, (value: NftMetadata | null) => void>();
let pendingQueue: number[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flushBatch() {
  flushTimer = null;
  if (pendingQueue.length === 0) return;

  const ids = pendingQueue;
  const resolvers = pendingResolvers;
  pendingQueue = [];
  pendingResolvers = new Map();

  // Server caps batch at 20; chunk if necessary.
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += MAX_BATCH_SIZE) {
    chunks.push(ids.slice(i, i + MAX_BATCH_SIZE));
  }

  for (const chunk of chunks) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    fetch('/api/nft/metadata/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenIds: chunk }),
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('batch metadata failed');
        const data = await res.json();
        const items: NftMetadata[] = Array.isArray(data?.nfts) ? data.nfts : [];
        const byId = new Map<number, NftMetadata>();
        for (const item of items) {
          if (typeof item?.tokenId === 'number') byId.set(item.tokenId, item);
        }
        for (const id of chunk) {
          const value = byId.get(id) ?? null;
          if (value) setCached(id, value);
          resolvers.get(id)?.(value);
          inflight.delete(id);
        }
      })
      .catch(() => {
        // Don't poison the cache on transient failure / timeout — resolve
        // null so the next mount can retry, and always clear inflight.
        for (const id of chunk) {
          resolvers.get(id)?.(null);
          inflight.delete(id);
        }
      })
      .finally(() => clearTimeout(timeout));
  }
}

function setCached(tokenId: number, value: NftMetadata) {
  // Re-insert to bump LRU position, then evict oldest over the cap.
  if (cache.has(tokenId)) cache.delete(tokenId);
  cache.set(tokenId, { value, expires: Date.now() + TTL_MS });
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function getCached(tokenId: number): NftMetadata | null | undefined {
  const hit = cache.get(tokenId);
  if (hit && hit.expires > Date.now()) {
    // LRU bump
    cache.delete(tokenId);
    cache.set(tokenId, hit);
    return hit.value;
  }
  if (hit) cache.delete(tokenId);
  return undefined;
}

function fetchBatched(tokenId: number): Promise<NftMetadata | null> {
  const existing = inflight.get(tokenId);
  if (existing) return existing;

  const promise = new Promise<NftMetadata | null>((resolve) => {
    pendingResolvers.set(tokenId, resolve);
  });
  inflight.set(tokenId, promise);
  pendingQueue.push(tokenId);

  if (!flushTimer) {
    flushTimer = setTimeout(flushBatch, BATCH_WINDOW_MS);
  }
  return promise;
}

/**
 * Fetch NFT metadata with automatic request coalescing. Multiple components
 * calling this hook for different token IDs in the same ~20ms window have
 * their requests merged into a single POST /api/nft/metadata/batch.
 */
export function useNftMetadata(tokenId: number | null | undefined) {
  const [data, setData] = useState<NftMetadata | null>(() => {
    if (tokenId == null) return null;
    return getCached(tokenId) ?? null;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (tokenId == null) {
      setData(null);
      return;
    }

    const cached = getCached(tokenId);
    if (cached !== undefined) {
      setData(cached);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    fetchBatched(tokenId)
      .then((value) => {
        if (cancelled) return;
        setData(value);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tokenId]);

  return { data, isLoading };
}
