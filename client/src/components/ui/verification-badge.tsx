import greenBadgeIcon from "@assets/green_badge_128_1758978841463.png";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSignedUrl } from "@/hooks/use-signed-url";

interface VerificationBadgeProps {
  isVerified: boolean;
  badgeImageUrl?: string | null;
  badgeName?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}

function BadgeImage({ imageUrl, alt, className }: { imageUrl: string; alt: string; className: string }) {
  const needsSigning = imageUrl.includes('supabase.co/storage');
  const { signedUrl, isLoading } = useSignedUrl(needsSigning ? imageUrl : '');
  const src = needsSigning ? (signedUrl || imageUrl) : imageUrl;

  if (needsSigning && isLoading) {
    return <div className={className} style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{
        userSelect: 'none',
        WebkitUserDrag: 'none',
        pointerEvents: 'none'
      } as React.CSSProperties}
      draggable="false"
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

export function VerificationBadge({ isVerified, badgeImageUrl, badgeName, size = "md" }: VerificationBadgeProps) {
  if (!isVerified) return null;

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5", 
    lg: "w-6 h-6",
    xl: "w-8 h-8"
  };

  const tooltipText = badgeName || "Verified Gamefolio user";
  const imgSrc = badgeImageUrl || greenBadgeIcon;
  const needsSignedUrl = badgeImageUrl && badgeImageUrl.includes('supabase.co/storage');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          {needsSignedUrl ? (
            <BadgeImage
              imageUrl={badgeImageUrl!}
              alt="Verified"
              className={`${sizeClasses[size]} ml-1`}
            />
          ) : (
            <img 
              src={imgSrc} 
              alt="Verified" 
              className={`${sizeClasses[size]} ml-1`}
              style={{
                userSelect: 'none',
                WebkitUserDrag: 'none',
                pointerEvents: 'none'
              } as React.CSSProperties}
              draggable="false"
              onContextMenu={(e) => e.preventDefault()}
            />
          )}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default VerificationBadge;
