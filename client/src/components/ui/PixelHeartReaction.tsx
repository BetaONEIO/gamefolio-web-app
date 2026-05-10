import { useState, useEffect, useRef } from 'react';

/**
 * PixelHeartReaction — hand-traced 8-bit/pixel-art heart SVG component.
 *
 * Heart shape: 12×9 unit grid, each "pixel" = 1 SVG unit.
 * ViewBox: "0 0 12 9"
 *
 * Path traced clockwise around the outer boundary of:
 *   Row 0: cols 2-3, 8-9
 *   Row 1: cols 1-4, 7-10
 *   Row 2-3: cols 0-11  (full width)
 *   Row 4: cols 1-10
 *   Row 5: cols 2-9
 *   Row 6: cols 3-8
 *   Row 7: cols 4-7
 *   Row 8: cols 5-6
 */

const HEART_PATH =
  'M 2 0 H 4 V 1 H 5 V 2 H 7 V 1 H 8 V 0 H 10 V 1 H 11 V 2 H 12 V 4 ' +
  'H 11 V 5 H 10 V 6 H 9 V 7 H 8 V 8 H 7 V 9 H 5 V 8 H 4 V 7 H 3 V 6 ' +
  'H 2 V 5 H 1 V 4 H 0 V 2 H 1 V 1 H 2 V 0 Z';

// Pixel sparkles: (x, y) in viewBox units, placed just outside the heart border
const SPARKLES = [
  { x:  4.5, y: -1.8, color: '#f472b6', delay:   0 },
  { x:  7.5, y: -1.8, color: '#a855f7', delay:  40 },
  { x: 11.5, y:  1.5, color: '#60a5fa', delay:  80 },
  { x: 11.5, y:  5.5, color: '#22d3ee', delay:  20 },
  { x:  6.0, y: 10.2, color: '#f472b6', delay:  60 },
  { x:  0.5, y:  5.5, color: '#a855f7', delay:  80 },
  { x:  0.5, y:  1.5, color: '#60a5fa', delay:  40 },
  { x:  2.5, y: -1.8, color: '#22d3ee', delay: 100 },
  { x:  9.5, y: -1.8, color: '#f472b6', delay:  60 },
];

// Inject keyframes once into <head>
let _stylesInjected = false;
function ensureStyles() {
  if (_stylesInjected || typeof document === 'undefined') return;
  _stylesInjected = true;
  const el = document.createElement('style');
  el.id = 'pixel-heart-keyframes';
  el.textContent = `
    @keyframes pixelHeartPop {
      0%   { transform: scale(1);    }
      30%  { transform: scale(1.18); }
      65%  { transform: scale(0.95); }
      100% { transform: scale(1);    }
    }
    @keyframes pixelGradientStroke {
      0%   { stroke: #f472b6; }
      25%  { stroke: #a855f7; }
      50%  { stroke: #60a5fa; }
      75%  { stroke: #22d3ee; }
      100% { stroke: #f472b6; }
    }
    @keyframes pixelSparkleOut {
      0%   { opacity: 1; transform: scale(1.0) translate(0px,  0px); }
      60%  { opacity: 0.9; }
      100% { opacity: 0; transform: scale(0.3) translate(0px, -2px); }
    }
  `;
  document.head.appendChild(el);
}

export interface PixelHeartReactionProps {
  active?: boolean;
  onClick?: () => void;
  size?: number;
  fillColour?: string;
  className?: string;
}

export function PixelHeartReaction({
  active = false,
  onClick,
  size = 24,
  fillColour = '#ff4d6d',
  className = '',
}: PixelHeartReactionProps) {
  const [popping, setPop] = useState(false);
  const [sparkling, setSpark] = useState(false);
  const prevActive = useRef(active);

  useEffect(() => { ensureStyles(); }, []);

  // Trigger sparkles only on inactive → active transition
  useEffect(() => {
    if (active && !prevActive.current) {
      setSpark(true);
      const t = setTimeout(() => setSpark(false), 650);
      return () => clearTimeout(t);
    }
    prevActive.current = active;
  }, [active]);

  function handleClick() {
    setPop(true);
    const t = setTimeout(() => setPop(false), 360);
    onClick?.();
    return () => clearTimeout(t);
  }

  // Aspect-correct height: viewBox is 12 wide × 9 tall
  const w = size;
  const h = Math.round(size * 9 / 12);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center bg-transparent border-0 p-0 cursor-pointer select-none touch-manipulation ${className}`}
      style={{ width: w, height: h, lineHeight: 0 }}
      aria-pressed={active}
      aria-label={active ? 'Unlike' : 'Like'}
    >
      <svg
        viewBox="-2 -2 16 13"
        width={w}
        height={h}
        shapeRendering="crispEdges"
        style={{
          overflow: 'visible',
          display: 'block',
          transformOrigin: '50% 50%',
          animation: popping ? 'pixelHeartPop 0.36s ease-out forwards' : 'none',
        }}
      >
        {/* ── Pixel sparkles (shown briefly on activate) ── */}
        {sparkling && SPARKLES.map((s, i) => (
          <rect
            key={i}
            x={s.x}
            y={s.y}
            width={1}
            height={1}
            fill={s.color}
            style={{
              transformOrigin: `${s.x + 0.5}px ${s.y + 0.5}px`,
              animation: `pixelSparkleOut 0.55s ease-out ${s.delay}ms both`,
            }}
          />
        ))}

        {/* ── Heart fill layer (active only, fades in) ── */}
        <path
          d={HEART_PATH}
          fill={fillColour}
          fillOpacity={active ? 1 : 0}
          stroke="none"
          style={{ transition: 'fill-opacity 0.18s ease-in-out' }}
        />

        {/* ── Heart stroke layer ── */}
        <path
          d={HEART_PATH}
          fill="none"
          strokeWidth={0.9}
          strokeLinejoin="miter"
          strokeLinecap="square"
          style={
            active
              ? {
                  animation: 'pixelGradientStroke 2s linear infinite',
                  stroke: '#f472b6', // initial / fallback
                }
              : {
                  stroke: 'currentColor',
                }
          }
        />
      </svg>
    </button>
  );
}

export default PixelHeartReaction;
