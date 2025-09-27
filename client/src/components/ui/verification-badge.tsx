import greenBadgeIcon from "@assets/green_badge_128_1758978841463.png";

interface VerificationBadgeProps {
  isVerified: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

export function VerificationBadge({ isVerified, size = "md" }: VerificationBadgeProps) {
  if (!isVerified) return null;

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5", 
    lg: "w-6 h-6",
    xl: "w-8 h-8"  // 50% larger than md (w-5 h-5 = 20px, w-8 h-8 = 32px)
  };

  return (
    <img 
      src={greenBadgeIcon} 
      alt="Verified" 
      className={`${sizeClasses[size]} ml-1`}
    />
  );
}

export default VerificationBadge;