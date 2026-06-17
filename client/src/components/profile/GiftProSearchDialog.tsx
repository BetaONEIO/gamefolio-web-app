import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Gift, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SearchUser {
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  nftProfileTokenId?: string | null;
  nftProfileImageUrl?: string | null;
  activeProfilePicType?: string | null;
  accentColor?: string | null;
  selectedBorderId?: number | null;
  isPro?: boolean | null;
}

interface GiftProSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUsername?: string;
}

export function GiftProSearchDialog({ open, onOpenChange, initialUsername }: GiftProSearchDialogProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState(initialUsername ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery(initialUsername ?? "");
      setSelectedUser(null);
      setDropdownOpen(false);
      setPlan("monthly");
    }
  }, [open, initialUsername]);

  const { data: searchResults = [], isFetching } = useQuery<SearchUser[]>({
    queryKey: ["/api/users/search", debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.trim().length < 2) return [];
      const res = await apiRequest("GET", `/api/users/search?q=${encodeURIComponent(debouncedQuery.trim())}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: debouncedQuery.trim().length >= 2 && !selectedUser,
    staleTime: 10000,
  });

  const giftMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) throw new Error("No user selected");
      const res = await apiRequest("POST", "/api/pro/gift-checkout", {
        recipientUsername: selectedUser.username,
        plan,
      });
      const data = await res.json();
      if (!data.url) throw new Error(data.error || "No checkout URL returned");
      return data.url as string;
    },
    onSuccess: (url) => {
      onOpenChange(false);
      window.open(url, "_blank", "noopener,noreferrer");
    },
    onError: (err: any) => {
      toast({
        title: "Gift failed",
        description: err?.message || "Could not start gift checkout.",
        variant: "destructive",
      });
    },
  });

  const handleSelectUser = (u: SearchUser) => {
    setSelectedUser(u);
    setQuery(u.username);
    setDropdownOpen(false);
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setQuery("");
    setDropdownOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const showDropdown = dropdownOpen && !selectedUser && debouncedQuery.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Gift Pro to a Friend
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Username search */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Search for a user
            </label>
            <div className="relative">
              {selectedUser ? (
                /* Selected user chip */
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-primary bg-primary/5">
                  <CustomAvatar user={selectedUser as any} size="sm" borderIntensity="subtle" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{selectedUser.displayName || selectedUser.username}</p>
                    <p className="text-xs text-muted-foreground truncate">@{selectedUser.username}</p>
                  </div>
                  <button
                    onClick={handleClearUser}
                    className="flex-shrink-0 p-0.5 rounded hover:bg-secondary transition-colors"
                    aria-label="Clear selection"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                /* Search input */
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    ref={inputRef}
                    className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Type a username…"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value.replace(/^@/, ""));
                      setDropdownOpen(true);
                    }}
                    onFocus={() => setDropdownOpen(true)}
                    autoComplete="off"
                  />
                  {isFetching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              )}

              {/* Dropdown results */}
              {showDropdown && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg overflow-hidden">
                  {searchResults.length === 0 && !isFetching ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No users found
                    </div>
                  ) : (
                    <ul className="max-h-48 overflow-y-auto divide-y divide-border">
                      {searchResults.map((u) => (
                        <li key={u.id}>
                          <button
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary transition-colors text-left"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectUser(u)}
                          >
                            <CustomAvatar user={u as any} size="sm" borderIntensity="subtle" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{u.displayName || u.username}</p>
                              <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                            </div>
                            {u.isPro && (
                              <span className="flex items-center gap-0.5 text-xs font-bold text-yellow-500 flex-shrink-0">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                PRO
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Plan selection */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Plan</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPlan("monthly")}
                className={cn(
                  "p-3 rounded-lg border text-sm transition-colors text-left",
                  plan === "monthly"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-secondary"
                )}
              >
                <div className="font-bold">Monthly</div>
                <div className="text-xs text-muted-foreground">£2.99 / month</div>
              </button>
              <button
                onClick={() => setPlan("yearly")}
                className={cn(
                  "p-3 rounded-lg border text-sm transition-colors text-left",
                  plan === "yearly"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-secondary"
                )}
              >
                <div className="font-bold">Yearly</div>
                <div className="text-xs text-muted-foreground">£30 / year</div>
              </button>
            </div>
          </div>

          <Button
            onClick={() => giftMutation.mutate()}
            disabled={!selectedUser || giftMutation.isPending}
            className="w-full"
          >
            {giftMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : selectedUser ? (
              `Gift ${plan === "monthly" ? "1 month" : "1 year"} of Pro to @${selectedUser.username}`
            ) : (
              "Select a user to gift"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
