import { useEffect, useState } from 'react';

let globalListenersAdded = false;

function updateKeyboardHeight() {
  if (!window.visualViewport) return;
  const vv = window.visualViewport;
  const kbHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  document.documentElement.style.setProperty('--keyboard-height', `${kbHeight}px`);
  document.documentElement.style.setProperty('--visual-viewport-height', `${vv.height}px`);
  document.documentElement.classList.toggle('keyboard-open', kbHeight > 50);
}

function addGlobalKeyboardListeners() {
  if (globalListenersAdded || !window.visualViewport) return;
  globalListenersAdded = true;
  window.visualViewport.addEventListener('resize', updateKeyboardHeight, { passive: true });
  window.visualViewport.addEventListener('scroll', updateKeyboardHeight, { passive: true });
  updateKeyboardHeight();
}

export function useKeyboardHeight(): number {
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    if (!window.visualViewport) return;

    addGlobalKeyboardListeners();

    const update = () => {
      const vv = window.visualViewport!;
      const h = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbHeight(h);
    };

    window.visualViewport.addEventListener('resize', update, { passive: true });
    window.visualViewport.addEventListener('scroll', update, { passive: true });
    update();

    return () => {
      window.visualViewport!.removeEventListener('resize', update);
      window.visualViewport!.removeEventListener('scroll', update);
    };
  }, []);

  return kbHeight;
}

export function useIsKeyboardOpen(): boolean {
  return useKeyboardHeight() > 50;
}
