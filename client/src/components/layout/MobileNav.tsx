import { useLocation, Link } from "wouter";
import { PlusCircle, User, Video, Film, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { GamefolioHomeIcon } from "@/components/icons/GamefolioHomeIcon";
import { GamefolioExploreIcon } from "@/components/icons/GamefolioExploreIcon";
import { GamefolioTrendingIcon } from "@/components/icons/GamefolioTrendingIcon";
import { useState, useCallback } from "react";
import AuthModal from "@/components/auth/auth-modal";

const uploadOptions = [
  { icon: Video, label: "Upload Clip", type: "clips", tilt: -12 },
  { icon: Film, label: "Upload Reel", type: "reels", tilt: 0 },
  { icon: Camera, label: "Screenshot", type: "screenshots", tilt: 12 },
];

const MobileNav = () => {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const username = user?.username || "user";
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);

  const navItems = [
    { icon: GamefolioHomeIcon, label: "Home", href: "/" },
    { icon: GamefolioExploreIcon, label: "Explore", href: "/explore" },
    { icon: PlusCircle, label: "", href: "/upload", isUpload: true },
    { icon: GamefolioTrendingIcon, label: "Trending", href: "/trending" },
    { icon: User, label: "Profile", href: `/profile/${username}`, requiresAuth: true },
  ];

  const handleNavClick = (item: typeof navItems[0], e: React.MouseEvent) => {
    if (item.isUpload) {
      e.preventDefault();
      setUploadMenuOpen((prev) => !prev);
      return;
    }
    if (item.requiresAuth && !user) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  const handleUploadOptionClick = useCallback((type: string) => {
    setUploadMenuOpen(false);
    window.dispatchEvent(new CustomEvent("upload-type-change", { detail: type }));
    setLocation(`/upload?type=${type}`);
  }, [setLocation]);

  return (
    <>
      {uploadMenuOpen && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-md bg-black/50 transition-opacity duration-300"
          onClick={() => setUploadMenuOpen(false)}
        />
      )}

      <div className="fixed bottom-14 left-0 right-0 z-50 flex justify-center pointer-events-none">
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
                  "bg-card border border-border",
                  "shadow-lg shadow-black/20",
                  "text-foreground",
                  "hover:bg-green-500 active:bg-green-500",
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
                <option.icon className="w-6 h-6 mb-1.5 text-primary group-hover:text-white group-active:text-white transition-colors" />
                <span className="text-[10px] font-semibold leading-tight text-center px-1 text-foreground group-hover:text-white group-active:text-white transition-colors">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="flex justify-around py-3">
          {navItems.map((item) => {
            if (item.isUpload) {
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
                    <PlusCircle className={cn(
                      "w-7 h-7 transition-colors duration-200",
                      uploadMenuOpen ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(item, e)}
                className="flex flex-col items-center text-xs w-full no-underline"
              >
                <item.icon className={cn(
                  "mb-1 w-6 h-6",
                  location === item.href
                    ? item.label === "Trending" ? "text-orange-500" : "text-primary"
                    : "text-muted-foreground"
                )} />
                <span className={cn(
                  location === item.href
                    ? item.label === "Trending" ? "text-orange-500" : "text-white"
                    : "text-muted-foreground"
                )}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        defaultTab="register"
      />
    </>
  );
};

export default MobileNav;
