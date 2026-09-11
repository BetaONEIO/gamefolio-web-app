import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BadgeCheck, Check, ExternalLink, Globe2, MapPin, Pencil, Share2, SlidersHorizontal, UserPlus, Users } from "lucide-react";
import { getQueryFn, queryClient } from "@/lib/queryClient";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { useAuth } from "@/hooks/use-auth";
import { publicGamePath } from "@/lib/game-routes";
import type { UserWithStats } from "@shared/schema";

type StudioGame = {
  id: number;
  gameSlug?: string | null;
  slug?: string | null;
  gameName?: string | null;
  catalogGameName?: string | null;
  title?: string | null;
  headerImageUrl?: string | null;
  capsuleImageUrl?: string | null;
  catalogImageUrl?: string | null;
  releaseStatus?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  isFeatured?: boolean;
  isPrimary?: boolean;
  releaseDate?: string | null;
  platforms?: string[] | null;
  genres?: string[] | null;
  [key: string]: unknown;
};

type Props = { profile: UserWithStats; isOwnProfile: boolean };

const formatNumber = (value: unknown) =>
  typeof value === "number" ? value.toLocaleString() : typeof value === "string" && value.trim() ? Number(value).toLocaleString() : null;

function Avatar({ url, name, className = "" }: { url?: string | null; name: string; className?: string }) {
  const { signedUrl } = useSignedUrl(url);
  return signedUrl ? <img src={signedUrl} alt={`${name} logo`} className={`object-cover ${className}`} /> : (
    <div className={`flex items-center justify-center bg-[#b7ff18] font-black text-[#09100c] ${className}`}>{name.slice(0, 2).toUpperCase()}</div>
  );
}

