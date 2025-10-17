import { Switch, Route, useLocation, useParams } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMobile } from "@/hooks/use-mobile";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ClipDialogProvider } from "@/hooks/use-clip-dialog";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthModalProvider, useAuthModal } from "@/hooks/use-auth-modal";
import { CrossmintProvider } from "@/hooks/use-crossmint";
import { useVersionCheck } from "@/hooks/use-version-check";
import AuthModal from "@/components/auth/auth-modal";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AdminProtectedRoute } from "@/components/auth/admin-protected-route";
import { OnboardingGuard } from "@/components/auth/onboarding-guard";
import { PageTransition } from "@/components/ui/page-transition";
import { BannerSettings } from "@shared/schema";

// Layout components
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import MobileNav from "./components/layout/MobileNav";
import MobileMenu from "./components/layout/MobileMenu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, X } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

// Lazy-loaded page components for better performance
import React, { Suspense } from 'react';
import { DiscordCallback } from "./components/auth/DiscordCallback";

const HomePage = React.lazy(() => import("./pages/HomePageSimple"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
const ExplorePage = React.lazy(() => import("./pages/explore-page"));
const TrendingPage = React.lazy(() => import("./pages/TrendingPage"));
const GameClipsPage = React.lazy(() => import("./pages/game-clips-page"));
const GamePage = React.lazy(() => import("./pages/game-page"));
const HashtagPage = React.lazy(() => import("./pages/hashtag-page"));
const ClipPage = React.lazy(() => import("./pages/ClipPage"));
const UploadPage = React.lazy(() => import("./pages/UploadPage"));
const ScreenshotUploadPage = React.lazy(() => import("./pages/ScreenshotUploadPage"));
const AccountSettingsPage = React.lazy(() => import("./pages/AccountSettingsPage"));
const AppearanceSettingsPage = React.lazy(() => import("./pages/AppearanceSettingsPage"));
const GameCategoriesPage = React.lazy(() => import("./pages/GameCategoriesPage"));
const LeaderboardPage = React.lazy(() => import("./pages/LeaderboardPage"));
const CustomizePage = React.lazy(() => import("./pages/customize-page"));
const SettingsPage = React.lazy(() => import("./pages/settings-page"));
const AuthPage = React.lazy(() => import("./pages/auth-page"));
const OnboardingPage = React.lazy(() => import("./pages/onboarding-page"));
const MessagesPage = React.lazy(() => import("./pages/MessagesPage"));
const LatestReelsPage = React.lazy(() => import("./pages/LatestReelsPage"));
const LatestClipsPage = React.lazy(() => import("./pages/LatestClipsPage"));
const NotFound = React.lazy(() => import("@/pages/not-found"));
const AdminPage = React.lazy(() => import("./pages/AdminPage"));
const AdminContentFilter = React.lazy(() => import("./pages/AdminContentFilter"));
const ContentFilterTest = React.lazy(() => import("./pages/ContentFilterTest"));
const ViewContentPage = React.lazy(() => import("./pages/ViewContentPage"));
const PostUploadSuccessPage = React.lazy(() => import("./pages/PostUploadSuccessPage"));
const VerifyEmailPage = React.lazy(() => import("./pages/verify-email"));
const VerifyCodePage = React.lazy(() => import("./pages/verify-code-page"));
const ResetPasswordPage = React.lazy(() => import("./pages/ResetPasswordPage"));
const TermsPage = React.lazy(() => import("./pages/terms-page"));
const PrivacyPage = React.lazy(() => import("./pages/privacy-page"));
const ContactPage = React.lazy(() => import("./pages/contact-page"));
const HelpPage = React.lazy(() => import("./pages/help-page"));
const LeaderboardEmbedPage = React.lazy(() => import("./pages/LeaderboardEmbedPage"));
const StorePage = React.lazy(() => import("./pages/StorePage"));
const WalletPage = React.lazy(() => import("./pages/WalletPage"));
const StoragePage = React.lazy(() => import("./pages/StoragePage"));

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
  const [location] = useLocation();
  const { isOpen, closeModal, defaultTab } = useAuthModal();
  
  // Version checking for cache busting
  useVersionCheck();
  
  // Banner state
  const [isBannerDismissed, setIsBannerDismissed] = React.useState(false);
  
  // Fetch banner settings from API
  const { data: bannerSettings, isLoading: isLoadingBanner } = useQuery<BannerSettings>({
    queryKey: ['/api/banner-settings'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Load banner dismissal state from localStorage on mount
  React.useEffect(() => {
    const dismissed = localStorage.getItem('banner-dismissed');
    setIsBannerDismissed(dismissed === 'true');
  }, []);

  // Reset banner dismissal state when banner settings change
  React.useEffect(() => {
    if (bannerSettings && bannerSettings.updatedAt) {
      const lastDismissalTime = localStorage.getItem('banner-dismissed-time');
      const bannerUpdateTime = new Date(bannerSettings.updatedAt).getTime();
      
      // If banner was updated after last dismissal, reset dismissal state
      if (!lastDismissalTime || bannerUpdateTime > parseInt(lastDismissalTime)) {
        setIsBannerDismissed(false);
        localStorage.removeItem('banner-dismissed');
        localStorage.removeItem('banner-dismissed-time');
      }
    }
  }, [bannerSettings]);
  
  // Handle banner dismissal
  const dismissBanner = () => {
    setIsBannerDismissed(true);
    localStorage.setItem('banner-dismissed', 'true');
    localStorage.setItem('banner-dismissed-time', Date.now().toString());
  };

  // Don't render layout for onboarding, verification, password reset, embed pages, and public view pages
  const isAuthOrOnboarding = location.startsWith("/onboarding") ||
                           location.startsWith("/verify-email") ||
                           location.startsWith("/verify-code") ||
                           location.startsWith("/reset-password") ||
                           location.startsWith("/embed/") ||
                           location.startsWith("/leaderboard/embed") ||
                           location.startsWith("/view/") ||
                           location.startsWith("/@"); // Also exclude shared content pages from layout

  if (isAuthOrOnboarding) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      {/* Simple green gradient effect */}
      <div className="fixed top-0 right-0 w-full h-full bg-gradient-to-br from-transparent via-transparent to-primary/5 pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-transparent to-primary/5 pointer-events-none"></div>

      <Header />

      {/* Dynamic Banner */}
      {!isLoadingBanner && bannerSettings && bannerSettings.isEnabled && !isBannerDismissed && (
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
      <MobileMenu />

      <div className="flex flex-1 relative z-10">
        {!isMobile && <Sidebar />}

        <main className={`flex-1 overflow-y-auto overflow-x-hidden w-full ${!isMobile ? 'ml-64' : ''}`}>
          <div className="px-4 py-4 md:px-6">
            {children}
          </div>
        </main>
      </div>

      {isMobile && <MobileNav />}
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={isOpen} 
        onClose={closeModal} 
        defaultTab={defaultTab} 
      />
    </div>
  );
}


function Router() {
  return (
    <PageTransition>
      <OnboardingGuard>
        <Suspense fallback={<RouteLoader />}>
          <Switch>
          {/* Public routes accessible to guests */}
          <Route path="/" component={HomePage} />
          <Route path="/trending" component={TrendingPage} />
          <Route path="/clip/:id" component={ClipPage} />
          <Route path="/clips/:id" component={ClipPage} />
          <Route path="/reel/:id" component={ClipPage} />
          <Route path="/reels/:id" component={ClipPage} />
          <Route path="/@:username/clip/:clipId" component={ClipPage} />
          <Route path="/@:username/clips/:clipId" component={ClipPage} />
          <Route path="/@:username/reel/:reelId" component={ClipPage} />
          <Route path="/@:username/reels/:reelId" component={ClipPage} />
          
          {/* Test route without @ symbol as fallback */}
          <Route path="/:username/clip/:clipId" component={ClipPage} />
          <Route path="/:username/reel/:reelId" component={ClipPage} />
          <Route path="/screenshots/:id" component={ScreenshotUploadPage} />
          <Route path="/@:username/screenshot/:shareCode" component={ProfilePage} />
          <Route path="/@:username/screenshots/:screenshotId" component={ProfilePage} />
          <Route path="/:username/screenshot/:shareCode" component={ProfilePage} />
          <Route path="/profile/:username" component={ProfilePage} />

          {/* Protected routes requiring authentication */}
          <Route path="/explore" component={ExplorePage} />
          <ProtectedRoute path="/games/:gameSlug" component={GamePage} />
          <ProtectedRoute path="/games/:gameId/clips" component={GameClipsPage} />
          <ProtectedRoute path="/hashtag/:hashtag" component={HashtagPage} />
          <ProtectedRoute path="/upload" component={UploadPage} />
          <ProtectedRoute path="/upload/screenshots" component={ScreenshotUploadPage} />
          <ProtectedRoute path="/upload-success" component={PostUploadSuccessPage} />
          <ProtectedRoute path="/upload-success/:contentType/:contentId" component={PostUploadSuccessPage} />
          <ProtectedRoute path="/account/settings" component={AccountSettingsPage} />
          <ProtectedRoute path="/settings/profile" component={SettingsPage} />
          <ProtectedRoute path="/settings/appearance" component={AppearanceSettingsPage} />
          <ProtectedRoute path="/customize" component={CustomizePage} />
          <ProtectedRoute path="/browse/games/:category" component={GameCategoriesPage} />
          <ProtectedRoute path="/browse/games/categories" component={GameCategoriesPage} />
          <Route path="/leaderboard" component={LeaderboardPage} />
          <ProtectedRoute path="/messages" component={MessagesPage} />
          <ProtectedRoute path="/latest-reels" component={LatestReelsPage} />
          <ProtectedRoute path="/latest-clips" component={LatestClipsPage} />

          <AdminProtectedRoute path="/admin" component={AdminPage} />
          <AdminProtectedRoute path="/admin/content-filter" component={AdminContentFilter} />
          <ProtectedRoute path="/test/content-filter" component={ContentFilterTest} />

          {/* Routes that bypass onboarding guard */}
          <Route path="/auth" component={AuthRedirect} />
          <Route path="/auth/discord/callback" component={DiscordCallback} />
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/verify-email" component={VerifyEmailPage} />
          <Route path="/verify-code" component={VerifyCodePage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/help" component={HelpPage} />
          <Route path="/store" component={StorePage} />
          <Route path="/wallet" component={WalletPage} />
          <Route path="/storage" component={StoragePage} />
          <Route path="/leaderboard/embed" component={LeaderboardEmbedPage} />

          {/* Public view routes for shareable content */}
          <Route path="/view/screenshot/:id" component={ViewContentPage} />
          <Route path="/view/:id" component={ViewContentPage} />

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
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <CrossmintProvider>
              <AuthModalProvider>
                <ClipDialogProvider>
                  <MainLayout>
                    <Router />
                  </MainLayout>
                </ClipDialogProvider>
                <Toaster />
              </AuthModalProvider>
            </CrossmintProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;