import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { UserWithStats } from "@shared/schema";
import { Mail, UserPlus, UserCheck, Share2, CheckCircle2, MessageSquare, Trophy, Heart, Flame, Video, Gamepad2, Upload, Code, Eye, Coffee, Scroll } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useJoinDialog } from "@/hooks/use-join-dialog";
import { JoinGamefolioDialog } from "@/components/auth/JoinGamefolioDialog";
import PlatformConnections from "./PlatformConnections";
import { GamefolioShareDialog } from "./GamefolioShareDialog";

const userTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  streamer: { label: "Streamer", icon: Video, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  gamer: { label: "Gamer", icon: Gamepad2, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  professional_gamer: { label: "Pro Gamer", icon: Trophy, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  content_creator: { label: "Creator", icon: Upload, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  indie_developer: { label: "Indie Dev", icon: Code, color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  viewer: { label: "Viewer", icon: Eye, color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  filthy_casual: { label: "Casual", icon: Coffee, color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  doom_scroller: { label: "Doom Scroller", icon: Scroll, color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

interface ProfileHeaderProps {
  profile: UserWithStats;
  isCurrentUser: boolean;
  currentUserId: number | null;
  isFollowing?: boolean;
  onFollowClick?: () => void;
  isFollowLoading?: boolean;
}

const ProfileHeader = ({ 
  profile, 
  isCurrentUser, 
  currentUserId, 
  isFollowing = false,
  onFollowClick,
  isFollowLoading = false
}: ProfileHeaderProps) => {
  const { user } = useAuth();
  const { isOpen, actionType, openDialog, closeDialog } = useJoinDialog();

  const handleFollowClick = () => {
    if (!user) {
      openDialog('general');
      return;
    }
    
    if (onFollowClick) {
      onFollowClick();
    } else {
      console.warn('ProfileHeader follow button clicked but no onFollowClick handler provided');
    }
  };

  const handleMessageClick = () => {
    if (!user) {
      openDialog('general');
      return;
    }
    
    console.log('🎯 MESSAGE BUTTON CLICKED - Setting target user:', profile.username);
    window.location.href = `/messages?user=${profile.username}`;
  };

  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Define banner style with theme-independent fallback
  const bannerStyle = {
    backgroundColor: '#02172C', // Fixed neutral background, independent of theme
    backgroundImage: profile.bannerUrl ? `url(${profile.bannerUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  // Define button style with accent color
  const buttonStyle = {
    backgroundColor: profile.accentColor || undefined
  };

  return (
    <div className="w-full">
      {/* Banner with overlapping profile picture */}
      <div className="relative">
        <div 
          className="w-full h-64 relative"
          style={bannerStyle}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90"></div>
        </div>
        
        {/* Profile Image - Positioned halfway on banner */}
        <div className="absolute left-8 bottom-0 transform translate-y-1/2">
          <div className="flex flex-col items-center">
            <div 
              className="relative w-32 h-32 rounded-lg shadow-lg overflow-hidden ring-4"
              style={{ 
                '--tw-ring-color': profile.avatarBorderColor || '#4ADE80'
              } as React.CSSProperties}
            >
              <img 
                src={profile.avatarUrl || `/attached_assets/gamefolio social logo 3d circle web.png`} 
                alt={profile.displayName} 
                className="block w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/attached_assets/gamefolio social logo 3d circle web.png";
                }}
              />
            </div>
            
            {/* Profile Stats underneath profile picture */}
            <div className="flex space-x-4 text-xs mt-3 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border">
              <div className="text-center">
                <span className="font-bold block">{profile._count?.clips || 0}</span>
                <span className="text-muted-foreground">Clips</span>
              </div>
              <div className="text-center">
                <span className="font-bold block">{profile._count?.followers || 0}</span>
                <span className="text-muted-foreground">Followers</span>
              </div>
              <div className="text-center">
                <span className="font-bold block">{profile._count?.following || 0}</span>
                <span className="text-muted-foreground">Following</span>
              </div>
              <div className="text-center" data-testid="stat-likes-received">
                <span className="font-bold block flex items-center gap-1 justify-center">
                  <Heart className="w-3 h-3 text-red-500" />
                  {profile._count?.likesReceived || 0}
                </span>
                <span className="text-muted-foreground">Likes</span>
              </div>
              <div className="text-center" data-testid="stat-fires-received">
                <span className="font-bold block flex items-center gap-1 justify-center">
                  <Flame className="w-3 h-3 text-orange-500" />
                  {profile._count?.firesReceived || 0}
                </span>
                <span className="text-muted-foreground">Fires</span>
              </div>
              <div className="text-center" data-testid="stat-streak">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="font-bold block flex items-center gap-1 justify-center">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {profile.currentStreak || 0}
                      </span>
                      <span className="text-muted-foreground">Streak</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">Longest: {profile.longestStreak || 0} days</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="text-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="font-bold block flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-yellow-500" />
                        {profile.level || 1}
                      </span>
                      <span className="text-muted-foreground">Level</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">{profile.totalXP || 0} Total XP</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Header Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-20 relative z-10">
        <div className="flex items-start justify-between">
          {/* Left side: Profile info next to image */}
          <div className="flex items-start gap-6 flex-grow">
            {/* Spacer for profile image */}
            <div className="flex-shrink-0 w-32"></div>

            {/* Profile Info */}
            <div className="space-y-2">
              {/* Username with user type badge */}
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {profile.displayName}
                </h1>
                {profile.userType && userTypeConfig[profile.userType] && (() => {
                  const config = userTypeConfig[profile.userType];
                  const IconComponent = config.icon;
                  return (
                    <Badge 
                      variant="outline" 
                      className={`${config.color} border text-xs font-medium px-2 py-0.5`}
                    >
                      <IconComponent className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  );
                })()}
              </div>

              {/* Handle */}
              <p className="text-sm text-muted-foreground">@{profile.username}</p>

              {/* Bio */}
              <div>
                <p className="text-sm text-muted-foreground">{profile.bio}</p>
              </div>
            </div>
          </div>

          {/* Right side: Action Buttons */}
          <div className="flex gap-2 flex-shrink-0">
            {/* Follow Button */}
            {!isCurrentUser && (
              <Button
                onClick={handleFollowClick}
                size="sm"
                variant={isFollowing ? "outline" : "default"}
                className={`h-8 px-4 ${!isFollowing ? 'text-gray-900' : ''}`}
                disabled={isFollowLoading}
                style={!isFollowing ? buttonStyle : undefined}
              >
                {isFollowLoading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-current animate-spin mr-2"></div>
                ) : isFollowing ? (
                  <>
                    <UserCheck className="mr-1 h-4 w-4" /> Following
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-1 h-4 w-4" /> Follow
                  </>
                )}
              </Button>
            )}

            {/* Message Button or Share Button */}
            {!isCurrentUser ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-4"
                onClick={handleMessageClick}
              >
                <MessageSquare className="mr-1 h-4 w-4" /> Message
              </Button>
            ) : (
              <GamefolioShareDialog 
                username={profile.username}
                open={shareDialogOpen}
                onOpenChange={setShareDialogOpen}
                trigger={(
                  <Button variant="outline" size="sm" className="h-8 px-4">
                    <Share2 className="mr-1 h-4 w-4" /> Share
                  </Button>
                )}
              />
            )}
          </div>
        </div>


        {/* Platform connections */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 mt-4">
          <PlatformConnections profile={profile} />
        </div>
      </div>
      
      <JoinGamefolioDialog 
        open={isOpen} 
        onOpenChange={closeDialog} 
        actionType={actionType} 
      />
    </div>
  );
};

export default ProfileHeader;