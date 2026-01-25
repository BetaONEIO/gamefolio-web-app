import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSignedUrl } from '@/hooks/use-signed-url';

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
  const { signedUrl } = useSignedUrl(avatarUrl);
  
  if (!avatarUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100vw-3rem)] md:max-w-2xl p-0 bg-black/95 border-none">
        {/* Profile image */}
        <div className="relative flex flex-col items-center justify-center p-4 md:p-8">
          <div className="relative">
            <img
              src={signedUrl || avatarUrl}
              alt={`${displayName}'s profile picture`}
              className="w-64 h-64 md:w-80 md:h-80 object-cover rounded-full shadow-2xl"
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