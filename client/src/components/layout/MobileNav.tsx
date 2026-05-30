import { useLocation, Link } from "wouter";
import { Video, Film, Camera } from "lucide-react";
import { GamefolioUploadIcon } from "@/components/icons/GamefolioUploadIcon";
import { GamefolioIcon } from "@/components/icons/GamefolioIcon";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { GamefolioHomeIcon } from "@/components/icons/GamefolioHomeIcon";
import { GamefolioExploreIcon } from "@/components/icons/GamefolioExploreIcon";
import { useState, useCallback, useRef, useEffect } from "react";
import { useIsKeyboardOpen } from "@/hooks/use-keyboard-height";
import AuthModal from "@/components/auth/auth-modal";
import { ZapIconSvg, useZapFly, ZapFlyOverlay } from "@/components/ui/ZapReactionIcon";
import { useClipDialog } from "@/hooks/use-clip-dialog";

const uploadOptions = [
  { icon: Video, label: "Upload Clip", type: "clips", tilt: -12 },
  { icon: Film, label: "Upload Reel", type: "reels", tilt: 0 },
  { icon: Camera, label: "Screenshot", type: "screenshots", tilt: 12 },
];

const MobileNav = () => {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { closeClipDialog } = useClipDialog();
  const username = user?.username || "user";
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const trendingIconRef = useRef<HTMLSpanElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const { zapFlyState, triggerZapFly, dismissZapFly } = useZapFly();
  const isKeyboardOpen = useIsKeyboardOpen();

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () => {
      document.documentElement.style.setProperty('--mobile-nav-height', `${nav.offsetHeight}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  // All hooks must be declared before any early return.
  const handleUploadOptionClick = useCallback((type: string) => {
    setUploadMenuOpen(false);
    window.dispatchEvent(new CustomEvent("upload-type-change", { detail: type }));
    setLocation(`/upload?type=${type}`);
  }, [setLocation]);

  // Hide navigation bar when keyboard is open so it doesn't overlap input fields.
  if (isKeyboardOpen) return null;

  const navItems = [
    { icon: GamefolioHomeIcon, label: "Home", href: "/" },
    { icon: GamefolioExploreIcon, label: "Explore", href: "/explore" },
    { icon: GamefolioUploadIcon, label: "", href: "/upload", isUpload: true },
    { label: "Trending", href: "/trending", isTrending: true },
    { label: "Gamefolio", href: `/profile/${username}`, requiresAuth: true, isGamefolio: true },
  ] as const;

  const handleNavClick = (item: typeof navItems[number], e: React.MouseEvent) => {
    closeClipDialog();
    if ('isUpload' in item && item.isUpload) {
      e.preventDefault();
      setUploadMenuOpen((prev) => !prev);
      return;
    }
    if ('isTrending' in item && item.isTrending) {
      if (location !== '/trending') {
        triggerZapFly(trendingIconRef.current);
      }
      return;
    }
    if ('requiresAuth' in item && item.requiresAuth && !user) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  return (
    <>
      {uploadMenuOpen && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-md bg-black/50 transition-opacity duration-300"
          onClick={() => setUploadMenuOpen(false)}
        />
      )}

      <div
        className="fixed left-0 right-0 z-50 flex justify-center pointer-events-none"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="relative w-0 h-0">
          {uploadOptions.map((option, index) => {
            const total = uploadOptions.length;
            const yOffset = -(index + 1) * 68;
            const xOffset = (index - 1) * 32;

            return (
              <button
                key={option.type}
                onClick={() => handleUploadOptionClick(option.type)}
                className={cn(
                  "absolute pointer-events-auto flex flex-col items-center justify-center",
                  "w-[76px] h-[88px] rounded-2xl",
                  "bg-background border-2 border-primary",
                  "shadow-lg shadow-black/40",
                  "hover:bg-primary active:bg-primary",
                  "group",
                  "transition-all duration-300 ease-out",
                  uploadMenuOpen
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-0"
                )}
                style={{
                  transform: uploadMenuOpen
                    ? `translate(calc(-50% + ${xOffset}px), calc(-50% + ${yOffset}px)) rotate(${option.tilt}deg)`
                    : `translate(-50%, 0px) rotate(0deg)`,
                  transitionDelay: uploadMenuOpen ? `${index * 60}ms` : `${(total - 1 - index) * 30}ms`,
                }}
              >
                <option.icon className="w-6 h-6 mb-1.5 text-white transition-colors" />
                <span className="text-[10px] font-semibold leading-tight text-center px-1 text-white transition-colors">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <nav ref={navRef} className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-[70] safe-area-bottom">
        <div className="flex justify-around py-3">
          {navItems.map((item) => {
            if ('isUpload' in item && item.isUpload) {
              return (
                <button
                  key="upload"
                  onClick={(e) => handleNavClick(item, e)}
                  className="flex flex-col items-center text-xs w-full bg-transparent border-0 cursor-pointer"
                >
                  <div className={cn(
                    "mb-1 transition-transform duration-300",
                    uploadMenuOpen && "rotate-45"
                  )}>
                    <GamefolioUploadIcon className={cn(
                      "w-6 h-6 transition-colors duration-200",
                      uploadMenuOpen ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                </button>
              );
            }

            if ('isTrending' in item && item.isTrending) {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleNavClick(item, e)}
                  className="flex flex-col items-center text-xs w-full no-underline"
                >
                  <span ref={trendingIconRef} className="mb-1 flex items-center justify-center w-6 h-6">
                    <ZapIconSvg
                      size={24}
                      active={isActive}
                      className={isActive ? '' : 'text-muted-foreground'}
                    />
                  </span>
                  <span className={cn(
                    isActive ? 'text-[#B7FF1A]' : 'text-muted-foreground'
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            }

            if ('isGamefolio' in item && item.isGamefolio) {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleNavClick(item, e)}
                  className="flex flex-col items-center text-xs w-full no-underline"
                >
                  <span className="mb-1 flex items-center justify-center w-6 h-6 overflow-visible">
                    <GamefolioIcon
                      glow={isActive}
                      className={cn(
                        "w-6 h-6 scale-[1.85]",
                        !isActive && "opacity-60"
                      )}
                    />
                  </span>
                  <span className={cn(
                    isActive ? 'text-white' : 'text-muted-foreground'
                  )}>{item.label}</span>
                </Link>
              );
            }

            const regularItem = item as Extract<typeof navItems[number], { icon: React.ComponentType<any> }>;
            return (
              <Link
                key={regularItem.href}
                href={regularItem.href}
                onClick={(e) => handleNavClick(item, e)}
                className="flex flex-col items-center text-xs w-full no-underline"
              >
                <regularItem.icon className={cn(
                  "mb-1 w-6 h-6",
                  location === regularItem.href ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  location === regularItem.href ? "text-white" : "text-muted-foreground"
                )}>{regularItem.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {zapFlyState && (
        <ZapFlyOverlay targetRect={zapFlyState} onDone={dismissZapFly} mode={null} showXpPopup={false} />
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultTab="register"
      />
    </>
  );
};

export default MobileNav;
