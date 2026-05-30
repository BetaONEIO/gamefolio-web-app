import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { VerificationBadge } from "@/components/ui/verification-badge";
import { Link } from "wouter";
import { getQueryFn } from "@/lib/queryClient";

function isTouchPrimary() {
  if (typeof window === "undefined") return false;
  return (
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(hover: none)").matches
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function getThemeTokens(accentColor: string) {
  const a = accentColor.toLowerCase();
  const isCyberpunk = a === "#00d3f2";
  const isNeo       = a === "#00ff41";

  return {
    isCyberpunk,
    labelFont:    isCyberpunk ? "'Orbitron', sans-serif" : isNeo ? "'JetBrains Mono', monospace" : undefined,
    labelSize:    isCyberpunk || isNeo ? "5.5px" : "6px",
    labelSpacing: isCyberpunk ? "1.2px" : "0.8px",
    borderRadius: isCyberpunk || isNeo ? 4 : 14,
    cardBorder:   isCyberpunk ? "1px solid #00b8db55"
                : isNeo       ? "1px solid #00ff4144"
                : `1px solid ${accentColor}22`,
    cardShadow:   isCyberpunk ? "0 12px 40px rgba(0,0,0,0.92), 0 0 20px #00d3f244, 0 0 0 1px #00b8db22"
                : isNeo       ? "0 12px 40px rgba(0,0,0,0.92), 0 0 16px #00ff4133"
                : `0 12px 40px rgba(0,0,0,0.72), 0 0 0 1px ${accentColor}10`,
  };
}

function LoadingSkeleton() {
  return (
    <>
      <Skeleton
        style={{
          height: 48,
          margin: "-12px -12px 10px -12px",
          width: "calc(100% + 24px)",
          borderRadius: "14px 14px 0 0",
          display: "block",
        }}
      />
      <div className="flex items-center gap-2 mb-2 pl-1">
        <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
        <div className="space-y-1 flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2.5 w-14" />
        </div>
      </div>
      <div className="flex gap-3 mb-2 pl-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-1.5 w-10" />
          </div>
        ))}
      </div>
      <Skeleton className="h-7 w-full rounded-lg" />
    </>
  );
}

interface ProfilePreviewProps {
  username: string;
  profile: any;
  badgeData?: { verificationBadge: { id: number; name: string; imageUrl: string } | null } | null;
  signedBannerUrl?: string | null;
  accent: string;
  theme: ReturnType<typeof getThemeTokens>;
}

