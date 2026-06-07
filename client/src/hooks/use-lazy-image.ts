import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchSignedUrl } from '@/hooks/use-signed-url';

interface UseLazyImageOptions {
  src: string;
  placeholder?: string;
  rootMargin?: string;
  threshold?: number;
}

interface LazyImageState {
  imageSrc: string | undefined;
  isLoading: boolean;
  isInView: boolean;
  hasError: boolean;
}

function isSupabaseStorageUrl(url: string): boolean {
  if (!url) return false;
  // Already-signed URLs contain a token query param — no need to re-sign
  if (url.includes('token=')) return false;
  return url.includes('gamefolio-media') || url.includes('gamefolio-assets') || url.includes('gamefolio-name-tags');
}

export function useLazyImage<T extends HTMLElement = HTMLElement>({
  src,
  placeholder,
  rootMargin = '50px',
  threshold = 0.1
}: UseLazyImageOptions): [React.RefObject<T>, LazyImageState] {
  const [state, setState] = useState<LazyImageState>({
    imageSrc: placeholder,
    isLoading: false,
    isInView: false,
    hasError: false,
  });

  const elementRef = useRef<T>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  // Use a ref to track isInView so the observer isn't torn down/recreated on load
  const isInViewRef = useRef(false);
  // Track the last src we loaded so we can reload when src changes post-load
  const loadedSrcRef = useRef<string | null>(null);

  const loadImage = useCallback(async (imageUrl: string) => {
    if (!imageUrl) return;
    setState(prev => ({ ...prev, isLoading: true, hasError: false }));

    try {
      let finalUrl = imageUrl;

      if (isSupabaseStorageUrl(imageUrl)) {
        finalUrl = await fetchSignedUrl(imageUrl);
      }

      const img = new Image();

      img.onload = () => {
        loadedSrcRef.current = imageUrl;
        setState(prev => ({
          ...prev,
          imageSrc: finalUrl,
          isLoading: false,
          hasError: false,
        }));
      };

      img.onerror = () => {
        setState(prev => ({
          ...prev,
          isLoading: false,
          hasError: true,
          imageSrc: placeholder,
        }));
      };

      img.src = finalUrl;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
        imageSrc: placeholder,
      }));
    }
  }, [placeholder]);

  // Set up the IntersectionObserver once (not dependent on isInView state)
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (!window.IntersectionObserver) {
      if (src) loadImage(src);
      return;
    }

    // Clean up any previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isInViewRef.current) {
          isInViewRef.current = true;
          setState(prev => ({ ...prev, isInView: true }));
          if (src) loadImage(src);
          if (observerRef.current) {
            observerRef.current.unobserve(element);
          }
        }
      },
      { rootMargin, threshold }
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  // Only re-run when src changes, not when isInView/state changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, rootMargin, threshold]);

  // If src changes AFTER the image was already loaded (e.g. signed URL resolves),
  // and the element is already in view, reload with the new src
  useEffect(() => {
    if (!src) return;
    if (isInViewRef.current && loadedSrcRef.current !== src) {
      loadImage(src);
    }
  }, [src, loadImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return [elementRef, state];
}

// Enhanced hook for React components that need more control
export function useLazyImageWithCallbacks<T extends HTMLElement = HTMLElement>({
  src,
  placeholder,
  rootMargin = '50px',
  threshold = 0.1,
  onLoad,
  onError,
  onInView,
}: UseLazyImageOptions & {
  onLoad?: () => void;
  onError?: () => void;
  onInView?: () => void;
}) {
  const [elementRef, state] = useLazyImage<T>({ src, placeholder, rootMargin, threshold });

  useEffect(() => {
    if (state.isInView && onInView) {
      onInView();
    }
  }, [state.isInView, onInView]);

  useEffect(() => {
    if (!state.isLoading && !state.hasError && state.imageSrc === src && onLoad) {
      onLoad();
    }
  }, [state.isLoading, state.hasError, state.imageSrc, src, onLoad]);

  useEffect(() => {
    if (state.hasError && onError) {
      onError();
    }
  }, [state.hasError, onError]);

  return [elementRef, state] as const;
}
