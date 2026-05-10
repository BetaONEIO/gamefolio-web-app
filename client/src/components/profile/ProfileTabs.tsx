import { useState, useEffect } from "react";
import { ClipWithUser } from "@shared/schema";
import UserClipItem from "@/components/clips/UserClipItem";
import ClipSkeleton from "@/components/clips/ClipSkeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers3, BarChart, Bookmark, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ProfileTabsProps {
  username: string;
  isCyberpunkTheme?: boolean;
}

const ProfileTabs = ({ username, isCyberpunkTheme = false }: ProfileTabsProps) => {
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

      case "reels":
        return (
          <div className="py-10 text-center">
            <p className="text-muted-foreground">No reels uploaded yet.</p>
          </div>
        );

      case "screenshots":
        return (
          <div className="py-10 text-center">
            <p className="text-muted-foreground">No screenshots uploaded yet.</p>
          </div>
        );
        
      case "favorites":
        return (
          <div className="py-10 text-center">
            <p className="text-muted-foreground">No favorites saved yet.</p>
          </div>
        );

      case "collection":
        return (
          <div className="py-10 text-center">
            <p className="text-muted-foreground">Your collection is empty.</p>
          </div>
        );
        
      default:
        return null;
    }
  };

  const tabs = [
    { id: "clips", label: "Clips", icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    )},
    { id: "reels", label: "Reels", icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    )},
    { id: "screenshots", label: "Screenshots", icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )},
    { id: "favorites", label: "Favorites", icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    )},
  ];

  return (
    <div>
      {isCyberpunkTheme && (
        <style>{`
          @keyframes profileTabsCyberGlow {
            0%,100% { box-shadow:0 0 8px #00d3f244, inset 0 0 8px #00d3f211; border-color:#00b8db88; }
            50%      { box-shadow:0 0 14px #e12afb55, inset 0 0 10px #e12afb11; border-color:#e12afb88; }
          }
          .profile-tabs-cyber-border { animation: profileTabsCyberGlow 4s ease-in-out infinite; }
        `}</style>
      )}
      {/* Curved fading line with tabs */}
      <div className="relative py-4">
        {/* Curved line container with fading ends */}
        <div className="relative flex items-center justify-center">
          {/* Left fading gradient */}
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 w-32 h-12 pointer-events-none"
            style={{
              background: 'linear-gradient(to right, transparent, hsl(var(--border)) 100%)',
              maskImage: 'linear-gradient(to right, transparent, black)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black)',
            }}
          />
          
          {/* Main curved rectangle border */}
          <div 
            className={`relative flex items-center gap-1 px-2 py-1 backdrop-blur-sm ${isCyberpunkTheme ? 'rounded-none border-0 profile-tabs-cyber-border' : 'rounded-xl border border-border/60 bg-background/50'}`}
            style={isCyberpunkTheme ? {
              background: '#020617',
              border: '1px solid #00b8db88',
              clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)',
            } : undefined}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={cn(
                  "relative px-4 md:px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200",
                  activeTab === tab.id 
                    ? "text-[#B7FF1A] border-b-2 border-[#B7FF1A] rounded-none" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
                )}
                onClick={() => setActiveTab(tab.id)}
                style={isCyberpunkTheme ? { fontFamily: "'Orbitron', sans-serif", letterSpacing: '2px', fontSize: '0.65rem', fontWeight: '900' } : undefined}
              >
                <span className="flex items-center gap-2">
                  {tab.icon}
                  <span
                    className="hidden sm:inline"
                    style={isCyberpunkTheme ? { background: 'linear-gradient(270deg,#00d3f2,#e12afb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' } : undefined}
                  >{tab.label}</span>
                </span>
              </button>
            ))}
            
            {/* Collection button */}
            <Button
              variant="outline"
              size="sm"
              className="ml-2 rounded-lg border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
              style={isCyberpunkTheme ? { fontFamily: "'Orbitron', sans-serif", letterSpacing: '2px', fontSize: '0.65rem', fontWeight: '900', borderColor: '#00b8db66' } : undefined}
              onClick={() => setActiveTab("collection")}
            >
              <FolderOpen className="h-4 w-4 mr-1" />
              <span
                className="hidden sm:inline"
                style={isCyberpunkTheme ? { background: 'linear-gradient(270deg,#00d3f2,#e12afb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' } : undefined}
              >Collection</span>
            </Button>
          </div>
          
          {/* Right fading gradient */}
          <div 
            className="absolute right-0 top-1/2 -translate-y-1/2 w-32 h-12 pointer-events-none"
            style={{
              background: 'linear-gradient(to left, transparent, hsl(var(--border)) 100%)',
              maskImage: 'linear-gradient(to left, transparent, black)',
              WebkitMaskImage: 'linear-gradient(to left, transparent, black)',
            }}
          />
        </div>
      </div>

      <div className="px-6 pt-5 pb-10">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ProfileTabs;
