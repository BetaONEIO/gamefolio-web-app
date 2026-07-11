import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { UserWithStats } from "@shared/schema";
import IndieGameProfileLayout from "@/pages/profile-layouts/IndieGameProfileLayout";

export default function IndieGameProfilePage() {
  const [, params] = useRoute("/studio/:username");
  const username = params?.username;
  const { user: currentUser } = useAuth();

  const { data: profile, isLoading, error } = useQuery<UserWithStats>({
    queryKey: [`/api/users/${username}`],
    enabled: !!username,
  });

  if (!username) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B1319" }}>
        <p className="text-white/50">No developer specified.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: "#0B1319" }}>
        <div className="relative w-full pt-32 pb-16 px-6 flex flex-col items-center"
          style={{ background: "linear-gradient(135deg, #0B1319 0%, #1a0b30 50%, #0d1f2d 100%)" }}>
          <Skeleton className="w-24 h-24 rounded-full mb-6" />
          <Skeleton className="h-12 w-72 mb-4" />
          <Skeleton className="h-4 w-40 mb-8" />
          <div className="flex gap-4">
            <Skeleton className="h-12 w-32 rounded-lg" />
            <Skeleton className="h-12 w-32 rounded-lg" />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#0B1319" }}>
        <Link href="/explore"
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Explore
        </Link>
        <h1 className="text-2xl font-bold text-white">Developer not found</h1>
        <p className="text-white/50">No indie game studio profile for <span className="text-white/80">@{username}</span>.</p>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <IndieGameProfileLayout
      profile={profile}
      isOwnProfile={isOwnProfile}
    />
  );
}
