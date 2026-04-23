import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { isNative, isIOS, isAndroid } from './platform';

export async function initMobileShell(): Promise<void> {
  if (!isNative) return;

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
