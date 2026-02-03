import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ClipDialog } from '@/components/clips/ClipDialog';
import { FullscreenReelsViewer } from '@/components/clips/FullscreenReelsViewer';
import { useQuery } from '@tanstack/react-query';
import { ClipWithUser } from '@shared/schema';

interface ClipDialogContextType {
  isOpen: boolean;
  clipId: number | null;
  openClipDialog: (id: number, clipsList?: ClipWithUser[]) => void;
  closeClipDialog: () => void;
}

const ClipDialogContext = createContext<ClipDialogContextType | undefined>(undefined);

export function ClipDialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [clipId, setClipId] = useState<number | null>(null);
  const [clipsList, setClipsList] = useState<ClipWithUser[] | null>(null);

  const openClipDialog = (id: number, providedClipsList?: ClipWithUser[]) => {
    setClipId(id);
    setClipsList(providedClipsList || null);
    setIsOpen(true);
  };

  const closeClipDialog = () => {
    setIsOpen(false);
    setClipId(null);
    setClipsList(null);
  };

  // Get current clip to check if it's a reel
  const { data: currentClip } = useQuery<ClipWithUser>({
    queryKey: [`/api/clips/${clipId}`],
    queryFn: async () => {
      const res = await fetch(`/api/clips/${clipId}`);
      if (!res.ok) throw new Error("Failed to fetch clip");
      return res.json();
    },
    enabled: !!clipId && isOpen,
  });

  const isReel = currentClip?.videoType === 'reel';
  const currentIndex = clipsList ? clipsList.findIndex(clip => clip.id === clipId) : -1;
  // Enable navigation for any clip list with more than 1 clip
  const hasNavigation = clipsList && clipsList.length > 1;

  // Reels now use the regular ClipDialog with 9:16 format and details panel
  // The fullscreen viewer is only triggered via the fullscreen button in ClipDialog
  const showFullscreenReelsViewer = false;

  const handleNext = () => {
    if (!clipsList || currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % clipsList.length;
    setClipId(clipsList[nextIndex].id);
  };

  const handlePrevious = () => {
    if (!clipsList || currentIndex === -1) return;
    const prevIndex = currentIndex === 0 ? clipsList.length - 1 : currentIndex - 1;
    setClipId(clipsList[prevIndex].id);
  };

  return (
    <ClipDialogContext.Provider value={{ isOpen, clipId, openClipDialog, closeClipDialog }}>
      {children}
      {showFullscreenReelsViewer ? (
        <FullscreenReelsViewer
          reels={clipsList || []}
          initialIndex={currentIndex >= 0 ? currentIndex : 0}
          onClose={closeClipDialog}
        />
      ) : (
        <ClipDialog
          clipId={clipId}
          isOpen={isOpen}
          onClose={closeClipDialog}
          onNext={hasNavigation ? handleNext : undefined}
          onPrevious={hasNavigation ? handlePrevious : undefined}
          showNavigation={hasNavigation || false}
        />
      )}
    </ClipDialogContext.Provider>
  );
}

export const useClipDialog = () => {
  const context = useContext(ClipDialogContext);
  if (!context) {
    throw new Error('useClipDialog must be used within a ClipDialogProvider');
  }
  return context;
};