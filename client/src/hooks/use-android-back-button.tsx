import { useEffect } from 'react';
import { App } from '@capacitor/app';
import * as Sentry from '@sentry/capacitor';
import { isAndroid } from '@/lib/platform';

export function useAndroidBackButton(): void {
  useEffect(() => {
    if (!isAndroid) return;

    const subscription = App.addListener('backButton', ({ canGoBack }) => {
      // Diagnostic for a suspected spurious-backButton-on-resume issue on some
      // Android OEMs (seen navigating a user off /upload mid-upload with no
      // actual back-button tap). Breadcrumb-only so it shows up on whatever
      // error the stray navigation causes downstream, without spamming Sentry
      // on its own.
      Sentry.addBreadcrumb({
        category: 'android-back-button',
        message: `backButton fired: canGoBack=${canGoBack}, path=${window.location.pathname}`,
        level: 'info',
      });
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    return () => {
      void subscription.then((handle) => handle.remove());
    };
  }, []);
}
