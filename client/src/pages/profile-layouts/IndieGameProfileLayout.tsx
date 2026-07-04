import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { UserWithStats, ClipWithUser, Screenshot, GameBounty } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import PlatformConnections from '@/components/profile/PlatformConnections';
import { SiSteam, SiEpicgames } from 'react-icons/si';
import {
  Users,
  Eye,
  Flame,
  MessageCircle,
  UserPlus,
  UserCheck,
  Video,
  Play,
  Camera,
  Star,
  Award,
  CheckCircle2,
  Terminal,
  Sword,
  Key,
  Clock,
} from 'lucide-react';

const MessageDialog = React.lazy(() =>
  import('@/components/messages/MessageDialog').then((m) => ({ default: m.MessageDialog }))
);

const TABS = ['OVERVIEW', 'CLIPS', 'REELS', 'SCREENSHOTS', 'BOUNTIES'];

function getVideoEmbedUrl(url: string): string | null {
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  return null;
}

type BountyWithMeta = GameBounty & { participantCount?: number; gameName?: string; gameImageUrl?: string };

interface IndieGameProfileLayoutProps {
  profile: UserWithStats;
  isOwnProfile: boolean;
}

export default function IndieGameProfileLayout({ profile, isOwnProfile }: IndieGameProfileLayoutProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  const brand = {
    bg: '#0B1319',
    accent: '#B7FF18',
    cardBg: 'rgba(255, 255, 255, 0.04)',
    cardBorder: 'rgba(183, 255, 24, 0.15)',
    textMuted: 'rgba(255, 255, 255, 0.7)',
  };

  const cardStyle: React.CSSProperties = {
    background: brand.cardBg,
    border: `1px solid ${brand.cardBorder}`,
    borderRadius: '12px',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
  };

  const glowStyle: React.CSSProperties = {
    boxShadow: `0 0 20px rgba(183, 255, 24, 0.2)`,
  };

  const { data: followStatus } = useQuery<{ status: 'following' | 'requested' | 'not_following' }>({
    queryKey: [`/api/users/${profile.username}/follow-status`],
    enabled: !!currentUser && !isOwnProfile,
  });

  const { data: clips } = useQuery<ClipWithUser[]>({
    queryKey: [`/api/users/${profile.username}/clips`],
  });

  const { data: screenshots } = useQuery<Screenshot[]>({
    queryKey: [`/api/users/${profile.id}/screenshots`],
  });

  const { data: bounties } = useQuery<BountyWithMeta[]>({
    queryKey: [`/api/users/${profile.username}/bounties`],
  });

  const isFollowing = followStatus?.status === 'following';
  const isRequested = followStatus?.status === 'requested';

  const followMutation = useMutation({
    mutationFn: async () => {
      const method = isFollowing || isRequested ? 'DELETE' : 'POST';
      const response = await fetch(`/api/users/${profile.username}/follow`, {
        method,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to update follow status');
      return response.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${profile.username}/follow-status`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${profile.username}`] });
    },
    onError: (err: Error) => {
      toast({ description: err.message || 'Something went wrong.', variant: 'gamefolioError' });
    },
  });

  const handleFollowClick = () => {
    if (!currentUser) {
      setLocation('/auth');
      return;
    }
    followMutation.mutate();
  };

  const genreTags = (profile.userType || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const gameClips = (clips || []).filter((c) => c.videoType !== 'reel');
  const reels = (clips || []).filter((c) => c.videoType === 'reel');

  return (
    <div style={{ background: brand.bg, minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: 'white' }}>
      <section
        className="relative w-full pt-32 pb-16 px-6 md:px-12 flex flex-col items-center justify-center border-b border-white/5"
        style={{ background: 'linear-gradient(135deg, #0B1319 0%, #1a0b30 50%, #0d1f2d 100%)' }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.15)_0%,transparent_50%)] pointer-events-none"></div>

        <div className="relative z-20 max-w-5xl w-full mx-auto flex flex-col items-center text-center">
          {profile.avatarUrl && (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="w-24 h-24 rounded-full object-cover mb-6 border-2"
              style={{ borderColor: brand.accent }}
            />
          )}

          {genreTags.length > 0 && (
            <div className="flex gap-3 mb-6 flex-wrap justify-center">
              {genreTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full"
                  style={{ background: brand.accent, color: '#0B1319' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-3 text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            {profile.displayName}
          </h1>
          <p className="text-white/50 mb-8">@{profile.username}</p>

          {profile.bio && (
            <p className="max-w-2xl text-white/70 mb-8">{profile.bio}</p>
          )}

          {!isOwnProfile && (
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8 w-full sm:w-auto">
              <button
                onClick={handleFollowClick}
                disabled={followMutation.isPending}
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg font-bold text-black transition-all hover:scale-105 disabled:opacity-60"
                style={{ background: brand.accent, ...glowStyle }}
              >
                {isFollowing ? <UserCheck size={18} /> : <UserPlus size={18} />}
                {isFollowing ? 'Following' : isRequested ? 'Requested' : 'Follow'}
              </button>
              <button
                onClick={() => (currentUser ? setMessageDialogOpen(true) : setLocation('/auth'))}
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg font-bold text-white transition-all hover:bg-white/5 border border-white/20"
              >
                <MessageCircle size={18} />
                Message
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4 w-full sm:w-auto">
            {[
              { label: 'Followers', value: profile._count?.followers ?? 0, icon: Users },
              { label: 'Total Views', value: profile._count?.clipViews ?? 0, icon: Eye },
              { label: 'Fires', value: profile._count?.firesReceived ?? 0, icon: Flame },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-4 rounded-lg" style={cardStyle}>
                <stat.icon size={22} color={brand.accent} className="opacity-90" />
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: brand.textMuted }}>
                    {stat.label}
                  </div>
                  <div className="text-xl font-bold">{stat.value.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>

          <PlatformConnections
            profile={profile}
            className="!border-t-0 mt-6 pt-6 border-t border-white/10 w-full justify-center flex-wrap"
          />
        </div>
      </section>

      <nav className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl bg-[#0B1319]/80 px-6">
        <div className="max-w-6xl mx-auto flex overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-5 text-sm font-bold tracking-widest whitespace-nowrap transition-colors relative
                ${tab === activeTab ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
            >
              {tab}
              {tab === activeTab && (
                <div className="absolute bottom-0 left-0 w-full h-1" style={{ background: brand.accent, ...glowStyle }}></div>
              )}
            </button>
          ))}
        </div>
      </nav>

      {activeTab === 'OVERVIEW' && (
        <section className="py-16 px-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            <div className="aspect-video rounded-lg overflow-hidden" style={cardStyle}>
              {profile.gameTrailerUrl ? (
                getVideoEmbedUrl(profile.gameTrailerUrl) ? (
                  <iframe
                    src={getVideoEmbedUrl(profile.gameTrailerUrl)!}
                    title={`${profile.displayName} trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                ) : (
                  <video
                    src={profile.gameTrailerUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ color: brand.textMuted }}>
                  <Play size={32} color={brand.accent} />
                  <span className="text-sm">No trailer added yet</span>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Overview</h2>
              <p className="text-lg leading-relaxed" style={{ color: brand.textMuted }}>
                {profile.gameDescription || profile.bio || `${profile.displayName} hasn't added a game description yet.`}
              </p>
            </div>

            {profile.gameScreenshotUrls && profile.gameScreenshotUrls.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Screenshots</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {profile.gameScreenshotUrls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-video rounded-lg overflow-hidden block"
                      style={cardStyle}
                    >
                      <img src={url} alt={`${profile.displayName} screenshot ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {profile.gameKeyFeatures && profile.gameKeyFeatures.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Key Features</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {profile.gameKeyFeatures.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-lg" style={cardStyle}>
                      <CheckCircle2 color={brand.accent} size={20} className="shrink-0 mt-0.5" />
                      <span className="text-sm font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Level', value: profile.level ?? 1, icon: Star },
                { label: 'Total XP', value: (profile.totalXP ?? 0).toLocaleString(), icon: Award },
                { label: 'Streak', value: `${profile.currentStreak ?? 0}d`, icon: Flame },
                { label: 'Clips', value: profile._count?.clips ?? 0, icon: Video },
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-lg flex flex-col items-center gap-2 text-center" style={cardStyle}>
                  <stat.icon size={20} color={brand.accent} />
                  <div className="text-lg font-bold">{stat.value}</div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: brand.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 space-y-6" style={{ ...cardStyle, boxShadow: `0 0 20px rgba(183, 255, 24, 0.15)` }}>
              <div>
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: brand.textMuted }}>Developer</div>
                <div className="text-xl font-bold text-white flex items-center gap-2">
                  <Terminal size={18} color={brand.accent} />
                  {profile.displayName}
                </div>
              </div>

              {(profile.studioFoundedYear || profile.studioTeamSize) && (
                <div className="grid grid-cols-2 gap-4">
                  {profile.studioFoundedYear && (
                    <div>
                      <div className="text-xs uppercase tracking-wider mb-1" style={{ color: brand.textMuted }}>Founded</div>
                      <div className="font-medium">{profile.studioFoundedYear}</div>
                    </div>
                  )}
                  {profile.studioTeamSize && (
                    <div>
                      <div className="text-xs uppercase tracking-wider mb-1" style={{ color: brand.textMuted }}>Team Size</div>
                      <div className="font-medium">{profile.studioTeamSize}</div>
                    </div>
                  )}
                </div>
              )}

              {profile.gameReleaseDate && (
                <div className="pt-4 border-t border-white/10">
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: brand.textMuted }}>Release Date</div>
                  <div className="text-lg font-bold text-white">{profile.gameReleaseDate}</div>
                </div>
              )}
            </div>

            {(profile.gameSteamUrl || profile.gameEpicUrl) && (
              <div className="p-6 space-y-4" style={cardStyle}>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/50 mb-2">Store Links</h3>

                {profile.gameSteamUrl && (
                  <a
                    href={profile.gameSteamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 p-3 rounded-md bg-[#171a21] hover:bg-[#2a303c] transition-colors border border-white/5 group"
                  >
                    <SiSteam size={24} className="text-[#66c0f4]" />
                    <span className="font-semibold text-[#c7d5e0]">Steam</span>
                  </a>
                )}

                {profile.gameEpicUrl && (
                  <a
                    href={profile.gameEpicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 p-3 rounded-md bg-[#121212] hover:bg-[#2a2a2a] transition-colors border border-white/5 group"
                  >
                    <SiEpicgames size={24} className="text-white" />
                    <span className="font-semibold text-white">Epic Games</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'CLIPS' && (
        <section className="py-16 px-6 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Clips</h2>
          {gameClips.length === 0 ? (
            <p style={{ color: brand.textMuted }}>No clips yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {gameClips.map((clip) => (
                <div key={clip.id} className="aspect-video rounded-lg flex items-center justify-center relative overflow-hidden" style={cardStyle}>
                  {clip.thumbnailUrl ? (
                    <img src={clip.thumbnailUrl} alt={clip.title} className="w-full h-full object-cover" />
                  ) : (
                    <Video size={28} className="text-white/30" />
                  )}
                  <span className="absolute bottom-2 left-2 right-2 text-xs font-semibold bg-black/60 px-2 py-1 rounded truncate">
                    {clip.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'REELS' && (
        <section className="py-16 px-6 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Reels</h2>
          {reels.length === 0 ? (
            <p style={{ color: brand.textMuted }}>No reels yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {reels.map((reel) => (
                <div key={reel.id} className="aspect-[9/16] rounded-lg flex items-center justify-center relative overflow-hidden" style={cardStyle}>
                  {reel.thumbnailUrl ? (
                    <img src={reel.thumbnailUrl} alt={reel.title} className="w-full h-full object-cover" />
                  ) : (
                    <Play size={28} className="text-white/30" />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'SCREENSHOTS' && (
        <section className="py-16 px-6 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Screenshots</h2>
          {(screenshots || []).length === 0 ? (
            <p style={{ color: brand.textMuted }}>No screenshots yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {(screenshots || []).map((shot) => (
                <div key={shot.id} className="aspect-video rounded-lg flex items-center justify-center relative overflow-hidden" style={cardStyle}>
                  {shot.imageUrl ? (
                    <img src={shot.imageUrl} alt={shot.title} className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={28} className="text-white/30" />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'BOUNTIES' && (
        <section className="py-16 px-6 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Bounty Campaigns</h2>
          {(bounties || []).length === 0 ? (
            <p style={{ color: brand.textMuted }}>
              {isOwnProfile
                ? "You haven't launched any bounty campaigns yet."
                : `${profile.displayName} hasn't launched any bounty campaigns yet.`}
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {(bounties || []).map((bounty) => {
                const isActive = bounty.status === 'active';
                return (
                  <Link
                    key={bounty.id}
                    href={`/games/${bounty.gameId}?tab=bounties`}
                    className="block p-6 rounded-lg transition-transform hover:scale-[1.02]"
                    style={cardStyle}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Sword size={18} color={brand.accent} />
                        <span
                          className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
                          style={{
                            background: isActive ? 'rgba(183, 255, 24, 0.15)' : 'rgba(255,255,255,0.08)',
                            color: isActive ? brand.accent : brand.textMuted,
                          }}
                        >
                          {bounty.status}
                        </span>
                      </div>
                      {bounty.gameName && (
                        <span className="text-xs font-semibold text-white/50 truncate max-w-[45%]">{bounty.gameName}</span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1">{bounty.campaignTitle || bounty.title}</h3>
                    {bounty.description && (
                      <p className="text-sm mb-4 line-clamp-2" style={{ color: brand.textMuted }}>
                        {bounty.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: brand.textMuted }}>
                      <div className="flex items-center gap-1.5">
                        <Users size={14} />
                        {bounty.participantCount ?? 0}/{bounty.maxParticipants ?? 10} joined
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Award size={14} />
                        {(bounty.totalXpAvailable ?? 0).toLocaleString()} XP
                      </div>
                      {(bounty.fullKeysRemaining ?? 0) > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Key size={14} />
                          {bounty.fullKeysRemaining} keys left
                        </div>
                      )}
                      {bounty.endDate && (
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} />
                          {new Date(bounty.endDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {currentUser && (
        <React.Suspense fallback={null}>
          <MessageDialog
            open={messageDialogOpen}
            onOpenChange={setMessageDialogOpen}
            targetUser={{
              id: profile.id,
              username: profile.username,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl,
            }}
          />
        </React.Suspense>
      )}
    </div>
  );
}
