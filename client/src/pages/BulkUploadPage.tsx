import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import GameSelector from "@/components/clips/GameSelector";
import TagInput from "@/components/clips/TagInput";
import ProUpgradeDialog from "@/components/ProUpgradeDialog";
import { Game } from "@shared/schema";
import type { UploadLimits } from "@shared/schema";
import {
  Upload,
  Video,
  Image as ImageIcon,
  X,
  Check,
  AlertCircle,
  Loader2,
  Crown,
  Plus,
} from "lucide-react";

// One file queued in the bulk-upload batch, with its own metadata + status.
type ItemKind = "video" | "screenshot";
type ItemStatus = "pending" | "uploading" | "success" | "error";

interface BulkItem {
  id: string;
  file: File;
  kind: ItemKind;
  previewUrl: string;
  title: string;
  description: string;
  game: Game | null;
  tags: string[];
  ageRestricted: boolean;
  // Video-only: 'clip' (landscape) or 'reel' (9:16), auto-detected from aspect
  // ratio once metadata loads. Ignored for screenshots.
  videoType: "clip" | "reel";
  durationSeconds: number | null;
  status: ItemStatus;
  progress: number;
  error: string | null;
}

const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/jpg"];

// Monotonic id source so React keys stay stable across re-renders.
let itemIdCounter = 0;
const nextItemId = () => `bulk-${++itemIdCounter}`;

// On Android, File.type can be empty even for valid media. Fall back to the
// extension, mirroring UploadPage.getEffectiveMimeType.
function getEffectiveMimeType(f: File): string {
  if (f.type) return f.type;
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  const extMap: Record<string, string> = {
    mp4: "video/mp4",
    m4v: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
  };
  return extMap[ext] ?? "";
}

function titleFromFilename(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 100);
}

// Probe a video file for its duration + aspect ratio so we can default each
// item to clip vs reel and validate duration before uploading.
function probeVideo(file: File): Promise<{ duration: number; aspectRatio: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration || 0;
      const aspectRatio = video.videoHeight ? video.videoWidth / video.videoHeight : 0;
      URL.revokeObjectURL(url);
      resolve({ duration, aspectRatio });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video metadata"));
    };
    video.src = url;
  });
}

const BulkUploadPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [items, setItems] = useState<BulkItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showProUpgrade, setShowProUpgrade] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: limits } = useQuery<UploadLimits>({
    queryKey: ["/api/upload/limits"],
    queryFn: async () => {
      const res = await fetch("/api/upload/limits", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load upload limits");
      return res.json();
    },
    staleTime: 60_000,
  });

  const maxBulk = limits?.maxBulkUploads ?? 3;
  const isFreeTier = maxBulk < 10;

  // Revoke object URLs on unmount to avoid leaking blob memory.
  useEffect(() => {
    return () => {
      setItems((prev) => {
        prev.forEach((it) => it.previewUrl && URL.revokeObjectURL(it.previewUrl));
        return prev;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before leaving while a batch is uploading.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isUploading) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isUploading]);

  const updateItem = (id: string, patch: Partial<BulkItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-picking the same file
    if (picked.length === 0) return;

    const remaining = maxBulk - items.length;
    if (remaining <= 0) {
      toast({
        title: "Batch is full",
        description: `You can upload up to ${maxBulk} files at once.${isFreeTier ? " Upgrade to Pro for 10 at a time." : ""}`,
        variant: "destructive",
      });
      return;
    }

    const accepted: File[] = [];
    let skippedForLimit = 0;
    for (const file of picked) {
      if (accepted.length >= remaining) {
        skippedForLimit++;
        continue;
      }
      const mime = getEffectiveMimeType(file);
      const isVideo = ALLOWED_VIDEO.includes(mime);
      const isImage = ALLOWED_IMAGE.includes(mime);
      if (!isVideo && !isImage) {
        toast({
          title: "Unsupported file",
          description: `"${file.name}" isn't a supported video (MP4, WebM, MOV) or image (JPEG, PNG).`,
          variant: "destructive",
        });
        continue;
      }
      // Size cap per tier. Reels are validated again once we know the type;
      // use the larger clip cap here so we don't wrongly reject a landscape clip.
      const maxImageMB = limits?.maxScreenshotSizeMB ?? 10;
      const maxVideoMB = limits?.maxClipSizeMB ?? 100;
      const capMB = isVideo ? maxVideoMB : maxImageMB;
      if (file.size > capMB * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `"${file.name}" exceeds your ${capMB}MB limit.${isFreeTier ? " Upgrade to Pro for larger uploads." : ""}`,
          variant: "destructive",
        });
        continue;
      }
      accepted.push(file);
    }

    if (skippedForLimit > 0) {
      toast({
        title: "Some files weren't added",
        description: `You can upload up to ${maxBulk} at once. ${skippedForLimit} file${skippedForLimit > 1 ? "s were" : " was"} left out.${isFreeTier ? " Upgrade to Pro for 10 at a time." : ""}`,
      });
    }

    const newItems: BulkItem[] = accepted.map((file) => {
      const mime = getEffectiveMimeType(file);
      const kind: ItemKind = ALLOWED_VIDEO.includes(mime) ? "video" : "screenshot";
      return {
        id: nextItemId(),
        file,
        kind,
        previewUrl: URL.createObjectURL(file),
        title: titleFromFilename(file.name),
        description: "",
        game: null,
        tags: [],
        ageRestricted: false,
        videoType: "clip",
        durationSeconds: null,
        status: "pending",
        progress: 0,
        error: null,
      };
    });

    setItems((prev) => [...prev, ...newItems]);

    // Probe videos for aspect ratio (clip vs reel) + duration in the background.
    newItems
      .filter((it) => it.kind === "video")
      .forEach((it) => {
        probeVideo(it.file)
          .then(({ duration, aspectRatio }) => {
            const isReel = aspectRatio > 0 && Math.abs(aspectRatio - 9 / 16) <= 0.1;
            updateItem(it.id, {
              durationSeconds: Math.round(duration),
              videoType: isReel ? "reel" : "clip",
            });
          })
          .catch(() => {
            /* leave defaults; the server re-validates anyway */
          });
      });
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((it) => it.id !== id);
    });
  };

  // ---- Upload helpers -------------------------------------------------------

  // Direct-to-Supabase + process-video, mirroring UploadPage's uploadMutation
  // but without client-side trimming (server uses the full clip when trimEnd
  // is omitted).
  async function uploadVideoItem(item: BulkItem, onProgress: (p: number) => void) {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = item.file.name.split(".").pop() || "mp4";
    const prefix = item.videoType === "reel" ? "reels" : "videos";
    const fileName = `${prefix}/${timestamp}-${randomId}.${extension}`;
    const filePath = `users/${user!.id}/${fileName}`;

    onProgress(5);
    const credsRes = await fetch("/api/upload/supabase-creds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath, contentType: item.file.type }),
      credentials: "include",
    });
    if (!credsRes.ok) throw new Error("Failed to get upload credentials");
    const { uploadUrl, publicUrl } = await credsRes.json();

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", item.file.type);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100);
          onProgress(10 + Math.round(pct * 0.75)); // 10 → 85
        }
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`Upload failed (${xhr.status})`));
      xhr.onerror = () => reject(new Error("Upload network error"));
      xhr.send(item.file);
    });

    onProgress(88);
    const processRes = await fetch("/api/upload/process-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadResult: { url: publicUrl, path: filePath },
        title: item.title.trim(),
        description: item.description.trim(),
        gameId: item.game ? item.game.id : null,
        tags: item.tags,
        videoType: item.videoType,
        ageRestricted: item.ageRestricted,
        trimStart: 0,
        // trimEnd omitted → server keeps the full clip duration.
      }),
      credentials: "include",
    });
    if (!processRes.ok) {
      const err = await processRes.json().catch(() => ({}));
      throw new Error(err.message || err.error || "Video processing failed");
    }
    onProgress(100);
  }

  async function uploadScreenshotItem(item: BulkItem, onProgress: (p: number) => void) {
    const formData = new FormData();
    formData.append("title", item.title.trim());
    formData.append("description", item.description.trim());
    if (item.game) {
      formData.append("gameId", item.game.id.toString());
      formData.append("gameName", item.game.name);
      formData.append("gameImageUrl", item.game.imageUrl || "");
    }
    formData.append("tags", JSON.stringify(item.tags));
    formData.append("ageRestricted", item.ageRestricted.toString());
    formData.append("screenshot", item.file);

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/screenshots/upload");
      xhr.withCredentials = true;
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 90)); // 0 → 90
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve();
        } else {
          let message = "Failed to upload screenshot";
          try {
            const body = JSON.parse(xhr.responseText);
            message = body.message || body.error || message;
          } catch {
            /* keep default */
          }
          reject(new Error(message));
        }
      };
      xhr.onerror = () => reject(new Error("Upload network error"));
      xhr.send(formData);
    });
  }

  // ---- Submit ---------------------------------------------------------------

  const handleUploadAll = async () => {
    if (!user) {
      toast({ title: "You must be logged in to upload.", variant: "destructive" });
      return;
    }
    const pending = items.filter((it) => it.status !== "success");
    if (pending.length === 0) return;

    // Validate: title required for everything; videos also need a game.
    for (const it of pending) {
      if (!it.title.trim()) {
        updateItem(it.id, { error: "Add a title before uploading." });
        toast({ title: "Missing title", description: `"${it.file.name}" needs a title.`, variant: "destructive" });
        return;
      }
      if (it.kind === "video" && !it.game) {
        updateItem(it.id, { error: "Pick a game before uploading." });
        toast({ title: "Missing game", description: `"${it.file.name}" needs a game.`, variant: "destructive" });
        return;
      }
    }

    setIsUploading(true);
    let succeeded = 0;
    let failed = 0;

    // Sequential so we don't saturate bandwidth / hit rate limits.
    for (const it of pending) {
      updateItem(it.id, { status: "uploading", progress: 0, error: null });
      try {
        const onProgress = (p: number) => updateItem(it.id, { progress: p });
        if (it.kind === "video") {
          await uploadVideoItem(it, onProgress);
        } else {
          await uploadScreenshotItem(it, onProgress);
        }
        updateItem(it.id, { status: "success", progress: 100 });
        succeeded++;
      } catch (err: any) {
        updateItem(it.id, { status: "error", error: err?.message || "Upload failed" });
        failed++;
      }
    }

    setIsUploading(false);

    // Refresh feeds / profile / limits so the new content shows up.
    queryClient.invalidateQueries({ queryKey: ["/api/clips"] });
    queryClient.invalidateQueries({ queryKey: ["/api/clips/latest"] });
    queryClient.invalidateQueries({ queryKey: ["/api/reels/latest"] });
    queryClient.invalidateQueries({ queryKey: [`/api/users/${user.username}/clips`] });
    queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/screenshots`] });
    queryClient.invalidateQueries({ queryKey: [`/api/users/${user.username}/screenshots`] });
    queryClient.invalidateQueries({ queryKey: [`/api/users/${user.username}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/upload/limits"] });
    queryClient.refetchQueries({ queryKey: ["/api/user"] });

    if (failed === 0) {
      toast({
        title: "All uploads complete",
        description: `${succeeded} item${succeeded > 1 ? "s" : ""} posted to your gamefolio.`,
      });
    } else {
      toast({
        title: "Some uploads failed",
        description: `${succeeded} succeeded, ${failed} failed. You can retry the failed ones.`,
        variant: "destructive",
      });
    }
  };

  const allDone = items.length > 0 && items.every((it) => it.status === "success");
  const pendingCount = items.filter((it) => it.status !== "success").length;

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6 pb-28">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="h-6 w-6 text-primary" />
            Bulk Upload
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add multiple clips, reels and screenshots at once — up to{" "}
            <span className="font-semibold text-foreground">{maxBulk}</span> per batch.
          </p>
        </div>
      </div>

      {isFreeTier && (
        <Alert className="mb-4 border-primary/40 bg-primary/5">
          <Crown className="h-4 w-4 text-primary" />
          <AlertTitle>Upload more at once</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>Free members can bulk upload 3 files at a time. Pro &amp; Partner members get 10.</span>
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setShowProUpgrade(true)}
            >
              Upgrade to Pro
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Hidden picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/jpg"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
        data-testid="input-bulk-files"
      />

      {items.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-muted-foreground/30 rounded-xl py-16 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-colors"
          data-testid="button-bulk-pick"
        >
          <Upload className="h-10 w-10 text-muted-foreground" />
          <span className="font-medium">Select files to upload</span>
          <span className="text-sm text-muted-foreground">
            Videos (MP4, WebM, MOV) and images (JPEG, PNG)
          </span>
        </button>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Preview */}
                  <div className="shrink-0 w-28 h-28 rounded-lg overflow-hidden bg-muted flex items-center justify-center relative">
                    {item.kind === "video" ? (
                      <video src={item.previewUrl} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                    )}
                    <span className="absolute top-1 left-1 bg-black/70 text-white rounded px-1.5 py-0.5 text-[10px] flex items-center gap-1">
                      {item.kind === "video" ? (
                        <>
                          <Video className="h-3 w-3" />
                          {item.videoType === "reel" ? "Reel" : "Clip"}
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-3 w-3" />
                          Screenshot
                        </>
                      )}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-muted-foreground truncate" title={item.file.name}>
                        {item.file.name}
                        {item.durationSeconds != null && item.kind === "video" && (
                          <> · {item.durationSeconds}s</>
                        )}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === "success" && (
                          <span className="text-green-500 flex items-center gap-1 text-xs">
                            <Check className="h-4 w-4" /> Posted
                          </span>
                        )}
                        {item.status === "error" && (
                          <span className="text-destructive flex items-center gap-1 text-xs">
                            <AlertCircle className="h-4 w-4" /> Failed
                          </span>
                        )}
                        {item.status === "uploading" && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                        {!isUploading && item.status !== "uploading" && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Remove"
                            data-testid={`button-remove-${item.id}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {item.status === "uploading" || item.status === "success" ? (
                      <div className="space-y-1">
                        <Progress value={item.progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">{item.progress}%</p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <Label className="text-xs">Title</Label>
                          <Input
                            value={item.title}
                            onChange={(e) => updateItem(item.id, { title: e.target.value.slice(0, 100), error: null })}
                            placeholder="Give it a title"
                            className="h-9"
                            data-testid={`input-title-${item.id}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Game{item.kind === "video" ? "" : " (optional)"}</Label>
                          <GameSelector
                            games={[]}
                            selectedGame={item.game}
                            onSelect={(g) => updateItem(item.id, { game: g, error: null })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tags</Label>
                          <TagInput
                            tags={item.tags}
                            setTags={(t) => updateItem(item.id, { tags: t })}
                          />
                        </div>
                        <details className="text-sm">
                          <summary className="cursor-pointer text-muted-foreground text-xs">
                            More options
                          </summary>
                          <div className="mt-2 space-y-2">
                            <Textarea
                              value={item.description}
                              onChange={(e) => updateItem(item.id, { description: e.target.value })}
                              placeholder="Description (optional)"
                              className="min-h-[60px]"
                            />
                            <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <Checkbox
                                checked={item.ageRestricted}
                                onCheckedChange={(c) => updateItem(item.id, { ageRestricted: c === true })}
                              />
                              Mark as age-restricted (18+)
                            </label>
                          </div>
                        </details>
                        {item.error && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {item.error}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add more */}
          {!isUploading && items.length < maxBulk && (
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-add-more"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add more ({items.length}/{maxBulk})
            </Button>
          )}
        </div>
      )}

      {/* Action bar */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur px-4 py-3">
          <div className="container max-w-3xl mx-auto flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {items.length} file{items.length > 1 ? "s" : ""} · {maxBulk - items.length} slot
              {maxBulk - items.length === 1 ? "" : "s"} left
            </span>
            {allDone ? (
              <Button onClick={() => navigate(`/profile/${user?.username}`)} data-testid="button-done">
                Done
              </Button>
            ) : (
              <Button
                onClick={handleUploadAll}
                disabled={isUploading || pendingCount === 0}
                data-testid="button-upload-all"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {pendingCount} file{pendingCount > 1 ? "s" : ""}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      <ProUpgradeDialog open={showProUpgrade} onOpenChange={setShowProUpgrade} />
    </div>
  );
};

export default BulkUploadPage;
