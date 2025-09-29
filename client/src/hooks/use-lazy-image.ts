import { useState, useEffect, useRef, useCallback } from 'react';

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

  const loadImage = useCallback((imageUrl: string) => {
    setState(prev => ({ ...prev, isLoading: true, hasError: false }));
    
    const img = new Image();
    
    img.onload = () => {
      setState(prev => ({
        ...prev,
        imageSrc: imageUrl,
        isLoading: false,
        hasError: false,
      }));
    };
    
    img.onerror = () => {
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
        imageSrc: placeholder, // Fallback to placeholder on error
      }));
    };
    
    img.src = imageUrl;
  }, [placeholder]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !src) return;

    // If the browser doesn't support IntersectionObserver, load immediately
    if (!window.IntersectionObserver) {
      loadImage(src);
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !state.isInView) {
          setState(prev => ({ ...prev, isInView: true }));
          loadImage(src);
          
          // Stop observing once the image is loaded
          if (observerRef.current) {
            observerRef.current.unobserve(element);
          }
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src, rootMargin, threshold, state.isInView, loadImage]);

  // Cleanup observer on unmount
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