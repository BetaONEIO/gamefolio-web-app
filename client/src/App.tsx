import { Switch, Route, useLocation, useParams } from "wouter";
import { queryClient, getQueryFn } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMobile } from "@/hooks/use-mobile";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ClipDialogProvider } from "@/hooks/use-clip-dialog";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthModalProvider, useAuthModal } from "@/hooks/use-auth-modal";
import { SequenceConnect } from "@0xsequence/connect";
import { sequenceConfig } from "@/lib/sequence-config";
import { WalletProvider, NoWalletProvider } from "@/hooks/use-wallet";
import { CrossmintProvider } from "@/hooks/use-crossmint";
import { CRYPTO_FEATURES_ENABLED } from "@/lib/crypto-features";
import { RevenueCatProvider } from "@/hooks/use-revenuecat";
import { LevelTrackerProvider } from "@/hooks/use-level-tracker";
import { DailyStreakProvider } from "@/hooks/use-daily-streak";
import { useVersionCheck } from "@/hooks/use-version-check";
import { useAndroidBackButton } from "@/hooks/use-android-back-button";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import AuthModal from "@/components/auth/auth-modal";
import DailyXpBonus from "@/components/gamification/DailyXpBonus";
import DailyStreakOverlay from "@/components/gamification/DailyStreak";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AdminProtectedRoute } from "@/components/auth/admin-protected-route";
import { AmbassadorProtectedRoute } from "@/components/auth/ambassador-protected-route";
import { OnboardingGuard } from "@/components/auth/onboarding-guard";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { PageTransition } from "@/components/ui/page-transition";
import { BannerSettings } from "@shared/schema";
import { WebPlatformRedirect } from "@/components/WebPlatformRedirect";

// Layout components
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import MobileNav from "./components/layout/MobileNav";
import MobileMenu from "./components/layout/MobileMenu";
import { PullToRefresh } from "./components/layout/PullToRefresh";
import { ActivityScrollBanner } from "./components/layout/ActivityScrollBanner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, X } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

// Lazy-loaded page components for better performance
import React, { Suspense } from 'react';
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SplashScreen } from "@/components/SplashScreen";
import { DiscordCallback } from "./components/auth/DiscordCallback";
import { XboxCallback } from "./components/auth/XboxCallback";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

// Single gate for all wallet / NFT / store / staking UI. These pages call wagmi
// hooks (useConfig, useAccount, …), which throw "must be used within
// WagmiProvider" unless the SequenceConnect provider tree is mounted. That tree
// only mounts when BOTH the compliance flag is on AND a real Sequence config
// exists — so the routes MUST gate on the same condition. Gating routes on
// CRYPTO_FEATURES_ENABLED alone (while the provider also required sequenceConfig)
// is what let WalletPage render with no provider on native and crash.
const WALLET_UI_ENABLED = CRYPTO_FEATURES_ENABLED && Boolean(sequenceConfig);

async function bustViteDepCache() {
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const depUrls = entries.map(e => e.name).filter(u => u.includes('/.vite/deps') || u.includes('/node_modules/.vite'));
  await Promise.allSettled(depUrls.map(u => fetch(u, { cache: 'reload' })));
}

function isDynamicImportError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    /Loading chunk \S+ failed/i.test(msg)
  );
}

