import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiRequest } from '@/lib/queryClient';

const signedUrlCache = new Map<string, { url: string; expires: number }>();
const CACHE_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiry
const URL_EXPIRY = 60 * 60 * 1000; // 1 hour

function isSupabaseStorageUrl(url: string): boolean {
  // Check if it's a Supabase storage URL that needs signing
  // All Supabase storage buckets are private and need signed URLs
  // Note: Old URLs may still have /object/public/ path but bucket is now private
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

export function useSignedUrl(publicUrl: string | undefined | null) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!publicUrl) {
      setSignedUrl(null);
      return;
    }

    // For public Supabase URLs or non-Supabase URLs, use directly without signing
    if (!isSupabaseStorageUrl(publicUrl)) {
      setSignedUrl(publicUrl);
      return;
    }

    // Check cache first for private URLs
    const cached = getCachedSignedUrl(publicUrl);
    if (cached) {
      setSignedUrl(cached);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    apiRequest('POST', '/api/media/signed-url', { url: publicUrl })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to get signed URL');
        const data = await res.json();
        if (!cancelled && data.signedUrl) {
          setCachedSignedUrl(publicUrl, data.signedUrl);
          setSignedUrl(data.signedUrl);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          // Fall back to original URL on error
          setSignedUrl(publicUrl);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [publicUrl]);

  // For non-Supabase URLs, return directly; for Supabase URLs, use signed URL from state
  const finalUrl = useMemo(() => {
    if (!publicUrl) return null;
    // Non-Supabase URLs don't need signing
    if (!isSupabaseStorageUrl(publicUrl)) return publicUrl;
    // Supabase URLs need signed URLs - return from state (will be null until signed)
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
      
      apiRequest('POST', '/api/media/signed-urls', { urls: urlsToFetch })
        .then(async (res) => {
          if (!res.ok) throw new Error('Failed to get signed URLs');
          const data = await res.json();
          
          if (data.signedUrls) {
            for (const [originalUrl, signedUrl] of Object.entries(data.signedUrls)) {
              setCachedSignedUrl(originalUrl, signedUrl as string);
              newSignedUrls.set(originalUrl, signedUrl as string);
            }
            setSignedUrls(new Map(newSignedUrls));
          }
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
    const res = await apiRequest('POST', '/api/media/signed-url', { url: publicUrl });
    if (res.ok) {
      const data = await res.json();
      if (data.signedUrl) {
        setCachedSignedUrl(publicUrl, data.signedUrl);
        return data.signedUrl;
      }
    }
  } catch (error) {
    console.error('Error fetching signed URL:', error);
  }

  return publicUrl;
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
      const res = await apiRequest('POST', '/api/media/signed-urls', { urls: urlsToFetch });
      if (res.ok) {
        const data = await res.json();
        if (data.signedUrls) {
          for (const [originalUrl, signedUrl] of Object.entries(data.signedUrls)) {
            setCachedSignedUrl(originalUrl, signedUrl as string);
            results.set(originalUrl, signedUrl as string);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching signed URLs:', error);
    }
  }

  return results;
}
