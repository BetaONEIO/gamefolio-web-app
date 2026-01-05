import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, AssetReward } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface CustomAvatarProps {
  user: User;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showBorder?: boolean;
  borderIntensity?: "subtle" | "normal" | "strong";
  showAvatarBorderOverlay?: boolean;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12", 
  lg: "h-16 w-16",
  xl: "h-20 w-20",
  "2xl": "h-32 w-32"
};

const borderOverlaySizes = {
  sm: "h-12 w-12",
  md: "h-16 w-16",
  lg: "h-24 w-24",
  xl: "h-28 w-28",
  "2xl": "h-44 w-44"
};

const borderStyles = {
  subtle: (color: string) => `0 0 0 1px ${color}66, 0 0 8px ${color}22`,
  normal: (color: string) => `0 0 0 2px ${color}66, 0 0 15px ${color}33`,
  strong: (color: string) => `0 0 0 3px ${color}88, 0 0 20px ${color}44`
};

export const CustomAvatar = ({ 
  user, 
  size = "md", 
  className = "", 
  showBorder = true,
  borderIntensity = "normal",
  showAvatarBorderOverlay = true
}: CustomAvatarProps) => {
  const borderColor = user?.avatarBorderColor || 'hsl(var(--primary))';
  const safeDisplayName = user?.displayName || user?.username || "?";
  
  // Fetch selected avatar border if user has one selected
  const { data: borderData } = useQuery<{ avatarBorder: AssetReward | null }>({
    queryKey: [`/api/user/${user?.id}/avatar-border`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: showAvatarBorderOverlay && !!user?.selectedAvatarBorderId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const avatarBorder = borderData?.avatarBorder;
  const hasAvatarBorderOverlay = showAvatarBorderOverlay && avatarBorder?.imageUrl;

  if (hasAvatarBorderOverlay) {
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        {/* Avatar in the center */}
        <Avatar 
          className={`${sizeClasses[size]} transition-all duration-300 rounded-full z-10`}
          style={showBorder ? {
            boxShadow: borderStyles[borderIntensity](borderColor)
          } : {}}
        >
          <AvatarImage src={user?.avatarUrl || ""} alt={safeDisplayName} className="rounded-full object-cover" />
          <AvatarFallback className="bg-primary/20 text-foreground font-semibold rounded-full">
            {safeDisplayName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {/* Border overlay image */}
        <img
          src={avatarBorder.imageUrl}
          alt="Avatar border"
          className={`absolute ${borderOverlaySizes[size]} object-contain pointer-events-none z-20`}
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>
    );
  }

  const displayName = user.displayName || user.username || "?";
  
  return (
    <Avatar 
      className={`${sizeClasses[size]} transition-all duration-300 rounded-full ${className}`}
      style={showBorder ? {
        boxShadow: borderStyles[borderIntensity](borderColor)
      } : {}}
    >
      <AvatarImage src={user.avatarUrl || ""} alt={displayName} className="rounded-full object-cover" />
      <AvatarFallback className="bg-primary/20 text-foreground font-semibold rounded-full">
        {displayName.substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
};

export default CustomAvatar;