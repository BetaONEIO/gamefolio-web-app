import { cn } from "@/lib/utils";

interface GamefolioProfileIconProps {
  className?: string;
}

export function GamefolioProfileIcon({ className }: GamefolioProfileIconProps) {
  return (
    <span 
      className={cn("inline-block shrink-0", className)}
      style={{
        width: "1.5rem",
        height: "1.5rem",
        minWidth: "1.5rem",
        minHeight: "1.5rem",
        maskImage: "url('https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/public/gamefolio-icons/sidebar_my_gamefolio_person_xp.svg')",
        WebkitMaskImage: "url('https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/public/gamefolio-icons/sidebar_my_gamefolio_person_xp.svg')",
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        backgroundColor: "currentColor",
      }}
      aria-hidden="true"
    />
  );
}
