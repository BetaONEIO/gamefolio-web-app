import { cn } from "@/lib/utils";

interface GamefolioExploreIconProps {
  className?: string;
}

export function GamefolioExploreIcon({ className }: GamefolioExploreIconProps) {
  return (
    <img 
      src="https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/public/gamefolio-icons/sidebar_explore_radar_norm_115.svg"
      alt=""
      className="shrink-0"
      style={{
        width: "28px",
        height: "28px",
      }}
      aria-hidden="true"
    />
  );
}
