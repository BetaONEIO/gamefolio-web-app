import React from 'react';
import { Flag, X, ImageOff, Heart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportDialog } from '@/components/content/ReportDialog';
import { LazyImage } from '@/components/ui/lazy-image';
import { Link } from 'wouter';
import { ProfileHoverCard } from '@/components/ui/ProfileHoverCard';
import { useSignedUrl } from '@/hooks/use-signed-url';

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
          className={`w-full h-full object-contain transition-transform duration-500 group-hover/card:scale-105 ${screenshot.ageRestricted ? 'blur-2xl' : ''}`}
          placeholder="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='100'%20height='100'%3e%3crect%20width='100'%20height='100'%20fill='%231f2937'/%3e%3c/svg%3e"
          showLoadingSpinner={true}
          containerClassName="absolute inset-0"
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <ImageOff className="h-12 w-12 text-gray-500" />
            </div>
          }
        />

        {/* Age Restriction badge */}
        {screenshot.ageRestricted && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded font-bold shadow-lg z-20">
            18+
          </div>
        )}

        {/* Age Restricted Overlay */}
        {screenshot.ageRestricted && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
            <div className="text-red-500 text-4xl mb-2">⚠️</div>
            <div className="text-white font-bold text-sm mb-1">Age Restricted</div>
            <div className="text-white/70 text-xs">18+ Content</div>
          </div>
        )}

        {/* Stats overlay — likes + views, matches h-2.5 w-2.5 icon size of Latest Clips module */}
        {!screenshot.ageRestricted && (
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
        )}

        {/* Action buttons */}
        {isOwnProfile ? (
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
        ) : (
          <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
            <ReportDialog
              contentType="screenshot"
              contentId={screenshot.id}
              contentTitle={screenshot.title}
              contentAuthor={profile.username}
              trigger={
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-black/50 hover:bg-black/70 text-white border-red-500 hover:border-red-400 p-1 h-7 w-7"
                  onClick={(e) => e.stopPropagation()}
                  title="Report screenshot"
                >
                  <Flag size={12} />
                </Button>
              }
            />
          </div>
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

        <h3 className="font-semibold text-sm line-clamp-2 leading-tight" style={{ color: '#F5F7F2' }}>
          {screenshot.title}
        </h3>

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
