import { cn } from "@/lib/utils";

interface GamefolioExploreIconProps {
  className?: string;
}

export function GamefolioExploreIcon({ className }: GamefolioExploreIconProps) {
  return (
    <span 
      className={cn("inline-flex items-center justify-center shrink-0", className)}
      style={{
        width: "1em",
        height: "1em",
        mask: "url('https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/public/gamefolio-icons/sidebar_explore_radar_norm_115.svg') no-repeat center / contain",
        WebkitMask: "url('https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/public/gamefolio-icons/sidebar_explore_radar_norm_115.svg') no-repeat center / contain",
        backgroundColor: "currentColor",
      }}
      aria-hidden="true"
    />
  );
}
