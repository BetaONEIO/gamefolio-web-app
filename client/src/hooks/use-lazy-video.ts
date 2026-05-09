import { useState, useRef, useEffect } from "react";

interface UseLazyVideoOptions {
  autoPlay?: boolean;
  threshold?: number;
}

export function useLazyVideo(options: UseLazyVideoOptions = {}) {
  const { autoPlay = true, threshold = 0.1 } = options;
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onEnter = () => {
      setVisible(true);
      if (autoPlay) {
        el.play().catch(() => {});
      }
    };

    if (!("IntersectionObserver" in window)) {
      onEnter();
      return;
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
    return () => observer.disconnect();
  }, [autoPlay, threshold]);

  return { ref, visible };
}
