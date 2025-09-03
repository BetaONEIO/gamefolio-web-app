import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ClipDialog } from '@/components/clips/ClipDialog';
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
  const [reelsList, setReelsList] = useState<ClipWithUser[] | null>(null);

  const openClipDialog = (id: number, clipsList?: ClipWithUser[]) => {
    setClipId(id);
    setReelsList(clipsList || null);
    setIsOpen(true);
  };

  const closeClipDialog = () => {
    setIsOpen(false);
    setClipId(null);
    setReelsList(null);
  };

  // Get current clip to check if it's a reel
  const { data: currentClip } = useQuery<ClipWithUser>({
    queryKey: [`/api/clips/${clipId}`],
    enabled: !!clipId && isOpen,
  });

  const isReel = currentClip?.videoType === 'reel';
  const currentIndex = reelsList ? reelsList.findIndex(clip => clip.id === clipId) : -1;
  // Enable navigation for any clip list with more than 1 clip, not just reels
  const hasNavigation = reelsList && reelsList.length > 1;

  const handleNext = () => {
    if (!reelsList || currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % reelsList.length;
    setClipId(reelsList[nextIndex].id);
  };

  const handlePrevious = () => {
    if (!reelsList || currentIndex === -1) return;
    const prevIndex = currentIndex === 0 ? reelsList.length - 1 : currentIndex - 1;
    setClipId(reelsList[prevIndex].id);
  };

  return (
    <ClipDialogContext.Provider value={{ isOpen, clipId, openClipDialog, closeClipDialog }}>
      {children}
      <ClipDialog
        clipId={clipId}
        isOpen={isOpen}
        onClose={closeClipDialog}
        onNext={hasNavigation ? handleNext : undefined}
        onPrevious={hasNavigation ? handlePrevious : undefined}
        showNavigation={hasNavigation || false}
      />
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