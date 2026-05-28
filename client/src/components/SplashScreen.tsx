import { useEffect, useRef } from "react";

interface StingerTransitionProps {
  onDone: () => void;
}

export function SplashScreen({ onDone }: StingerTransitionProps) {
  const prefersReduced = useRef(
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ).current;

  useEffect(() => {
    if (prefersReduced) {
      const t = setTimeout(() => onDone(), 400);
      return () => clearTimeout(t);
    }

    // Total transition: ~1050ms (850ms swipe + 200ms fade-out)
    const t = setTimeout(() => onDone(), 1050);
    return () => clearTimeout(t);
  }, [onDone, prefersReduced]);

  if (prefersReduced) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "#0B1319",
          opacity: 0,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className="stinger-overlay"
      aria-hidden="true"
      onAnimationEnd={(e) => {
        if (e.animationName === "stinger-fade-out") {
          onDone();
        }
      }}
    >
      <div className="stinger-panel">
        <div className="stinger-trail" />
      </div>
    </div>
  );
}
