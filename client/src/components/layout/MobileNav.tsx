import { useLocation, Link } from "wouter";
import { Home, Compass, PlusCircle, Flame, User, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const MobileNav = () => {
  const [location] = useLocation();
  const { user } = useAuth();
  const username = user?.username || "user";

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Compass, label: "Explore", href: "/explore" },
    { icon: PlusCircle, label: "", href: "/upload", isUpload: true },
    { icon: Flame, label: "Trending", href: "/trending" },
    { icon: Trophy, label: "Leaderboard", href: "/leaderboard" },
    { icon: User, label: "Profile", href: `/profile/${username}` },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
      <div className="flex justify-around py-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center text-xs w-full no-underline",
              location === item.href
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon className={cn(
              "mb-1",
              item.isUpload ? "text-2xl" : "text-lg"
            )} />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;
