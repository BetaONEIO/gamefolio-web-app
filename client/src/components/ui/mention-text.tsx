import { Link } from "wouter";

interface MentionTextProps {
  text: string;
  className?: string;
}

export function MentionText({ text, className = "" }: MentionTextProps) {
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    const username = match[1];
    parts.push(
      <Link 
        key={`mention-${match.index}`}
        href={`/profile/${username}`}
        className="text-[#00d26a] hover:text-[#00b359] font-medium cursor-pointer hover:underline"
      >
        @{username}
      </Link>
    );
    
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}
