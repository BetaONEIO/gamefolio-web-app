import type { ReactElement, ReactNode } from "react";
import { Eye, Play } from "lucide-react";
import { Link } from "wouter";
import { LazyImage } from "@/components/ui/lazy-image";
import { ProfileHoverCard } from "@/components/ui/ProfileHoverCard";
import { formatDuration } from "@/lib/constants";
import { formatNumber } from "@/lib/format";

type ReelCardProps = {
  title: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
  views?: number | null;
  username?: string;
  gameName?: string | null;
  gameHref?: string;
  actions?: ReactNode;
  onOpen?: () => void;
  wrapThumbnail?: (thumbnail: ReactElement) => ReactNode;
  sample?: boolean;
  disabled?: boolean;
};

export function ReelCard({ title, thumbnailUrl, duration, views, username, gameName, gameHref, actions, onOpen, wrapThumbnail, sample, disabled }: ReelCardProps) {
  const thumbnail = (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      aria-label={`Play ${title}`}
      className="group relative block aspect-[9/16] w-full overflow-hidden rounded-xl border border-white/5 bg-black text-left enabled:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {thumbnailUrl ? (
        <LazyImage
          src={thumbnailUrl}
          alt=""
          className="h-full w-full object-contain motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
          showLoadingSpinner
          rootMargin="100px"
          threshold={0.1}
          containerClassName="absolute inset-0"
        />
      ) : <span className="absolute inset-0 grid place-items-center text-white/60"><Play aria-hidden="true" size={28}/></span>}
      {duration != null && <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
        {formatDuration(duration)}
      </span>}
      {views != null && <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white" aria-label={`${views} views`}>
        <Eye className="h-3 w-3" aria-hidden="true"/>{formatNumber(views)}
      </span>}
    </button>
  );
  const gameTag = gameName && <span className="inline-block max-w-full truncate rounded bg-[#B7FF18] px-1.5 py-0.5 text-[10px] font-bold text-[#0A0A10]">{gameName}</span>;

  return <div className="min-w-0">
    {wrapThumbnail ? wrapThumbnail(thumbnail) : thumbnail}
    <div className="px-0.5 pt-2">
      <div className="flex items-start justify-between gap-1">
        <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-white">{title}</h3>
        {actions && <div className="-mt-0.5 shrink-0">{actions}</div>}
      </div>
      {username && <ProfileHoverCard username={username}>
        <Link href={`/profile/${encodeURIComponent(username)}`} className="mt-0.5 block truncate text-xs text-white/60 transition-colors hover:text-white/90">@{username}</Link>
      </ProfileHoverCard>}
      {sample && <span className="mt-0.5 block text-xs text-white/60">Layout sample</span>}
      {gameTag && (gameHref ? <Link href={gameHref} className="mt-1.5 block w-fit max-w-full">{gameTag}</Link> : <div className="mt-1.5">{gameTag}</div>)}
    </div>
  </div>;
}
