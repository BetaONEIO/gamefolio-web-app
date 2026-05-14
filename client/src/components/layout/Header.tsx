import { Link, useLocation } from "wouter";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Settings, LogOut, CheckCircle2, Palette, UserCog, Menu, ShieldCheck, Flame, Trophy, Crown, Video, Film, Camera, Gift } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMobileMenu } from "@/hooks/use-mobile-menu";
import { useMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { User, Game } from "@shared/schema";
import { GamefolioProfileIcon } from "@/components/icons/GamefolioProfileIcon";


import { CustomAvatar } from "@/components/ui/custom-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { LootboxDialog, LootboxTrigger } from "@/components/lootbox/LootboxDialog";
import { ModeratorBadge } from "@/components/ui/moderator-badge";
import { ProBadge } from "@/components/ui/pro-badge";
import { LevelTrackerModal } from "@/components/level/LevelTrackerModal";
import { ManageProModal } from "@/components/subscription/ManageProModal";
import { ProUpgradeDialog } from "@/components/subscription/ProUpgradeDialog";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

const Header = () => {
  const [location, setLocation] = useLocation();
  const { user, isPro, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [proUpgradeOpen, setProUpgradeOpen] = useState(false);
  const [manageProOpen, setManageProOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenu = useMobileMenu();
  const isMobile = useMobile();

  const handleLogout = async () => {
    await logout();
    setShowDropdown(false);
    setLocation("/");
  };

  return (
    <header>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button">Menu</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setLocation(`/profile/${user?.username}`)}>
              <GamefolioProfileIcon className="mr-2 h-4 w-4" />
              <span>View Gamefolio</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setLocation("/level-tracker")} data-testid="button-level-tracker">
              <LevelTrackerIcon className="mr-2 h-4 w-4" />
              <span>Level Tracker</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setLocation("/account/settings?tab=referral")} data-testid="button-referral">
              <ReferFriendIcon className="mr-2 h-4 w-4" />
              <span>Refer a Friend</span>
            </DropdownMenuItem>
            {!(isPro || user?.isPro || (user?.proSubscriptionEndDate && new Date(user.proSubscriptionEndDate) > new Date())) && (
              <DropdownMenuItem className="cursor-pointer text-white" style={{ background: 'linear-gradient(to right, #B7FF1A 0%, rgba(30, 41, 59, 0) 70%)' }} onClick={() => setProUpgradeOpen(true)} data-testid="button-go-pro">
                <GoProIcon className="mr-2 h-4 w-4" />
                <span>Go Pro</span>
              </DropdownMenuItem>
            )}
            {(isPro || user?.isPro || (user?.proSubscriptionEndDate && new Date(user.proSubscriptionEndDate) > new Date())) && (
              <DropdownMenuItem className="cursor-pointer" onClick={() => setManageProOpen(true)} data-testid="button-manage-pro">
                <ManageProIcon className="mr-2 h-4 w-4 text-[#B7FF1A]" />
                <span>Manage Pro Subscription</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 pt-0">Settings</DropdownMenuLabel>
              <DropdownMenuItem className="cursor-pointer" onClick={() => setLocation("/account/settings") }>
                <AccountSettingsIcon className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => setLocation("/settings/profile")}>
                <ProfileAppearanceIcon className="mr-2 h-4 w-4" />
                <span>Profile & Appearance</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {user?.role === "admin" && (
              <DropdownMenuItem className="cursor-pointer" onClick={() => setLocation("/admin") }>
                <AdminPanelIcon className="mr-2 h-4 w-4" />
                Admin Panel
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogoutIcon className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
