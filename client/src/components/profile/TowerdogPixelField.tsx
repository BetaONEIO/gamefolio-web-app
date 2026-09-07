import type { CSSProperties } from "react";

type PixelTone = "red" | "blue" | "purple";

interface Pixel {
  x: number;
  y: number;
  size: 6 | 10 | 16;
  tone: PixelTone;
  delay: number;
  duration?: number;
}

const backgroundPixels: Pixel[] = [
  // Deep red clusters on the left.
  { x: 5, y: 16, size: 16, tone: "red", delay: 0 },
  { x: 8, y: 16, size: 10, tone: "red", delay: 0.25 },
  { x: 8, y: 19, size: 6, tone: "red", delay: 0.5 },
  { x: 14, y: 27, size: 10, tone: "red", delay: 1.1 },
  { x: 17, y: 27, size: 6, tone: "red", delay: 1.35 },
  { x: 3, y: 38, size: 10, tone: "red", delay: 2.1 },
  { x: 6, y: 41, size: 6, tone: "red", delay: 2.35 },
  { x: 20, y: 12, size: 6, tone: "red", delay: 3.2 },
  { x: 23, y: 12, size: 6, tone: "red", delay: 3.45 },
  { x: 12, y: 58, size: 16, tone: "red", delay: 4.2 },
  { x: 16, y: 58, size: 10, tone: "red", delay: 4.45 },
  { x: 18, y: 62, size: 6, tone: "red", delay: 4.7 },
  { x: 4, y: 74, size: 10, tone: "red", delay: 5.5 },
  { x: 7, y: 77, size: 6, tone: "red", delay: 5.75 },
  { x: 25, y: 84, size: 10, tone: "red", delay: 6.5 },
  { x: 28, y: 84, size: 6, tone: "red", delay: 6.75 },

  // Electric and deep blue clusters on the right.
  { x: 88, y: 14, size: 16, tone: "blue", delay: 0.8 },
  { x: 85, y: 14, size: 10, tone: "blue", delay: 1.05 },
  { x: 85, y: 18, size: 6, tone: "blue", delay: 1.3 },
  { x: 76, y: 24, size: 10, tone: "blue", delay: 2 },
  { x: 79, y: 27, size: 6, tone: "blue", delay: 2.25 },
  { x: 94, y: 36, size: 10, tone: "blue", delay: 2.9 },
  { x: 91, y: 39, size: 6, tone: "blue", delay: 3.15 },
  { x: 72, y: 11, size: 6, tone: "blue", delay: 3.8 },
  { x: 75, y: 11, size: 6, tone: "blue", delay: 4.05 },
  { x: 84, y: 56, size: 16, tone: "blue", delay: 4.9 },
  { x: 80, y: 56, size: 10, tone: "blue", delay: 5.15 },
  { x: 80, y: 60, size: 6, tone: "blue", delay: 5.4 },
  { x: 94, y: 72, size: 10, tone: "blue", delay: 6.1 },
  { x: 91, y: 75, size: 6, tone: "blue", delay: 6.35 },
  { x: 73, y: 84, size: 10, tone: "blue", delay: 7.1 },
  { x: 76, y: 84, size: 6, tone: "blue", delay: 7.35 },

  // Sparse purple transition pixels near the centre.
  { x: 43, y: 18, size: 6, tone: "purple", delay: 2.8 },
  { x: 47, y: 21, size: 10, tone: "purple", delay: 3.05 },
  { x: 52, y: 18, size: 6, tone: "purple", delay: 3.3 },
  { x: 57, y: 30, size: 6, tone: "purple", delay: 5.8 },
  { x: 61, y: 33, size: 10, tone: "purple", delay: 6.05 },
  { x: 65, y: 30, size: 6, tone: "purple", delay: 6.3 },
];

const wavePixels: Pixel[] = [
  // Stepped red pass moving inward from the left.
  { x: 4, y: 35, size: 10, tone: "red", delay: 0, duration: 12 },
  { x: 10, y: 35, size: 6, tone: "red", delay: 0.25, duration: 12 },
  { x: 16, y: 39, size: 10, tone: "red", delay: 0.5, duration: 12 },
  { x: 22, y: 39, size: 6, tone: "red", delay: 0.75, duration: 12 },
  { x: 28, y: 43, size: 10, tone: "red", delay: 1, duration: 12 },
  { x: 34, y: 43, size: 6, tone: "purple", delay: 1.25, duration: 12 },
  { x: 40, y: 47, size: 10, tone: "purple", delay: 1.5, duration: 12 },

  // Stepped blue pass moving inward from the right.
  { x: 96, y: 60, size: 10, tone: "blue", delay: 1.4, duration: 12 },
  { x: 90, y: 60, size: 6, tone: "blue", delay: 1.65, duration: 12 },
  { x: 84, y: 56, size: 10, tone: "blue", delay: 1.9, duration: 12 },
  { x: 78, y: 56, size: 6, tone: "blue", delay: 2.15, duration: 12 },
  { x: 72, y: 52, size: 10, tone: "blue", delay: 2.4, duration: 12 },
  { x: 66, y: 52, size: 6, tone: "purple", delay: 2.65, duration: 12 },
  { x: 60, y: 48, size: 10, tone: "purple", delay: 2.9, duration: 12 },
];

function pixelStyle(pixel: Pixel): CSSProperties {
  return {
    left: `${pixel.x}%`,
    top: `${pixel.y}%`,
    "--pixel-size": `${pixel.size}px`,
    "--pixel-delay": `${pixel.delay}s`,
    "--pixel-duration": `${pixel.duration ?? 18}s`,
  } as CSSProperties;
}

function Pixel({ pixel, wave = false }: { pixel: Pixel; wave?: boolean }) {
  return (
    <span
      className={`towerdog-pixel towerdog-pixel--${pixel.tone}${wave ? " towerdog-wave-pixel" : ""}`}
      style={pixelStyle(pixel)}
      aria-hidden="true"
    />
  );
}

export function TowerdogPixelField() {
  return (
    <>
      <div className="towerdog-pixel-background profile-theme-global-background" aria-hidden="true">
        {backgroundPixels.map((pixel, index) => (
          <Pixel key={`towerdog-background-pixel-${index}`} pixel={pixel} />
        ))}
      </div>
      <div className="towerdog-pixel-wave-overlay profile-theme-global-overlay" aria-hidden="true">
        {wavePixels.map((pixel, index) => (
          <Pixel key={`towerdog-wave-pixel-${index}`} pixel={pixel} wave />
        ))}
      </div>
    </>
  );
}