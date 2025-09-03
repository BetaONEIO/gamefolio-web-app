import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@shared/schema";

interface CustomAvatarProps {
  user: User;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showBorder?: boolean;
  borderIntensity?: "subtle" | "normal" | "strong";
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12", 
  lg: "h-16 w-16",
  xl: "h-20 w-20"
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
  borderIntensity = "normal" 
}: CustomAvatarProps) => {
  const borderColor = user.avatarBorderColor || '#4ADE80';
  
  return (
    <Avatar 
      className={`${sizeClasses[size]} transition-all duration-300 rounded-lg ${className}`}
      style={showBorder ? {
        boxShadow: borderStyles[borderIntensity](borderColor)
      } : {}}
    >
      <AvatarImage src={user.avatarUrl || ""} alt={user.username} />
      <AvatarFallback className="bg-primary/20 text-foreground font-semibold rounded-lg">
        {user.username.substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
};

export default CustomAvatar;