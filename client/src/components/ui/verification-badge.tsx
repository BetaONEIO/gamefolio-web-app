import { Check } from "lucide-react";

interface VerificationBadgeProps {
  isVerified: boolean;
  size?: "sm" | "md" | "lg";
}

export function VerificationBadge({ isVerified, size = "md" }: VerificationBadgeProps) {
  if (!isVerified) return null;

  const sizeClasses = {
    sm: "w-4 h-4 text-xs",
    md: "w-5 h-5 text-sm", 
    lg: "w-6 h-6 text-base"
  };

  return (
    <div className={`${sizeClasses[size]} bg-primary rounded-full flex items-center justify-center ml-1 relative`}>
      <div className="absolute inset-0 bg-white rounded-full flex items-center justify-center">
        <span className="text-primary font-bold text-[0.6em]">G</span>
      </div>
      <Check className="w-2/3 h-2/3 text-white z-10" strokeWidth={3} />
    </div>
  );
}

export default VerificationBadge;