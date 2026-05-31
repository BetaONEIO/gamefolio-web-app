import React from 'react';
import { X, ImageOff, Heart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/ui/lazy-image';
import { Link } from 'wouter';
import { ProfileHoverCard } from '@/components/ui/ProfileHoverCard';
import { useSignedUrl } from '@/hooks/use-signed-url';
import { TrendingClipMenu } from '@/components/clips/TrendingClipMenu';
import { ClipWithUser } from '@shared/schema';

interface ScreenshotCardProps {
  screenshot: any;
  isHighlighted?: boolean;
  isOwnProfile?: boolean;
  profile: any;
  onDelete?: (id: number) => void;
  onSelect?: (screenshot: any) => void;
  showUserInfo?: boolean;
}

function ScreenshotAvatar({ avatarUrl, username }: { avatarUrl?: string | null; username: string }) {
  const { signedUrl } = useSignedUrl(avatarUrl ?? null);
  return (
    <img
      src={signedUrl || avatarUrl || '/uploaded_assets/gamefolio-logo-green.png'}
      alt={username}
      className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-white/10"
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/uploaded_assets/gamefolio-logo-green.png'; }}
    />
  );
}

export function ScreenshotCard({ 
  screenshot, 
  isHighlighted, 
  isOwnProfile, 
  profile, 
  onDelete, 
  onSelect,
  showUserInfo = false
}: ScreenshotCardProps) {
  const screenshotUser = (screenshot as any).user;

  return (
    <div 
      className={`group/card cursor-pointer ${
        isHighlighted ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl' : ''
      }`}
      id={isHighlighted ? `screenshot-${screenshot.id}` : undefined}
    >
      {/* Thumbnail — dark card matching VideoClipCard style */}
      <div 
        className="relative aspect-video overflow-hidden rounded-xl bg-[#0B1218]"
        onClick={() => onSelect?.(screenshot)}
      >
        <LazyImage 
          src={screenshot.imageUrl || ''} 
          alt={screenshot.title}
          className="w-full h-full object-contain transition-transform duration-500 group-hover/card:scale-105"
          placeholder="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='100'%20height='100'%3e%3crect%20width='100'%20height='100'%20fill='%231f2937'/%3e%3c/svg%3e"
          showLoadingSpinner={true}
          containerClassName="absolute inset-0"
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <ImageOff className="h-12 w-12 text-gray-500" />
            </div>
          }
        />

        {/* Stats overlay — likes + views */}
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 z-20 scale-90 sm:scale-100 origin-bottom-right">
          {((screenshot as any)._count?.likes ?? (screenshot as any).likesCount ?? 0) > 0 && (
            <div className="bg-black/70 backdrop-blur-sm text-white px-1 py-0.5 text-[8px] sm:text-[9px] rounded font-semibold flex items-center gap-0.5 leading-none">
              <Heart className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
              {((screenshot as any)._count?.likes ?? (screenshot as any).likesCount ?? 0) >= 1000
                ? `${(((screenshot as any)._count?.likes ?? (screenshot as any).likesCount ?? 0) / 1000).toFixed(1)}K`
                : (screenshot as any)._count?.likes ?? (screenshot as any).likesCount ?? 0}
            </div>
          )}
          <div className="bg-black/70 backdrop-blur-sm text-white px-1 py-0.5 text-[8px] sm:text-[9px] rounded font-semibold flex items-center gap-0.5 leading-none">
            <Eye className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
            {(screenshot.views ?? 0) >= 1000
              ? `${((screenshot.views ?? 0) / 1000).toFixed(1)}K`
              : (screenshot.views ?? 0)}
          </div>
        </div>

        {/* Quick-delete button — own profile only, hover overlay */}
        {isOwnProfile && (
          <Button
            size="sm"
            variant="destructive"
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-20 h-8 w-8 md:h-7 md:w-7"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (confirm(`Are you sure you want to delete "${screenshot.title}"? This action cannot be undone.`)) {
                onDelete?.(screenshot.id);
              }
            }}
            title="Delete screenshot"
            data-testid="button-delete-screenshot"
          >
            <X className="h-4 w-4 md:h-3 md:w-3" />
          </Button>
        )}
      </div>

      {/* Info Section — matches VideoClipCard metadata layout */}
      <div className="pt-2.5 pb-1 space-y-1.5">
        {showUserInfo && screenshotUser ? (
          <ProfileHoverCard username={screenshotUser.username}>
            <Link
              href={`/profile/${screenshotUser.username}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="flex items-center gap-2 group/author"
            >
              <ScreenshotAvatar avatarUrl={screenshotUser.avatarUrl} username={screenshotUser.username} />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium leading-tight truncate" style={{ color: '#F5F7F2' }}>
                  {screenshotUser.displayName || screenshotUser.username}
                </span>
                <span className="text-[10px] leading-tight" style={{ color: 'rgba(245,247,242,0.45)' }}>
                  @{screenshotUser.username}
                </span>
              </div>
            </Link>
          </ProfileHoverCard>
        ) : null}

        <div className="flex items-start justify-between gap-1">
          <h3 className="font-semibold text-sm line-clamp-2 leading-tight flex-1 min-w-0" style={{ color: '#F5F7F2' }}>
            {screenshot.title}
          </h3>
          <div onClick={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); }} className="flex-shrink-0 -mt-0.5">
            <TrendingClipMenu
              clip={{ ...screenshot, user: screenshotUser || { username: profile?.username || '', id: screenshot.userId } } as unknown as ClipWithUser}
              contentType="screenshot"
              screenshotImageUrl={screenshot.imageUrl}
            />
          </div>
        </div>

        {(screenshot as any).game && (
          <Link
            href={`/games/${(screenshot as any).game.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <span
              className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded hover:opacity-90 transition-opacity mt-0.5"
              style={{ background: '#B7FF1A', color: '#071013' }}
            >
              {(screenshot as any).game.name}
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
