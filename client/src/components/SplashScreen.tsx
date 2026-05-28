import { useState, useEffect, useRef } from "react";
import logoPath from "@assets/gamefolio-logo-green.png";

interface SplashScreenProps {
  onDone: () => void;
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const prefersReduced = useRef(
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ).current;

  useEffect(() => {
    if (prefersReduced) {
      const t = setTimeout(() => onDone(), 600);
      return () => clearTimeout(t);
    }

    const t1 = setTimeout(() => setPhase("hold"), 700);
    const t2 = setTimeout(() => setPhase("out"), 1500);
    const t3 = setTimeout(() => onDone(), 2050);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone, prefersReduced]);

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B1319",
    fontFamily: "'Space Grotesk', sans-serif",
    animation: phase === "out" ? "gf-splash-fade-out 0.55s ease forwards" : undefined,
    willChange: "opacity",
  };

  const glowStyle: React.CSSProperties = {
    position: "absolute",
    width: "260px",
    height: "260px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(183,255,24,0.18) 0%, rgba(183,255,24,0.06) 50%, transparent 72%)",
    animation: prefersReduced ? undefined : "gf-splash-glow-pulse 2s ease-in-out infinite",
    willChange: "opacity, transform",
  };

  const logoWrapStyle: React.CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    animation: prefersReduced
      ? undefined
      : phase === "in"
      ? "gf-splash-logo-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards"
      : undefined,
    opacity: prefersReduced ? 1 : phase === "in" ? 0 : 1,
    willChange: "opacity, transform",
  };

  const logoStyle: React.CSSProperties = {
    width: "160px",
    height: "auto",
    filter:
      "drop-shadow(0 0 18px rgba(183,255,24,0.55)) drop-shadow(0 0 6px rgba(183,255,24,0.35))",
    userSelect: "none",
    pointerEvents: "none",
  };

  const dotsWrapStyle: React.CSSProperties = {
    marginTop: "52px",
    display: "flex",
    gap: "10px",
    alignItems: "center",
    opacity: prefersReduced ? 1 : phase === "in" ? 0 : 1,
    transition: "opacity 0.4s ease",
  };

  return (
    <div style={containerStyle} aria-hidden="true">
      <div style={glowStyle} />

      <div style={logoWrapStyle}>
        <img src={logoPath} alt="Gamefolio" style={logoStyle} draggable={false} />
      </div>

      <div style={dotsWrapStyle}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display: "block",
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: "#B7FF18",
              animation: prefersReduced
                ? undefined
                : `gf-splash-dot 1.2s ease-in-out ${i * 0.18}s infinite`,
              willChange: "opacity, transform",
            }}
          />
        ))}
      </div>
    </div>
  );
}