function ProfilePreview({ username, profile, badgeData, signedBannerUrl, accent, theme }: ProfilePreviewProps) {
  const [bannerImgError, setBannerImgError] = useState(false);

  const verificationBadge = badgeData?.verificationBadge ?? null;
  const bannerSrc = bannerImgError ? null : signedBannerUrl;

  const stats = [
    { label: "CLIPS",     value: profile._count?.clips ?? 0 },
    { label: "FOLLOWERS", value: profile._count?.followers ?? 0 },
    { label: "FOLLOWING", value: profile._count?.following ?? 0 },
  ];

  const bgFrom = profile.primaryColor || profile.backgroundColor || "#0B1218";
  const bgTo   = profile.backgroundColor || "#1B2A33";

  return (
    <>
      {/* Banner */}
      <div className="relative" style={{ height: 48, margin: "-12px -12px 0 -12px" }}>
        {bannerSrc ? (
          <img
            src={bannerSrc}
            alt=""
            className="w-full h-full object-cover"
            style={{ borderRadius: `${theme.borderRadius}px ${theme.borderRadius}px 0 0` }}
            onError={() => setBannerImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${bgFrom} 0%, ${bgTo} 100%)`,
              borderRadius: `${theme.borderRadius}px ${theme.borderRadius}px 0 0`,
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 65%)",
            borderRadius: `${theme.borderRadius}px ${theme.borderRadius}px 0 0`,
          }}
        />
        {theme.isCyberpunk && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,211,242,0.04) 3px, rgba(0,211,242,0.04) 4px)",
              borderRadius: `${theme.borderRadius}px ${theme.borderRadius}px 0 0`,
            }}
          />
        )}
      </div>

      {/* Avatar + name row — pl-1 keeps content off the left edge */}
      <div className="flex items-end gap-2 mb-1.5 pl-1" style={{ marginTop: -14 }}>
        <div className="ring-2 ring-[#0B1218] rounded-full flex-shrink-0">
          <CustomAvatar user={profile} size="sm" showBorder />
        </div>
        <div className="min-w-0 pb-0.5">
          <div className="flex items-center gap-1 min-w-0">
            <p
              className="font-bold leading-tight truncate"
              style={{
                fontSize: "0.7rem",
                color: theme.isCyberpunk ? accent : "white",
                fontFamily: theme.isCyberpunk ? "'Orbitron', sans-serif" : undefined,
                letterSpacing: theme.isCyberpunk ? "0.8px" : undefined,
              }}
            >
              {profile.displayName || profile.username}
            </p>
            {verificationBadge && (
              <VerificationBadge
                isVerified
                badgeImageUrl={verificationBadge.imageUrl}
                badgeName={verificationBadge.name}
                size="sm"
              />
            )}
          </div>
          <p className="leading-tight" style={{ fontSize: "0.6rem", color: "#7E887A" }}>
            @{profile.username}
          </p>
          {profile.level && (
            <p
              className="font-semibold leading-tight mt-0.5"
              style={{
                color: accent,
                fontSize: theme.isCyberpunk ? "0.5rem" : "9px",
                fontFamily: theme.labelFont,
                letterSpacing: theme.isCyberpunk ? "1.2px" : undefined,
                textTransform: theme.isCyberpunk ? "uppercase" : undefined,
              }}
            >
              {theme.isCyberpunk ? `LVL ${profile.level}` : `Level ${profile.level}`}
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p
          className="line-clamp-1 mb-2 leading-relaxed pl-1"
          style={{ fontSize: "0.6rem", color: "#8C9A87" }}
        >
          {profile.bio}
        </p>
      )}

      {/* Stats */}
      <div
        className="flex mb-2.5 pb-2.5 pl-1"
        style={{
          gap: "1rem",
          borderBottom: `1px solid ${accent}22`,
        }}
      >
        {stats.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="font-black leading-tight text-white" style={{ fontSize: "0.75rem" }}>
              {formatCount(value)}
            </span>
            <span
              className="font-black uppercase leading-tight"
              style={{
                fontSize: theme.labelSize,
                color: accent,
                letterSpacing: theme.labelSpacing,
                fontFamily: theme.labelFont,
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* View profile button — always neon green, never theme-overridden */}
      <Link href={`/profile/${username}`}>
        <button
          className="w-full font-bold py-1.5 rounded-lg transition-opacity hover:opacity-90"
          style={{
            background: "#B7FF1A",
            color: "#071013",
            fontSize: "0.65rem",
          }}
        >
          View Gamefolio
        </button>
      </Link>
    </>
  );
}

interface ProfileHoverCardProps {
  username: string;
  children: React.ReactNode;
}

export function ProfileHoverCard({ username, children }: ProfileHoverCardProps) {
  const [prefetch, setPrefetch] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: [`/api/users/${username}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 5 * 60 * 1000,
    enabled: prefetch,
  });

  const { data: badgeData } = useQuery<{
    verificationBadge: { id: number; name: string; imageUrl: string } | null;
  }>({
    queryKey: [`/api/user/${profile?.id}/verification-badge`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
  });

  const isSupabaseBanner =
    !!profile?.bannerUrl &&
    (profile.bannerUrl.includes("gamefolio-media") ||
      profile.bannerUrl.includes("gamefolio-assets") ||
      profile.bannerUrl.includes("gamefolio-name-tags"));
  const { signedUrl: signedBannerUrl } = useSignedUrl(
    isSupabaseBanner ? profile!.bannerUrl : null
  );

  const accent = profile?.accentColor  || "#B7FF1A";
  const cardBg = profile?.primaryColor || profile?.backgroundColor || "#101923";
  const theme  = getThemeTokens(accent);

  if (isTouchPrimary()) return <>{children}</>;

  return (
    <HoverCard
      openDelay={400}
      closeDelay={100}
      onOpenChange={(open) => {
        if (open) setPrefetch(true);
      }}
    >
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        className="p-3 overflow-hidden"
        style={{
          width: 200,
          background: cardBg,
          borderRadius: theme.borderRadius,
          border: theme.cardBorder,
          boxShadow: theme.cardShadow,
        }}
      >
        {prefetch && (
          isLoading ? (
            <LoadingSkeleton />
          ) : profile ? (
            <ProfilePreview
              username={username}
              profile={profile}
              badgeData={badgeData}
              signedBannerUrl={signedBannerUrl}
              accent={accent}
              theme={theme}
            />
          ) : null
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
