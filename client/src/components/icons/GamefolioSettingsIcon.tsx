import { cn } from "@/lib/utils";

interface GamefolioSettingsIconProps {
  className?: string;
}

export function GamefolioSettingsIcon({ className }: GamefolioSettingsIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-6 h-6", className)}
      aria-hidden="true"
    >
      {/* Track 1 */}
      <line x1="3" y1="7" x2="21" y2="7" />
      {/* Knob 1 */}
      <circle cx="8" cy="7" r="2.5" />
      {/* Track 2 */}
      <line x1="3" y1="13" x2="21" y2="13" />
      {/* Knob 2 */}
      <circle cx="15.5" cy="13" r="2.5" />
      {/* Track 3 */}
      <line x1="3" y1="19" x2="21" y2="19" />
      {/* Knob 3 */}
      <circle cx="10" cy="19" r="2.5" />
      {/* Accent dot on middle knob */}
      <circle cx="15.5" cy="13" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
