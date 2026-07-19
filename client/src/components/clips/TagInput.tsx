import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { X, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TagInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

const TagInput = ({
  tags,
  setTags,
  placeholder = "Add tags...",
  maxTags = 5,
}: TagInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: frequentTags = [] } = useQuery<string[]>({
    queryKey: ["/api/user/top-tags"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/top-tags");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 120000,
  });

  const query = inputValue.trim().toLowerCase().replace(/^#/, "");

  const suggestions = frequentTags.filter(
    (t) =>
      !tags.includes(t) &&
      (query === "" || t.includes(query))
  );

  const showDropdown = dropdownOpen && (suggestions.length > 0);

  const addTag = (raw: string) => {
    const trimmed = raw.trim().toLowerCase().replace(/^#/, "");
    if (!trimmed || tags.includes(trimmed) || tags.length >= maxTags) return;
    setTags([...tags, trimmed]);
    setInputValue("");
    setActiveIndex(-1);
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showDropdown) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        return;
      }
      if (e.key === "Escape") {
        setDropdownOpen(false);
        setActiveIndex(-1);
        return;
      }
      if ((e.key === "Enter" || e.key === "Tab") && activeIndex >= 0) {
        e.preventDefault();
        addTag(suggestions[activeIndex]);
        return;
      }
    }

    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (!pasted.includes(",")) return;
    e.preventDefault();
    const parts = pasted.split(",").map((p) => p.trim()).filter(Boolean);
    let updated = [...tags];
    for (const part of parts) {
      const clean = part.toLowerCase().replace(/^#/, "");
      if (clean && !updated.includes(clean) && updated.length < maxTags) {
        updated = [...updated, clean];
      }
    }
    setTags(updated);
    setInputValue("");
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay so clicks inside the dropdown register first
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        if (inputValue) addTag(inputValue);
        setDropdownOpen(false);
        setActiveIndex(-1);
      }
    }, 150);
  };

  // Reset active index whenever suggestions change
  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  return (
    <div ref={containerRef} className="relative">
      {/* Input area */}
      <div
        className="flex flex-wrap items-center gap-1.5 p-2 border border-input rounded-md focus-within:ring-1 focus-within:ring-ring bg-background cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1 pl-1.5 pr-1 py-0.5 text-xs"
          >
            <Hash className="h-2.5 w-2.5 opacity-60" />
            {tag}
            <button
              type="button"
              className="ml-0.5 hover:text-destructive transition-colors"
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setDropdownOpen(true);
          }}
          onFocus={() => setDropdownOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={tags.length < maxTags ? placeholder : `Max ${maxTags} tags`}
          disabled={tags.length >= maxTags}
          className="flex-1 border-0 outline-none bg-transparent text-sm min-w-[120px] placeholder:text-muted-foreground disabled:cursor-not-allowed"
          style={{ fontSize: "16px" }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && (
        <div
          className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-border shadow-lg overflow-hidden"
          style={{ background: "#0B1218", top: "100%" }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Frequently used
          </p>
          <ul className="max-h-48 overflow-y-auto pb-1">
            {suggestions.map((tag, i) => (
              <li key={tag}>
                <button
                  type="button"
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                    i === activeIndex
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => {
                    addTag(tag);
                    inputRef.current?.focus();
                    setDropdownOpen(true);
                  }}
                >
                  <Hash className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#B7FF1A" }} />
                  {tag}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TagInput;
