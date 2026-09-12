import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  CalendarDays,
  Check,
  ExternalLink,
  Eye,
  Gamepad2,
  Globe2,
  ImageOff,
  MapPin,
  Pencil,
  Share2,
  SlidersHorizontal,
  Store,
  UserPlus,
  Users,
} from "lucide-react";
import { getQueryFn, queryClient } from "@/lib/queryClient";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { useAuth } from "@/hooks/use-auth";
import { publicGamePath } from "@/lib/game-routes";
import EditProfileModal from "@/components/profile/EditProfileModal";
import type { UserWithStats } from "@shared/schema";

const DEFAULT_BANNER_URL = "/api/static/telegram-cloud-photo-size-4-5929334272504744521-y_1749637964973.jpg";

type StudioLinks = {
  websiteUrl?: string | null;
  studioWebsite?: string | null;
  discordUrl?: string | null;
  twitterUrl?: string | null;
  youtubeUrl?: string | null;
  steamUrl?: string | null;
  epicUrl?: string | null;
  itchUrl?: string | null;
};

type StudioGame = StudioLinks & {
  id: number;
  catalogGameId?: number | null;
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
  fullDescription?: string | null;
  isFeatured?: boolean;
  isPrimary?: boolean;
  releaseDate?: string | null;
  platforms?: string[] | null;
  genres?: string[] | null;
  followerCount?: number | null;
  communityUploads?: number | null;
  views?: number | null;
  [key: string]: unknown;
};

type Props = { profile: UserWithStats; isOwnProfile: boolean };

const formatNumber = (value: unknown) => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : "0";
};

const formatStatus = (status?: string | null) =>
  status?.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || "In development";

const validHref = (value?: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
};

function Avatar({ url, name, className = "" }: { url?: string | null; name: string; className?: string }) {
  return (
    <SafeSignedImage
      url={url}
      alt={`${name} logo`}
      className={`object-cover ${className}`}
      fallback={<div className={`flex items-center justify-center bg-[#b7ff18] font-black text-[#09100c] ${className}`}>{name.slice(0, 2).toUpperCase()}</div>}
    />
  );
}

function SafeSignedImage({
  url,
  alt,
  className,
  fallback,
  loading,
}: {
  url?: string | null;
  alt: string;
  className: string;
  fallback: ReactNode;
  loading?: "lazy" | "eager";
}) {
  const { signedUrl } = useSignedUrl(url);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [signedUrl]);
  if (!signedUrl || failed) return <>{fallback}</>;
  return <img src={signedUrl} alt={alt} loading={loading} className={className} onError={() => setFailed(true)} />;
}

