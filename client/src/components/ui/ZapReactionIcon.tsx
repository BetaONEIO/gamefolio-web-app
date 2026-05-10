import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * ZapReactionIcon — pixel-art lightning bolt reaction icon.
 *
 * Bolt shape: 11×14 unit grid.
 * Active colour: Gamefolio neon green (#B7FF1A).
 * Inactive: outline only, muted via currentColor.
 *
 * Animations:
 *  - zapSnap: quick scale-up snap on click
 *  - zapSparkOut: pixel sparks shoot out on inactive→active transition
 *  - active glow: CSS drop-shadow filter on the fill layer
 */

// Lightning bolt polygon on an 11×14 grid
const ZAP_PATH = 'M 6 0 H 11 L 5 7 H 10 L 2 14 L 4 8 H 0 Z';

// Pixel sparks placed around the bolt perimeter
const SPARKS = [
  { x:  5.0, y: -2.0, color: '#B7FF1A', delay:   0 },
  { x:  8.5, y: -2.0, color: '#d4ff6b', delay:  30 },
  { x: 11.5, y:  2.0, color: '#B7FF1A', delay:  60 },
  { x: 11.0, y:  7.0, color: '#d4ff6b', delay:  10 },
  { x:  9.5, y: 14.5, color: '#B7FF1A', delay:  50 },
  { x:  1.0, y: 14.5, color: '#d4ff6b', delay:  80 },
  { x: -2.0, y:  9.0, color: '#B7FF1A', delay:  20 },
  { x: -2.0, y:  3.0, color: '#d4ff6b', delay:  70 },
];

const NEON = '#B7FF1A';

let _zapStylesInjected = false;
function ensureZapStyles() {
  if (_zapStylesInjected || typeof document === 'undefined') return;
  _zapStylesInjected = true;
  const el = document.createElement('style');
  el.id = 'zap-reaction-keyframes';
  el.textContent = `
    @keyframes zapSnap {
      0%   { transform: scale(1);    }
      22%  { transform: scale(1.22); }
      55%  { transform: scale(0.92); }
      100% { transform: scale(1);    }
    }
    @keyframes zapSparkOut {
      0%   { opacity: 1; transform: scale(1.2) translate(0px, 0px); }
      65%  { opacity: 0.8; }
      100% { opacity: 0; transform: scale(0.15) translate(0px, -2px); }
    }
  `;
  document.head.appendChild(el);
}

export interface ZapReactionIconProps {
  active?: boolean;
  onClick?: () => void;
  size?: number;
  className?: string;
}

export function ZapReactionIcon({
  active = false,
  onClick,
  size = 24,
  className = '',
}: ZapReactionIconProps) {
  const [zapping, setZapping] = useState(false);
  const [sparkling, setSparkling] = useState(false);
  const prevActive = useRef(active);

  useEffect(() => { ensureZapStyles(); }, []);

  useEffect(() => {
    if (active && !prevActive.current) {
      setSparkling(true);
      const t = setTimeout(() => setSparkling(false), 650);
      return () => clearTimeout(t);
    }
    prevActive.current = active;
  }, [active]);

  function handleClick() {
    setZapping(true);
    setTimeout(() => setZapping(false), 360);
    onClick?.();
  }

  // size = target HEIGHT; width proportional to 11:14 aspect ratio
  const h = size;
  const w = Math.round(size * 11 / 14);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center bg-transparent border-0 p-0 cursor-pointer select-none touch-manipulation ${className}`}
      style={{ width: w, height: h, lineHeight: 0 }}
      aria-pressed={active}
      aria-label={active ? 'Un-zap' : 'Zap'}
    >
      <svg
        viewBox="-1 -1 13 16"
        width={w}
        height={h}
        shapeRendering="crispEdges"
        style={{
          overflow: 'visible',
          display: 'block',
          transformOrigin: '50% 50%',
          animation: zapping ? 'zapSnap 0.36s ease-out forwards' : 'none',
        }}
      >
        {/* ── Pixel sparks (shown briefly on activate) ── */}
        {sparkling && SPARKS.map((s, i) => (
          <rect
            key={i}
            x={s.x}
            y={s.y}
            width={1}
            height={1}
            fill={s.color}
            style={{
              transformOrigin: `${s.x + 0.5}px ${s.y + 0.5}px`,
              animation: `zapSparkOut 0.55s ease-out ${s.delay}ms both`,
            }}
          />
        ))}

        {/* ── Glow layer behind fill (active only) ── */}
        {active && (
          <path
            d={ZAP_PATH}
            fill={NEON}
            style={{
              filter: `drop-shadow(0 0 2px ${NEON}) drop-shadow(0 0 5px ${NEON})`,
              opacity: 0.55,
            }}
          />
        )}

        {/* ── Fill layer ── */}
        <path
          d={ZAP_PATH}
          fill={active ? NEON : 'none'}
          stroke="none"
          style={{ transition: 'fill 0.15s ease-in-out' }}
        />

        {/* ── Stroke layer ── */}
        <path
          d={ZAP_PATH}
          fill="none"
          stroke={active ? NEON : 'currentColor'}
          strokeWidth={0.85}
          strokeLinejoin="miter"
          strokeLinecap="square"
          style={{ transition: 'stroke 0.15s ease-in-out' }}
        />
      </svg>
    </button>
  );
}

export default ZapReactionIcon;

// ─────────────────────────────────────────────────────────────────────────────
// ZapIconSvg — pure visual SVG (no button wrapper).
// Use this inside other buttons/elements as a drop-in replacement for <Flame>.
// Accepts size (px height) OR className for Tailwind sizing (e.g. "h-4 w-4").
// active=false → outline/stroke (matches lucide icon inactive look)
// active=true  → neon green fill + glow
// ─────────────────────────────────────────────────────────────────────────────
export interface ZapIconSvgProps {
  size?: number;
  active?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function ZapIconSvg({ size, active = false, className = '', style }: ZapIconSvgProps) {
  const NEON = '#B7FF1A';
  const w = size ? Math.round(size * 11 / 14) : undefined;
  return (
    <svg
      viewBox="-1 -1 13 16"
      width={w}
      height={size}
      className={className}
      style={{ overflow: 'visible', ...style }}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {active && (
        <path
          d={ZAP_PATH}
          fill={NEON}
          style={{ filter: `drop-shadow(0 0 2px ${NEON}) drop-shadow(0 0 5px ${NEON})`, opacity: 0.5 }}
        />
      )}
      <path
        d={ZAP_PATH}
        fill={active ? NEON : 'none'}
        stroke={active ? NEON : 'currentColor'}
        strokeWidth={0.85}
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZapIconFire — always-active ZapIconSvg. Accepts className/style so it can be
// used as a drop-in component reference in icon arrays (like lucide icons).
// ─────────────────────────────────────────────────────────────────────────────
export function ZapIconFire({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <ZapIconSvg active={true} className={className} style={style} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// useZapFly + ZapFlyOverlay — "Zap to position" gaming animation.
//
// Usage:
//   const { triggerZapFly, zapFlyState, dismissZapFly } = useZapFly();
//   const iconRef = useRef<HTMLElement>(null);
//
//   // On tap:
//   triggerZapFly(iconRef.current);
//
//   // In JSX:
//   {zapFlyState && <ZapFlyOverlay targetRect={zapFlyState} onDone={dismissZapFly} />}
// ─────────────────────────────────────────────────────────────────────────────

export function useZapFly() {
  const [zapFlyState, setZapFlyState] = useState<DOMRect | null>(null);

  const triggerZapFly = useCallback((el: Element | null) => {
    if (!el) return;
    setZapFlyState(el.getBoundingClientRect());
  }, []);

  const dismissZapFly = useCallback(() => setZapFlyState(null), []);

  return { zapFlyState, triggerZapFly, dismissZapFly };
}

// Landing spark positions (normalised around bolt centre)
const FLY_SPARKS = [
  { dx: -14, dy: -18, color: '#B7FF1A', delay: 0.00 },
  { dx:  12, dy: -20, color: '#d4ff6b', delay: 0.03 },
  { dx:  20, dy:  -4, color: '#B7FF1A', delay: 0.06 },
  { dx:  18, dy:  12, color: '#d4ff6b', delay: 0.01 },
  { dx:   4, dy:  20, color: '#B7FF1A', delay: 0.05 },
  { dx: -16, dy:  16, color: '#d4ff6b', delay: 0.08 },
  { dx: -22, dy:   2, color: '#B7FF1A', delay: 0.02 },
  { dx:  -8, dy: -22, color: '#d4ff6b', delay: 0.07 },
];

export function ZapFlyOverlay({ targetRect, onDone }: { targetRect: DOMRect; onDone: () => void }) {
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<'appear' | 'fly' | 'land'>('appear');
  const [showSparks, setShowSparks] = useState(false);

  const LARGE = 76;
  const scx = window.innerWidth / 2;
  const scy = window.innerHeight / 2;
  const tcx = targetRect.left + targetRect.width / 2;
  const tcy = targetRect.top + targetRect.height / 2;
  const dx = tcx - scx;
  const dy = tcy - scy;
  const endScale = Math.max(targetRect.height, 16) / LARGE;

  // Reduced-motion: just fire onDone immediately
  useEffect(() => {
    if (prefersReducedMotion) {
      const t = setTimeout(onDone, 50);
      return () => clearTimeout(t);
    }
  }, [prefersReducedMotion, onDone]);

  if (prefersReducedMotion) return null;

  const portal = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        pointerEvents: 'none', overflow: 'visible',
      }}
    >
      {/* ── Flash bloom at screen centre ── */}
      {phase === 'appear' && (
        <motion.div
          initial={{ scale: 0, opacity: 0.9 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: scx - 52, top: scy - 52,
            width: 104, height: 104,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(183,255,26,0.75) 0%, transparent 70%)',
          }}
        />
      )}

      {/* ── Flying zap bolt ── */}
      {phase !== 'land' && (
        <motion.div
          initial={{ x: 0, y: 0, scale: 0.08, opacity: 0 }}
          animate={
            phase === 'appear'
              ? { scale: 1.3, opacity: 1, x: 0, y: 0 }
              : { x: dx, y: dy, scale: endScale, opacity: 0 }
          }
          onAnimationComplete={() => {
            if (phase === 'appear') {
              setPhase('fly');
            } else {
              setShowSparks(true);
              setPhase('land');
              setTimeout(onDone, 280);
            }
          }}
          transition={
            phase === 'appear'
              ? { duration: 0.13, ease: [0.0, 0.0, 0.2, 1.0] }
              : { duration: 0.46, ease: [0.55, 0.0, 0.45, 1.0] }
          }
          style={{
            position: 'absolute',
            left: scx - LARGE / 2,
            top: scy - LARGE / 2,
            width: LARGE, height: LARGE,
          }}
        >
          <ZapIconSvg size={LARGE} active={true} />
        </motion.div>
      )}

      {/* ── Landing pixel sparks ── */}
      {showSparks && FLY_SPARKS.map((s, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: s.dx * 1.6, y: s.dy * 1.6, opacity: 0, scale: 0.2 }}
          transition={{ duration: 0.26, delay: s.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: tcx - 2, top: tcy - 2,
            width: 4, height: 4,
            background: s.color,
            borderRadius: 0,
          }}
        />
      ))}
    </div>
  );

  return createPortal(portal, document.body);
}
