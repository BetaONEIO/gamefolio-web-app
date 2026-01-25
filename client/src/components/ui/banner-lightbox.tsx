import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSignedUrl } from '@/hooks/use-signed-url';

interface BannerLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  bannerUrl?: string;
  displayName: string;
  username: string;
}

export function BannerLightbox({ 
  isOpen, 
  onClose, 
  bannerUrl, 
  displayName, 
  username 
}: BannerLightboxProps) {
  const { signedUrl } = useSignedUrl(bannerUrl);
  
  if (!bannerUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-full p-0 bg-black/95 border-none overflow-hidden">
        {/* Banner image */}
        <div className="relative flex flex-col items-center justify-center p-8 overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <img
              src={signedUrl || bannerUrl}
              alt={`${displayName}'s banner`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
          
          {/* Username below image */}
          <div className="text-center text-white/80 text-lg font-medium mt-6">
            @{username}'s banner
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing banner lightbox state
export function useBannerLightbox() {
  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    bannerUrl?: string;
    displayName: string;
    username: string;
  }>({
    isOpen: false,
    bannerUrl: '',
    displayName: '',
    username: '',
  });

  const openLightbox = (bannerUrl: string, displayName: string, username: string) => {
    setLightboxData({
      isOpen: true,
      bannerUrl,
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