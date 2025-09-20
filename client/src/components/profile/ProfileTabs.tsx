import { useState, useEffect } from "react";
import { ClipWithUser } from "@shared/schema";
import UserClipItem from "@/components/clips/UserClipItem";
import ClipSkeleton from "@/components/clips/ClipSkeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers3, BarChart, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileTabsProps {
  username: string;
}

const ProfileTabs = ({ username }: ProfileTabsProps) => {
  const [activeTab, setActiveTab] = useState("clips");
  const queryClient = useQueryClient();
  
  // Force refetch clips data every time component renders
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: [`/api/users/${username}/clips`] });
  }, [username, queryClient]);

  const { data: userClips, isLoading } = useQuery<ClipWithUser[]>({
    queryKey: [`/api/users/${username}/clips`],
    refetchInterval: 3000, // Refresh every 3 seconds
    staleTime: 0 // Always consider data stale
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case "clips":
        if (isLoading) {
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="w-full" key={`skeleton-${index}`}>
                  <ClipSkeleton />
                </div>
              ))}
            </div>
          );
        }
        
        if (!userClips || userClips.length === 0) {
          return (
            <div className="py-10 text-center">
              <p className="text-muted-foreground">No clips uploaded yet.</p>
            </div>
          );
        }
        
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userClips.map(clip => (
              <div className="w-full" key={clip.id}>
                <UserClipItem clip={clip} />
              </div>
            ))}
          </div>
        );
        
      case "gaming-stats":
        if (isLoading) {
          return (
            <div className="space-y-4 py-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`stat-skeleton-${index}`} className="bg-card p-4 rounded-md">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-card p-1">
                      <div className="w-8 h-8 rounded-full overflow-hidden">
                        <div className="animate-pulse bg-slate-700 w-full h-full" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="animate-pulse bg-slate-700 h-4 w-1/3 mb-1 rounded-sm" />
                      <div className="animate-pulse bg-slate-700 h-3 w-1/2 rounded-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        }
        
        return (
          <div className="py-10 text-center">
            <p className="text-muted-foreground">Gaming statistics coming soon!</p>
          </div>
        );
        
      case "saved":
        if (isLoading) {
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="w-full" key={`saved-skeleton-${index}`}>
                  <ClipSkeleton />
                </div>
              ))}
            </div>
          );
        }
        
        return (
          <div className="py-10 text-center">
            <p className="text-muted-foreground">Saved clips coming soon!</p>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Instagram-style tabs with icons */}
      <div className="border-t border-border">
        <div className="flex justify-center">
          <button
            className={cn(
              "flex items-center justify-center px-3 md:px-6 py-3 gap-1 md:gap-2 font-medium text-xs uppercase tracking-wider relative",
              activeTab === "clips" 
                ? "text-primary" 
                : "text-muted-foreground",
              // Mobile-friendly underline using pseudo-element
              activeTab === "clips" && "after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-6 md:after:w-8 after:h-0.5 after:bg-primary after:rounded-full"
            )}
            onClick={() => setActiveTab("clips")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Clips
          </button>
          <button
            className={cn(
              "flex items-center justify-center px-3 md:px-6 py-3 gap-1 md:gap-2 font-medium text-xs uppercase tracking-wider relative",
              activeTab === "gaming-stats" 
                ? "text-primary" 
                : "text-muted-foreground",
              // Mobile-friendly underline using pseudo-element
              activeTab === "gaming-stats" && "after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-6 md:after:w-8 after:h-0.5 after:bg-primary after:rounded-full"
            )}
            onClick={() => setActiveTab("gaming-stats")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Stats
          </button>
          <button
            className={cn(
              "flex items-center justify-center px-3 md:px-6 py-3 gap-1 md:gap-2 font-medium text-xs uppercase tracking-wider relative",
              activeTab === "saved" 
                ? "text-primary" 
                : "text-muted-foreground",
              // Mobile-friendly underline using pseudo-element
              activeTab === "saved" && "after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-6 md:after:w-8 after:h-0.5 after:bg-primary after:rounded-full"
            )}
            onClick={() => setActiveTab("saved")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Saved
          </button>
        </div>
      </div>

      <div className="px-6 pt-5 pb-10">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ProfileTabs;
