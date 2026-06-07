import { useState, useRef, useEffect } from "react";

interface UseLazyVideoOptions {
  autoPlay?: boolean;
  threshold?: number;
}

export function useLazyVideo(options: UseLazyVideoOptions = {}) {
  const { autoPlay = true, threshold = 0.1 } = options;
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onPlaying = () => setIsPlaying(true);
    el.addEventListener("playing", onPlaying);

    const onEnter = () => {
      setVisible(true);
      if (autoPlay) {
        el.play().catch(() => {});
      }
    };

    if (!("IntersectionObserver" in window)) {
      onEnter();
      return () => el.removeEventListener("playing", onPlaying);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onEnter();
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      el.removeEventListener("playing", onPlaying);
    };
  }, [autoPlay, threshold]);

  return { ref, visible, isPlaying };
}
