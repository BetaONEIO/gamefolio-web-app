import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { getQueryFn } from "@/lib/queryClient";

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function ProfilePreview({ username }: { username: string }) {
  const { data: profile, isLoading } = useQuery({
    queryKey: [`/api/users/${username}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 5 * 60 * 1000,
  });

  const { signedUrl: signedBannerUrl } = useSignedUrl(profile?.bannerUrl ?? null);
  const bannerSrc =
    signedBannerUrl ||
    (profile?.bannerUrl && !profile.bannerUrl.includes("supabase")
      ? profile.bannerUrl
      : null);

  if (isLoading) {
    return (
      <>
        <Skeleton
          className="mb-3"
          style={{
            height: 72,
            margin: "-16px -16px 12px -16px",
            width: "calc(100% + 32px)",
            borderRadius: "16px 16px 0 0",
          }}
        />
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1 mb-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-8 w-full rounded-lg" />
      </>
    );
  }

  if (!profile) return null;

  const stats = [
    { label: "Followers", value: profile._count?.followers ?? 0 },
    { label: "Following", value: profile._count?.following ?? 0 },
    { label: "Clips", value: profile._count?.clips ?? 0 },
    { label: "Screenshots", value: profile._count?.screenshots ?? 0 },
  ];

  return (
    <>
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
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: "linear-gradient(135deg, #0B1218 0%, #1B2A33 100%)",
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

      <div
        className="flex items-end gap-3 mb-2"
        style={{ marginTop: -22 }}
      >
        <div className="ring-2 ring-[#101923] rounded-full flex-shrink-0">
          <CustomAvatar user={profile} size="md" showBorder />
        </div>
        <div className="min-w-0 pb-0.5">
          <p className="font-bold text-sm text-white leading-tight truncate">
            {profile.displayName || profile.username}
          </p>
          <p className="text-xs leading-tight" style={{ color: "#7E887A" }}>
            @{profile.username}
          </p>
          {profile.level && (
            <p
              className="text-[10px] font-semibold leading-tight mt-0.5"
              style={{ color: "#B7FF1A" }}
            >
              Level {profile.level}
            </p>
          )}
        </div>
      </div>

      {profile.bio && (
        <p
          className="text-xs line-clamp-2 mb-2 leading-relaxed"
          style={{ color: "#8C9A87" }}
        >
          {profile.bio}
        </p>
      )}

      <div className="grid grid-cols-4 gap-1 mb-3">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="text-center py-1.5 rounded-lg"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <p className="text-sm font-bold text-white leading-tight">
              {formatCount(value)}
            </p>
            <p className="text-[10px] leading-tight" style={{ color: "#556059" }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      <Link href={`/profile/${username}`}>
        <button
          className="w-full text-xs font-bold py-2 rounded-lg transition-opacity hover:opacity-90"
          style={{ background: "#B7FF1A", color: "#071013" }}
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
          width: 280,
          background: "#101923",
          borderRadius: 16,
          border: "1px solid rgba(27,42,51,0.9)",
          boxShadow:
            "0 16px 56px rgba(0,0,0,0.72), 0 0 0 1px rgba(183,255,26,0.06)",
        }}
      >
        {prefetch && <ProfilePreview username={username} />}
      </HoverCardContent>
    </HoverCard>
  );
}
