import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ClipWithUser } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import {
  MoreHorizontal,
  Ban,
  Pencil,
  Trash2,
  Pin,
  Download,
  Loader2,
  User,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface TrendingClipMenuProps {
  clip: ClipWithUser;
  onHide?: () => void;
}

function MenuItem({
  icon,
  label,
  onClick,
  destructive = false,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed ${
        destructive
          ? "text-red-400 hover:bg-red-500/10"
          : "text-foreground hover:bg-white/5"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      {label}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1 mx-3 h-px bg-white/10" />;
}

export function TrendingClipMenu({ clip, onHide }: TrendingClipMenuProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { closeClipDialog } = useClipDialog();

  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showEditCaption, setShowEditCaption] = useState(false);
  const [editTitle, setEditTitle] = useState(clip.title);
  const [editDescription, setEditDescription] = useState((clip as any).description ?? "");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const isOwn = user?.id === clip.userId;

  const blockMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/users/block", { userId: clip.userId }),
    onSuccess: () => {
      toast({
        title: "User blocked",
        description: `You won't see content from @${clip.user.username} anymore.`,
      });
      setShowBlockConfirm(false);
      onHide?.();
    },
    onError: (err: Error) => {
      const msg = err.message?.includes("already blocked")
        ? "You've already blocked this user."
        : err.message;
      toast({ title: "Failed to block", description: msg, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/clips/${clip.id}`),
    onSuccess: () => {
      toast({
        title: clip.videoType === "reel" ? "Reel deleted" : "Clip deleted",
        variant: "gamefolioSuccess",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trending"] });
      setShowDeleteConfirm(false);
      onHide?.();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    },
  });

  const pinMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/clips/${clip.id}/pin`),
    onSuccess: (data: any) => {
      const isPinned = !!data?.pinnedAt;
      toast({
        title: isPinned ? "Pinned to profile" : "Unpinned from profile",
        description: isPinned
          ? "This clip is now featured at the top of your profile."
          : "Clip removed from the top of your profile.",
        variant: "gamefolioSuccess",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.username}/clips`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${clip.user.username}/clips`] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to pin", description: err.message, variant: "destructive" });
    },
  });

  const editCaptionMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/clips/${clip.id}`, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      }),
    onSuccess: () => {
      toast({
        title: clip.videoType === "reel" ? "Reel updated" : "Clip updated",
        description: "Your caption has been saved.",
        variant: "gamefolioSuccess",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trending"] });
      queryClient.invalidateQueries({ queryKey: [`/api/clips/${clip.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${clip.user.username}/clips`] });
      setShowEditCaption(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update caption", description: err.message, variant: "destructive" });
    },
  });

  const handleDownload = async () => {
    close();
    setIsDownloading(true);
    try {
      toast({
        title: "⚡ Preparing your clip…",
        description: "Adding Gamefolio watermark. This may take a moment.",
      });
      const response = await fetch(`/api/clips/${clip.id}/download`, {
        credentials: "include",
        headers: { Accept: "video/mp4" },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as any).error || "Download failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeTitle = clip.title.replace(/[^a-z0-9]/gi, "_").slice(0, 60);
      a.download = `${safeTitle}_gamefolio.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Download complete!",
        description: "Saved with Gamefolio watermark. Share it anywhere!",
        variant: "gamefolioSuccess",
      });
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const close = () => setIsOpen(false);

  const otherUserMenu = (
    <>
      <MenuItem
        icon={<User className="h-4 w-4" />}
        label="View Gamefolio"
        onClick={() => {
          close();
          closeClipDialog();
          navigate(`/profile/${clip.user.username}`);
        }}
      />
      <MenuDivider />
      <MenuItem
        icon={
          isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )
        }
        label={isDownloading ? "Downloading…" : "Download Clip"}
        disabled={isDownloading}
        onClick={handleDownload}
      />
      <MenuDivider />
      <MenuItem
        icon={<Ban className="h-4 w-4" />}
        label="Block User"
        destructive
        onClick={() => {
          close();
          setShowBlockConfirm(true);
        }}
      />
    </>
  );

  const ownMenu = (
    <>
      <MenuItem
        icon={<Pencil className="h-4 w-4" />}
        label="Edit Caption"
        onClick={() => {
          close();
          setEditTitle(clip.title);
          setEditDescription((clip as any).description ?? "");
          setShowEditCaption(true);
        }}
      />
      <MenuItem
        icon={<Pin className="h-4 w-4" />}
        label={clip.pinnedAt ? "Unpin from Profile" : "Pin to Profile"}
        onClick={() => {
          close();
          pinMutation.mutate();
        }}
      />
      <MenuDivider />
      <MenuItem
        icon={<Trash2 className="h-4 w-4" />}
        label={clip.videoType === "reel" ? "Delete Reel" : "Delete Clip"}
        destructive
        onClick={() => {
          close();
          setShowDeleteConfirm(true);
        }}
      />
    </>
  );

  const menuContent = (
    <div className="py-1">{isOwn ? ownMenu : otherUserMenu}</div>
  );

  const menuLabel = isOwn ? "Creator tools" : "Clip options";

  // Mobile: manually toggles the Sheet (no SheetTrigger wrapper)
  const mobileTriggerBtn = (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen((v) => !v);
      }}
      className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
      aria-label="More options"
    >
      <MoreHorizontal className="h-4 w-4" />
    </button>
  );

  // Desktop: only stops propagation — Radix Popover owns the toggle via onOpenChange.
  // CRITICAL: Do NOT call e.preventDefault() here. Radix's PopoverTrigger uses
  // composeEventHandlers which checks `event.defaultPrevented` and SKIPS its own
  // click handler when true — meaning the popover would never toggle open.
  // We only stopPropagation so the parent card's onClick (which opens the clip
  // dialog) doesn't fire when the user clicks the 3-dot button.
  const desktopTriggerBtn = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
      }}
      className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
      aria-label="More options"
    >
      <MoreHorizontal className="h-4 w-4" />
    </button>
  );

  return (
    <>
      {isMobile ? (
        <>
          {mobileTriggerBtn}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent
              side="bottom"
              className="p-0 bg-[#0B1218] border-t border-white/10 rounded-t-2xl [&>button]:hidden"
            >
              <SheetTitle className="sr-only">{menuLabel}</SheetTitle>
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <div className="px-4 py-2 border-b border-white/10 mb-1">
                <p className="text-xs text-muted-foreground truncate font-medium">{clip.title}</p>
                <p className="text-xs text-muted-foreground/60 truncate">@{clip.user.username}</p>
              </div>
              {menuContent}
              <div className="pb-20" />
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>{desktopTriggerBtn}</PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={6}
            className="w-52 p-0 bg-[#0B1218] border border-white/10 shadow-2xl rounded-xl overflow-hidden"
          >
            {menuContent}
          </PopoverContent>
        </Popover>
      )}

      {/* Edit Caption dialog */}
      <Dialog open={showEditCaption} onOpenChange={setShowEditCaption}>
        <DialogContent
          className="bg-[#0B1218] border border-white/10 text-foreground sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>
              Edit {clip.videoType === "reel" ? "reel" : "clip"} caption
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title" className="text-sm text-muted-foreground">
                Title
              </Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={100}
                className="bg-white/5 border-white/10 focus-visible:ring-primary"
                placeholder="Enter a title…"
              />
              <p className="text-xs text-muted-foreground/60 text-right">
                {editTitle.length}/100
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-description" className="text-sm text-muted-foreground">
                Description
              </Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="bg-white/5 border-white/10 focus-visible:ring-primary resize-none"
                placeholder="Add a description…"
              />
              <p className="text-xs text-muted-foreground/60 text-right">
                {editDescription.length}/500
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-white/10 hover:bg-white/5"
              onClick={() => setShowEditCaption(false)}
              disabled={editCaptionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => editCaptionMutation.mutate()}
              disabled={editCaptionMutation.isPending || !editTitle.trim()}
              className="bg-primary text-[#071013] hover:bg-primary/90 font-semibold"
            >
              {editCaptionMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {clip.videoType === "reel" ? "reel" : "clip"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              "{clip.title}" will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block confirmation */}
      <AlertDialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block @{clip.user.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              You won't see their clips, comments, or interactions anymore. You can unblock them
              from your account settings at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={blockMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => blockMutation.mutate()}
              disabled={blockMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {blockMutation.isPending ? "Blocking…" : "Block user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
