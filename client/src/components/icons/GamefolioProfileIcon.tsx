import { cn } from "@/lib/utils";

interface GamefolioProfileIconProps {
  className?: string;
}

export function GamefolioProfileIcon({ className }: GamefolioProfileIconProps) {
  return (
    <span 
      className={cn("inline-flex items-center justify-center shrink-0 w-6 h-6", className)}
      style={{
        mask: "url('https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/public/gamefolio-icons/sidebar_messages_single_ellipsis_spaced%20(1).svg') no-repeat center / 100% 100%",
        WebkitMask: "url('https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/public/gamefolio-icons/sidebar_messages_single_ellipsis_spaced%20(1).svg') no-repeat center / 100% 100%",
        backgroundColor: "currentColor",
      }}
      aria-hidden="true"
    />
  );
}
