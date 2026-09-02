import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GamefolioCollectionButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  active?: boolean;
  size?: "mobile" | "desktop";
}

export function GamefolioCollectionButton({
  active = false,
  size = "desktop",
  className,
  style,
  ...buttonProps
}: GamefolioCollectionButtonProps) {
  return (
    <button
      {...buttonProps}
      type="button"
      aria-label="View Collection"
      aria-pressed={active}
      className={cn(
        "absolute z-20 inline-flex items-center justify-center border font-semibold uppercase leading-none tracking-[1px] text-[#0F101B] transition-colors duration-150 ease-out hover:border-[#B7FF1A] hover:bg-[#B7FF1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FF1A] focus-visible:ring-offset-2",
        size === "desktop"
          ? "right-[22px] top-[-26px] h-[27px] w-[105px] text-[9px]"
          : "right-3 top-[-22px] h-[23px] w-[86px] text-[8px]",
        active
          ? "border-[#B7FF1A] bg-[#B7FF1A]"
          : "border-[#F1F3F4] bg-[#F1F3F4]",
        className,
      )}
      style={{
        clipPath: "polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 9px)",
        ...style,
      }}
    >
      COLLECTION
    </button>
  );
}