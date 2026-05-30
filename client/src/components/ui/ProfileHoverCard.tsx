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
  return window.matchMedia("(pointer: coarse)").matches;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function LoadingSkeleton() {
  return (
    <>
      <Skeleton
        style={{
          height: 72,
          margin: "-16px -16px 12px -16px",
          width: "calc(100% + 32px)",
          borderRadius: "16px 16px 0 0",
          display: "block",
        }}
      />
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-11 w-11 rounded-full flex-shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="flex gap-5 mb-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-2 w-12" />
          </div>
        ))}
      </div>
      <Skeleton className="h-8 w-full rounded-lg" />
    </>
  );
}

interface ProfilePreviewProps {
  username: string;
  profile: any;
  badgeData?: { verificationBadge: { id: number; name: string; imageUrl: string } | null } | null;
  signedBannerUrl?: string | null;
  accent: string;
}

function ProfilePreview({ username, profile, badgeData, signedBannerUrl, accent }: ProfilePreviewProps) {
  const [bannerImgError, setBannerImgError] = useState(false);

  const verificationBadge = badgeData?.verificationBadge ?? null;
  const bannerSrc = bannerImgError ? null : signedBannerUrl;

  const stats = [
    { label: "CLIPS", value: profile._count?.clips ?? 0 },
    { label: "FOLLOWERS", value: profile._count?.followers ?? 0 },
    { label: "FOLLOWING", value: profile._count?.following ?? 0 },
  ];

  return (
    <>
      {/* Banner */}
      <div
        className="relative"
        style={{ height: 72, margin: "-16px -16px 0 -16px" }}
      >
        {bannerSrc ? (
          <img
            src={bannerSrc}
            alt=""
            className="w-full h-full object-cover"
            style={{ borderRadius: "16px 16px 0 0" }}
            onError={() => setBannerImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${profile.backgroundColor || '#0B1218'} 0%, ${profile.cardColor || '#1B2A33'} 100%)`,
              borderRadius: "16px 16px 0 0",
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(11,18,24,0.88) 0%, transparent 65%)",
            borderRadius: "16px 16px 0 0",
          }}
        />
      </div>

      {/* Avatar — overlaps banner */}
      <div className="flex items-end gap-3 mb-2" style={{ marginTop: -22 }}>
        <div className="ring-2 ring-[#101923] rounded-full flex-shrink-0">
          <CustomAvatar user={profile} size="md" showBorder />
        </div>
        <div className="min-w-0 pb-0.5">
          <div className="flex items-center gap-1 min-w-0">
            <p className="font-bold text-sm text-white leading-tight truncate">
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
          <p className="text-xs leading-tight" style={{ color: "#7E887A" }}>
            @{profile.username}
          </p>
          {profile.level && (
            <p
              className="text-[10px] font-semibold leading-tight mt-0.5"
              style={{ color: accent }}
            >
              Level {profile.level}
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p
          className="text-xs line-clamp-2 mb-3 leading-relaxed"
          style={{ color: "#8C9A87" }}
        >
          {profile.bio}
        </p>
      )}

      {/* Stats */}
      <div
        className="flex mb-3 pb-3"
        style={{
          gap: "1.5rem",
          borderBottom: `1px solid ${accent}18`,
        }}
      >
        {stats.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="font-black text-base leading-tight text-white">
              {formatCount(value)}
            </span>
            <span
              className="font-black uppercase leading-tight"
              style={{ fontSize: "7px", color: accent, letterSpacing: "0.8px" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* View profile button */}
      <Link href={`/profile/${username}`}>
        <button
          className="w-full text-xs font-bold py-2 rounded-lg transition-opacity hover:opacity-90"
          style={{ background: accent, color: "#071013" }}
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

  const accent = profile?.accentColor || "#B7FF1A";
  const cardBg = profile?.cardColor || "#101923";

  // On touch-primary devices there are no hover events — tapping the trigger
  // would immediately pop the card open. Render children as-is.
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
        className="p-4 overflow-hidden"
        style={{
          width: 292,
          background: cardBg,
          borderRadius: 16,
          border: `1px solid ${accent}22`,
          boxShadow: `0 16px 56px rgba(0,0,0,0.72), 0 0 0 1px ${accent}10`,
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
            />
          ) : null
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
