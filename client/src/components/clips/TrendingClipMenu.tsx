import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ClipWithUser } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import {
  MoreHorizontal,
  Flag,
  EyeOff,
  VolumeX,
  Ban,
  Copy,
  Share2,
  Pencil,
  Trash2,
  Pin,
  BarChart2,
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
import { ReportDialog } from "@/components/content/ReportDialog";
import { ClipShareDialog } from "@/components/clip/ClipShareDialog";

interface TrendingClipMenuProps {
  clip: ClipWithUser;
  onHide?: () => void;
}

function MenuItem({
  icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left ${
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
  const { openClipDialog } = useClipDialog();

  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [reportPending, setReportPending] = useState(false);
  const reportTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (reportPending && reportTriggerRef.current) {
      reportTriggerRef.current.click();
      setReportPending(false);
    }
  }, [reportPending]);

  const isOwn = user?.id === clip.userId;

  const blockMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/users/block", { userId: clip.userId }),
    onSuccess: () => {
      toast({
        title: "User blocked",
        description: `You won't see content from @${clip.user.username} anymore.`,
      });
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
          ? "This clip is now pinned at the top of your profile."
          : "Clip removed from top of profile.",
        variant: "gamefolioSuccess",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.username}/clips`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${clip.user.username}/clips`] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to pin", description: err.message, variant: "destructive" });
    },
  });

  const handleCopyLink = async () => {
    setIsOpen(false);
    try {
      const res = await fetch(`/api/clips/${clip.id}/share`, { credentials: "include" });
      const data = await res.json();
      const url = data.clipUrl || data.shareUrl || `${window.location.origin}/clips/${clip.id}`;
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!", description: "The link has been copied to your clipboard." });
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleMute = () => {
    setIsOpen(false);
    try {
      const muted: number[] = JSON.parse(localStorage.getItem("gf_muted_users") || "[]");
      if (!muted.includes(clip.userId)) {
        localStorage.setItem("gf_muted_users", JSON.stringify([...muted, clip.userId]));
      }
    } catch {}
    toast({
      title: "User muted",
      description: `You won't see @${clip.user.username}'s content for now.`,
    });
    onHide?.();
  };

  const close = () => setIsOpen(false);

  const otherUserMenu = (
    <>
      <ReportDialog
        contentType="clip"
        contentId={clip.id}
        contentTitle={clip.title}
        contentAuthor={clip.user.username}
        trigger={<button ref={reportTriggerRef} className="sr-only" tabIndex={-1} aria-hidden />}
      />
      <MenuItem
        icon={<Flag className="h-4 w-4" />}
        label="Report clip"
        onClick={() => {
          close();
          setReportPending(true);
        }}
      />
      <MenuItem
        icon={<EyeOff className="h-4 w-4" />}
        label="Not interested"
        onClick={() => {
          close();
          toast({ title: "Got it", description: "You'll see less content like this." });
          onHide?.();
        }}
      />
      <MenuItem
        icon={<VolumeX className="h-4 w-4" />}
        label="Mute user"
        onClick={handleMute}
      />
      <MenuItem
        icon={<Ban className="h-4 w-4" />}
        label="Block user"
        destructive
        onClick={() => {
          close();
          blockMutation.mutate();
        }}
      />
      <MenuDivider />
      <MenuItem
        icon={<Copy className="h-4 w-4" />}
        label="Copy link"
        onClick={handleCopyLink}
      />
      <MenuItem
        icon={<Share2 className="h-4 w-4" />}
        label="Share"
        onClick={() => {
          close();
          setShowShare(true);
        }}
      />
    </>
  );

  const ownMenu = (
    <>
      <MenuItem
        icon={<Pencil className="h-4 w-4" />}
        label="Edit caption"
        onClick={() => {
          close();
          openClipDialog(clip.id);
        }}
      />
      <MenuItem
        icon={<Trash2 className="h-4 w-4" />}
        label={clip.videoType === "reel" ? "Delete reel" : "Delete clip"}
        destructive
        onClick={() => {
          close();
          setShowDeleteConfirm(true);
        }}
      />
      <MenuItem
        icon={<Pin className="h-4 w-4" />}
        label={clip.pinnedAt ? "Unpin from profile" : "Pin to profile"}
        onClick={() => {
          close();
          pinMutation.mutate();
        }}
      />
      <MenuDivider />
      <MenuItem
        icon={<Copy className="h-4 w-4" />}
        label="Copy link"
        onClick={handleCopyLink}
      />
      <MenuItem
        icon={<BarChart2 className="h-4 w-4" />}
        label="View insights"
        onClick={() => {
          close();
          navigate(`/profile/${clip.user.username}`);
        }}
      />
    </>
  );

  const menuContent = (
    <div className="py-1">{isOwn ? ownMenu : otherUserMenu}</div>
  );

  const triggerBtn = (
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

  return (
    <>
      {isMobile ? (
        <>
          {triggerBtn}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent
              side="bottom"
              className="p-0 bg-[#0d1b26] border-t border-white/10 rounded-t-2xl [&>button]:hidden"
            >
              <SheetTitle className="sr-only">Clip options</SheetTitle>
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <div className="px-4 py-2 border-b border-white/10 mb-1">
                <p className="text-xs text-muted-foreground truncate font-medium">{clip.title}</p>
                <p className="text-xs text-muted-foreground/60 truncate">@{clip.user.username}</p>
              </div>
              {menuContent}
              <div className="h-safe-area-inset-bottom pb-2" />
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>{triggerBtn}</PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={6}
            className="w-52 p-0 bg-[#0d1b26] border border-white/10 shadow-2xl rounded-xl overflow-hidden"
          >
            {menuContent}
          </PopoverContent>
        </Popover>
      )}

      <ClipShareDialog
        clipId={clip.id}
        open={showShare}
        onOpenChange={setShowShare}
        isOwnContent={isOwn}
        contentType={clip.videoType === "reel" ? "reel" : "clip"}
      />

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
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
