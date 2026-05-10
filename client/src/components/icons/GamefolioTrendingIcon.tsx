import { cn } from "@/lib/utils";

interface GamefolioTrendingIconProps {
  className?: string;
}

const ZAP_PATH = 'M 6 0 H 11 L 5 7 H 10 L 2 14 L 4 8 H 0 Z';

export function GamefolioTrendingIcon({ className }: GamefolioTrendingIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-1 -1 13 16"
      fill="currentColor"
      shapeRendering="crispEdges"
      className={cn("w-6 h-6", className)}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={ZAP_PATH} />
    </svg>
  );
}
