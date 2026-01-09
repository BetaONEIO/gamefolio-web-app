import { cn } from "@/lib/utils";

interface GamefolioProfileIconProps {
  className?: string;
}

export function GamefolioProfileIcon({ className }: GamefolioProfileIconProps) {
  return (
    <span 
      className={cn("inline-flex items-center justify-center shrink-0 w-6 h-6", className)}
      aria-hidden="true"
    >
      <span
        style={{
          display: "block",
          width: "24px",
          height: "24px",
          maskImage: "url('https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/public/gamefolio-icons/sidebar_my_gamefolio_person_xp.svg')",
          WebkitMaskImage: "url('https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/public/gamefolio-icons/sidebar_my_gamefolio_person_xp.svg')",
          maskSize: "24px 24px",
          WebkitMaskSize: "24px 24px",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          backgroundColor: "currentColor",
        }}
      />
    </span>
  );
}
