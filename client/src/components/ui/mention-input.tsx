import * as React from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "./textarea";
import { useQuery } from "@tanstack/react-query";
import { Gamepad2, Hash, User as UserIcon } from "lucide-react";
import { useSignedUrl } from "@/hooks/use-signed-url";

function SignedImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const { signedUrl } = useSignedUrl(src);
  return <img src={signedUrl || src} alt={alt} className={className} />;
}

interface User {
  id: number;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

interface Game {
  id: number;
  name: string;
  imageUrl?: string;
}

type SuggestionType = 'user' | 'hashtag' | 'game';

interface MentionInputProps extends Omit<React.ComponentProps<"textarea">, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onSubmit?: () => void;
}

const MentionInput = React.forwardRef<HTMLTextAreaElement, MentionInputProps>(
  ({ className, value, onChange, placeholder, onSubmit, ...props }, ref) => {
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [currentQuery, setCurrentQuery] = React.useState("");
    const [mentionStart, setMentionStart] = React.useState(0);
    const [suggestionType, setSuggestionType] = React.useState<SuggestionType>('user');
    const [triggerChar, setTriggerChar] = React.useState('@');
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const suggestionsRef = React.useRef<HTMLDivElement>(null);

    const actualRef = ref || textareaRef;

    // Fetch users for autocomplete
    const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
      queryKey: ["/api/users/search", currentQuery],
      queryFn: async () => {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(currentQuery)}`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to search users');
        return response.json();
      },
      enabled: showSuggestions && suggestionType === 'user' && currentQuery.length >= 2,
      staleTime: 30000,
    });

    // Fetch games for autocomplete
    const { data: games = [], isLoading: isLoadingGames } = useQuery<Game[]>({
      queryKey: ["/api/games/search", currentQuery],
      queryFn: async () => {
        const response = await fetch(`/api/games/search/${encodeURIComponent(currentQuery)}`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to search games');
        return response.json();
      },
      enabled: showSuggestions && suggestionType === 'game' && currentQuery.length >= 2,
      staleTime: 30000,
    });

    // Common hashtags (could be fetched from server in future)
    const commonHashtags = React.useMemo(() => {
      const tags = ['gaming', 'fps', 'rpg', 'mmo', 'esports', 'clips', 'highlights', 'clutch', 'win', 'fail', 'funny', 'epic', 'stream', 'live', 'pro', 'casual', 'ranked', 'competitive'];
      if (!currentQuery) return tags.slice(0, 8);
      return tags.filter(tag => tag.toLowerCase().includes(currentQuery.toLowerCase())).slice(0, 8);
    }, [currentQuery]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPosition = e.target.selectionStart;
      
      onChange(newValue);

      const beforeCursor = newValue.substring(0, cursorPosition);
      
      // Check for @ (user mention)
      const userMatch = beforeCursor.match(/@([a-zA-Z0-9_-]*)$/);
      // Check for # (hashtag)
      const hashtagMatch = beforeCursor.match(/#([a-zA-Z0-9_]*)$/);
      // Check for / (game) - allow common game name characters including hyphens, colons, apostrophes
      const gameMatch = beforeCursor.match(/\/([a-zA-Z0-9_ :'\-&!.]+?)$/)

      if (userMatch) {
        setCurrentQuery(userMatch[1]);
        setMentionStart(cursorPosition - userMatch[0].length + 1);
        setSuggestionType('user');
        setTriggerChar('@');
        setShowSuggestions(true);
      } else if (hashtagMatch) {
        setCurrentQuery(hashtagMatch[1]);
        setMentionStart(cursorPosition - hashtagMatch[0].length + 1);
        setSuggestionType('hashtag');
        setTriggerChar('#');
        setShowSuggestions(true);
      } else if (gameMatch) {
        setCurrentQuery(gameMatch[1].trim());
        setMentionStart(cursorPosition - gameMatch[0].length + 1);
        setSuggestionType('game');
        setTriggerChar('/');
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
        setCurrentQuery("");
      }
    };

    const selectUser = (user: User) => {
      if (actualRef && 'current' in actualRef && actualRef.current) {
        const textarea = actualRef.current;
        const cursorPosition = textarea.selectionStart;
        const beforeMention = value.substring(0, mentionStart - 1);
        const afterCursor = value.substring(cursorPosition);
        const newValue = beforeMention + `@${user.username} ` + afterCursor;
        
        onChange(newValue);
        setShowSuggestions(false);
        setCurrentQuery("");

        setTimeout(() => {
          const newCursorPos = beforeMention.length + user.username.length + 2;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);
      }
    };

    const selectHashtag = (tag: string) => {
      if (actualRef && 'current' in actualRef && actualRef.current) {
        const textarea = actualRef.current;
        const cursorPosition = textarea.selectionStart;
        const beforeMention = value.substring(0, mentionStart - 1);
        const afterCursor = value.substring(cursorPosition);
        const newValue = beforeMention + `#${tag} ` + afterCursor;
        
        onChange(newValue);
        setShowSuggestions(false);
        setCurrentQuery("");

        setTimeout(() => {
          const newCursorPos = beforeMention.length + tag.length + 2;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);
      }
    };

    const selectGame = (game: Game) => {
      if (actualRef && 'current' in actualRef && actualRef.current) {
        const textarea = actualRef.current;
        const cursorPosition = textarea.selectionStart;
        const beforeMention = value.substring(0, mentionStart - 1);
        const afterCursor = value.substring(cursorPosition);
        // Wrap game name in brackets for reliable parsing
        const newValue = beforeMention + `/[${game.name}] ` + afterCursor;
        
        onChange(newValue);
        setShowSuggestions(false);
        setCurrentQuery("");

        setTimeout(() => {
          const newCursorPos = beforeMention.length + game.name.length + 4; // +4 for /[ and ] and space
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showSuggestions) {
        if (e.key === "Escape") {
          setShowSuggestions(false);
          setCurrentQuery("");
          e.preventDefault();
        }
      }
      if (e.key === "Enter" && !e.shiftKey && !showSuggestions && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
    };

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          suggestionsRef.current &&
          !suggestionsRef.current.contains(event.target as Node) &&
          actualRef &&
          'current' in actualRef &&
          actualRef.current &&
          !actualRef.current.contains(event.target as Node)
        ) {
          setShowSuggestions(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [actualRef]);

    const isLoading = suggestionType === 'user' ? isLoadingUsers : suggestionType === 'game' ? isLoadingGames : false;
    const minChars = suggestionType === 'hashtag' ? 1 : 2;

    return (
      <div className="relative">
        <Textarea
          ref={actualRef}
          className={cn("", className)}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          {...props}
        />
        
        {showSuggestions && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-64 max-h-48 overflow-y-auto bg-[#1a1a2e] border border-[#16213e] rounded-lg shadow-xl"
            style={{ top: '100%', left: 0, marginTop: '4px' }}
          >
            {/* User suggestions */}
            {suggestionType === 'user' && (
              <>
                {currentQuery.length < 2 ? (
                  <div className="p-3 text-sm text-gray-400">
                    Type at least 2 characters to search users...
                  </div>
                ) : isLoading ? (
                  <div className="p-3 text-sm text-gray-400">Loading users...</div>
                ) : users.length > 0 ? (
                  <div className="py-1">
                    {users.slice(0, 8).map((user: User) => (
                      <button
                        key={user.id}
                        className="w-full px-3 py-2 text-left hover:bg-[#16213e] focus:bg-[#16213e] focus:outline-none transition-colors"
                        onClick={() => selectUser(user)}
                      >
                        <div className="flex items-center space-x-2">
                          {user.avatarUrl ? (
                            <SignedImage src={user.avatarUrl} alt={user.username} className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-[#00d26a]/20 text-[#00d26a] flex items-center justify-center text-xs font-medium">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[#00d26a] truncate">@{user.username}</div>
                            {user.displayName && user.displayName !== user.username && (
                              <div className="text-xs text-gray-400 truncate">{user.displayName}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-sm text-gray-400">No users found for "@{currentQuery}"</div>
                )}
              </>
            )}

            {/* Hashtag suggestions */}
            {suggestionType === 'hashtag' && (
              <>
                {commonHashtags.length > 0 ? (
                  <div className="py-1">
                    {commonHashtags.map((tag) => (
                      <button
                        key={tag}
                        className="w-full px-3 py-2 text-left hover:bg-[#16213e] focus:bg-[#16213e] focus:outline-none transition-colors"
                        onClick={() => selectHashtag(tag)}
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-[#00d26a]/20 text-[#00d26a] flex items-center justify-center">
                            <Hash className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-medium text-[#00d26a]">#{tag}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-sm text-gray-400">No matching hashtags</div>
                )}
              </>
            )}

            {/* Game suggestions */}
            {suggestionType === 'game' && (
              <>
                {currentQuery.length < 2 ? (
                  <div className="p-3 text-sm text-gray-400">
                    Type at least 2 characters to search games...
                  </div>
                ) : isLoading ? (
                  <div className="p-3 text-sm text-gray-400">Loading games...</div>
                ) : games.length > 0 ? (
                  <div className="py-1">
                    {games.slice(0, 8).map((game: Game) => (
                      <button
                        key={game.id}
                        className="w-full px-3 py-2 text-left hover:bg-[#16213e] focus:bg-[#16213e] focus:outline-none transition-colors"
                        onClick={() => selectGame(game)}
                      >
                        <div className="flex items-center space-x-2">
                          {game.imageUrl ? (
                            <SignedImage src={game.imageUrl} alt={game.name} className="w-6 h-6 rounded object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center">
                              <Gamepad2 className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <span className="text-sm font-bold text-white truncate">{game.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-sm text-gray-400">No games found for "{currentQuery}"</div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }
);

MentionInput.displayName = "MentionInput";

// Helper function to render text with styled mentions, hashtags, and games
function renderStyledText(text: string): React.ReactNode[] {
  if (!text) return [];
  
  const parts: React.ReactNode[] = [];
  // Match @username, #hashtag, or /[GameName]
  const regex = /(@[a-zA-Z0-9_-]+)|(#[a-zA-Z0-9_]+)|(\/\[[^\]]+\])/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  
  while ((match = regex.exec(text)) !== null) {
    // Add plain text before the match
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    
    // Add styled match
    if (match[1]) {
      // @mention - green
      parts.push(
        <span key={key++} className="text-[#00d26a] font-medium">
          {match[1]}
        </span>
      );
    } else if (match[2]) {
      // #hashtag - green
      parts.push(
        <span key={key++} className="text-[#00d26a] font-medium">
          {match[2]}
        </span>
      );
    } else if (match[3]) {
      // /[Game] - purple, show only the game name
      const gameName = match[3].slice(2, -1); // Remove /[ and ]
      parts.push(
        <span key={key++} className="text-purple-400 font-medium">
          {gameName}
        </span>
      );
    }
    
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining plain text
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }
  
  return parts;
}

// Styled mention input with live preview
const StyledMentionInput = React.forwardRef<HTMLTextAreaElement, MentionInputProps>(
  ({ className, value, onChange, placeholder, onSubmit, ...props }, ref) => {
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [currentQuery, setCurrentQuery] = React.useState("");
    const [mentionStart, setMentionStart] = React.useState(0);
    const [suggestionType, setSuggestionType] = React.useState<SuggestionType>('user');
    const [triggerChar, setTriggerChar] = React.useState('@');
    const [isFocused, setIsFocused] = React.useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const suggestionsRef = React.useRef<HTMLDivElement>(null);
    const overlayRef = React.useRef<HTMLDivElement>(null);

    const actualRef = ref || textareaRef;

    // Fetch users for autocomplete
    const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
      queryKey: ["/api/users/search", currentQuery],
      queryFn: async () => {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(currentQuery)}`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to search users');
        return response.json();
      },
      enabled: showSuggestions && suggestionType === 'user' && currentQuery.length >= 2,
      staleTime: 30000,
    });

    // Fetch games for autocomplete
    const { data: games = [], isLoading: isLoadingGames } = useQuery<Game[]>({
      queryKey: ["/api/games/search", currentQuery],
      queryFn: async () => {
        const response = await fetch(`/api/games/search/${encodeURIComponent(currentQuery)}`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to search games');
        return response.json();
      },
      enabled: showSuggestions && suggestionType === 'game' && currentQuery.length >= 2,
      staleTime: 30000,
    });

    // Common hashtags
    const commonHashtags = React.useMemo(() => {
      const tags = ['gaming', 'fps', 'rpg', 'mmo', 'esports', 'clips', 'highlights', 'clutch', 'win', 'fail', 'funny', 'epic', 'stream', 'live', 'pro', 'casual', 'ranked', 'competitive'];
      if (!currentQuery) return tags.slice(0, 8);
      return tags.filter(tag => tag.toLowerCase().includes(currentQuery.toLowerCase())).slice(0, 8);
    }, [currentQuery]);

    // Sync scroll between textarea and overlay
    const syncScroll = React.useCallback(() => {
      if (actualRef && 'current' in actualRef && actualRef.current && overlayRef.current) {
        overlayRef.current.scrollTop = actualRef.current.scrollTop;
        overlayRef.current.scrollLeft = actualRef.current.scrollLeft;
      }
    }, [actualRef]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPosition = e.target.selectionStart;
      
      onChange(newValue);

      const beforeCursor = newValue.substring(0, cursorPosition);
      
      const userMatch = beforeCursor.match(/@([a-zA-Z0-9_-]*)$/);
      const hashtagMatch = beforeCursor.match(/#([a-zA-Z0-9_]*)$/);
      const gameMatch = beforeCursor.match(/\/([a-zA-Z0-9_ :'\-&!.]+?)$/);

      if (userMatch) {
        setCurrentQuery(userMatch[1]);
        setMentionStart(cursorPosition - userMatch[0].length + 1);
        setSuggestionType('user');
        setTriggerChar('@');
        setShowSuggestions(true);
      } else if (hashtagMatch) {
        setCurrentQuery(hashtagMatch[1]);
        setMentionStart(cursorPosition - hashtagMatch[0].length + 1);
        setSuggestionType('hashtag');
        setTriggerChar('#');
        setShowSuggestions(true);
      } else if (gameMatch) {
        setCurrentQuery(gameMatch[1].trim());
        setMentionStart(cursorPosition - gameMatch[0].length + 1);
        setSuggestionType('game');
        setTriggerChar('/');
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
        setCurrentQuery("");
      }
    };

    const selectUser = (user: User) => {
      if (actualRef && 'current' in actualRef && actualRef.current) {
        const textarea = actualRef.current;
        const cursorPosition = textarea.selectionStart;
        const beforeMention = value.substring(0, mentionStart - 1);
        const afterCursor = value.substring(cursorPosition);
        const newValue = beforeMention + `@${user.username} ` + afterCursor;
        
        onChange(newValue);
        setShowSuggestions(false);
        setCurrentQuery("");

        setTimeout(() => {
          const newCursorPos = beforeMention.length + user.username.length + 2;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);
      }
    };

    const selectHashtag = (tag: string) => {
      if (actualRef && 'current' in actualRef && actualRef.current) {
        const textarea = actualRef.current;
        const cursorPosition = textarea.selectionStart;
        const beforeMention = value.substring(0, mentionStart - 1);
        const afterCursor = value.substring(cursorPosition);
        const newValue = beforeMention + `#${tag} ` + afterCursor;
        
        onChange(newValue);
        setShowSuggestions(false);
        setCurrentQuery("");

        setTimeout(() => {
          const newCursorPos = beforeMention.length + tag.length + 2;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);
      }
    };

    const selectGame = (game: Game) => {
      if (actualRef && 'current' in actualRef && actualRef.current) {
        const textarea = actualRef.current;
        const cursorPosition = textarea.selectionStart;
        const beforeMention = value.substring(0, mentionStart - 1);
        const afterCursor = value.substring(cursorPosition);
        const newValue = beforeMention + `/[${game.name}] ` + afterCursor;
        
        onChange(newValue);
        setShowSuggestions(false);
        setCurrentQuery("");

        setTimeout(() => {
          const newCursorPos = beforeMention.length + game.name.length + 4;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showSuggestions) {
        if (e.key === "Escape") {
          setShowSuggestions(false);
          setCurrentQuery("");
          e.preventDefault();
        }
      }
      if (e.key === "Enter" && !e.shiftKey && !showSuggestions && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
    };

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          suggestionsRef.current &&
          !suggestionsRef.current.contains(event.target as Node) &&
          actualRef &&
          'current' in actualRef &&
          actualRef.current &&
          !actualRef.current.contains(event.target as Node)
        ) {
          setShowSuggestions(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [actualRef]);

    const isLoading = suggestionType === 'user' ? isLoadingUsers : suggestionType === 'game' ? isLoadingGames : false;
    const hasStyledContent = /@[a-zA-Z0-9_-]+|#[a-zA-Z0-9_]+|\/\[[^\]]+\]/.test(value);

    return (
      <div className="relative">
        {/* Styled overlay that shows colored mentions */}
        <div
          ref={overlayRef}
          className={cn(
            "absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words",
            "px-3 py-2 text-sm",
            className
          )}
          style={{
            color: 'transparent',
            background: 'transparent',
          }}
          aria-hidden="true"
        >
          {renderStyledText(value)}
        </div>
        
        {/* Actual textarea with transparent text when there are mentions */}
        <textarea
          ref={actualRef}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
            hasStyledContent ? "caret-white" : "",
            className
          )}
          style={hasStyledContent ? {
            color: 'transparent',
            caretColor: 'white',
            background: 'transparent',
          } : {}}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          {...props}
        />
        
        {/* Visible text layer for non-styled parts */}
        {hasStyledContent && (
          <div
            className={cn(
              "absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words",
              "px-3 py-2 text-sm text-white",
              className
            )}
            aria-hidden="true"
          >
            {renderStyledText(value)}
          </div>
        )}
        
        {showSuggestions && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-64 max-h-48 overflow-y-auto bg-[#1a1a2e] border border-[#16213e] rounded-lg shadow-xl"
            style={{ top: '100%', left: 0, marginTop: '4px' }}
          >
            {/* User suggestions */}
            {suggestionType === 'user' && (
              <>
                {currentQuery.length < 2 ? (
                  <div className="p-3 text-sm text-gray-400">
                    Type at least 2 characters to search users...
                  </div>
                ) : isLoading ? (
                  <div className="p-3 text-sm text-gray-400">Loading users...</div>
                ) : users.length > 0 ? (
                  <div className="py-1">
                    {users.slice(0, 8).map((user: User) => (
                      <button
                        key={user.id}
                        className="w-full px-3 py-2 text-left hover:bg-[#16213e] focus:bg-[#16213e] focus:outline-none transition-colors"
                        onClick={() => selectUser(user)}
                      >
                        <div className="flex items-center space-x-2">
                          {user.avatarUrl ? (
                            <SignedImage src={user.avatarUrl} alt={user.username} className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-[#00d26a]/20 text-[#00d26a] flex items-center justify-center text-xs font-medium">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[#00d26a] truncate">@{user.username}</div>
                            {user.displayName && user.displayName !== user.username && (
                              <div className="text-xs text-gray-400 truncate">{user.displayName}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-sm text-gray-400">No users found for "@{currentQuery}"</div>
                )}
              </>
            )}

            {/* Hashtag suggestions */}
            {suggestionType === 'hashtag' && (
              <>
                {commonHashtags.length > 0 ? (
                  <div className="py-1">
                    {commonHashtags.map((tag) => (
                      <button
                        key={tag}
                        className="w-full px-3 py-2 text-left hover:bg-[#16213e] focus:bg-[#16213e] focus:outline-none transition-colors"
                        onClick={() => selectHashtag(tag)}
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-[#00d26a]/20 text-[#00d26a] flex items-center justify-center">
                            <Hash className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-medium text-[#00d26a]">#{tag}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-sm text-gray-400">No matching hashtags</div>
                )}
              </>
            )}

            {/* Game suggestions */}
            {suggestionType === 'game' && (
              <>
                {currentQuery.length < 2 ? (
                  <div className="p-3 text-sm text-gray-400">
                    Type at least 2 characters to search games...
                  </div>
                ) : isLoading ? (
                  <div className="p-3 text-sm text-gray-400">Loading games...</div>
                ) : games.length > 0 ? (
                  <div className="py-1">
                    {games.slice(0, 8).map((game: Game) => (
                      <button
                        key={game.id}
                        className="w-full px-3 py-2 text-left hover:bg-[#16213e] focus:bg-[#16213e] focus:outline-none transition-colors"
                        onClick={() => selectGame(game)}
                      >
                        <div className="flex items-center space-x-2">
                          {game.imageUrl ? (
                            <SignedImage src={game.imageUrl} alt={game.name} className="w-6 h-6 rounded object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center">
                              <Gamepad2 className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <span className="text-sm font-bold text-white truncate">{game.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-sm text-gray-400">No games found for "{currentQuery}"</div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }
);

StyledMentionInput.displayName = "StyledMentionInput";

export { MentionInput, StyledMentionInput };
export type { MentionInputProps, User, Game };
