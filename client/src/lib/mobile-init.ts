import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { App as CapacitorApp } from '@capacitor/app';
import { isNative, isIOS, isAndroid } from './platform';
import { initNativeAuthBridge } from './native-auth-bridge';
import { queryClient } from './queryClient';

// Tracks the last time the app went to background. Used to gate the
// "we were away long enough that data is probably stale" refetch on resume
// so we don't refetch on every quick app switch.
let lastBackgroundedAt: number | null = null;
const RESUME_REFETCH_THRESHOLD_MS = 30_000;

function refetchAfterResume(): void {
  // Invalidate the most user-visible queries. Other queries refetch on demand
  // when their owning components mount, so a broad invalidation here would
  // create unnecessary network traffic on every foreground.
  void queryClient.invalidateQueries({ queryKey: ['/api/user'] });
  void queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
  void queryClient.invalidateQueries({ queryKey: ['/api/token/balance'] });
  void queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
  // Long-lived sockets (notifications) can be silently dropped while the
  // WebView is backgrounded and never receive a `close` event. Broadcast a
  // resume signal so socket-owning components (e.g. NotificationPanel) can
  // tear down and re-open their WebSocket.
  try {
    window.dispatchEvent(new CustomEvent('app-resumed'));
  } catch {
    /* SSR / older webview — safe to ignore */
  }
}

export async function initMobileShell(): Promise<void> {
  if (!isNative) return;

  // Register deep-link listener for OAuth callbacks (Discord/Xbox/etc.)
  initNativeAuthBridge();

  // App lifecycle: invalidate user-facing queries when returning from
  // background so notifications / Pro status / GFT balance recover even if
  // the WebView (and any open WebSockets) was paused for a few minutes.
  try {
    await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        const wasBackgrounded =
          lastBackgroundedAt !== null &&
          Date.now() - lastBackgroundedAt >= RESUME_REFETCH_THRESHOLD_MS;
        if (wasBackgrounded) {
          refetchAfterResume();
        }
        lastBackgroundedAt = null;
      } else {
        lastBackgroundedAt = Date.now();
      }
    });
    await CapacitorApp.addListener('resume', () => {
      // Belt-and-braces: some Android OEMs deliver `resume` without a prior
      // `appStateChange(false)`. Honour the same 30 s threshold so a quick
      // app-switcher peek doesn't trigger a refetch storm.
      if (
        lastBackgroundedAt !== null &&
        Date.now() - lastBackgroundedAt >= RESUME_REFETCH_THRESHOLD_MS
      ) {
        refetchAfterResume();
      }
      lastBackgroundedAt = null;
    });
  } catch (err) {
    console.warn('App lifecycle listeners failed:', err);
  }

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (isAndroid) {
      await StatusBar.setBackgroundColor({ color: '#101D27' });
    }
    if (isIOS) {
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch (err) {
    console.warn('StatusBar init failed:', err);
  }

  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
    if (isIOS) {
      await Keyboard.setAccessoryBarVisible({ isVisible: false });
    }
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-visible');
    });
    Keyboard.addListener('keyboardDidHide', () => {
      document.body.classList.remove('keyboard-visible');
    });
  } catch (err) {
    console.warn('Keyboard init failed:', err);
  }

  try {
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch (err) {
    console.warn('SplashScreen hide failed:', err);
  }
}
