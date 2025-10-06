import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProfilePictureLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  avatarUrl?: string;
  displayName: string;
  username: string;
}

export function ProfilePictureLightbox({ 
  isOpen, 
  onClose, 
  avatarUrl, 
  displayName, 
  username 
}: ProfilePictureLightboxProps) {
  if (!avatarUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100vw-3rem)] md:max-w-2xl p-0 bg-black/95 border-none">
        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 md:right-4 md:top-4 z-50 text-white/70 hover:text-white hover:bg-white/10"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
        
        {/* Profile image */}
        <div className="relative flex flex-col items-center justify-center p-4 md:p-8">
          <div className="relative max-w-full max-h-[70vh] md:max-h-[80vh]">
            <img
              src={avatarUrl}
              alt={`${displayName}'s profile picture`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              style={{ 
                maxWidth: '280px',
                maxHeight: '70vh'
              }}
            />
          </div>
          
          {/* Username below image */}
          <div className="text-center text-white/80 text-base md:text-lg font-medium mt-4 md:mt-6">
            @{username}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing profile picture lightbox state
export function useProfilePictureLightbox() {
  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    avatarUrl?: string;
    displayName: string;
    username: string;
  }>({
    isOpen: false,
    avatarUrl: '',
    displayName: '',
    username: '',
  });

  const openLightbox = (avatarUrl: string, displayName: string, username: string) => {
    setLightboxData({
      isOpen: true,
      avatarUrl,
      displayName,
      username,
    });
  };

  const closeLightbox = () => {
    setLightboxData(prev => ({
      ...prev,
      isOpen: false,
    }));
  };

  return {
    lightboxData,
    openLightbox,
    closeLightbox,
  };
}