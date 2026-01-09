import { cn } from "@/lib/utils";

interface GamefolioLeaderboardIconProps {
  className?: string;
}

export function GamefolioLeaderboardIcon({ className }: GamefolioLeaderboardIconProps) {
  return (
    <img 
      src="https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/public/gamefolio-icons/sidebar_leaderboard_podium.svg"
      alt=""
      className={cn("w-7 h-7 shrink-0", className)}
      style={{
        filter: "brightness(0) saturate(100%) invert(70%) sepia(10%) saturate(200%) hue-rotate(180deg)",
      }}
      aria-hidden="true"
    />
  );
}
