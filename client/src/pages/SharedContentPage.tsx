
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SharedContent {
  id: number;
  title: string;
  description?: string;
  videoUrl?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  contentType: 'clip' | 'reel' | 'screenshot';
  user: {
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  views: number;
  createdAt: string;
}

export default function SharedContentPage() {
  const { username, contentType, id } = useParams();
  const [, navigate] = useLocation();

  const { data: content, isLoading, error } = useQuery<SharedContent>({
    queryKey: ['shared-content', username, contentType, id],
    queryFn: async () => {
      let endpoint = '';
      
      if (contentType === 'clips' || contentType === 'reels') {
        endpoint = `/api/clips/${id}`;
      } else if (contentType === 'screenshots') {
        endpoint = `/api/screenshots/${id}`;
      } else {
        throw new Error('Invalid content type');
      }

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Content not found');
      }
      
      const data = await response.json();
      return {
        ...data,
        contentType: contentType === 'clips' ? 'clip' : contentType === 'reels' ? 'reel' : 'screenshot'
      };
    },
    retry: false
  });

  const handleViewContent = () => {
    if (content) {
      if (content.contentType === 'screenshot') {
        navigate(`/view/screenshot/${content.id}`);
      } else {
        navigate(`/view/${content.id}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Content Not Found</h1>
              <p className="text-muted-foreground mb-4">
                The content you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => navigate('/')}>
                Go Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {content.user.avatarUrl && (
                  <img
                    src={content.user.avatarUrl}
                    alt={content.user.displayName}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <h2 className="font-semibold">{content.user.displayName}</h2>
                  <p className="text-sm text-muted-foreground">@{content.user.username}</p>
                </div>
              </div>

              <h1 className="text-2xl font-bold">{content.title}</h1>
              
              {content.description && (
                <p className="text-muted-foreground">{content.description}</p>
              )}

              <div className="relative">
                {content.contentType === 'screenshot' ? (
                  <img
                    src={content.imageUrl || content.thumbnailUrl}
                    alt={content.title}
                    className="w-full rounded-lg"
                  />
                ) : (
                  <div className="relative">
                    <img
                      src={content.thumbnailUrl}
                      alt={content.title}
                      className="w-full rounded-lg"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/50 rounded-full p-4">
                        <Play className="h-8 w-8 text-white" fill="white" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{content.views} views</span>
                <span>{new Date(content.createdAt).toLocaleDateString()}</span>
              </div>

              <Button onClick={handleViewContent} className="w-full" size="lg">
                {content.contentType === 'screenshot' ? 'View Screenshot' : 'Watch Video'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