function lazyWithRecovery<T extends React.ComponentType<object>>(
  factory: () => Promise<{ default: T }>
) {
  return React.lazy(() =>
    factory().catch(async (err: unknown) => {
      if (!isDynamicImportError(err)) {
        throw err;
      }
      const key = 'vite_chunk_reload_v1';
      const now = Date.now();
      const RELOAD_TTL_MS = 30_000;
      const last = Number(sessionStorage.getItem(key) || '0');
      if (now - last > RELOAD_TTL_MS) {
        sessionStorage.setItem(key, String(now));
        try { await bustViteDepCache(); } catch {}
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    })
  );
}

const HomePage = lazyWithRecovery(() => import("./pages/HomePageSimple"));
const ProfilePage = lazyWithRecovery(() => import("./pages/ProfilePage"));
const ExplorePage = lazyWithRecovery(() => import("./pages/explore-page"));
const TrendingPage = lazyWithRecovery(() => import("./pages/TrendingPage"));
const GameClipsPage = lazyWithRecovery(() => import("./pages/game-clips-page"));
const GamePage = lazyWithRecovery(() => import("./pages/game-page"));
const HashtagPage = lazyWithRecovery(() => import("./pages/hashtag-page"));
const ClipPage = lazyWithRecovery(() => import("./pages/ClipPage"));
const ClipRedirectPage = lazyWithRecovery(() => import("./pages/ClipRedirectPage"));
const UploadPage = lazyWithRecovery(() => import("./pages/UploadPage"));
const ScreenshotUploadPage = lazyWithRecovery(() => import("./pages/ScreenshotUploadPage"));
const AccountSettingsPage = lazyWithRecovery(() => import("./pages/AccountSettingsPage"));
const GameCategoriesPage = lazyWithRecovery(() => import("./pages/GameCategoriesPage"));
const LeaderboardPage = lazyWithRecovery(() => import("./pages/LeaderboardPage"));
const CustomizePage = lazyWithRecovery(() => import("./pages/customize-page"));
const SettingsPage = lazyWithRecovery(() => import("./pages/settings-page"));
const AuthPage = lazyWithRecovery(() => import("./pages/auth-page"));
const OnboardingPage = lazyWithRecovery(() => import("./pages/onboarding-page"));
const MessagesPage = lazyWithRecovery(() => import("./pages/MessagesPage"));
const LatestReelsPage = lazyWithRecovery(() => import("./pages/LatestReelsPage"));
const LatestClipsPage = lazyWithRecovery(() => import("./pages/LatestClipsPage"));
const LatestScreenshotsPage = lazyWithRecovery(() => import("@/pages/LatestScreenshotsPage"));
const InvitePage = lazyWithRecovery(() => import("./pages/InvitePage"));
const ReferralInvitePage = lazyWithRecovery(() => import("./pages/ReferralInvitePage"));
const RegisterPage = lazyWithRecovery(() => import("./pages/RegisterPage"));
const NotificationsPage = lazyWithRecovery(() => import("./pages/NotificationsPage"));
const FollowersPage = lazyWithRecovery(() => import("./pages/FollowersPage"));
const NotFound = lazyWithRecovery(() => import("@/pages/not-found"));
const AdminPage = lazyWithRecovery(() => import("./pages/AdminPage"));
const AmbassadorDashboardPage = lazyWithRecovery(() => import("./pages/AmbassadorDashboardPage"));
const AdminContentFilter = lazyWithRecovery(() => import("./pages/AdminContentFilter"));
const ContentFilterTest = lazyWithRecovery(() => import("./pages/ContentFilterTest"));
const ViewContentPage = lazyWithRecovery(() => import("./pages/ViewContentPage"));
const PostUploadSuccessPage = lazyWithRecovery(() => import("./pages/PostUploadSuccessPage"));
const VerifyEmailPage = lazyWithRecovery(() => import("./pages/verify-email"));
const VerifyCodePage = lazyWithRecovery(() => import("./pages/verify-code-page"));
const OAuthAuthorizePage = lazyWithRecovery(() => import("./pages/OAuthAuthorizePage"));
const DeveloperHomePage = lazyWithRecovery(() => import("./pages/developer/DeveloperHomePage"));
const MyAppsPage = lazyWithRecovery(() => import("./pages/developer/MyAppsPage"));
const CreateAppPage = lazyWithRecovery(() => import("./pages/developer/CreateAppPage"));
const AppDetailPage = lazyWithRecovery(() => import("./pages/developer/AppDetailPage"));
const ConnectedAppsPage = lazyWithRecovery(() => import("./pages/ConnectedAppsPage"));
const TermsPage = lazyWithRecovery(() => import("./pages/terms-page"));
const PrivacyPage = lazyWithRecovery(() => import("./pages/privacy-page"));
const ContactPage = lazyWithRecovery(() => import("./pages/contact-page"));
const HelpPage = lazyWithRecovery(() => import("./pages/HelpPage"));
const LeaderboardEmbedPage = lazyWithRecovery(() => import("./pages/LeaderboardEmbedPage"));
const StorePage = lazyWithRecovery(() => import("./pages/StorePage"));
const WalletPage = lazyWithRecovery(() => import("./pages/WalletPage"));
const StakingPage = lazyWithRecovery(() => import("./pages/StakingPage"));
const StoragePage = lazyWithRecovery(() => import("./pages/StoragePage"));
const WatchlistPage = lazyWithRecovery(() => import("./pages/WatchlistPage"));
const UserBattlesPage = lazyWithRecovery(() => import("./pages/UserBattlesPage"));
const LevelTrackerPage = lazyWithRecovery(() => import("./pages/LevelTrackerPage"));
const CollectionPage = lazyWithRecovery(() => import("./pages/CollectionPage"));
const BookmarksPage = lazyWithRecovery(() => import("./pages/BookmarksPage"));
const DebugWalletPage = lazyWithRecovery(() => import("./pages/DebugWalletPage"));
const TwoFactorVerifyPage = lazyWithRecovery(() => import("./pages/TwoFactorVerifyPage"));
const MintNFTPage = lazyWithRecovery(() => import("./pages/MintNFTPage"));
const NFTDetailsPage = lazyWithRecovery(() => import("./pages/NFTDetailsPage"));

// Loading component for lazy-loaded routes
function RouteLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Component to handle /auth route redirect to modal
function AuthRedirect() {
  const { openModal } = useAuthModal();
  
  React.useEffect(() => {
    openModal();
    // Redirect to home to avoid URL confusion
    window.history.replaceState({}, '', '/');
  }, [openModal]);
  
  return null;
}


function MainLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useMobile();
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { isOpen, closeModal, defaultTab } = useAuthModal();
  const mainScrollRef = React.useRef<HTMLElement>(null);

  // Version checking for cache busting
  useVersionCheck();

  // Android hardware back button → go back in history, or exit at root
  useAndroidBackButton();

  // Scroll to top on every route change — useLayoutEffect runs before paint
  // so the user never sees the old position flashing before the reset.
  React.useLayoutEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
  }, [location]);

  // Global keyboard height detection — sets --keyboard-height CSS var and `keyboard-open` class on <html>
  const keyboardHeight = useKeyboardHeight();

  // Global focus handler: scroll any focused input/textarea into view above the keyboard
  React.useEffect(() => {
    const isMobileDevice = /iPad|iPhone|iPod|Android/.test(navigator.userAgent) || window.innerWidth < 768;
    if (!isMobileDevice) return;

    const scrollIntoViewSafe = (el: HTMLElement) => {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable)) return;
      // Wait for keyboard to fully open (~300ms) then scroll
      setTimeout(() => scrollIntoViewSafe(t), 320);
    };

    const onViewportResize = () => {
      const t = document.activeElement as HTMLElement | null;
      if (t && (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable)) {
        setTimeout(() => scrollIntoViewSafe(t), 100);
      }
    };

    document.addEventListener('focusin', onFocusIn);
    window.visualViewport?.addEventListener('resize', onViewportResize, { passive: true });
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      window.visualViewport?.removeEventListener('resize', onViewportResize);
    };
  }, []);

  // Radix Dropdown/Dialog race condition (iOS WKWebView especially): opening
  // a Dialog from inside a DropdownMenu item can leave `body { pointer-events:
  // none }` stuck after the dropdown unmounts, locking out every tap until
  // app restart. Clear it whenever no Radix-managed overlay is actually open.
  React.useEffect(() => {
    const id = window.setInterval(() => {
      if (document.body.style.pointerEvents !== 'none') return;
      const openOverlay = document.querySelector(
        '[data-state="open"][role="dialog"],' +
        '[data-state="open"][role="alertdialog"],' +
        '[data-state="open"][role="menu"],' +
        '[data-state="open"][role="listbox"]'
      );
      if (!openOverlay) document.body.style.pointerEvents = '';
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  // Tapping a system push surfaces the actionUrl through this custom event.
  // Route into the SPA when the user opens a push that targets a specific
  // page (clip, profile, follow request, etc.).
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ actionUrl?: string }>).detail;
      const target = detail?.actionUrl;
      if (target && typeof target === 'string' && target.startsWith('/')) {
        setLocation(target);
      }
    };
    window.addEventListener('gf-push-deeplink', handler as EventListener);
    return () => window.removeEventListener('gf-push-deeplink', handler as EventListener);
  }, [setLocation]);

  // Universal Links (iOS) / App Links (Android): when the installed app is
  // opened via an https://app.gamefolio.com content link, Capacitor fires
  // appUrlOpen with the full URL. Route its path into the SPA so the link
  // lands on the same page it would have in the browser.
  React.useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cleanup: (() => void) | undefined;
    CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      try {
        const parsed = new URL(url);
        // Only route our web domain — OAuth custom-scheme callbacks
        // (com.gamefolio.app://…) are handled elsewhere.
        if (parsed.hostname === 'app.gamefolio.com') {
          setLocation(parsed.pathname + parsed.search + parsed.hash);
        }
      } catch {
        /* not a parseable URL — ignore */
      }
    }).then((handle) => {
      cleanup = () => handle.remove();
    });
    return () => cleanup?.();
  }, [setLocation]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("pro_payment") === "success") {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      params.delete("pro_payment");
      params.delete("pi");
      params.delete("plan");
      params.delete("payment_intent");
      params.delete("payment_intent_client_secret");
      params.delete("redirect_status");
      const cleanUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);
  
  // Banner state
  const [isBannerDismissed, setIsBannerDismissed] = React.useState(false);
  
  // Fetch banner settings from API
  const { data: bannerSettings, isLoading: isLoadingBanner } = useQuery<BannerSettings>({
    queryKey: ['/api/banner-settings'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  React.useEffect(() => {
    try {
      const dismissed = localStorage.getItem('banner-dismissed');
      setIsBannerDismissed(dismissed === 'true');
    } catch {
    }
  }, []);

  React.useEffect(() => {
    try {
      if (bannerSettings && bannerSettings.updatedAt) {
        const lastDismissalTime = localStorage.getItem('banner-dismissed-time');
        const bannerUpdateTime = new Date(bannerSettings.updatedAt).getTime();
        
        if (!lastDismissalTime || bannerUpdateTime > parseInt(lastDismissalTime)) {
          setIsBannerDismissed(false);
          localStorage.removeItem('banner-dismissed');
          localStorage.removeItem('banner-dismissed-time');
        }
      }
    } catch {
    }
  }, [bannerSettings]);
  
  const dismissBanner = () => {
    setIsBannerDismissed(true);
    try {
      localStorage.setItem('banner-dismissed', 'true');
      localStorage.setItem('banner-dismissed-time', Date.now().toString());
    } catch {
    }
  };

  // developer.gamefolio.com is a dedicated developer-portal site — it keeps
  // the Header (branding + login) and AuthModal so auth still works, but
  // drops the consumer app's Sidebar/MobileNav/MobileMenu and promotional
  // banners, none of which make sense outside the main app.
  const isDeveloperSubdomain = window.location.hostname === 'developer.gamefolio.com';

  // Don't render layout for onboarding, verification, password reset, embed pages, and public view pages
  const isAuthOrOnboarding = location.startsWith("/onboarding") ||
                           location.startsWith("/verify-email") ||
                           location.startsWith("/verify-code") ||
                           location.startsWith("/oauth/consent") ||
                           location.startsWith("/embed/") ||
                           location.startsWith("/leaderboard/embed") ||
                           location.startsWith("/view/") ||
                           location === "/invite" ||
                           location === "/register";

  if (isAuthOrOnboarding) {
    return <>{children}</>;
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      <Header />

      {/* Email Verification Banner - shown app-wide until the user verifies */}
      {!isDeveloperSubdomain && user && !user.emailVerified && (
        <div className={`px-4 mt-2 relative z-20 ${!isMobile ? 'ml-64' : ''}`}>
          <EmailVerificationBanner />
        </div>
      )}

      {/* Activity Scroll Banner - Only show on home page */}
      {!isDeveloperSubdomain && location === "/" && <ActivityScrollBanner />}

      {/* Dynamic Banner */}
      {!isDeveloperSubdomain && !isLoadingBanner && bannerSettings && bannerSettings.isEnabled && !isBannerDismissed && (
        <Alert className={`mx-4 mt-2 border-primary/30 bg-primary/10 backdrop-blur-sm relative z-20 ${!isMobile ? 'ml-64' : ''}`}>
          {bannerSettings.showIcon && <AlertTriangle className="h-4 w-4 text-primary" />}
          <AlertDescription className="text-foreground flex items-center justify-between">
            <span>
              <strong className="text-primary">{bannerSettings.title}:</strong> {bannerSettings.message}
              {bannerSettings.linkText && bannerSettings.linkUrl && (
                <>
                  {" "}If you experience any problems, please {" "}
                  <Link 
                    href={bannerSettings.linkUrl} 
                    className="text-primary underline hover:no-underline font-medium hover:text-primary/80 transition-colors"
                    data-testid="link-bug-report"
                  >
                    {bannerSettings.linkText}
                  </Link>
                  !
                </>
              )}
            </span>
            {bannerSettings.isDismissible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissBanner}
                className="ml-4 h-6 w-6 p-0 text-primary hover:text-primary/80 hover:bg-primary/20"
                data-testid="button-dismiss-banner"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Mobile Menu Overlay */}
      {!isDeveloperSubdomain && <MobileMenu />}

      <div className="flex flex-1 min-h-0 relative z-10">
        {!isDeveloperSubdomain && !isMobile && <Sidebar />}

        <main
          ref={mainScrollRef}
          className={`flex-1 overflow-y-auto overflow-x-hidden w-full scrollbar-hide bg-background ${!isDeveloperSubdomain && !isMobile ? 'ml-64' : ''}`}
          style={{
            ...(isMobile && keyboardHeight > 0 ? { paddingBottom: `${keyboardHeight}px` } : {}),
            overflowAnchor: 'none',
          }}
        >
          <PullToRefresh
            containerRef={mainScrollRef}
            onRefresh={() => queryClient.invalidateQueries()}
          >
            <div className="px-0 py-0">
              {children}
            </div>
          </PullToRefresh>
        </main>
      </div>

      {!isDeveloperSubdomain && isMobile && <MobileNav />}
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={isOpen} 
        onClose={closeModal} 
        defaultTab={defaultTab} 
      />
    </div>
  );
}


// developer.gamefolio.com is meant to be a dedicated developer-portal site
// (sign up, register an app, use the OAuth API) rather than the consumer home
// feed — render the developer portal directly at its root path rather than
// navigating to /developer, so the URL bar doesn't show the redundant-looking
// "developer.gamefolio.com/developer". Every other route (login,
// /oauth/authorize, /api/public/v1/*, etc.) behaves identically regardless of
// hostname, since Express/wouter don't otherwise branch on it.
const DEVELOPER_SUBDOMAIN_HOSTNAME = 'developer.gamefolio.com';

function RootRoute() {
  const isDeveloperSubdomain = window.location.hostname === DEVELOPER_SUBDOMAIN_HOSTNAME;
  if (isDeveloperSubdomain) return <DeveloperHomePage />;
  return <HomePage />;
}

function Router() {
  return (
    <PageTransition>
      <OnboardingGuard>
        <Suspense fallback={<RouteLoader />}>
          <Switch>
          {/* Public routes accessible to guests */}
          <Route path="/" component={RootRoute} />
          <Route path="/trending" component={TrendingPage} />
          <Route path="/clip/:id" component={ClipRedirectPage} />
          <Route path="/clips/:id" component={ClipRedirectPage} />
          <Route path="/reel/:id" component={ClipRedirectPage} />
          <Route path="/reels/:id" component={ClipRedirectPage} />
          <Route path="/@:username/clip/:clipId" component={ClipRedirectPage} />
          <Route path="/@:username/clips/:clipId" component={ClipRedirectPage} />
          <Route path="/@:username/reel/:reelId" component={ClipRedirectPage} />
          <Route path="/@:username/reels/:reelId" component={ClipRedirectPage} />
          
          {/* Test route without @ symbol as fallback */}
          <Route path="/:username/clip/:clipId" component={ClipRedirectPage} />
          <Route path="/:username/reel/:reelId" component={ClipRedirectPage} />
          <Route path="/screenshots/:id" component={ScreenshotUploadPage} />
          <Route path="/@:username/screenshot/:shareCode" component={ProfilePage} />
          <Route path="/@:username/screenshots/:screenshotId" component={ProfilePage} />
          <Route path="/:username/screenshot/:shareCode" component={ProfilePage} />
          <Route path="/profile/:username" component={ProfilePage} />

          {/* Protected routes requiring authentication */}
          <Route path="/explore" component={ExplorePage} />
          <Route path="/games/:gameSlug" component={GamePage} />
          <Route path="/games/:gameId/clips" component={GameClipsPage} />
          <ProtectedRoute path="/hashtag/:hashtag" component={HashtagPage} />
          <ProtectedRoute path="/upload" component={UploadPage} />
          <ProtectedRoute path="/upload/screenshots" component={ScreenshotUploadPage} />
          <ProtectedRoute path="/upload-success" component={PostUploadSuccessPage} />
          <ProtectedRoute path="/upload-success/:contentType/:contentId" component={PostUploadSuccessPage} />
          <ProtectedRoute path="/account/settings" component={AccountSettingsPage} />
          <ProtectedRoute path="/customize" component={CustomizePage} />
          <ProtectedRoute path="/settings/profile" component={SettingsPage} />
          <Route path="/browse/games/:category" component={GameCategoriesPage} />
          <Route path="/browse/games/categories" component={GameCategoriesPage} />
          <Route path="/leaderboard" component={LeaderboardPage} />
          <ProtectedRoute path="/messages" component={MessagesPage} />
          <ProtectedRoute path="/notifications" component={NotificationsPage} />
          <Route path="/latest-reels" component={LatestReelsPage} />
          <Route path="/latest-clips" component={LatestClipsPage} />
          <Route path="/latest-screenshots" component={LatestScreenshotsPage} />

          <AmbassadorProtectedRoute path="/ambassador-dashboard" component={AmbassadorDashboardPage} />
          <AdminProtectedRoute path="/admin" component={AdminPage} />
          <AdminProtectedRoute path="/admin/content-filter" component={AdminContentFilter} />
          <ProtectedRoute path="/test/content-filter" component={ContentFilterTest} />

          {/* Routes that bypass onboarding guard */}
          <Route path="/auth" component={AuthRedirect} />
          <Route path="/auth/discord/callback" component={DiscordCallback} />
          <Route path="/auth/xbox/callback" component={XboxCallback} />
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/verify-email" component={VerifyEmailPage} />
          <Route path="/verify-code" component={VerifyCodePage} />
          <Route path="/oauth/consent" component={OAuthAuthorizePage} />
          <Route path="/developer" component={DeveloperHomePage} />
          <ProtectedRoute path="/developer/apps/new" component={CreateAppPage} />
          <ProtectedRoute path="/developer/apps/:id" component={AppDetailPage} />
          <ProtectedRoute path="/developer/apps" component={MyAppsPage} />
          <Route path="/settings/connected-apps" component={ConnectedAppsPage} />
          <Route path="/2fa-verify" component={TwoFactorVerifyPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/help" component={HelpPage} />
          <Route path="/invite/:code" component={ReferralInvitePage} />
          <Route path="/invite" component={InvitePage} />
          <Route path="/register" component={RegisterPage} />
          {/* Web3 routes: full feature on web; branded redirect to app.gamefolio.com on native. */}
          <Route path="/store" component={WALLET_UI_ENABLED ? StorePage : () => (
            <WebPlatformRedirect
              title="Gamefolio Store"
              description="Browse and purchase cosmetics, borders, name tags, and exclusive items. The full store is available on our web platform."
            />
          )} />
          <Route path="/mint-nft" component={WALLET_UI_ENABLED ? MintNFTPage : () => (
            <WebPlatformRedirect
              title="Mint Your NFT"
              description="Create and mint unique NFTs on the SKALE network. NFT minting is available on the Gamefolio web platform."
            />
          )} />
          <Route path="/nft/:id" component={WALLET_UI_ENABLED ? NFTDetailsPage : () => (
            <WebPlatformRedirect
              title="NFT Collectibles"
              description="View, trade, and manage your NFT collection. Access the full NFT marketplace on the Gamefolio web platform."
            />
          )} />
          <Route path="/wallet" component={WALLET_UI_ENABLED ? WalletPage : () => (
            <WebPlatformRedirect
              title="Your Wallet"
              description="Manage your GFT token balance, transactions, and wallet settings securely on the Gamefolio web platform."
            />
          )} />
          <Route path="/staking" component={WALLET_UI_ENABLED ? StakingPage : () => (
            <WebPlatformRedirect
              title="GFT Staking"
              description="Stake your GFT tokens to earn rewards and boost your creator status. Staking is available on the Gamefolio web platform."
            />
          )} />
          <Route path="/storage" component={StoragePage} />
          <Route path="/watchlist" component={WALLET_UI_ENABLED ? WatchlistPage : () => (
            <WebPlatformRedirect
              title="NFT Watchlist"
              description="Track your favourite NFTs and monitor floor prices. Your watchlist is available on the Gamefolio web platform."
            />
          )} />
          <Route path="/battles" component={UserBattlesPage} />
          <Route path="/user-battles" component={UserBattlesPage} />
          <ProtectedRoute path="/level-tracker" component={LevelTrackerPage} />
          {/* Collection renders on native too (browse-only): the page is server-
              sourced and uses no wallet provider at render time. Transaction
              actions (Quick Sell) are disabled on native — see MintedNftDetailScreen. */}
          <ProtectedRoute path="/collection" component={CollectionPage} />
          <ProtectedRoute path="/bookmarks" component={BookmarksPage} />
          <Route path="/leaderboard/embed" component={LeaderboardEmbedPage} />
          <Route path="/debug/wallet" component={WALLET_UI_ENABLED ? DebugWalletPage : () => (
            <WebPlatformRedirect title="Wallet" />
          )} />

          {/* Public view routes for shareable content */}
          <Route path="/view/screenshot/:id" component={ViewContentPage} />
          <Route path="/view/:id" component={ViewContentPage} />

          {/* Followers / following full-page view (single route, tab via ?tab=following) */}
          <Route path="/profile/:username/followers" component={FollowersPage} />

          {/* Custom profile link route - matches gamefolio.gg/username pattern */}
          {/* General profile routes - MUST be at bottom after all specific routes */}
          <Route path="/@:username" component={ProfilePage} />
          <Route path="/:username" component={ProfilePage} />

          <Route component={NotFound} />
          </Switch>
        </Suspense>
      </OnboardingGuard>
    </PageTransition>
  );
}

function App() {
  const [splashDone, setSplashDone] = React.useState(false);

  return (
    <>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      <ErrorBoundary level="app">
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <DailyStreakProvider>
              <AuthProvider>
                <RevenueCatProvider>
                  <LevelTrackerProvider>
                      {WALLET_UI_ENABLED && sequenceConfig ? (
                      <SequenceConnect config={sequenceConfig}>
                        <WalletProvider>
                          <CrossmintProvider>
                            <AuthModalProvider>
                              <ClipDialogProvider>
                                <MainLayout>
                                  <ErrorBoundary level="feature">
                                    <Router />
                                  </ErrorBoundary>
                                </MainLayout>
                                <DailyXpBonus />
                                <DailyStreakOverlay />
                              </ClipDialogProvider>
                              <Toaster />
                            </AuthModalProvider>
                          </CrossmintProvider>
                        </WalletProvider>
                      </SequenceConnect>
                      ) : (
                        <NoWalletProvider>
                          <CrossmintProvider>
                            <AuthModalProvider>
                              <ClipDialogProvider>
                                <MainLayout>
                                  <ErrorBoundary level="feature">
                                    <Router />
                                  </ErrorBoundary>
                                </MainLayout>
                                <DailyXpBonus />
                                <DailyStreakOverlay />
                              </ClipDialogProvider>
                              <Toaster />
                            </AuthModalProvider>
                          </CrossmintProvider>
                        </NoWalletProvider>
                      )}
                  </LevelTrackerProvider>
                </RevenueCatProvider>
              </AuthProvider>
              </DailyStreakProvider>
            </TooltipProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </>
  );
}

export default App;