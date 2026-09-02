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
        "absolute z-20 inline-flex items-center justify-center rounded-tr-[4px] border font-semibold uppercase leading-none tracking-[0.5px] transition-[filter,box-shadow] duration-150 ease-out hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FF1A] focus-visible:ring-offset-2",
        size === "desktop"
          ? "right-[22px] top-[-23px] h-[24px] w-[100px] text-[8px]"
          : "right-[18px] top-[-20px] h-[21px] w-[80px] text-[7px]",
        active
          ? "border-[#B7FF1A] bg-[#B7FF1A]"
          : "border-[#F1F3F4] bg-[#F1F3F4]",
        className,
      )}
      style={{
        clipPath: "polygon(7px 0, 100% 0, 100% 100%, 0 100%, 0 8px)",
        ...style,
      }}
    >
      COLLECTION
    </button>
  );
}