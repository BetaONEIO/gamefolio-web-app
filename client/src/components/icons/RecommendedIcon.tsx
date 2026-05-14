import { cn } from "@/lib/utils";

interface RecommendedIconProps {
  className?: string;
  glow?: boolean;
}

/**
 * Gamefolio "Recommended For You" discovery icon.
 *
 * Shape: a very sharp 4-pointed spark (electric lens-flare style) enclosed
 * in a minimal L-bracket targeting frame.  The spike tips sit just inside the
 * brackets so the two elements read as a single "locked-on" symbol.
 *
 * Design intent: algorithm-powered, personalised, gaming-premium.
 * Stroke-based so it inherits colour via `currentColor` and scales cleanly.
 */
export function RecommendedIcon({ className, glow = false }: RecommendedIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-5 h-5", className)}
      style={
        glow
          ? { filter: "drop-shadow(0 0 5px rgba(183,255,26,0.55))" }
          : undefined
      }
      aria-hidden
    >
      {/*
        Sharp 4-pointed spark — waist is only 2 units wide (11–13) while tips
        reach from y=4 to y=20 and x=4 to x=20, giving a ~8:1 spike ratio.
        This reads as an electric discharge / discovery pulse, not a soft star.
      */}
      <path d="M12 4 L13 11 L20 12 L13 13 L12 20 L11 13 L4 12 L11 11 Z" />

      {/*
        Targeting brackets — L-shaped corner marks that frame the spark
        without enclosing it fully, suggesting "curated / selected for you".
        Each arm is 5 units long.
      */}
      {/* top-left */}
      <polyline points="3,8 3,3 8,3" />
      {/* top-right */}
      <polyline points="21,8 21,3 16,3" />
      {/* bottom-left */}
      <polyline points="3,16 3,21 8,21" />
      {/* bottom-right */}
      <polyline points="21,16 21,21 16,21" />
    </svg>
  );
}
