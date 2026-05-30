import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Gamepad2, Users, Film, Star } from "lucide-react";

interface User {
  id: number;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  level?: number;
  xp?: number;
  _count?: {
    followers?: number;
    clips?: number;
    screenshots?: number;
  };
}

interface Game {
  id: number;
  name: string;
  imageUrl?: string;
  genre?: string;
  description?: string;
}

interface MentionTextProps {
  text: string;
  className?: string;
  onLinkClick?: () => void;
}

function UserHoverPreview({ username, onLinkClick }: { username: string; onLinkClick?: () => void }) {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: [`/api/users/${username}`],
    enabled: !!username,
    staleTime: 60000,
  });

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Link
          href={`/@${username}`}
          onClick={onLinkClick}
          className="text-[#B7FF1A] hover:text-[#A2F000] font-medium cursor-pointer hover:underline"
        >
          @{username}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 bg-[#0B1218] border-[#1B2A33] p-0 overflow-hidden">
        {isLoading ? (
          <div>
            <div className="w-full h-20 bg-gray-800 animate-pulse" />
            <div className="px-3 pb-3 pt-8">
              <div className="flex items-end gap-2 -mt-8 mb-2">
                <div className="w-12 h-12 rounded-full bg-gray-700 animate-pulse border-2 border-[#0B1218]" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-28 bg-gray-700 rounded animate-pulse" />
                <div className="h-3 w-20 bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ) : user ? (
          <div>
            {/* Banner */}
            <div className="w-full h-20 bg-gradient-to-br from-[#1B2A33] to-[#0B1218] relative overflow-hidden flex-shrink-0">
              {user.bannerUrl ? (
                <img
                  src={user.bannerUrl}
                  alt=""
                  aria-hidden="true"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#B7FF1A]/10 to-[#0B1218]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1218]/60 to-transparent" />
            </div>

            {/* Avatar + info */}
            <div className="px-3 pb-3">
              <div className="flex items-end justify-between -mt-6 mb-2">
                <Avatar className="h-12 w-12 border-2 border-[#0B1218] ring-1 ring-[#B7FF1A]/30">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.username} />
                  <AvatarFallback className="bg-[#B7FF1A]/20 text-[#B7FF1A] text-sm font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {user.level != null && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#B7FF1A] bg-[#B7FF1A]/10 border border-[#B7FF1A]/30 rounded-full px-2 py-0.5 mb-1">
                    <Star className="w-2.5 h-2.5" />
                    Lv {user.level}
                  </span>
                )}
              </div>

              <p className="text-sm font-semibold text-white leading-tight">
                {user.displayName || user.username}
              </p>
              <p className="text-xs text-gray-400 mb-2">@{user.username}</p>

              {user.bio && (
                <p className="text-xs text-gray-300 line-clamp-2 mb-2">{user.bio}</p>
              )}

              {/* Stats row */}
              {user._count && (
                <div className="flex items-center gap-3 pt-1 border-t border-[#1B2A33]">
                  {user._count.followers != null && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Users className="w-3 h-3" />
                      <span className="font-medium text-white">
                        {Number(user._count.followers).toLocaleString()}
                      </span>
                      <span>followers</span>
                    </div>
                  )}
                  {(user._count.clips != null || user._count.screenshots != null) && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Film className="w-3 h-3" />
                      <span className="font-medium text-white">
                        {((user._count.clips ?? 0) + (user._count.screenshots ?? 0)).toLocaleString()}
                      </span>
                      <span>posts</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 text-sm text-gray-400">User not found</div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

function GameHoverPreview({ gameName, gameSlug, onLinkClick }: { gameName: string; gameSlug: string; onLinkClick?: () => void }) {
  const { data: games, isLoading } = useQuery<Game[]>({
    queryKey: [`/api/games/search/${encodeURIComponent(gameName)}`],
    enabled: !!gameName,
    staleTime: 60000,
  });

  const game = games?.[0];

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Link
          href={`/games/${gameSlug}`}
          onClick={onLinkClick}
          className="font-bold text-white hover:text-gray-300 cursor-pointer hover:underline"
        >
          {gameName}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 bg-[#0B1218] border-[#1B2A33] p-0 overflow-hidden">
        {isLoading ? (
          <div>
            <div className="w-full h-32 bg-gray-800 animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-28 bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-20 bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        ) : game ? (
          <div>
            {/* Game cover — full-width banner crop */}
            <div className="w-full h-36 bg-[#1B2A33] relative overflow-hidden">
              {game.imageUrl ? (
                <img
                  src={game.imageUrl}
                  alt={game.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-[#0B1218]">
                  <Gamepad2 className="w-12 h-12 text-primary/60" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1218] via-transparent to-transparent" />
            </div>
            {/* Info below */}
            <div className="px-3 py-2">
              <p className="text-sm font-bold text-white leading-tight">{game.name}</p>
              {game.genre && (
                <p className="text-xs text-gray-400 mt-0.5">{game.genre}</p>
              )}
              <p className="text-xs text-[#B7FF1A]/70 mt-1">View game page →</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="w-full h-36 flex items-center justify-center bg-gradient-to-br from-primary/10 to-[#0B1218]">
              <Gamepad2 className="w-12 h-12 text-primary/50" />
            </div>
            <div className="px-3 py-2">
              <p className="text-sm font-bold text-white">{gameName}</p>
              <p className="text-xs text-[#B7FF1A]/70 mt-1">View game page →</p>
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

export function MentionText({ text, className = "", onLinkClick }: MentionTextProps) {
  const parts: (string | JSX.Element)[] = [];

  // Combined regex for @mentions, #hashtags, and /[games]
  const combinedRegex = /(@[a-zA-Z0-9_-]+)|(#[a-zA-Z0-9_]+)|(\/\[[^\]]+\])/g;

  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = combinedRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const fullMatch = match[0];
    keyIndex++;

    if (match[1]) {
      const username = fullMatch.substring(1);
      parts.push(
        <UserHoverPreview
          key={`mention-${keyIndex}`}
          username={username}
          onLinkClick={onLinkClick}
        />
      );
    } else if (match[2]) {
      const hashtag = fullMatch.substring(1);
      parts.push(
        <Link
          key={`hashtag-${keyIndex}`}
          href={`/hashtag/${hashtag}`}
          onClick={onLinkClick}
          className="text-[#B7FF1A] hover:text-[#A2F000] font-medium cursor-pointer hover:underline"
        >
          {fullMatch}
        </Link>
      );
    } else if (match[3]) {
      const gameName = fullMatch.slice(2, -1);
      const gameSlug = gameName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      parts.push(
        <GameHoverPreview
          key={`game-${keyIndex}`}
          gameName={gameName}
          gameSlug={gameSlug}
          onLinkClick={onLinkClick}
        />
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}
