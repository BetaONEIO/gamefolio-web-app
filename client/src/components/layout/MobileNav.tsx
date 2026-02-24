import { useLocation, Link } from "wouter";
import { PlusCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { GamefolioHomeIcon } from "@/components/icons/GamefolioHomeIcon";
import { GamefolioExploreIcon } from "@/components/icons/GamefolioExploreIcon";
import { GamefolioTrendingIcon } from "@/components/icons/GamefolioTrendingIcon";
import { useState } from "react";
import AuthModal from "@/components/auth/auth-modal";

const MobileNav = () => {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const username = user?.username || "user";
  const [showAuthModal, setShowAuthModal] = useState(false);

  const navItems = [
    { icon: GamefolioHomeIcon, label: "Home", href: "/" },
    { icon: GamefolioExploreIcon, label: "Explore", href: "/explore" },
    { icon: PlusCircle, label: "", href: "/upload", isUpload: true },
    { icon: GamefolioTrendingIcon, label: "Trending", href: "/trending" },
    { icon: User, label: "Profile", href: `/profile/${username}`, requiresAuth: true },
  ];

  const handleNavClick = (item: typeof navItems[0], e: React.MouseEvent) => {
    if (item.requiresAuth && !user) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
        <div className="flex justify-around py-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(item, e)}
              className="flex flex-col items-center text-xs w-full no-underline"
            >
              <item.icon className={cn(
                "mb-1",
                item.isUpload ? "w-7 h-7" : "w-6 h-6",
                location === item.href ? "text-primary" : "text-muted-foreground"
              )} />
              <span className={cn(
                location === item.href ? "text-white" : "text-muted-foreground"
              )}>{item.label}</span>
            </Link>
          ))}
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
