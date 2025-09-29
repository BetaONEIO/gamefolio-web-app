import { LikeButton } from "./LikeButton";
import { FireButton } from "./FireButton";
import { CommentSection } from "./CommentSection";

interface EngagementBarProps {
  contentId: number;
  contentType: 'clip' | 'screenshot';
  contentOwnerId?: number;
  initialLikes?: number;
  initialFires?: number;
  initialComments?: number;
  userHasLiked?: boolean;
  userHasFired?: boolean;
  layout?: 'horizontal' | 'vertical';
  showCounts?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function EngagementBar({
  contentId,
  contentType,
  contentOwnerId,
  initialLikes = 0,
  initialFires = 0,
  initialComments = 0,
  userHasLiked = false,
  userHasFired = false,
  layout = 'horizontal',
  showCounts = true,
  size = 'md'
}: EngagementBarProps) {
  
  const containerClasses = layout === 'horizontal' 
    ? "flex items-center gap-2"
    : "flex flex-col gap-2";

  return (
    <div className={`${containerClasses} w-full`}>
      {/* Like and Fire buttons */}
      <div className={layout === 'horizontal' ? "flex items-center gap-1" : "flex flex-col gap-1"}>
        <LikeButton
          contentId={contentId}
          contentType={contentType}
          contentOwnerId={contentOwnerId}
          initialLiked={userHasLiked}
          initialCount={initialLikes}
          size={size}
        />
        
        <FireButton
          contentId={contentId}
          contentType={contentType}
          contentOwnerId={contentOwnerId}
          initialFired={userHasFired}
          initialCount={initialFires}
          size={size}
        />
      </div>

      {/* Comment Section */}
      <div className="flex-1">
        <CommentSection
          contentId={contentId}
          contentType={contentType}
          initialCount={initialComments}
        />
      </div>
    </div>
  );
}