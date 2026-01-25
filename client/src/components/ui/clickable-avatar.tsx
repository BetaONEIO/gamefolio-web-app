import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useProfilePictureLightbox, ProfilePictureLightbox } from '@/components/ui/profile-picture-lightbox';
import { cn } from '@/lib/utils';
import { useSignedUrl } from '@/hooks/use-signed-url';

interface ClickableAvatarProps {
  avatarUrl?: string;
  displayName: string;
  username: string;
  className?: string;
  fallbackClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLightbox?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12', 
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
};

const fallbackSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
  xl: 'text-2xl',
};

export function ClickableAvatar({
  avatarUrl,
  displayName,
  username,
  className,
  fallbackClassName,
  size = 'md',
  showLightbox = true,
}: ClickableAvatarProps) {
  const { lightboxData, openLightbox, closeLightbox } = useProfilePictureLightbox();
  const { signedUrl } = useSignedUrl(avatarUrl);
  
  // Use signed URL if available, otherwise fall back to original URL
  const effectiveUrl = signedUrl || avatarUrl;

  const handleClick = () => {
    if (showLightbox && effectiveUrl) {
      openLightbox(effectiveUrl, displayName, username);
    }
  };

  return (
    <>
      <Avatar 
        className={cn(
          sizeClasses[size],
          showLightbox && effectiveUrl ? 'cursor-pointer hover:opacity-80 transition-opacity' : '',
          className
        )}
        onClick={handleClick}
      >
        <AvatarImage 
          src={effectiveUrl || undefined} 
          alt={`${displayName}'s profile picture`}
        />
        <AvatarFallback className={cn(fallbackSizeClasses[size], fallbackClassName)}>
          {displayName?.charAt(0)}
        </AvatarFallback>
      </Avatar>
      
      {showLightbox && (
        <ProfilePictureLightbox
          isOpen={lightboxData.isOpen}
          onClose={closeLightbox}
          avatarUrl={lightboxData.avatarUrl}
          displayName={lightboxData.displayName}
          username={lightboxData.username}
        />
      )}
    </>
  );
}