function GameCard({ game }: { game: StudioGame }) {
  const image = game.headerImageUrl || game.capsuleImageUrl || game.catalogImageUrl;
  const { signedUrl } = useSignedUrl(image);
  const title = game.catalogGameName || game.gameName || game.title || "Untitled game";
  const path = game.gameSlug || game.slug
    ? `/games/${encodeURIComponent(game.gameSlug || game.slug || "")}`
    : publicGamePath(title);
  const status = game.releaseStatus?.replaceAll("_", " ") || null;
  return (
    <Link href={path} className="group block overflow-hidden rounded-2xl border border-white/[.11] bg-[#111a20] transition-colors hover:border-[#b7ff18]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7ff18]">
      <div className="relative aspect-[16/8] overflow-hidden bg-[#17232b]">
        {signedUrl ? <img src={signedUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : <div className="h-full w-full bg-[linear-gradient(120deg,#17232b,#273c3d)]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111a20] via-transparent to-transparent" />
        {(game.isFeatured || game.isPrimary) && <span className="absolute left-3 top-3 rounded-md bg-[#b7ff18] px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[#07100a]">Featured</span>}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-black tracking-tight text-white">{title}</h3>
          {status && <span className="shrink-0 rounded-full border border-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white/55">{status}</span>}
        </div>
        {(game.shortDescription || game.description) && <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/58">{game.shortDescription || game.description}</p>}
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-white/40">
          {game.releaseDate && <span>{new Date(game.releaseDate).getFullYear()}</span>}
          {game.genres?.slice(0, 2).map((genre) => <span key={genre} className="border-l border-white/15 pl-2">{genre}</span>)}
          {game.platforms?.slice(0, 2).map((platform) => <span key={platform} className="border-l border-white/15 pl-2">{platform}</span>)}
        </div>
      </div>
    </Link>
  );
}

export default function IndieDeveloperProfile({ profile, isOwnProfile }: Props) {
  const { user: currentUser } = useAuth();
  const [shared, setShared] = useState(false);
  const { data: gamesData, isLoading: gamesLoading, error: gamesError } = useQuery<{ games?: StudioGame[] }>({
    queryKey: [`/api/games/indie/${profile.username}/list`],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  const { data: followStatus } = useQuery<{ following?: boolean; requested?: boolean }>({
    queryKey: [`/api/users/${profile.username}/follow-status`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!currentUser && !isOwnProfile,
  });
  const followMutation = useMutation({
    mutationFn: async () => {
      const following = !!followStatus?.following || !!followStatus?.requested;
      const response = await fetch(`/api/users/${profile.username}/follow`, { method: following ? "DELETE" : "POST", credentials: "include" });
      if (!response.ok) throw new Error("Unable to update follow status");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/users/${profile.username}/follow-status`] }),
  });
  const games = useMemo(() => gamesData?.games ?? [], [gamesData]);
  const displayName = profile.displayName || profile.username;
  const website = (profile as any).studioWebsite || (profile as any).websiteUrl;
  const location = (profile as any).location || (profile as any).city;
  const social = [
    (profile as any).twitterUsername ? { label: "X", href: `https://x.com/${(profile as any).twitterUsername}` } : null,
    (profile as any).instagramUsername ? { label: "Instagram", href: `https://instagram.com/${(profile as any).instagramUsername}` } : null,
    (profile as any).youtubeUsername ? { label: "YouTube", href: `https://youtube.com/@${(profile as any).youtubeUsername}` } : null,
  ].filter(Boolean) as { label: string; href: string }[];
  const followers = formatNumber((profile as any)._count?.followers);
  const following = !!followStatus?.following;
  const requested = !!followStatus?.requested;

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: displayName, url }).catch(() => undefined);
    else await navigator.clipboard?.writeText(url);
    setShared(true);
    window.setTimeout(() => setShared(false), 1800);
  };

  return (
    <main className="min-h-[100dvh] bg-[#080d11] pb-20 text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="h-44 bg-[#101b22] sm:h-60 lg:h-72">
          {profile.bannerUrl && <BannerImage url={profile.bannerUrl} name={displayName} />}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#080d11] via-[#080d11]/35 to-transparent" />
        <div className="relative mx-auto -mt-16 max-w-6xl px-5 sm:-mt-20 sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <Avatar url={profile.avatarUrl} name={displayName} className="h-28 w-28 shrink-0 rounded-2xl border-4 border-[#080d11] text-3xl shadow-xl sm:h-36 sm:w-36" />
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{displayName}</h1>
                <BadgeCheck className="h-6 w-6 text-[#b7ff18]" aria-label="Indie Developer" />
              </div>
              <p className="mt-1 text-sm font-semibold text-white/48">@{profile.username} <span className="mx-2 text-white/20">/</span> Indie Developer</p>
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              {!isOwnProfile && <button type="button" onClick={() => currentUser ? followMutation.mutate() : window.location.assign("/auth")} disabled={followMutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-[#b7ff18] px-4 py-3 text-sm font-black text-[#07100a] hover:brightness-110 disabled:opacity-60"><UserPlus className="h-4 w-4" />{following ? "Following" : requested ? "Requested" : "Follow"}</button>}
              <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#111a20] px-4 py-3 text-sm font-bold hover:border-white/35">{shared ? <Check className="h-4 w-4 text-[#b7ff18]" /> : <Share2 className="h-4 w-4" />} {shared ? "Copied" : "Share"}</button>
              {isOwnProfile && <><Link href="/game-dashboard" className="inline-flex items-center gap-2 rounded-xl border border-[#b7ff18]/40 px-4 py-3 text-sm font-bold text-[#b7ff18] hover:bg-[#b7ff18]/10"><SlidersHorizontal className="h-4 w-4" /> Manage games</Link><Link href="/game-dashboard?tab=profile" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-bold hover:border-white/35"><Pencil className="h-4 w-4" /> Edit profile</Link></>}
            </div>
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-9 sm:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          {profile.bio && <p className="max-w-2xl text-base leading-7 text-white/72">{profile.bio}</p>}
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/55">
            {website && <a href={website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-[#b7ff18]"><Globe2 className="h-4 w-4" /> Website <ExternalLink className="h-3 w-3" /></a>}
            {location && <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" /> {location}</span>}
            {social.map((item) => <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className="hover:text-[#b7ff18]">{item.label}</a>)}
          </div>
          <div className="mt-10 flex items-center justify-between border-b border-white/10 pb-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#b7ff18]">Studio catalogue</p><h2 className="mt-2 text-2xl font-black">Published games <span className="text-white/35">({games.length})</span></h2></div></div>
          {gamesLoading ? <div className="mt-6 grid gap-5 sm:grid-cols-2">{[1, 2].map((n) => <div key={n} className="aspect-[16/11] animate-pulse rounded-2xl bg-white/[.06]" />)}</div> : gamesError ? <p className="mt-6 rounded-xl border border-red-400/20 p-5 text-sm text-red-200/75">Games could not be loaded. Please try again later.</p> : games.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2">{games.map((game) => <GameCard key={game.id} game={game} />)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-white/45">No published games yet.</div>}
        </div>
        <aside className="h-fit border-l border-white/10 pl-0 lg:pl-7">
          <p className="text-xs font-black uppercase tracking-[.2em] text-white/40">Community reach</p>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-1">
            <Stat label="Followers" value={followers} icon={<Users className="h-4 w-4" />} />
          </div>
        </aside>
      </div>
    </main>
  );
}

function BannerImage({ url, name }: { url: string; name: string }) {
  const { signedUrl } = useSignedUrl(url);
  return signedUrl ? <img src={signedUrl} alt={`${name} studio banner`} className="h-full w-full object-cover opacity-80" /> : null;
}

function Stat({ label, value, icon }: { label: string; value: string | null; icon?: ReactNode }) {
  return <div className="rounded-xl border border-white/10 bg-[#111a20] p-4"><div className="flex items-center gap-2 text-[#b7ff18]">{icon}<span className="text-2xl font-black text-white">{value || "—"}</span></div><p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-white/40">{label}</p></div>;
}