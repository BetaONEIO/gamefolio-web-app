import { useSignedUrl } from "@/hooks/use-signed-url";
import HlsVideo from "@/components/media/HlsVideo";
import { Film } from "lucide-react";

type Props = {
  type: "clip" | "reel" | "screenshot";
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  title?: string | null;
};

export function CampaignMediaPreview({ type, mediaUrl, thumbnailUrl, title }: Props) {
  const { signedUrl: videoOrImage } = useSignedUrl(mediaUrl ?? null);
  const { signedUrl: poster } = useSignedUrl(thumbnailUrl ?? null);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/50">
      {type === "screenshot" ? (
        videoOrImage || poster
          ? <img src={videoOrImage || poster || ""} alt={title || "Uploaded screenshot"} className="max-h-64 w-full object-contain" />
          : <div className="flex aspect-video items-center justify-center text-white/40"><Film size={26} /></div>
      ) : videoOrImage ? (
        <HlsVideo key={videoOrImage} src={videoOrImage} poster={poster || undefined} controls preload="metadata" playsInline className="aspect-video max-h-72 w-full bg-black object-contain" aria-label={title || `Uploaded ${type}`} />
      ) : poster ? (
        <div className="relative">
          <img src={poster} alt={title || `Uploaded ${type} thumbnail`} className="aspect-video max-h-72 w-full object-contain" />
          <span className="absolute bottom-2 left-2 rounded bg-black/75 px-2 py-1 text-[10px] font-bold text-white/80">Video processing</span>
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center text-white/40"><Film size={26} /></div>
      )}
      {title && <div className="truncate border-t border-white/10 px-3 py-2 text-xs font-bold text-white/75">{title}</div>}
    </div>
  );
}