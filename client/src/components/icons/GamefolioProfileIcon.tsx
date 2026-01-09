import { cn } from "@/lib/utils";

interface GamefolioProfileIconProps {
  className?: string;
}

export function GamefolioProfileIcon({ className }: GamefolioProfileIconProps) {
  return (
    <span 
      className={cn("inline-block w-6 h-6", className)}
      style={{
        maskImage: "url('https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/public/gamefolio-icons/sidebar_my_gamefolio_person_xp.svg')",
        WebkitMaskImage: "url('https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/public/gamefolio-icons/sidebar_my_gamefolio_person_xp.svg')",
        maskSize: "contain",
        WebkitMaskSize: "contain",
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
