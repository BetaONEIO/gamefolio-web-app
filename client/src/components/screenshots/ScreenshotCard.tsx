import React from 'react';
import { Flag, X, ImageOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ReportDialog } from '@/components/content/ReportDialog';
import { LazyImage } from '@/components/ui/lazy-image';
import { useSignedUrl } from '@/hooks/use-signed-url';
import { AppealDialog } from '@/components/moderation/AppealDialog';
import { Link } from 'wouter';

interface ScreenshotCardProps {
  screenshot: any;
  isHighlighted?: boolean;
  isOwnProfile?: boolean;
  profile: any;
  onDelete?: (id: number) => void;
  onSelect?: (screenshot: any) => void;
  showUserInfo?: boolean;
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
  const { signedUrl: screenshotSignedUrl } = useSignedUrl(screenshot.imageUrl);
  const screenshotUser = (screenshot as any).user;
  const { signedUrl: signedAvatarUrl } = useSignedUrl(showUserInfo ? screenshotUser?.avatarUrl : null);

  return (
    <Card 
      className={`relative overflow-hidden group/card cursor-pointer transition-all duration-500 hover:shadow-lg ${
        isHighlighted ? 'ring-4 ring-primary ring-offset-2' : ''
      }`}
      id={isHighlighted ? `screenshot-${screenshot.id}` : undefined}
    >
      <div 
        className="aspect-video rounded-lg overflow-hidden bg-black relative"
        onClick={() => onSelect?.(screenshot)}
      >
        <LazyImage 
          src={screenshotSignedUrl || screenshot.imageUrl || ''} 
          alt={screenshot.title}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105 ${screenshot.ageRestricted ? 'blur-2xl' : ''}`}
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

        {/* Moderation status badge — owner-only, with Appeal button */}
        {isOwnProfile && screenshot.moderationStatus && screenshot.moderationStatus !== 'approved' && (
          <div className="absolute bottom-2 left-2 flex items-center gap-2 z-20" onClick={(e) => e.stopPropagation()}>
            <div
              className={`text-white text-xs px-2 py-1 rounded font-semibold shadow-lg ${
                screenshot.moderationStatus === 'rejected' ? 'bg-red-600' : 'bg-amber-600'
              }`}
              title={
                screenshot.moderationStatus === 'rejected'
                  ? 'Removed by content moderation'
                  : 'Pending review — only visible to you until approved'
              }
            >
              {screenshot.moderationStatus === 'rejected' ? 'Removed' : 'Pending review'}
            </div>
            <AppealDialog
              contentType="screenshot"
              contentId={screenshot.id}
              trigger={
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 px-2 text-xs bg-black/70 hover:bg-black/90 text-white border-white/20"
                >
                  Appeal
                </Button>
              }
            />
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

        {/* Action buttons for screenshots */}
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

      {/* Info Section - User, Title, Game, Stats */}
      <div className="p-3 space-y-1">
        {showUserInfo && screenshotUser && (
          <div className="flex items-center justify-between mb-2">
            <Link href={`/profile/${screenshotUser.username}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <div className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                {screenshotUser.nftProfileTokenId && screenshotUser.nftProfileImageUrl && (screenshotUser as any).activeProfilePicType === 'nft' ? (
                  <div className="h-7 w-7 rounded-lg overflow-hidden border border-[#4ade80]/40 flex-shrink-0">
                    <img src={screenshotUser.nftProfileImageUrl} alt={screenshotUser.displayName} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={signedAvatarUrl || '/uploaded_assets/gamefolio social logo 3d circle web.png'} />
                    <AvatarFallback className="text-xs">{screenshotUser.displayName?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                )}
                <span className="text-sm font-medium text-foreground truncate max-w-[120px]">{screenshotUser.displayName || screenshotUser.username}</span>
              </div>
            </Link>
          </div>
        )}
        {/* Title */}
        <h3 className="font-semibold text-sm line-clamp-1 leading-tight">{screenshot.title}</h3>
        
        {/* Game name with green background like clips/reels */}
        {(screenshot as any).game && (
          <div className="pt-1">
            <span className="inline-block bg-green-600 text-white text-xs px-2 py-0.5 rounded font-medium">
              {(screenshot as any).game.name}
            </span>
          </div>
        )}
        
      </div>
    </Card>
  );
}