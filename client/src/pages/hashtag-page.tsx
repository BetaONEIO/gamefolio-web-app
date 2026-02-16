import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Hash, TrendingUp, Clock, Eye } from "lucide-react";
import { ClipWithUser } from "@shared/schema";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/constants";

const HashtagPage = () => {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/hashtag/:hashtag");
  const hashtag = params?.hashtag;
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');

  // Get clips with this hashtag
  const { data: clips, isLoading, error } = useQuery<ClipWithUser[]>({
    queryKey: ["/api/clips/hashtag", hashtag],
    queryFn: async () => {
      if (!hashtag) return [];
      const response = await fetch(`/api/clips/hashtag/${encodeURIComponent(hashtag)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch clips for hashtag");
      }
      return response.json();
    },
    enabled: !!hashtag,
  });

  // Sort clips based on selected criteria
  const sortedClips = clips ? [...clips].sort((a, b) => {
    if (sortBy === 'popular') {
      return (b.views || 0) - (a.views || 0);
    }
    // Default to recent
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }) : [];

  if (!match || !hashtag) {
    return <div>Hashtag not found</div>;
  }

  const handleBackToExplore = () => {
    navigate("/explore");
  };

  return (
    <div className="py-6 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={handleBackToExplore}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Explore
        </Button>
      </div>

      {/* Hashtag Info */}
      <div className="flex items-center gap-6 mb-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-border/50">
          <Hash className="w-10 h-10 text-primary" />
        </div>
        
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">#{hashtag}</h1>
          <p className="text-muted-foreground mb-4">
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              `${clips?.length || 0} ${clips?.length === 1 ? 'clip' : 'clips'}`
            )}
          </p>
          
          {/* Sort Options */}
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'recent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('recent')}
              className="flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Recent
            </Button>
            <Button
              variant={sortBy === 'popular' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('popular')}
              className="flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Popular
            </Button>
          </div>
        </div>
      </div>

      {/* Clips Grid */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array(8).fill(0).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  <Skeleton className="aspect-video w-full" />
                  <div className="p-4">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Error loading clips</h2>
            <p className="text-muted-foreground">
              There was an error loading clips for #{hashtag}. Please try again.
            </p>
          </div>
        ) : sortedClips.length === 0 ? (
          <div className="text-center py-12">
            <Hash className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No clips found</h2>
            <p className="text-muted-foreground mb-4">
              There are no clips tagged with #{hashtag} yet.
            </p>
            <Button onClick={() => navigate("/upload")} className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Be the first to upload
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedClips.map((clip) => (
              <VideoClipGridItem 
                key={clip.id} 
                clip={clip}
              />
            ))}
          </div>
        )}
      </div>

      {/* Hashtag Stats */}
      {sortedClips.length > 0 && (
        <div className="mt-12 p-6 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">#{hashtag} Stats</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{sortedClips.length}</div>
              <div className="text-sm text-muted-foreground">Total Clips</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {sortedClips.reduce((sum, clip) => sum + (clip.views || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Views</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {new Set(sortedClips.map(clip => clip.userId)).size}
              </div>
              <div className="text-sm text-muted-foreground">Contributors</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HashtagPage;