function Artwork({ game, className = "" }: { game: StudioGame; className?: string }) {
  const image = game.headerImageUrl || game.capsuleImageUrl || game.catalogImageUrl;
  return (
    <SafeSignedImage
      url={image}
      alt=""
      loading="lazy"
      className={`h-full w-full object-cover ${className}`}
      fallback={<div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#16203b,#263f46)]"><ImageOff className="h-7 w-7 text-white/20" /></div>}
    />
  );
}

function GamePath({ game }: { game: StudioGame }) {
  const title = game.catalogGameName || game.gameName || game.title || "Untitled game";
  return game.gameSlug || game.slug
    ? `/games/${encodeURIComponent(game.gameSlug || game.slug || "")}`
    : publicGamePath(title);
}

function MetaPill({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/[.035] px-2.5 py-1 text-[11px] font-semibold text-white/60">{children}</span>;
}

function StoreLinks({ game, compact = false }: { game: StudioGame; compact?: boolean }) {
  const links = [
    { label: "Steam", href: game.steamUrl },
    { label: "Epic", href: game.epicUrl },
    { label: "itch.io", href: game.itchUrl },
  ].map((entry) => ({ ...entry, href: validHref(entry.href) })).filter((entry) => entry.href);
  if (!links.length) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-4"}`}>
      {links.map((link) => (
        <a key={link.label} href={link.href!} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-xs font-bold text-white/70 transition-colors hover:border-[#b7ff18]/60 hover:text-[#b7ff18]">
          <Store className="h-3.5 w-3.5" /> {link.label} <ExternalLink className="h-3 w-3 opacity-50" />
        </a>
      ))}
    </div>
  );
}

function GameCard({ game }: { game: StudioGame }) {
  const title = game.catalogGameName || game.gameName || game.title || "Untitled game";
  return (
    <article className="group overflow-hidden rounded-2xl border border-white/[.11] bg-[#151725] transition-colors hover:border-[#b7ff18]/55">
      <Link href={GamePath({ game })} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#b7ff18]">
        <div className="relative aspect-[16/8] overflow-hidden bg-[#182039]">
          <Artwork game={game} className="transition-transform duration-300 group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#151725] via-transparent to-transparent" />
          {(game.isFeatured || game.isPrimary) && <span className="absolute left-3 top-3 rounded-md bg-[#b7ff18] px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[#07100a]">Featured</span>}
        </div>
      </Link>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <Link href={GamePath({ game })} className="text-lg font-black tracking-tight text-white hover:text-[#b7ff18]">{title}</Link>
          <span className="shrink-0 rounded-full border border-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white/55">{formatStatus(game.releaseStatus)}</span>
        </div>
        {(game.shortDescription || game.fullDescription) && <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/58">{game.shortDescription || game.fullDescription}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {game.genres?.slice(0, 2).map((genre) => <MetaPill key={genre}>{genre}</MetaPill>)}
          {game.platforms?.slice(0, 2).map((platform) => <MetaPill key={platform}>{platform}</MetaPill>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/42">
          {game.followerCount != null && <span><Users className="mr-1 inline h-3.5 w-3.5" />{formatNumber(game.followerCount)} followers</span>}
          {game.communityUploads != null && <span><Gamepad2 className="mr-1 inline h-3.5 w-3.5" />{formatNumber(game.communityUploads)} uploads</span>}
        </div>
      </div>
    </article>
  );
}

function FeaturedGame({ game, isOwnProfile }: { game: StudioGame; isOwnProfile: boolean }) {
  const title = game.catalogGameName || game.gameName || game.title || "Untitled game";
  return (
    <article className="overflow-hidden rounded-2xl border border-white/[.12] bg-[#151725]">
      <div className="grid lg:grid-cols-[minmax(0,1.02fr)_minmax(0,.98fr)]">
        <Link href={GamePath({ game })} className="group relative min-h-[250px] overflow-hidden bg-[#182039] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#b7ff18] sm:min-h-[320px]">
          <Artwork game={game} className="transition-transform duration-500 group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#151725] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#151725]" />
          {(game.isFeatured || game.isPrimary) && <span className="absolute left-4 top-4 rounded-md bg-[#b7ff18] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#07100a]">Featured game</span>}
        </Link>
        <div className="flex flex-col justify-center p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#b7ff18]">
            <span>{formatStatus(game.releaseStatus)}</span>
            {game.releaseDate && <><span className="text-white/20">•</span><span>{new Date(game.releaseDate).getFullYear()}</span></>}
          </div>
          <h3 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h3>
          {(game.shortDescription || game.fullDescription) && <p className="mt-3 max-w-xl text-sm leading-6 text-white/62">{game.shortDescription || game.fullDescription}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {game.genres?.map((genre) => <MetaPill key={genre}>{genre}</MetaPill>)}
            {game.platforms?.map((platform) => <MetaPill key={platform}>{platform}</MetaPill>)}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 border-y border-white/10 py-4 sm:grid-cols-3">
            <MiniStat label="Followers" value={game.followerCount} icon={<Users className="h-3.5 w-3.5" />} />
            <MiniStat label="Uploads" value={game.communityUploads} icon={<Gamepad2 className="h-3.5 w-3.5" />} />
            <MiniStat label="Views" value={game.views} icon={<Eye className="h-3.5 w-3.5" />} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={GamePath({ game })} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#b7ff18] px-4 text-xs font-black text-[#07100a] hover:brightness-110">View Game</Link>
            <StoreLinks game={game} compact />
            {isOwnProfile && <Link href={`/game-dashboard?tab=game-profile&gameId=${game.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#b7ff18]/35 px-4 text-xs font-bold text-[#b7ff18] hover:bg-[#b7ff18]/10"><SlidersHorizontal className="h-3.5 w-3.5" /> Manage Game</Link>}
          </div>
        </div>
      </div>
    </article>
  );
}

function MiniStat({ label, value, icon }: { label: string; value?: number | null; icon: ReactNode }) {
  return <div><div className="flex items-center gap-1.5 text-[#b7ff18]">{icon}<span className="text-sm font-black text-white">{formatNumber(value)}</span></div><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/35">{label}</p></div>;
}

function LinkItem({ label, href, icon }: { label: string; href?: string | null; icon?: ReactNode }) {
  const safe = validHref(href);
  if (!safe) return null;
  return <a href={safe} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-bold text-white/55 transition-colors hover:border-[#b7ff18]/50 hover:text-[#b7ff18]">{icon}{label}<ExternalLink className="h-3 w-3 opacity-45" /></a>;
}

export default function IndieDeveloperProfile({ profile, isOwnProfile }: Props) {
  const { user: currentUser } = useAuth();
  const [shared, setShared] = useState(false);
  const { data: gamesData, isLoading: gamesLoading, error: gamesError } = useQuery<{ games?: StudioGame[]; studio?: StudioLinks }>({
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
  const primaryGame = games.find((game) => game.isFeatured || game.isPrimary) || games[0];
  const displayName = profile.displayName || profile.username;
  const studio = gamesData?.studio || primaryGame || {};
  const customBanner = profile.bannerUrl && profile.bannerUrl !== DEFAULT_BANNER_URL ? profile.bannerUrl : null;
  const bannerImage = customBanner || primaryGame?.headerImageUrl || primaryGame?.capsuleImageUrl || primaryGame?.catalogImageUrl;
  const website = studio.studioWebsite || studio.websiteUrl || (profile as any).websiteUrl;
  const location = (profile as any).location || (profile as any).city || (studio as any).studioCountry;
  const social = [
    { label: "Discord", href: studio.discordUrl },
    { label: "X", href: studio.twitterUrl || ((profile as any).twitterUsername ? `https://x.com/${(profile as any).twitterUsername}` : null) },
    { label: "YouTube", href: studio.youtubeUrl || ((profile as any).youtubeUsername ? `https://youtube.com/@${(profile as any).youtubeUsername}` : null) },
    { label: "Steam developer page", href: studio.steamUrl },
  ];
  const publishedGames = games.length;
  const communityUploads = games.reduce((total, game) => total + Number(game.communityUploads || 0), 0);
  const totalViews = games.reduce((total, game) => total + Number(game.views || 0), 0);
  const followers = (profile as any)._count?.followers;
  const bio = profile.bio?.trim() || "";
  const hasStudioBio = !!bio && bio.toLowerCase() !== "love this game";
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
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#0F101B] pb-20 text-white">
      <div className="mx-auto max-w-[1200px]">
        <section className="relative px-4 pt-4 sm:px-6 lg:px-0 lg:pt-6">
          <div className="relative h-[180px] overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#101c38,#1e3b47)] sm:h-[235px] lg:h-[280px]">
            <SafeSignedImage
              url={bannerImage}
              alt=""
              loading="eager"
              className="h-full w-full object-cover opacity-80"
              fallback={<div className="h-full w-full bg-[radial-gradient(circle_at_75%_25%,rgba(183,255,24,.16),transparent_32%),linear-gradient(135deg,#101c38,#1e3b47)]" />}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F101B] via-[#0F101B]/20 to-transparent" />
          </div>
          <div className="relative -mt-14 flex flex-col gap-5 px-2 sm:-mt-16 sm:flex-row sm:items-end sm:px-5 lg:px-6">
            <Avatar url={profile.avatarUrl} name={displayName} className="h-28 w-28 shrink-0 rounded-2xl border-4 border-[#0F101B] text-3xl shadow-xl sm:h-32 sm:w-32" />
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{displayName}</h1>
                <BadgeCheck className="h-6 w-6 text-[#b7ff18]" aria-label="Verified indie developer" />
              </div>
              <p className="mt-1 text-sm font-semibold text-white/48">@{profile.username} <span className="mx-2 text-white/20">/</span> Developer / Studio</p>
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              {!isOwnProfile && <button type="button" onClick={() => currentUser ? followMutation.mutate() : window.location.assign("/auth")} disabled={followMutation.isPending} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#b7ff18] px-4 text-sm font-black text-[#07100a] hover:brightness-110 disabled:opacity-60"><UserPlus className="h-4 w-4" />{following ? "Following" : requested ? "Requested" : "Follow"}</button>}
              <button type="button" onClick={share} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 bg-[#151725] px-4 text-sm font-bold hover:border-white/35">{shared ? <Check className="h-4 w-4 text-[#b7ff18]" /> : <Share2 className="h-4 w-4" />} {shared ? "Copied" : "Share"}</button>
              {isOwnProfile && <><Link href="/game-dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#b7ff18]/40 px-4 text-sm font-bold text-[#b7ff18] hover:bg-[#b7ff18]/10"><SlidersHorizontal className="h-4 w-4" /> Manage games</Link><EditProfileModal profile={profile} trigger={<button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold hover:border-white/35"><Pencil className="h-4 w-4" /> Edit profile</button>} /></>}
            </div>
          </div>
        </section>

        <div className="grid gap-8 px-4 py-9 sm:px-6 lg:grid-cols-[minmax(0,1fr)_275px] lg:px-0 lg:py-12">
          <div className="min-w-0">
            {hasStudioBio ? <section><p className="text-xs font-black uppercase tracking-[.2em] text-[#b7ff18]">About the Studio</p><p className="mt-2 max-w-2xl text-base leading-7 text-white/72">{bio}</p></section> : isOwnProfile ? <section className="rounded-xl border border-dashed border-[#b7ff18]/35 bg-[#b7ff18]/[.04] p-5"><p className="text-sm font-bold text-white">Add a short introduction</p><p className="mt-1 text-sm leading-6 text-white/50">Tell players what your studio makes. It will appear here on your public studio profile.</p><EditProfileModal profile={profile} trigger={<button type="button" className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#b7ff18] px-3 text-xs font-black text-[#07100a]"><Pencil className="h-3.5 w-3.5" /> Edit profile</button>} /></section> : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <LinkItem label="Website" href={website} icon={<Globe2 className="h-3.5 w-3.5" />} />
              {location && <span className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-bold text-white/55"><MapPin className="h-3.5 w-3.5" /> {location}</span>}
              {social.map((item) => <LinkItem key={item.label} label={item.label} href={item.href} />)}
            </div>

            <section className="mt-12">
              <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
                <div><p className="text-xs font-black uppercase tracking-[.2em] text-[#b7ff18]">Studio portfolio</p><h2 className="mt-2 text-2xl font-black">Games <span className="text-white/35">({publishedGames})</span></h2></div>
              </div>
              {gamesLoading ? <div className="mt-6 grid gap-5 md:grid-cols-2">{[1, 2].map((n) => <div key={n} className="aspect-[16/10] animate-pulse rounded-2xl bg-white/[.06]" />)}</div> : gamesError ? <p className="mt-6 rounded-xl border border-red-400/20 p-5 text-sm text-red-200/75">Games could not be loaded. Please try again later.</p> : games.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-10 text-center"><p className="font-bold text-white/65">{isOwnProfile ? "Your studio has no published games yet." : "This studio has no published games yet."}</p>{isOwnProfile && <Link href="/game-dashboard" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-[#b7ff18] px-4 text-xs font-black text-[#07100a]">Add your first game</Link>}</div> : games.length === 1 ? <div className="mt-6"><FeaturedGame game={games[0]} isOwnProfile={isOwnProfile} /></div> : <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{games.map((game) => <GameCard key={game.id} game={game} />)}</div>}
            </section>
          </div>
          <aside className="h-fit lg:border-l lg:border-white/10 lg:pl-7">
            <p className="text-xs font-black uppercase tracking-[.2em] text-white/40">Studio at a glance</p>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-1">
              <Stat label={publishedGames === 1 ? "Published game" : "Published games"} value={publishedGames} icon={<Gamepad2 className="h-4 w-4" />} />
              <Stat label="Developer followers" value={followers} icon={<Users className="h-4 w-4" />} />
              <Stat label="Community uploads" value={communityUploads} icon={<UploadIcon />} />
              <Stat label="Total views" value={totalViews} icon={<Eye className="h-4 w-4" />} />
            </div>
            {primaryGame?.releaseDate && <div className="mt-5 flex items-center gap-2 text-xs text-white/45"><CalendarDays className="h-4 w-4 text-[#b7ff18]" /> Next release: {new Date(primaryGame.releaseDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</div>}
          </aside>
        </div>
      </div>
    </main>
  );
}

function UploadIcon() {
  return <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-current text-[9px] font-black">↑</span>;
}

function Stat({ label, value, icon }: { label: string; value: unknown; icon?: ReactNode }) {
  return <div className="rounded-xl border border-white/10 bg-[#151725] p-4"><div className="flex items-center gap-2 text-[#b7ff18]">{icon}<span className="text-2xl font-black text-white">{formatNumber(value)}</span></div><p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-white/40">{label}</p></div>;
}