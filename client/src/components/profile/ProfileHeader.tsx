import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { UserWithStats } from "@shared/schema";
import { Mail, UserPlus, UserCheck, Share2, CheckCircle2, MessageSquare } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useJoinDialog } from "@/hooks/use-join-dialog";
import { JoinGamefolioDialog } from "@/components/auth/JoinGamefolioDialog";
import PlatformConnections from "./PlatformConnections";
import { GamefolioShareDialog } from "./GamefolioShareDialog";
import { VerificationBadge } from "@/components/ui/verification-badge";

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
            <img 
              src={profile.avatarUrl || `/attached_assets/gamefolio social logo 3d circle web.png`} 
              alt={profile.displayName} 
              className="w-32 h-32 rounded-lg object-cover border-4 shadow-lg bg-background"
              style={{ borderColor: profile.avatarBorderColor || '#4ADE80' }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/attached_assets/gamefolio social logo 3d circle web.png";
              }}
            />
            
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
              {/* Username with verification badge */}
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {profile.displayName}
                </h1>
                <VerificationBadge 
                  isVerified={!!profile.emailVerified} 
                  size="md" 
                />
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
                className="h-8 px-4"
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