import { cn } from "@/lib/utils";

interface RecommendedIconProps {
  className?: string;
  glow?: boolean;
  animate?: boolean;
}

/**
 * Gamefolio "Recommended For You" discovery icon.
 *
 * Shape: a very sharp 4-pointed spark (electric lens-flare style) enclosed
 * in a minimal L-bracket targeting frame.  The spike tips sit just inside the
 * brackets so the two elements read as a single "locked-on" symbol.
 *
 * Animation (animate=true, default):
 *   1. Subtle rotation of the whole icon (+9°)
 *   2. Corner brackets separate outward diagonally
 *   3. Neon green glow pulses in
 *   4. Everything eases back to rest
 *   Cycle: 4 s · ease-in-out · infinite
 *
 * Design intent: algorithm-powered, personalised, gaming-premium.
 * Stroke-based so it inherits colour via `currentColor` and scales cleanly.
 */
export function RecommendedIcon({
  className,
  glow = false,
  animate = true,
}: RecommendedIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-5 h-5", animate && "rec-icon-animated", className)}
      style={
        !animate && glow
          ? { filter: "drop-shadow(0 0 5px rgba(183,255,26,0.55))" }
          : undefined
      }
      aria-hidden
    >
      {/*
        Inner group rotates as a unit around the SVG centre (12,12).
        Each bracket sub-group then translates independently outward.
      */}
      <g className={animate ? "rec-icon-spin" : undefined}>
        {/*
          Sharp 4-pointed spark — waist is only 2 units wide (11–13) while
          tips reach from y=4 to y=20 and x=4 to x=20 (8:1 spike ratio).
        */}
        <path d="M12 4 L13 11 L20 12 L13 13 L12 20 L11 13 L4 12 L11 11 Z" />

        {/* Targeting brackets — each in its own group so it can translate */}
        <g className={animate ? "rec-bracket-tl" : undefined}>
          <polyline points="3,8 3,3 8,3" />
        </g>
        <g className={animate ? "rec-bracket-tr" : undefined}>
          <polyline points="21,8 21,3 16,3" />
        </g>
        <g className={animate ? "rec-bracket-bl" : undefined}>
          <polyline points="3,16 3,21 8,21" />
        </g>
        <g className={animate ? "rec-bracket-br" : undefined}>
          <polyline points="21,16 21,21 16,21" />
        </g>
      </g>
    </svg>
  );
}
