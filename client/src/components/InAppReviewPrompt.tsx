import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { recordNativeLaunch, scheduleInAppReview } from '@/lib/app-review';

export function InAppReviewPrompt() {
  const { user } = useAuth();
  const launchRef = useRef<ReturnType<typeof recordNativeLaunch> | undefined>(undefined);

  useEffect(() => {
    launchRef.current ??= recordNativeLaunch();
  }, []);

  useEffect(() => {
    if (!user || !launchRef.current) return;

    let cancelled = false;
    let cancelTimer = () => {};
    void scheduleInAppReview(launchRef.current).then((cancel) => {
      if (cancelled) cancel();
      else cancelTimer = cancel;
    });

    return () => {
      cancelled = true;
      cancelTimer();
    };
  }, [user]);

  return null;
}
