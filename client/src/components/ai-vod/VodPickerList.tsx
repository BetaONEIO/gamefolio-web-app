import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TwitchVodOption } from "@/hooks/use-ai-vod-clips";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

interface VodPickerListProps {
  vods: TwitchVodOption[];
  maxDurationSeconds: number;
  onSelect: (vod: TwitchVodOption) => void;
  disabled?: boolean;
}

export default function VodPickerList({ vods, maxDurationSeconds, onSelect, disabled }: VodPickerListProps) {
  if (vods.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        No past broadcasts found on your connected Twitch channel.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {vods.map((vod) => (
        <Card
          key={vod.id}
          className={`overflow-hidden transition-opacity ${
            vod.eligible && !disabled ? "cursor-pointer hover:opacity-90" : "opacity-50 cursor-not-allowed"
          }`}
          onClick={() => vod.eligible && !disabled && onSelect(vod)}
          title={vod.eligible ? undefined : `VODs over ${Math.round(maxDurationSeconds / 60)} min aren't supported yet`}
        >
          <div className="relative aspect-video bg-muted">
            {vod.thumbnailUrl && (
              <img src={vod.thumbnailUrl} alt={vod.title} className="w-full h-full object-cover" />
            )}
            <Badge className="absolute bottom-2 right-2 bg-black/70 text-white border-0">
              {formatDuration(vod.durationSeconds)}
            </Badge>
            {!vod.eligible && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="text-white text-sm font-medium px-2 text-center">Too long for AI clips</span>
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="font-medium text-sm line-clamp-2">{vod.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(vod.createdAt).toLocaleDateString()} · {vod.viewCount.toLocaleString()} views
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
