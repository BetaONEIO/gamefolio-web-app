import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useProfilePictureLightbox, ProfilePictureLightbox } from '@/components/ui/profile-picture-lightbox';
import { cn } from '@/lib/utils';

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

  const handleClick = () => {
    if (showLightbox && avatarUrl) {
      openLightbox(avatarUrl, displayName, username);
    }
  };

  return (
    <>
      <Avatar 
        className={cn(
          sizeClasses[size],
          showLightbox && avatarUrl ? 'cursor-pointer hover:opacity-80 transition-opacity' : '',
          className
        )}
        onClick={handleClick}
      >
        <AvatarImage 
          src={avatarUrl || undefined} 
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