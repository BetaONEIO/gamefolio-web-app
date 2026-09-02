import type { ButtonHTMLAttributes } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface GamefolioCollectionIconProps {
  className?: string;
}

export function GamefolioCollectionIcon({
  className,
}: GamefolioCollectionIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <rect x="7" y="4.5" width="18" height="14" rx="2.25" opacity="0.35" />
      <rect x="5" y="8.5" width="18" height="14" rx="2.25" opacity="0.62" />
      <rect x="7" y="12.5" width="18" height="14" rx="2.25" />
      <path
        d="m16 15.9 1.15 2.8 3.03.22-2.32 1.88.74 2.91L16 22.1l-2.6 1.61.74-2.91-2.32-1.88 3.03-.22L16 15.9Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <style>{`
        rect, path { stroke: currentColor; }
      `}</style>
    </svg>
  );
}

interface GamefolioCollectionButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  active?: boolean;
  size?: "mobile" | "desktop";
  showTooltip?: boolean;
}

export function GamefolioCollectionButton({
  active = false,
  size = "desktop",
  showTooltip = true,
  className,
  ...buttonProps
}: GamefolioCollectionButtonProps) {
  const button = (
    <button
      type="button"
      aria-label="View Collection"
      aria-pressed={active}
      {...buttonProps}
      className={cn(
        "group absolute right-2 top-[-14px] z-10 inline-flex items-center justify-center rounded-xl border bg-[#0F101B] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FF1A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F101B]",
        size === "desktop" ? "h-12 w-12" : "h-10 w-10",
        active
          ? "border-[#B7FF1A] text-[#B7FF1A]"
          : "border-[#35E0FF]/70 text-[#35E0FF] hover:border-[#9CEFFF] hover:text-[#9CEFFF] active:border-[#B7FF1A] active:text-[#B7FF1A]",
        className,
      )}
    >
      <GamefolioCollectionIcon
        className={cn(
          "transition-colors duration-150",
          size === "desktop" ? "h-7 w-7" : "h-6 w-6",
        )}
      />
    </button>
  );

  if (!showTooltip) {
    return button;
  }

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="top">View Collection</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}