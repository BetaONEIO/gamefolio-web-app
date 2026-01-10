import * as React from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "./textarea";
import { useQuery } from "@tanstack/react-query";

interface User {
  id: number;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

interface MentionInputProps extends Omit<React.ComponentProps<"textarea">, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const MentionInput = React.forwardRef<HTMLTextAreaElement, MentionInputProps>(
  ({ className, value, onChange, placeholder, ...props }, ref) => {
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [suggestionPosition, setSuggestionPosition] = React.useState({ top: 0, left: 0 });
    const [currentQuery, setCurrentQuery] = React.useState("");
    const [mentionStart, setMentionStart] = React.useState(0);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const suggestionsRef = React.useRef<HTMLDivElement>(null);

    // Use the forwarded ref or our internal ref
    const actualRef = ref || textareaRef;

    // Fetch users for autocomplete
    const { data: users = [], isLoading } = useQuery<User[]>({
      queryKey: ["/api/users/search", currentQuery],
      queryFn: async () => {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(currentQuery)}`, {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Failed to search users');
        }
        return response.json();
      },
      enabled: showSuggestions && currentQuery.length >= 2,
      staleTime: 30000, // Cache for 30 seconds
    });

    // Handle text changes and detect @ mentions
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPosition = e.target.selectionStart;
      
      onChange(newValue);

      // Check if we're typing after an @ symbol
      // Updated regex to match backend support for hyphens and underscores
      const beforeCursor = newValue.substring(0, cursorPosition);
      const atMatch = beforeCursor.match(/@([a-zA-Z0-9_-]*)$/);

      if (atMatch) {
        const query = atMatch[1];
        const mentionStartPos = cursorPosition - atMatch[0].length;

        setCurrentQuery(query);
        setMentionStart(mentionStartPos + 1); // +1 to skip the @
        setShowSuggestions(true);
        
        // Calculate suggestion position relative to cursor
        if (actualRef && 'current' in actualRef && actualRef.current) {
          const textarea = actualRef.current;
          const rect = textarea.getBoundingClientRect();
          
          // Simple approximation for cursor position
          // In a real implementation, you might want a more sophisticated method
          const lineHeight = 24; // Approximate line height
          const charWidth = 8; // Approximate character width
          const lines = beforeCursor.split('\n');
          const currentLine = lines.length - 1;
          const currentColumn = lines[lines.length - 1].length;
          
          setSuggestionPosition({
            top: rect.top + (currentLine * lineHeight) + 30,
            left: rect.left + (currentColumn * charWidth)
          });
        }
      } else {
        setShowSuggestions(false);
        setCurrentQuery("");
      }
    };

    // Handle suggestion selection
    const selectSuggestion = (user: User) => {
      if (actualRef && 'current' in actualRef && actualRef.current) {
        const textarea = actualRef.current;
        const cursorPosition = textarea.selectionStart;
        const beforeMention = value.substring(0, mentionStart - 1); // -1 to include @
        const afterCursor = value.substring(cursorPosition);
        const newValue = beforeMention + `@${user.username} ` + afterCursor;
        
        onChange(newValue);
        setShowSuggestions(false);
        setCurrentQuery("");

        // Focus back to textarea and set cursor position
        setTimeout(() => {
          const newCursorPos = beforeMention.length + user.username.length + 2; // +2 for @ and space
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);
      }
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showSuggestions && users.length > 0) {
        if (e.key === "Escape") {
          setShowSuggestions(false);
          setCurrentQuery("");
          e.preventDefault();
        }
        // Additional keyboard navigation could be added here (arrow keys, enter)
      }
    };

    // Close suggestions when clicking outside
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
        
        {/* Mention suggestions dropdown */}
        {showSuggestions && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-64 max-h-48 overflow-y-auto bg-[#1a1a2e] border border-[#16213e] rounded-lg shadow-xl"
            style={{
              top: '100%',
              left: 0,
              marginTop: '4px'
            }}
          >
            {currentQuery.length < 2 ? (
              <div className="p-3 text-sm text-gray-400">
                Type at least 2 characters to search users...
              </div>
            ) : isLoading ? (
              <div className="p-3 text-sm text-gray-400">
                Loading users...
              </div>
            ) : users.length > 0 ? (
              <div className="py-1">
                {users.slice(0, 8).map((user: User) => (
                  <button
                    key={user.id}
                    className="w-full px-3 py-2 text-left hover:bg-[#16213e] focus:bg-[#16213e] focus:outline-none transition-colors"
                    onClick={() => selectSuggestion(user)}
                    data-testid={`mention-suggestion-${user.username}`}
                  >
                    <div className="flex items-center space-x-2">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.username}
                          className="w-6 h-6 rounded-full"
                          data-testid={`avatar-${user.username}`}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#00d26a]/20 text-[#00d26a] flex items-center justify-center text-xs font-medium">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          @{user.username}
                        </div>
                        {user.displayName && user.displayName !== user.username && (
                          <div className="text-xs text-gray-400 truncate">
                            {user.displayName}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3 text-sm text-gray-400">
                No users found for "@{currentQuery}"
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

MentionInput.displayName = "MentionInput";

export { MentionInput };
export type { MentionInputProps, User };