import { cn } from "@/lib/utils";

interface GamefolioProfileIconProps {
  className?: string;
}

export function GamefolioProfileIcon({ className }: GamefolioProfileIconProps) {
  return (
    <img 
      src="https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/public/gamefolio-icons/sidebar_my_gamefolio_person_xp.svg"
      alt=""
      className={cn("w-5 h-5", className)}
    />
  );
}
