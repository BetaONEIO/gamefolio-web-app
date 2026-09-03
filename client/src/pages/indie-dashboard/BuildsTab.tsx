import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import {
  Upload, Loader2, Trash2, Globe, Download, AlertCircle,
  CheckCircle2, Clock, EyeOff, HardDrive, Monitor, Apple, Terminal,
} from "lucide-react";
import {
  quotaFor, validateBuildUpload, formatBytes, extensionsFor,
  BUILD_PLATFORMS, PLATFORM_LABELS,
  type BuildType, type BuildPlatform, type BuildQuota, type BuildStatus,
} from "@shared/game-builds";
import { DASHBOARD_THEME, rgbaAccent } from "./constants";

interface BuildRow {
  id: number;
  buildType: BuildType;
  platform: BuildPlatform | null;
  channel: "demo" | "full";
  label: string;
  originalFileName: string;
  sizeBytes: number;
  storedBytes: number | null;
  status: BuildStatus;
  reviewNotes: string | null;
  downloadCount: number;
  hiddenAt: string | null;
  hiddenReason: string | null;
  createdAt: string;
}

interface QuotaResponse {
  usedBytes: number;
  remainingBytes: number;
  quota: BuildQuota;
  isSubscriber: boolean;
  hostingConfigured: boolean;
  webPlayConfigured: boolean;
}

const PLATFORM_ICONS: Record<BuildPlatform, any> = {
  windows: Monitor,
  mac: Apple,
  linux: Terminal,
};

const STATUS_LABELS: Record<BuildStatus, { label: string; icon: any; tone: string }> = {
  pending_upload: { label: "Upload incomplete", icon: AlertCircle, tone: DASHBOARD_THEME.warning },
  pending_review: { label: "In review", icon: Clock, tone: DASHBOARD_THEME.info },
  approved: { label: "Live", icon: CheckCircle2, tone: DASHBOARD_THEME.success },
  rejected: { label: "Needs changes", icon: AlertCircle, tone: DASHBOARD_THEME.danger },
  removed: { label: "Removed", icon: Trash2, tone: DASHBOARD_THEME.textMuted },
};

