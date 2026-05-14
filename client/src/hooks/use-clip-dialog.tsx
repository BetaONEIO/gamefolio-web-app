import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { ClipDialog } from '@/components/clips/ClipDialog';
import { FullscreenReelsViewer } from '@/components/clips/FullscreenReelsViewer';
import { useQuery } from '@tanstack/react-query';
import { ClipWithUser } from '@shared/schema';

interface ClipDialogContextType {
  isOpen: boolean;
  clipId: number | null;
  openClipDialog: (id: number, clipsList?: ClipWithUser[], viewAllHref?: string) => void;
  closeClipDialog: () => void;
}

// Preserve context across Vite HMR re-evaluations. When Vite re-evaluates
// this module, createContext() would produce a NEW object — but the
// ClipDialogProvider already mounted in the tree holds the OLD one, causing
// useContext to return undefined and crash. import.meta.hot.data persists
// across invalidations so we can reuse the same context instance.
const ClipDialogContext: React.Context<ClipDialogContextType | undefined> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta.hot?.data as any)?.clipDialogCtx ??
  createContext<ClipDialogContextType | undefined>(undefined);

if (import.meta.hot) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta.hot.data as any).clipDialogCtx = ClipDialogContext;
}

export function ClipDialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [clipId, setClipId] = useState<number | null>(null);
  const [clipsList, setClipsList] = useState<ClipWithUser[] | null>(null);
  const [viewAllHref, setViewAllHref] = useState<string | undefined>(undefined);
  const previousUrlRef = useRef<string | null>(null);

  const buildClipUrl = (clip: ClipWithUser) => {
    const username = clip.user?.username;
    const shareCode = clip.shareCode;
    const type = clip.videoType === 'reel' ? 'reel' : 'clip';
    if (username && shareCode) return `/@${username}/${type}/${shareCode}`;
    return `/${type}/${clip.id}`;
  };

  const openClipDialog = (id: number, providedClipsList?: ClipWithUser[], href?: string) => {
    previousUrlRef.current = window.location.pathname + window.location.search + window.location.hash;
    setClipId(id);
    setClipsList(providedClipsList || null);
    setViewAllHref(href);
    setIsOpen(true);
    // If the clip is in the provided list we can build the pretty URL right away
    const matchingClip = providedClipsList?.find(c => c.id === id);
    if (matchingClip) {
      window.history.replaceState(null, '', buildClipUrl(matchingClip));
    } else {
      window.history.replaceState(null, '', `/clip/${id}`);
    }
  };

  const closeClipDialog = () => {
    if (previousUrlRef.current) {
      window.history.replaceState(null, '', previousUrlRef.current);
      previousUrlRef.current = null;
    }
    setIsOpen(false);
    setClipId(null);
    setClipsList(null);
    setViewAllHref(undefined);
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

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Once currentClip data loads, refine the URL to the pretty /@username/type/shareCode format
  useEffect(() => {
    if (!isOpen || !clipId || !currentClip) return;
    window.history.replaceState(null, '', buildClipUrl(currentClip));
  }, [isOpen, clipId, currentClip?.shareCode, currentClip?.videoType]);

  const showFullscreenReelsViewer = isReel && isMobile && isOpen && clipsList && clipsList.length > 0;

  const handleNext = () => {
    if (!clipsList || currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % clipsList.length;
    const nextClip = clipsList[nextIndex];
    setClipId(nextClip.id);
    window.history.replaceState(null, '', buildClipUrl(nextClip));
  };

  const handlePrevious = () => {
    if (!clipsList || currentIndex === -1) return;
    const prevIndex = currentIndex === 0 ? clipsList.length - 1 : currentIndex - 1;
    const prevClip = clipsList[prevIndex];
    setClipId(prevClip.id);
    window.history.replaceState(null, '', buildClipUrl(prevClip));
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
          viewAllHref={viewAllHref}
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
