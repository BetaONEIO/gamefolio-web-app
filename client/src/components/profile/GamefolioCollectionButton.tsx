import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GamefolioCollectionButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  active?: boolean;
  size?: "mobile" | "desktop";
  placement?: "attached" | "inline";
}

export function GamefolioCollectionButton({
  active = false,
  size = "desktop",
  placement = "attached",
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
        "z-20 inline-flex items-center justify-center border font-semibold uppercase leading-none tracking-[0.5px] transition-[filter,box-shadow] duration-150 ease-out hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FF18] focus-visible:ring-offset-2",
        placement === "attached" ? "absolute rounded-t-[4px]" : "relative rounded-lg",
        placement === "attached" && (size === "desktop"
          ? "right-[22px] top-[-23px] h-[24px] w-[100px] text-[8px]"
          : "right-[18px] top-[-20px] h-[21px] w-[80px] text-[7px]"),
        placement === "inline" && "h-9 px-3 text-xs",
        active
          ? "border-[#B7FF18] bg-[#B7FF18]"
          : "border-[#F1F3F4] bg-[#F1F3F4]",
        className,
      )}
      style={{
        ...style,
      }}
    >
      COLLECTION
    </button>
  );
}