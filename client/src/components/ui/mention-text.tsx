import { Link } from "wouter";

interface MentionTextProps {
  text: string;
  className?: string;
}

export function MentionText({ text, className = "" }: MentionTextProps) {
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
      // @mention - green and clickable to profile
      const username = fullMatch.substring(1);
      parts.push(
        <Link 
          key={`mention-${keyIndex}`}
          href={`/profile/${username}`}
          className="text-[#00d26a] hover:text-[#00b359] font-medium cursor-pointer hover:underline"
        >
          {fullMatch}
        </Link>
      );
    } else if (match[2]) {
      // #hashtag - green and clickable, links to dedicated hashtag page
      const hashtag = fullMatch.substring(1);
      parts.push(
        <Link 
          key={`hashtag-${keyIndex}`}
          href={`/hashtag/${hashtag}`}
          className="text-[#00d26a] hover:text-[#00b359] font-medium cursor-pointer hover:underline"
        >
          {fullMatch}
        </Link>
      );
    } else if (match[3]) {
      // /[game] - bold and clickable, extract name from brackets
      const gameName = fullMatch.slice(2, -1); // Remove /[ and ]
      const gameSlug = gameName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      parts.push(
        <Link 
          key={`game-${keyIndex}`}
          href={`/games/${gameSlug}`}
          className="font-bold text-white hover:text-gray-300 cursor-pointer hover:underline"
        >
          {gameName}
        </Link>
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
