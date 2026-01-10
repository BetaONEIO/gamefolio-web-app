import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Gamepad2 } from "lucide-react";

interface User {
  id: number;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

interface Game {
  id: number;
  name: string;
  imageUrl?: string;
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
          className="text-[#00d26a] hover:text-[#00b359] font-medium cursor-pointer hover:underline"
        >
          @{username}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 bg-[#1a1a2e] border-[#16213e]">
        {isLoading ? (
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gray-700 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-32 bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        ) : user ? (
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatarUrl || undefined} alt={user.username} />
                <AvatarFallback className="bg-[#00d26a]/20 text-[#00d26a]">
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-white">
                  {user.displayName || user.username}
                </p>
                <p className="text-xs text-gray-400">@{user.username}</p>
              </div>
            </div>
            {user.bio && (
              <p className="text-xs text-gray-300 line-clamp-2">{user.bio}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">User not found</p>
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
      <HoverCardContent className="w-64 bg-[#1a1a2e] border-[#16213e] p-3">
        {isLoading ? (
          <div className="flex items-center space-x-3">
            <div className="w-16 h-20 rounded bg-gray-700 animate-pulse" />
            <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
          </div>
        ) : game ? (
          <div className="flex items-center space-x-3">
            {game.imageUrl ? (
              <img 
                src={game.imageUrl} 
                alt={game.name} 
                className="w-16 h-20 rounded object-cover"
              />
            ) : (
              <div className="w-16 h-20 rounded bg-purple-500/20 flex items-center justify-center">
                <Gamepad2 className="w-8 h-8 text-purple-400" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white">{game.name}</p>
              <p className="text-xs text-gray-400">Click to view game page</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <div className="w-16 h-20 rounded bg-purple-500/20 flex items-center justify-center">
              <Gamepad2 className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-sm font-semibold text-white">{gameName}</p>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

export function MentionText({ text, className = "", onLinkClick }: MentionTextProps) {
  const parts: (string | JSX.Element)[] = [];
  
  // Combined regex for @mentions, #hashtags, and /[games]
  // Games are wrapped in brackets /[Game Name] for reliable parsing of multi-word titles
  const combinedRegex = /(@[a-zA-Z0-9_-]+)|(#[a-zA-Z0-9_]+)|(\/\[[^\]]+\])/g;
  
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = combinedRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    const fullMatch = match[0];
    keyIndex++;
    
    if (match[1]) {
      // @mention - green with hover preview
      const username = fullMatch.substring(1);
      parts.push(
        <UserHoverPreview 
          key={`mention-${keyIndex}`} 
          username={username} 
          onLinkClick={onLinkClick}
        />
      );
    } else if (match[2]) {
      // #hashtag - green and clickable, links to dedicated hashtag page
      const hashtag = fullMatch.substring(1);
      parts.push(
        <Link 
          key={`hashtag-${keyIndex}`}
          href={`/hashtag/${hashtag}`}
          onClick={onLinkClick}
          className="text-[#00d26a] hover:text-[#00b359] font-medium cursor-pointer hover:underline"
        >
          {fullMatch}
        </Link>
      );
    } else if (match[3]) {
      // /[game] - bold with hover preview, extract name from brackets
      const gameName = fullMatch.slice(2, -1); // Remove /[ and ]
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

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}