export default function BuildsTab({ gameId }: { gameId: number | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [buildType, setBuildType] = useState<BuildType>("web");
  const [platform, setPlatform] = useState<BuildPlatform>("windows");
  const [channel, setChannel] = useState<"demo" | "full">("demo");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [stage, setStage] = useState<string | null>(null);

  const { data: quotaData } = useQuery<QuotaResponse>({
    queryKey: ["/api/game-builds/quota"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: buildsData, isLoading } = useQuery<{ builds: BuildRow[] }>({
    queryKey: ["/api/game-builds", { profileId: gameId }],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!gameId,
  });

  const builds = buildsData?.builds ?? [];
  const quota = quotaData?.quota ?? quotaFor(false);
  const usedBytes = quotaData?.usedBytes ?? 0;
  const isSubscriber = quotaData?.isSubscriber ?? false;

  // The same validator the server runs, so the form can refuse a file before
  // spending twenty minutes uploading something that would be rejected.
  const validationError = useMemo(() => {
    if (!file) return null;
    return validateBuildUpload(
      {
        buildType,
        platform: buildType === "download" ? platform : null,
        fileName: file.name,
        sizeBytes: file.size,
      },
      { usedBytes, buildsOnGame: builds.filter((b) => b.status !== "removed").length },
      quota,
    );
  }, [file, buildType, platform, usedBytes, builds, quota]);

  const resetForm = useCallback(() => {
    setFile(null);
    setLabel("");
    setProgress(null);
    setStage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  /**
   * Three-step upload: reserve → PUT straight to R2 → confirm. The middle step
   * bypasses this app's server entirely, which is why progress is tracked with
   * XMLHttpRequest rather than fetch — fetch still cannot report upload
   * progress, and a multi-GB upload with no progress bar is unusable.
   */
  const upload = useMutation({
    mutationFn: async () => {
      if (!file || !gameId) throw new Error("Pick a game and a file first");

      setStage("Preparing upload");
      const reserveRes = await apiRequest("POST", "/api/game-builds/upload-url", {
        profileId: gameId,
        buildType,
        platform: buildType === "download" ? platform : null,
        channel,
        label: label.trim(),
        fileName: file.name,
        sizeBytes: file.size,
      });
      if (!reserveRes.ok) {
        const body = await reserveRes.json().catch(() => ({}));
        throw new Error(body.message ?? "Could not start the upload");
      }
      const { buildId, uploadUrl, requiredHeaders } = await reserveRes.json();

      setStage("Uploading");
      setProgress(0);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        for (const [key, value] of Object.entries(requiredHeaders ?? {})) {
          xhr.setRequestHeader(key, String(value));
        }
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Upload failed — check your connection and try again"));
        xhr.send(file);
      });

      setProgress(100);
      setStage(buildType === "web" ? "Unpacking build" : "Finishing up");
      const completeRes = await apiRequest("POST", `/api/game-builds/${buildId}/complete`);
      if (!completeRes.ok) {
        const body = await completeRes.json().catch(() => ({}));
        throw new Error(body.message ?? "Could not finish processing the build");
      }
      return completeRes.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Build uploaded",
        description: data?.message ?? "A moderator will review it before it goes live.",
      });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/game-builds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/game-builds/quota"] });
    },
    onError: (error: any) => {
      setProgress(null);
      setStage(null);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const remove = useMutation({
    mutationFn: async (buildId: number) => {
      const res = await apiRequest("DELETE", `/api/game-builds/${buildId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Could not remove the build");
      }
    },
    onSuccess: () => {
      toast({ title: "Build removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/game-builds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/game-builds/quota"] });
    },
    onError: (error: any) =>
      toast({ title: "Could not remove build", description: error.message, variant: "destructive" }),
  });

  if (quotaData && !quotaData.hostingConfigured) {
    return (
      <div className="rounded-2xl p-6 text-center"
        style={{ background: DASHBOARD_THEME.surface, border: `1px solid ${DASHBOARD_THEME.border}` }}>
        <HardDrive className="mx-auto mb-3 h-8 w-8" style={{ color: DASHBOARD_THEME.textMuted }} />
        <h3 className="text-sm font-black text-white">Build hosting isn't switched on yet</h3>
        <p className="mt-2 text-xs" style={{ color: DASHBOARD_THEME.textMuted }}>
          Hosting your game on Gamefolio is coming soon. Nothing to do here for now.
        </p>
      </div>
    );
  }

  if (!gameId) {
    return (
      <div className="rounded-2xl p-6 text-center text-xs"
        style={{ background: DASHBOARD_THEME.surface, border: `1px solid ${DASHBOARD_THEME.border}`, color: DASHBOARD_THEME.textMuted }}>
        Add a game to your profile before uploading a build.
      </div>
    );
  }

  const usedPct = Math.min(100, Math.round((usedBytes / quota.accountBytes) * 100));
  const canSubmit = !!file && !!label.trim() && !validationError && !upload.isPending;

  return (
    <div className="space-y-4">
      {/* ── Storage ── */}
      <div className="rounded-2xl p-4"
        style={{ background: DASHBOARD_THEME.surface, border: `1px solid ${DASHBOARD_THEME.border}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" style={{ color: DASHBOARD_THEME.accent }} />
            <span className="text-xs font-black text-white">Build storage</span>
          </div>
          <span className="text-xs font-bold" style={{ color: DASHBOARD_THEME.textMuted }}>
            {formatBytes(usedBytes)} of {formatBytes(quota.accountBytes)}
          </span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ background: DASHBOARD_THEME.surfaceSubtle }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${usedPct}%`, background: usedPct > 90 ? DASHBOARD_THEME.danger : DASHBOARD_THEME.accent }} />
        </div>
        {!isSubscriber && (
          <p className="mt-3 text-[11px] leading-4" style={{ color: DASHBOARD_THEME.textMuted }}>
            Free accounts can host one browser-playable build. Game Developer adds downloadable
            builds for Windows, macOS and Linux, and raises storage to {formatBytes(quotaFor(true).accountBytes)}.
          </p>
        )}
      </div>

      {/* ── Upload form ── */}
      <div className="rounded-2xl p-4"
        style={{ background: DASHBOARD_THEME.surface, border: `1px solid ${DASHBOARD_THEME.border}` }}>
        <h3 className="text-xs font-black text-white">Upload a build</h3>

        <div className="mt-3 flex gap-2">
          {(["web", "download"] as BuildType[]).map((type) => {
            const allowed = quota.allowedTypes.includes(type);
            const active = buildType === type;
            return (
              <button key={type} type="button" disabled={!allowed}
                onClick={() => setBuildType(type)}
                className="flex-1 rounded-xl px-3 py-2.5 text-[11px] font-bold transition-all disabled:opacity-40"
                style={{
                  background: active ? rgbaAccent(0.12) : DASHBOARD_THEME.surfaceSubtle,
                  border: `1px solid ${active ? DASHBOARD_THEME.accent : DASHBOARD_THEME.border}`,
                  color: active ? DASHBOARD_THEME.accent : DASHBOARD_THEME.textMuted,
                }}>
                <div className="flex items-center justify-center gap-1.5">
                  {type === "web" ? <Globe className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                  {type === "web" ? "Play in browser" : "Downloadable"}
                </div>
                {!allowed && <div className="mt-1 text-[10px]">Game Developer only</div>}
              </button>
            );
          })}
        </div>

        {buildType === "download" && (
          <div className="mt-3 flex gap-2">
            {BUILD_PLATFORMS.map((p) => {
              const Icon = PLATFORM_ICONS[p];
              const active = platform === p;
              return (
                <button key={p} type="button" onClick={() => setPlatform(p)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-all"
                  style={{
                    background: active ? rgbaAccent(0.12) : DASHBOARD_THEME.surfaceSubtle,
                    border: `1px solid ${active ? DASHBOARD_THEME.accent : DASHBOARD_THEME.border}`,
                    color: active ? DASHBOARD_THEME.accent : DASHBOARD_THEME.textMuted,
                  }}>
                  <Icon className="h-3.5 w-3.5" />
                  {PLATFORM_LABELS[p]}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80}
            placeholder="Version label, e.g. Demo v0.4"
            className="rounded-xl px-3 py-2.5 text-xs text-white outline-none"
            style={{ background: DASHBOARD_THEME.surfaceSubtle, border: `1px solid ${DASHBOARD_THEME.border}` }} />
          <select value={channel} onChange={(e) => setChannel(e.target.value as "demo" | "full")}
            className="rounded-xl px-3 py-2.5 text-xs text-white outline-none"
            style={{ background: DASHBOARD_THEME.surfaceSubtle, border: `1px solid ${DASHBOARD_THEME.border}` }}>
            <option value="demo">Demo</option>
            <option value="full">Full game</option>
          </select>
        </div>

        <input ref={fileInputRef} type="file" className="hidden"
          accept={extensionsFor(buildType).join(",")}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

        <button type="button" onClick={() => fileInputRef.current?.click()}
          disabled={upload.isPending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-dashed px-3 py-5 text-xs font-bold transition-all disabled:opacity-50"
          style={{ background: DASHBOARD_THEME.surfaceSubtle, border: `1px dashed ${DASHBOARD_THEME.border}`, color: DASHBOARD_THEME.textMuted }}>
          <Upload className="h-4 w-4" />
          {file ? `${file.name} — ${formatBytes(file.size)}` : `Choose a ${extensionsFor(buildType).join(" / ")} archive`}
        </button>

        {validationError && (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-4" style={{ color: DASHBOARD_THEME.danger }}>
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            {validationError}
          </p>
        )}

        {upload.isPending && (
          <div className="mt-3">
            <div className="mb-1.5 flex justify-between text-[11px]" style={{ color: DASHBOARD_THEME.textMuted }}>
              <span>{stage}</span>
              {progress !== null && <span>{progress}%</span>}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: DASHBOARD_THEME.surfaceSubtle }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${progress ?? 0}%`, background: DASHBOARD_THEME.accent }} />
            </div>
          </div>
        )}

        <button type="button" disabled={!canSubmit} onClick={() => upload.mutate()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition-all disabled:opacity-40"
          style={{ background: DASHBOARD_THEME.accent, color: "#071000" }}>
          {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {upload.isPending ? "Uploading…" : "Upload build"}
        </button>

        <p className="mt-2 text-[11px] leading-4" style={{ color: DASHBOARD_THEME.textSubtle }}>
          Every build is checked by a moderator before it appears on your game page.
        </p>
      </div>

      {/* ── Existing builds ── */}
      <div className="space-y-2">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: DASHBOARD_THEME.textMuted }} />
          </div>
        )}

        {!isLoading && builds.length === 0 && (
          <div className="rounded-2xl p-6 text-center text-xs"
            style={{ background: DASHBOARD_THEME.surface, border: `1px solid ${DASHBOARD_THEME.border}`, color: DASHBOARD_THEME.textMuted }}>
            No builds uploaded yet.
          </div>
        )}

        {builds.map((build) => {
          const status = STATUS_LABELS[build.status] ?? STATUS_LABELS.pending_review;
          const StatusIcon = status.icon;
          return (
            <div key={build.id} className="rounded-2xl p-4"
              style={{ background: DASHBOARD_THEME.surface, border: `1px solid ${DASHBOARD_THEME.border}` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {build.buildType === "web"
                      ? <Globe className="h-3.5 w-3.5 shrink-0" style={{ color: DASHBOARD_THEME.accent }} />
                      : <Download className="h-3.5 w-3.5 shrink-0" style={{ color: DASHBOARD_THEME.accent }} />}
                    <span className="truncate text-xs font-black text-white">{build.label}</span>
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                      style={{ background: DASHBOARD_THEME.surfaceSubtle, color: DASHBOARD_THEME.textMuted }}>
                      {build.channel}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: DASHBOARD_THEME.textMuted }}>
                    {build.platform ? `${PLATFORM_LABELS[build.platform]} · ` : "Browser · "}
                    {formatBytes(build.storedBytes ?? build.sizeBytes)}
                    {build.status === "approved" && ` · ${build.downloadCount} download${build.downloadCount === 1 ? "" : "s"}`}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: status.tone }}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </span>
                  <button type="button" onClick={() => remove.mutate(build.id)}
                    disabled={remove.isPending}
                    className="rounded-lg p-1.5 transition-colors hover:bg-white/5 disabled:opacity-40"
                    aria-label={`Remove ${build.label}`}>
                    <Trash2 className="h-3.5 w-3.5" style={{ color: DASHBOARD_THEME.textMuted }} />
                  </button>
                </div>
              </div>

              {build.status === "rejected" && build.reviewNotes && (
                <p className="mt-3 rounded-lg p-2.5 text-[11px] leading-4"
                  style={{ background: DASHBOARD_THEME.surfaceSubtle, color: DASHBOARD_THEME.danger }}>
                  {build.reviewNotes}
                </p>
              )}

              {build.hiddenAt && build.hiddenReason === "subscription_lapsed" && (
                <p className="mt-3 flex items-start gap-1.5 rounded-lg p-2.5 text-[11px] leading-4"
                  style={{ background: DASHBOARD_THEME.surfaceSubtle, color: DASHBOARD_THEME.warning }}>
                  <EyeOff className="mt-0.5 h-3 w-3 shrink-0" />
                  Hidden while your Game Developer subscription is inactive. Your files are kept —
                  resubscribe and this build goes straight back up.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
