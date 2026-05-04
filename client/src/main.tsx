import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initEmailJS } from "./services/email-service";
import { installNativeFetchPatch } from "./lib/platform";
import { initMobileShell } from "./lib/mobile-init";
import { ensureHydrated as ensureAuthTokensHydrated } from "./lib/auth-token";

installNativeFetchPatch();
void initMobileShell();
void ensureAuthTokensHydrated();

const adsenseClientId = import.meta.env.VITE_ADSENSE_CLIENT_ID?.trim();
if (adsenseClientId) {
  const adsenseScript = document.createElement("script");
  adsenseScript.async = true;
  adsenseScript.crossOrigin = "anonymous";
  adsenseScript.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClientId)}`;
  document.head.appendChild(adsenseScript);
}

// Set page title
document.title = "Gamefolio - Share Your Gaming Moments";

// Add meta description for SEO
const metaDescription = document.createElement('meta');
metaDescription.name = 'description';
metaDescription.content = 'Gamefolio is a social platform for gamers to share and discover gaming clips, customize profiles, and connect with other players.';
document.head.appendChild(metaDescription);

// Add Open Graph tags for better social sharing
const ogTitle = document.createElement('meta');
ogTitle.property = 'og:title';
ogTitle.content = 'Gamefolio - Share Your Gaming Moments';
document.head.appendChild(ogTitle);

const ogDescription = document.createElement('meta');
ogDescription.property = 'og:description';
ogDescription.content = 'Join Gamefolio, the Instagram for gamers. Share your best gaming clips, follow other players, and discover trending games.';
document.head.appendChild(ogDescription);

const ogType = document.createElement('meta');
ogType.property = 'og:type';
ogType.content = 'website';
document.head.appendChild(ogType);


// Initialize EmailJS
initEmailJS();

// Add global error handlers to prevent unhandled promise rejections
// This prevents MetaMask connection errors from browser extensions
window.addEventListener('unhandledrejection', (event) => {
  // Check if error is related to browser extensions or MetaMask
  const error = event.reason;
  const errorMessage = error?.message || error?.toString() || '';
  
  if (errorMessage.includes('MetaMask') || 
      errorMessage.includes('ethereum') || 
      errorMessage.includes('web3') ||
      errorMessage.includes('chrome-extension')) {
    // Silently prevent MetaMask/browser extension errors from showing
    event.preventDefault();
    console.debug('Browser extension error prevented:', errorMessage);
    return;
  }
  
  // Handle video-related promise rejections
  if (errorMessage.includes('play()') || 
      errorMessage.includes('video') ||
      errorMessage.includes('AbortError') ||
      errorMessage.includes('NotAllowedError')) {
    event.preventDefault();
    console.debug('Video playback error handled:', errorMessage);
    return;
  }
  
  // Log other unhandled rejections for debugging
  console.warn('Unhandled promise rejection:', error);
});

// Global error handler for any remaining errors
window.addEventListener('error', (event) => {
  const error = event.error;
  const errorMessage = error?.message || event.message || '';
  
  // Prevent browser extension errors from showing
  if (errorMessage.includes('MetaMask') || 
      errorMessage.includes('chrome-extension') || 
      errorMessage.includes('web3')) {
    event.preventDefault();
    console.debug('Browser extension error prevented:', errorMessage);
    return;
  }
});

createRoot(document.getElementById("root")!).render(<App />);
