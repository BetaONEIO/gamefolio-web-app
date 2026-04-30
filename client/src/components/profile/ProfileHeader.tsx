import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { UserWithStats } from "@shared/schema";
import {
  UserPlus,
  UserCheck,
  Share2,
  Trophy,
  Heart,
  Flame,
  Video,
  Gamepad2,
  Upload,
  Code,
  Eye,
  Coffee,
  Scroll,
  Settings,
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useJoinDialog } from "@/hooks/use-join-dialog";
import { JoinGamefolioDialog } from "@/components/auth/JoinGamefolioDialog";
import PlatformConnections from "./PlatformConnections";
import { GamefolioShareDialog } from "./GamefolioShareDialog";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { useSignedUrl } from "@/hooks/use-signed-url";
import NftProfilePopup from "@/components/nft/NftProfilePopup";
import {
  useProfilePictureLightbox,
  ProfilePictureLightbox,
} from "@/components/ui/profile-picture-lightbox";

const getRelativeLuminance = (hex: string): number => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 0;

  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  return (
    0.2126 * toLinear(parseInt(result[1], 16)) +
    0.7152 * toLinear(parseInt(result[2], 16)) +
    0.0722 * toLinear(parseInt(result[3], 16))
  );
};

const userTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  streamer: {
    label: "Streamer",
    icon: Video,
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  gamer: {
    label: "Gamer",
    icon: Gamepad2,
    color: "bg-primary/20 text-primary border-primary/30",
  },
  professional_gamer: {
    label: "Pro Gamer",
    icon: Trophy,
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  content_creator: {
    label: "Creator",
    icon: Upload,
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  indie_developer: {
    label: "Indie Dev",
    icon: Code,
    color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  },
  filthy_casual: {
    label: "Casual",
    icon: Coffee,
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  doom_scroller: {
    label: "Doom Scroller",
    icon: Scroll,
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

interface ProfileHeaderProps {
  profile: UserWithStats;
  isCurrentUser: boolean;
  currentUserId: number | null;
  isFollowing?: boolean;
  onFollowClick?: () => void;
  isFollowLoading?: boolean;
}

interface NameTag {
  id: number;
  name: string;
  imageUrl: string;
  rarity: string;
  isDefault: boolean;
  isActive: boolean;
  description?: string | null;
}

const ProfileHeader = ({
  profile,
  isCurrentUser,
  currentUserId,
  isFollowing = false,
  onFollowClick,
  isFollowLoading = false,
}: ProfileHeaderProps) => {
  const { user } = useAuth();
  const { isOpen, actionType, openDialog, closeDialog } = useJoinDialog();
  const [nftPopup, setNftPopup] = useState<{
    userId: number;
    tokenId: number;
    imageUrl: string;
    anchorRect: DOMRect | null;
  } | null>(null);
  const { lightboxData, openLightbox, closeLightbox } = useProfilePictureLightbox();

  const isNftProfileActive = !!(
    profile?.nftProfileTokenId &&
    profile?.nftProfileImageUrl &&
    (profile?.activeProfilePicType === "nft" || !profile?.activeProfilePicType)
  );

  const { data: nameTagData } = useQuery<{ nameTag: NameTag | null }>({
    queryKey: ["/api/user", profile.id, "name-tag"],
    queryFn: async () => {
      const res = await fetch(`/api/user/${profile.id}/name-tag`);
      if (!res.ok) return { nameTag: null };
      return res.json();
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { signedUrl: signedBannerUrl } = useSignedUrl(profile.bannerUrl);
  const { signedUrl: signedNameTagUrl } = useSignedUrl(nameTagData?.nameTag?.imageUrl);

  const handleFollowClick = () => {
    if (!user) {
      openDialog("general");
      return;
    }

    if (onFollowClick) {
      onFollowClick();
    } else {
      console.warn("ProfileHeader follow button clicked but no onFollowClick handler provided");
    }
  };

  const handleMessageClick = () => {
    if (!user) {
      openDialog("general");
      return;
    }

    console.log("🎯 MESSAGE BUTTON CLICKED - Setting target user:", profile.username);
    window.location.href = `/messages?user=${profile.username}`;
  };

  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const bannerStyle = {
    backgroundColor: "#02172C",
    backgroundImage: signedBannerUrl ? `url(${signedBannerUrl})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  const buttonStyle = {
    backgroundColor: profile.accentColor || undefined,
  };

  const memberSinceText = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="w-full">
      {/* Banner — fades into background at the bottom */}
      <div className="relative">
        <div className="w-full h-64 relative" style={bannerStyle}>
          {/* Gradient overlay: transparent at top → fully opaque at bottom */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent from-30% via-background/60 to-background"></div>
        </div>

        {/* Profile Image — positioned halfway over banner */}
        <div className="absolute left-8 bottom-0 transform translate-y-1/2">
          <div className="flex flex-col items-center">
            <CustomAvatar
              user={profile}
              size="2xl"
              className="shadow-lg"
              borderIntensity="strong"
              showAvatarBorderOverlay={true}
              themeColor={profile.accentColor}
              onNftClick={
                isNftProfileActive
                  ? (userId, tokenId, imageUrl, event) => {
                      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                      setNftPopup({ userId, tokenId, imageUrl, anchorRect: rect });
                    }
                  : undefined
              }
              onClick={
                !isNftProfileActive
                  ? () => {
                      const avatarUrl = profile.avatarUrl || "";
                      if (avatarUrl) {
                        openLightbox(
                          avatarUrl,
                          profile.displayName || profile.username,
                          profile.username
                        );
                      }
                    }
                  : undefined
              }
            />

            {/* Stats box with Collection button */}
            <div className="relative mt-3">
              {/* L-shaped gradient border — top edge (uses theme accent colour) */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "1px",
                  background: profile.accentColor || "#B7FF1A",
                  pointerEvents: "none",
                  zIndex: 5,
                }}
              />
              {/* L-shaped gradient border — left edge (uses theme accent colour) */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: "1px",
                  background: profile.accentColor || "#B7FF1A",
                  pointerEvents: "none",
                  zIndex: 5,
                }}
              />

              {/* Collection button overlaid at top-right */}
              <Link href={`/${profile.username}/collections`}>
                <div
                  className="absolute -top-3 right-0 z-10 cursor-pointer transition-opacity hover:opacity-80"
                  style={{
                    background: profile.accentColor || "#B7FF1A",
                    padding: "1px",
                    borderRadius: "8px",
                  }}
                >
                  <div className="bg-background rounded-lg px-3 py-1">
                    <span className="text-xs font-medium text-foreground">Collection</span>
                  </div>
                </div>
              </Link>

              {(() => {
                const isLight = getRelativeLuminance(profile.backgroundColor || "#0B2232") > 0.179;
                const numColor = isLight ? "#111827" : "#FFFFFF";
                const lblColor = isLight ? "#374151" : profile.accentColor || undefined;

                return (
                  <div className="flex space-x-4 text-xs rounded-[10px] px-4 py-2.5 bg-background/90">
                      <div className="text-center">
                        <span className="font-bold block" style={{ color: numColor }}>
                          {(profile._count?.clips || 0) + (profile._count?.screenshots || 0)}
                        </span>
                        <span className="text-muted-foreground" style={{ color: lblColor }}>
                          Uploads
                        </span>
                      </div>

                      <div className="text-center">
                        <span className="font-bold block" style={{ color: numColor }}>
                          {profile._count?.followers || 0}
                        </span>
                        <span className="text-muted-foreground" style={{ color: lblColor }}>
                          Followers
                        </span>
                      </div>

                      <div className="text-center">
                        <span className="font-bold block" style={{ color: numColor }}>
                          {profile._count?.following || 0}
                        </span>
                        <span className="text-muted-foreground" style={{ color: lblColor }}>
                          Following
                        </span>
                      </div>

                      <div className="text-center" data-testid="stat-likes-received">
                        <span
                          className="font-bold block flex items-center gap-1 justify-center"
                          style={{ color: numColor }}
                        >
                          <Heart className="w-3 h-3 text-red-500" />
                          {profile._count?.likesReceived || 0}
                        </span>
                        <span className="text-muted-foreground" style={{ color: lblColor }}>
                          Likes
                        </span>
                      </div>

                      <div className="text-center" data-testid="stat-fires-received">
                        <span
                          className="font-bold block flex items-center gap-1 justify-center"
                          style={{ color: numColor }}
                        >
                          <Flame className="w-3 h-3 text-orange-500" />
                          {profile._count?.firesReceived || 0}
                        </span>
                        <span className="text-muted-foreground" style={{ color: lblColor }}>
                          Fires
                        </span>
                      </div>

                      <div className="text-center" data-testid="stat-streak">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <span
                                className="font-bold block flex items-center gap-1 justify-center"
                                style={{ color: numColor }}
                              >
                                <Flame className="w-3 h-3 text-orange-500" />
                                {profile.currentStreak || 0}
                              </span>
                              <span className="text-muted-foreground" style={{ color: lblColor }}>
                                Streak
                              </span>
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
                              <span
                                className="font-bold block flex items-center gap-1 justify-center"
                                style={{ color: numColor }}
                              >
                                <Trophy className="w-3 h-3 text-yellow-500" />
                                {profile.level || 1}
                              </span>
                              <span className="text-muted-foreground" style={{ color: lblColor }}>
                                Level
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-sm">{profile.totalXP || 0} Total XP</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Header Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-20 relative z-10">
        <div className="flex items-start justify-between">
          {/* Left side: Profile info */}
          <div className="flex items-start gap-6 flex-grow">
            {/* Spacer for profile image */}
            <div className="flex-shrink-0 w-32"></div>

            {/* Profile Info */}
            <div className="space-y-1">
              {/* Display name + name tag */}
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">
                  {profile.displayName && profile.displayName.length > 12
                    ? profile.displayName.slice(0, 12) + "…"
                    : profile.displayName}
                </h1>

                {nameTagData?.nameTag && signedNameTagUrl && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <img
                          src={signedNameTagUrl}
                          alt={nameTagData.nameTag.name}
                          className="h-5 rounded-sm"
                          style={{
                            borderRadius: "2px",
                            boxShadow:
                              "inset 0 1px 3px rgba(0,0,0,0.3), inset 0 -1px 2px rgba(255,255,255,0.1)",
                          }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm font-medium">{nameTagData.nameTag.name}</p>
                        {nameTagData.nameTag.description && (
                          <p className="text-xs text-muted-foreground">
                            {nameTagData.nameTag.description}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Handle */}
              <p className="text-sm text-muted-foreground">@{profile.username}</p>

              {/* User type badges */}
              {profile.userType &&
                profile.showUserType !== false &&
                (() => {
                  const userTypes = profile.userType
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean);
                  const displayTypes = userTypes.slice(0, 2);

                  return (
                    <div className="flex items-center gap-2 flex-wrap">
                      {displayTypes.map((type, index) => {
                        const config = userTypeConfig[type];
                        if (!config) return null;

                        const IconComponent = config.icon;

                        return (
                          <Badge
                            key={`${type}-${index}`}
                            variant="outline"
                            className={`${config.color} border text-xs font-medium px-2 py-0.5`}
                          >
                            <IconComponent className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        );
                      })}
                    </div>
                  );
                })()}

              {/* Member since + bio */}
              {memberSinceText && (
                <p className="text-xs text-muted-foreground">Member since {memberSinceText}</p>
              )}

              {profile.bio && (
                <p className="text-sm text-muted-foreground">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Right side: Action Buttons */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {isCurrentUser ? (
              <Link href="/account/settings">
                <Button
                  size="sm"
                  variant="default"
                  className="h-8 px-4 text-gray-900"
                  style={buttonStyle}
                >
                  <Settings className="mr-1 h-4 w-4" /> Edit Profile
                </Button>
              </Link>
            ) : (
              <Button
                onClick={handleFollowClick}
                size="sm"
                variant={isFollowing ? "outline" : "default"}
                className={`h-8 px-4 ${!isFollowing ? "text-gray-900" : ""}`}
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

            {!isCurrentUser ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4"
                onClick={handleMessageClick}
              >
                Message
              </Button>
            ) : (
              <GamefolioShareDialog
                username={profile.username}
                open={shareDialogOpen}
                onOpenChange={setShareDialogOpen}
                trigger={
                  <Button variant="outline" size="sm" className="h-8 px-4">
                    <Share2 className="mr-1 h-4 w-4" /> Share
                  </Button>
                }
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

      {nftPopup && (
        <NftProfilePopup
          userId={nftPopup.userId}
          tokenId={nftPopup.tokenId}
          imageUrl={nftPopup.imageUrl}
          onClose={() => setNftPopup(null)}
          anchorRect={null}
          username={profile.username}
        />
      )}

      <ProfilePictureLightbox
        isOpen={lightboxData.isOpen}
        onClose={closeLightbox}
        avatarUrl={lightboxData.avatarUrl}
        displayName={lightboxData.displayName}
        username={lightboxData.username}
      />
    </div>
  );
};

export default ProfileHeader;