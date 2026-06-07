import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

const NEON = "#B7FF1A";

// Curved arc rising from lower-left to upper-right — TikTok-style share shape
const ARC = "M 4 19 C 4 10 10 5 18 5";
// Chevron arrowhead pointing right at the tip (18, 5)
const HEAD = "M 14 2 L 18 5 L 14 8";
// Tip coordinates for spark origins
const TIP = { x: 18, y: 5 };

// 4 spark offsets radiating from the arrow tip (upward-right bias)
const SPARKS = [
  { ox: 4,  oy: -4, delay: 0.00 },
  { ox: 5,  oy:  1, delay: 0.04 },
  { ox:  0, oy: -6, delay: 0.06 },
  { ox: -3, oy: -4, delay: 0.02 },
];

export interface ShareLaunchIconProps {
  size?: number;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

const ShareLaunchIcon = ({ size = 24, className, onClick }: ShareLaunchIconProps) => {
  const busy = useRef(false);
  const arrowCtrl = useAnimation();
  const trailCtrl = useAnimation();
  const [sparkKey, setSparkKey] = useState(0);
  const [showSparks, setShowSparks] = useState(false);

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    onClick?.(e);
    if (busy.current) return;
    busy.current = true;
    setSparkKey(k => k + 1);
    setShowSparks(true);

    await Promise.all([
      arrowCtrl.start({
        x: [0, 4, -1, 0],
        y: [0, -4,  1, 0],
        transition: { duration: 0.42, times: [0, 0.38, 0.70, 1], ease: "easeOut" },
      }),
      trailCtrl.start({
        opacity:    [0, 0.9, 0],
        pathLength: [0, 1,   1],
        transition: { duration: 0.45, ease: "easeOut" },
      }),
    ]);

    setTimeout(() => { setShowSparks(false); busy.current = false; }, 60);
  }, [arrowCtrl, trailCtrl, onClick]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      onClick={handleClick}
      style={{ cursor: "pointer", overflow: "visible" }}
      className={cn(className)}
    >
      {/* Neon glow trail — rendered beneath the icon, blurred */}
      <motion.path
        d={ARC}
        stroke={NEON}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        style={{ filter: "blur(3px)" }}
        initial={{ opacity: 0, pathLength: 0 }}
        animate={trailCtrl}
      />

      {/* Icon body — nudges upward-right on click */}
      <motion.g animate={arrowCtrl}>
        <path d={ARC}  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={HEAD} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </motion.g>

      {/* Spark particles at the arrow tip */}
      <AnimatePresence>
        {showSparks && SPARKS.map((s, i) => (
          <motion.circle
            key={`${sparkKey}-${i}`}
            cx={TIP.x + s.ox}
            cy={TIP.y + s.oy}
            r="1.5"
            fill={NEON}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.8, 0] }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.36, delay: s.delay, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>
    </svg>
  );
};

export { ShareLaunchIcon };
export default ShareLaunchIcon;
