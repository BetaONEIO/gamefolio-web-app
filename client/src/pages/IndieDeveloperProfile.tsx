import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarDays,
  ExternalLink,
  Eye,
  Gamepad2,
  Globe2,
  ImageOff,
  MapPin,
  MessageSquareText,
  MousePointerClick,
  Pencil,
  SlidersHorizontal,
  Store,
  UserPlus,
  Users,
} from "lucide-react";
import { getQueryFn, queryClient } from "@/lib/queryClient";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { useAuth } from "@/hooks/use-auth";
import { publicGamePath } from "@/lib/game-routes";
import { BannerLightbox, useBannerLightbox } from "@/components/ui/banner-lightbox";
import { ProfilePictureLightbox, useProfilePictureLightbox } from "@/components/ui/profile-picture-lightbox";
import { GamefolioShareDialog } from "@/components/profile/GamefolioShareDialog";
import ShareLaunchIcon from "@/components/ui/ShareIcon";
import type { UserWithStats } from "@shared/schema";
import { DEFAULT_PROFILE_THEME, resolveProfileTheme } from "@shared/profile-theme";

const DEFAULT_BANNER_URL = "/api/static/telegram-cloud-photo-size-4-5929334272504744521-y_1749637964973.jpg";

const PROFILE_FONTS: Record<string, string> = {
  default: "system-ui, sans-serif",
  inter: "'Inter', sans-serif",
  roboto: "'Roboto', sans-serif",
  poppins: "'Poppins', sans-serif",
  montserrat: "'Montserrat', sans-serif",
  oswald: "'Oswald', sans-serif",
  playfair: "'Playfair Display', serif",
  raleway: "'Raleway', sans-serif",
  "space-grotesk": "'Space Grotesk', sans-serif",
  orbitron: "'Orbitron', sans-serif",
  "press-start": "'Press Start 2P', cursive",
  "russo-one": "'Russo One', sans-serif",
  "bungee-shade": "'Bungee Shade', cursive",
  nabla: "'Nabla', cursive",
  silkscreen: "'Silkscreen', cursive",
  "rubik-bubbles": "'Rubik Bubbles', cursive",
  monoton: "'Monoton', cursive",
  creepster: "'Creepster', cursive",
  "permanent-marker": "'Permanent Marker', cursive",
  bangers: "'Bangers', cursive",
  fredoka: "'Fredoka', sans-serif",
  righteous: "'Righteous', cursive",
  "bungee-inline": "'Bungee Inline', cursive",
  notable: "'Notable', sans-serif",
  "bungee-spice": "'Bungee Spice', cursive",
  honk: "'Honk', system-ui",
};

const FONT_EFFECTS: Record<string, string> = {
  none: "none",
  "drop-shadow": "2px 2px 4px rgba(0,0,0,.8)",
  "hard-shadow": "3px 3px 0 rgba(0,0,0,.9)",
  "neon-green": "0 0 7px #00ff00, 0 0 20px #00ff00",
  "neon-blue": "0 0 7px #00bfff, 0 0 20px #00bfff",
  "neon-pink": "0 0 7px #ff00de, 0 0 20px #ff00de",
  "neon-red": "0 0 7px #ff0000, 0 0 20px #ff1a1a",
  "neon-purple": "0 0 7px #bf00ff, 0 0 20px #bf00ff",
  "neon-yellow": "0 0 7px #ffff00, 0 0 20px #ffff00",
  fire: "0 0 4px #ff4500, 0 0 19px #ff6600",
  ice: "0 0 5px #e0f7ff, 0 0 20px #7ec8e3",
  gold: "0 0 5px #ffd700, 0 0 20px #ffaa00",
  retro: "2px 2px 0 #ff0000, -2px -2px 0 #00bfff",
  "outline-white": "-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff",
  "outline-black": "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
  rainbow: "0 0 5px #f00, 0 0 12px #0f0, 0 0 20px #00f",
};

const FONT_ANIMATIONS: Record<string, string> = {
  bounce: "animate-font-bounce",
  shake: "animate-font-shake",
  pulse: "animate-font-pulse",
  float: "animate-font-float",
  wave: "animate-font-wave",
  flicker: "animate-font-flicker",
  rubberband: "animate-font-rubberband",
  jello: "animate-font-jello",
  swing: "animate-font-swing",
};

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
  pageViews?: number | null;
  contentViews?: number | null;
  storeClicks?: number | null;
  communityPosts?: number | null;
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
      fallback={<div className={`studio-accent-bg studio-button-text flex items-center justify-center font-black ${className}`}>{name.slice(0, 2).toUpperCase()}</div>}
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
      fallback={<div className="studio-surface flex h-full w-full items-center justify-center"><ImageOff className="studio-muted h-7 w-7" /></div>}
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
  return <span className="studio-border studio-muted rounded-full border bg-white/[.035] px-2.5 py-1 text-[11px] font-semibold">{children}</span>;
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
        <a key={link.label} href={link.href!} target="_blank" rel="noreferrer" className="studio-border studio-muted studio-hover-accent inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors">
          <Store className="h-3.5 w-3.5" /> {link.label} <ExternalLink className="h-3 w-3 opacity-50" />
        </a>
      ))}
    </div>
  );
}

function GameCard({ game }: { game: StudioGame }) {
  const title = game.catalogGameName || game.gameName || game.title || "Untitled game";
  return (
    <article className="studio-surface studio-border studio-hover-accent-border group overflow-hidden rounded-2xl border transition-colors">
      <Link href={GamePath({ game })} className="studio-focus-accent block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset">
        <div className="relative aspect-[16/8] overflow-hidden bg-[#182039]">
          <Artwork game={game} className="transition-transform duration-300 group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#151725] via-transparent to-transparent" />
          {(game.isFeatured || game.isPrimary) && <span className="studio-accent-bg studio-button-text absolute left-3 top-3 rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-widest">Featured</span>}
        </div>
      </Link>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <Link href={GamePath({ game })} className="studio-text studio-hover-accent text-lg font-black tracking-tight">{title}</Link>
          <span className="studio-border studio-muted shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide">{formatStatus(game.releaseStatus)}</span>
        </div>
        {(game.shortDescription || game.fullDescription) && <p className="studio-muted mt-2 line-clamp-2 text-sm leading-6">{game.shortDescription || game.fullDescription}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {game.genres?.slice(0, 2).map((genre) => <MetaPill key={genre}>{genre}</MetaPill>)}
          {game.platforms?.slice(0, 2).map((platform) => <MetaPill key={platform}>{platform}</MetaPill>)}
        </div>
        <GamePerformanceStats game={game} />
      </div>
    </article>
  );
}

function FeaturedGame({ game, isOwnProfile }: { game: StudioGame; isOwnProfile: boolean }) {
  const title = game.catalogGameName || game.gameName || game.title || "Untitled game";
  return (
    <article className="studio-surface studio-border overflow-hidden rounded-2xl border">
      <div className="grid lg:grid-cols-[minmax(0,1.02fr)_minmax(0,.98fr)]">
        <Link href={GamePath({ game })} className="studio-focus-accent group relative min-h-[250px] overflow-hidden bg-[#182039] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset sm:min-h-[320px]">
          <Artwork game={game} className="transition-transform duration-500 group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#151725] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#151725]" />
          {(game.isFeatured || game.isPrimary) && <span className="studio-accent-bg studio-button-text absolute left-4 top-4 rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-widest">Featured game</span>}
        </Link>
        <div className="flex flex-col justify-center p-6 sm:p-8">
          <div className="studio-accent-text flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[.16em]">
            <span>{formatStatus(game.releaseStatus)}</span>
            {game.releaseDate && <><span className="studio-muted">•</span><span>{new Date(game.releaseDate).getFullYear()}</span></>}
          </div>
          <h3 className="studio-text mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h3>
          {(game.shortDescription || game.fullDescription) && <p className="studio-muted mt-3 max-w-xl text-sm leading-6">{game.shortDescription || game.fullDescription}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {game.genres?.map((genre) => <MetaPill key={genre}>{genre}</MetaPill>)}
            {game.platforms?.map((platform) => <MetaPill key={platform}>{platform}</MetaPill>)}
          </div>
          <GamePerformanceStats game={game} />
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={GamePath({ game })} className="studio-accent-bg studio-button-text inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-xs font-black hover:brightness-110">View Game</Link>
            <StoreLinks game={game} compact />
            {isOwnProfile && <Link href={`/game-dashboard?tab=game-profile&gameId=${game.id}`} className="studio-accent-border studio-accent-text studio-hover-accent-bg inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 text-xs font-bold"><SlidersHorizontal className="h-3.5 w-3.5" /> Manage Game</Link>}
          </div>
        </div>
      </div>
    </article>
  );
}

function MiniStat({ label, value, icon }: { label: string; value?: number | null; icon: ReactNode }) {
  return <div><div className="studio-accent-text flex items-center gap-1.5">{icon}<span className="studio-text text-sm font-black">{formatNumber(value)}</span></div><p className="studio-muted mt-1 text-[10px] font-bold uppercase tracking-wider">{label}</p></div>;
}

function GamePerformanceStats({ game }: { game: StudioGame }) {
  return (
    <div className="studio-border mt-6 grid grid-cols-2 gap-3 border-y py-4 sm:grid-cols-4">
      <MiniStat label="Page views" value={game.pageViews} icon={<BarChart3 className="h-3.5 w-3.5" />} />
      <MiniStat label="Content views" value={game.contentViews} icon={<Eye className="h-3.5 w-3.5" />} />
      <MiniStat label="Store clicks" value={game.storeClicks} icon={<MousePointerClick className="h-3.5 w-3.5" />} />
      <MiniStat label="Community posts" value={game.communityPosts} icon={<MessageSquareText className="h-3.5 w-3.5" />} />
    </div>
  );
}

function LinkItem({ label, href, icon }: { label: string; href?: string | null; icon?: ReactNode }) {
  const safe = validHref(href);
  if (!safe) return null;
  return <a href={safe} target="_blank" rel="noreferrer" className="studio-border studio-muted studio-hover-accent inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition-colors">{icon}{label}<ExternalLink className="h-3 w-3 opacity-45" /></a>;
}

export default function IndieDeveloperProfile({ profile, isOwnProfile }: Props) {
  const { user: currentUser } = useAuth();
  const { lightboxData, openLightbox, closeLightbox } = useProfilePictureLightbox();
  const { lightboxData: bannerLightboxData, openLightbox: openBannerLightbox, closeLightbox: closeBannerLightbox } = useBannerLightbox();
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
  const communityPosts = games.reduce((total, game) => total + Number(game.communityPosts || 0), 0);
  const totalContentViews = games.reduce((total, game) => total + Number(game.contentViews || 0), 0);
  const followers = (profile as any)._count?.followers;
  const bio = profile.bio?.trim() || "";
  const normalisedBio = bio.toLowerCase().replace(/[^a-z]/g, "");
  const hasStudioBio = !!bio && !["lovethisgame", "lovehtisgame"].includes(normalisedBio);
  const following = !!followStatus?.following;
  const requested = !!followStatus?.requested;
  const { signedUrl: signedBackgroundImage } = useSignedUrl((profile as any).profileBackgroundImageUrl || null);
  const resolvedTheme = resolveProfileTheme(profile as any);
  const themeDefinition = resolvedTheme.theme;
  const themeTokens = themeDefinition?.tokens;
  const isDefaultStudioTheme = !themeDefinition || themeDefinition.slug === "default";
  const accentColor = themeTokens?.accent || resolvedTheme.accentColor;
  const backgroundColor = themeTokens?.background || resolvedTheme.backgroundColor;
  const surfaceColor = isDefaultStudioTheme
    ? DEFAULT_PROFILE_THEME.cardColor
    : (themeTokens?.surface || resolvedTheme.cardColor);
  const savedFontColor = (profile as any).profileFontColor || "";
  const textColor = savedFontColor && savedFontColor.toUpperCase() !== "#FFFFFF"
    ? savedFontColor
    : themeTokens?.text || "#f8fafc";
  const mutedColor = themeTokens?.textSecondary || "#cbd5e1";
  const borderColor = themeTokens?.border || `${accentColor}55`;
  const backgroundImage = signedBackgroundImage || (profile as any).profileBackgroundImageUrl || "";
  const backgroundGradient = (profile as any).profileBackgroundGradient === false
    ? ""
    : (profile as any).profileBackgroundGradientCss || themeDefinition?.profileBackgroundGradientCss || "";
  const backgroundPattern = themeDefinition?.assets.decorativeOverlay || themeDefinition?.patternCss || "none";
  const backgroundAnimation = themeDefinition?.assets.backgroundAnimation || themeDefinition?.animation || "none";
  const profileFont = PROFILE_FONTS[(profile as any).profileFont || "default"] || themeDefinition?.fontFamily || PROFILE_FONTS.default;
  const profileFontEffect = FONT_EFFECTS[(profile as any).profileFontEffect || "none"] || "none";
  const profileFontAnimation = FONT_ANIMATIONS[(profile as any).profileFontAnimation || "none"] || "";
  const hideBanner = !!(profile as any).hideBanner;
  const statsGlassEffect = !!(profile as any).statsGlassEffect;
  const studioThemeStyle = {
    "--studio-background": backgroundColor,
    "--studio-surface": surfaceColor,
    "--studio-text": textColor,
    "--studio-muted": mutedColor,
    "--studio-accent": accentColor,
    "--studio-avatar-border": resolvedTheme.avatarBorderColor,
    "--studio-border": borderColor,
    "--studio-primary": resolvedTheme.primaryColor,
    "--studio-button-text": themeTokens?.buttonText || "#071018",
    "--profile-theme-background": backgroundColor,
    "--profile-theme-surface": surfaceColor,
    "--profile-theme-surface-secondary": themeTokens?.surfaceSecondary || resolvedTheme.primaryColor,
    "--profile-theme-primary": themeDefinition?.primaryColor || resolvedTheme.primaryColor,
    "--profile-theme-accent": accentColor,
    "--profile-theme-accent-secondary": themeTokens?.accentSecondary || accentColor,
    "--profile-theme-text": textColor,
    "--profile-theme-muted": mutedColor,
    "--profile-theme-border": borderColor,
    "--profile-theme-button-bg": themeTokens?.buttonBg || accentColor,
    "--profile-theme-button-text": themeTokens?.buttonText || "#071018",
    "--profile-theme-pattern": backgroundPattern,
    "--profile-theme-font": themeDefinition?.fontFamily || profileFont,
    fontFamily: profileFont,
  } as CSSProperties;
  const studioBackgroundStyle: CSSProperties = backgroundImage
    ? {
        backgroundColor,
        backgroundImage: `url("${backgroundImage}")`,
        backgroundPosition: `${(profile as any).profileBackgroundDesktopX || (profile as any).profileBackgroundPositionX || "50"}% ${(profile as any).profileBackgroundDesktopY || (profile as any).profileBackgroundPositionY || "50"}%`,
        backgroundSize: `${(profile as any).profileBackgroundDesktopZoom || (profile as any).profileBackgroundZoom || "100"}%`,
        backgroundRepeat: "no-repeat",
      }
    : { background: backgroundGradient || backgroundColor };

  const openStudioAvatar = () => {
    if (profile.avatarUrl) openLightbox(profile.avatarUrl, displayName, profile.username);
  };

  const openStudioBanner = () => {
    if (bannerImage) openBannerLightbox(bannerImage, displayName, profile.username);
  };

  return (
    <main
      className={`studio-profile-theme profile-theme-scope relative min-h-[100dvh] overflow-x-hidden pb-20 text-white ${statsGlassEffect ? "studio-stats-glass" : ""}`}
      data-profile-theme={isDefaultStudioTheme ? "default" : themeDefinition?.slug}
      data-profile-animation={backgroundAnimation}
      style={studioThemeStyle}
    >
      <div className="studio-theme-background fixed inset-0" style={{ ...studioBackgroundStyle, backgroundAttachment: "fixed" }} aria-hidden="true" />
      {!backgroundImage && !isDefaultStudioTheme && (
        <div
          className="profile-theme-atmosphere"
          style={{ backgroundImage: backgroundPattern }}
          aria-hidden="true"
        />
      )}
      <div className="relative z-[1] mx-auto max-w-[1200px]">
        <section className="relative px-4 pt-4 sm:px-6 lg:px-0 lg:pt-6">
          {!hideBanner && <div
            className={`studio-border relative h-[180px] overflow-hidden rounded-2xl border sm:h-[235px] lg:h-[280px] ${bannerImage ? "cursor-pointer transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset" : ""}`}
            style={{ background: `linear-gradient(135deg, ${resolvedTheme.primaryColor}, ${backgroundColor})` }}
            onClick={bannerImage ? openStudioBanner : undefined}
            onKeyDown={bannerImage ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openStudioBanner();
              }
            } : undefined}
            role={bannerImage ? "button" : undefined}
            tabIndex={bannerImage ? 0 : undefined}
            aria-label={bannerImage ? `View ${displayName}'s banner` : undefined}
          >
            <SafeSignedImage
              url={bannerImage}
              alt=""
              loading="eager"
              className="h-full w-full object-cover opacity-80"
               fallback={<div className="h-full w-full" style={{ background: `radial-gradient(circle at 75% 25%, ${accentColor}28, transparent 32%), linear-gradient(135deg, ${resolvedTheme.primaryColor}, ${backgroundColor})` }} />}
            />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${backgroundColor}, transparent 72%)` }} />
          </div>}
          <div className={`relative flex flex-col gap-5 px-2 sm:flex-row sm:items-end sm:px-5 lg:px-6 ${hideBanner ? "mt-8" : "-mt-14 sm:-mt-16"}`}>
            <button
              type="button"
              onClick={openStudioAvatar}
              disabled={!profile.avatarUrl}
              className={`studio-avatar-border shrink-0 overflow-hidden rounded-[1.25rem] border-4 p-0 text-3xl shadow-xl ${profile.avatarUrl ? "cursor-pointer transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2" : "cursor-default"} disabled:opacity-100`}
              aria-label={profile.avatarUrl ? `View ${displayName}'s profile picture` : undefined}
            >
              <Avatar url={profile.avatarUrl} name={displayName} className="h-28 w-28 rounded-[1rem] sm:h-32 sm:w-32" />
            </button>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className={`text-3xl font-black tracking-tight sm:text-5xl ${profileFontAnimation}`} style={{ textShadow: profileFontEffect }}>{displayName}</h1>
              </div>
              <p className="studio-muted mt-1 text-sm font-semibold">@{profile.username} <span className="mx-2 opacity-50">/</span> Developer / Studio</p>
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              {!isOwnProfile && <button type="button" onClick={() => currentUser ? followMutation.mutate() : window.location.assign("/auth")} disabled={followMutation.isPending} className="studio-accent-bg studio-button-text inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-black hover:brightness-110 disabled:opacity-60"><UserPlus className="h-4 w-4" />{following ? "Following" : requested ? "Requested" : "Follow"}</button>}
              <GamefolioShareDialog
                username={profile.username}
                userId={profile.id}
                userProfile={{
                  displayName: profile.displayName,
                  bio: profile.bio,
                  avatarUrl: profile.avatarUrl,
                  bannerUrl: bannerImage,
                  hideBanner,
                  accentColor,
                  backgroundColor,
                  cardColor: surfaceColor,
                  primaryColor: resolvedTheme.primaryColor,
                }}
                userStats={{
                  views: totalContentViews,
                  uploads: communityPosts,
                  followers,
                }}
                favoriteGames={games.slice(0, 5).map((game) => ({
                  id: game.id,
                  name: game.catalogGameName || game.gameName || game.title || "Untitled game",
                  imageUrl: game.headerImageUrl || game.capsuleImageUrl || game.catalogImageUrl,
                }))}
                trigger={<button type="button" className="studio-surface studio-border studio-text studio-hover-accent-border inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold"><ShareLaunchIcon size={16} /> Share</button>}
              />
              {isOwnProfile && <><Link href="/game-dashboard" className="studio-accent-border studio-accent-text studio-hover-accent-bg inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold"><SlidersHorizontal className="h-4 w-4" /> Manage games</Link><Link href="/settings/profile" className="studio-border studio-text studio-hover-accent-border inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold"><Pencil className="h-4 w-4" /> Edit profile</Link></>}
            </div>
          </div>
        </section>

        <div className="grid gap-8 px-4 py-9 sm:px-6 lg:grid-cols-[minmax(0,1fr)_275px] lg:px-0 lg:py-12">
          <div className="min-w-0">
            {hasStudioBio ? <section><p className="studio-accent-text text-xs font-black uppercase tracking-[.2em]">About the Studio</p><p className="studio-muted mt-2 max-w-2xl text-base leading-7">{bio}</p></section> : isOwnProfile ? <section className="studio-accent-border rounded-xl border border-dashed p-5"><p className="studio-text text-sm font-bold">Add a short introduction</p><p className="studio-muted mt-1 text-sm leading-6">Tell players what your studio makes. It will appear here on your public studio profile.</p><Link href="/settings/profile" className="studio-accent-bg studio-button-text mt-4 inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-black"><Pencil className="h-3.5 w-3.5" /> Edit profile</Link></section> : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <LinkItem label="Website" href={website} icon={<Globe2 className="h-3.5 w-3.5" />} />
              {location && <span className="studio-border studio-muted inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold"><MapPin className="h-3.5 w-3.5" /> {location}</span>}
              {social.map((item) => <LinkItem key={item.label} label={item.label} href={item.href} />)}
            </div>

            <section className="mt-12">
              <div className="studio-border flex items-end justify-between gap-4 border-b pb-4">
                <div><p className="studio-accent-text text-xs font-black uppercase tracking-[.2em]">Studio portfolio</p><h2 className="studio-text mt-2 text-2xl font-black">Games <span className="studio-muted">({publishedGames})</span></h2></div>
              </div>
              {gamesLoading ? <div className="mt-6 grid gap-5 md:grid-cols-2">{[1, 2].map((n) => <div key={n} className="studio-surface aspect-[16/10] animate-pulse rounded-2xl opacity-60" />)}</div> : gamesError ? <p className="mt-6 rounded-xl border border-red-400/40 p-5 text-sm text-red-500">Games could not be loaded. Please try again later.</p> : games.length === 0 ? <div className="studio-border mt-6 rounded-2xl border border-dashed p-10 text-center"><p className="studio-muted font-bold">{isOwnProfile ? "Your studio has no published games yet." : "This studio has no published games yet."}</p>{isOwnProfile && <Link href="/game-dashboard" className="studio-accent-bg studio-button-text mt-4 inline-flex min-h-10 items-center rounded-lg px-4 text-xs font-black">Add your first game</Link>}</div> : games.length === 1 ? <div className="mt-6"><FeaturedGame game={games[0]} isOwnProfile={isOwnProfile} /></div> : <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{games.map((game) => <GameCard key={game.id} game={game} />)}</div>}
            </section>
          </div>
          <aside className="studio-border h-fit lg:border-l lg:pl-7">
            <p className="studio-muted text-xs font-black uppercase tracking-[.2em]">Studio at a glance</p>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-1">
              <Stat label={publishedGames === 1 ? "Published game" : "Published games"} value={publishedGames} icon={<Gamepad2 className="h-4 w-4" />} />
              <Stat label="Developer followers" value={followers} icon={<Users className="h-4 w-4" />} />
               <Stat label="Community posts" value={communityPosts} icon={<MessageSquareText className="h-4 w-4" />} />
               <Stat label="Content views" value={totalContentViews} icon={<Eye className="h-4 w-4" />} />
            </div>
            {primaryGame?.releaseDate && <div className="studio-muted mt-5 flex items-center gap-2 text-xs"><CalendarDays className="studio-accent-text h-4 w-4" /> Next release: {new Date(primaryGame.releaseDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</div>}
          </aside>
        </div>
        <ProfilePictureLightbox
          isOpen={lightboxData.isOpen}
          onClose={closeLightbox}
          avatarUrl={lightboxData.avatarUrl}
          displayName={lightboxData.displayName}
          username={lightboxData.username}
        />
        <BannerLightbox
          isOpen={bannerLightboxData.isOpen}
          onClose={closeBannerLightbox}
          bannerUrl={bannerLightboxData.bannerUrl}
          displayName={bannerLightboxData.displayName}
          username={bannerLightboxData.username}
        />
      </div>
    </main>
  );
}

function Stat({ label, value, icon }: { label: string; value: unknown; icon?: ReactNode }) {
  return <div className="studio-stat-card studio-surface studio-border rounded-xl border p-4"><div className="studio-accent-text flex items-center gap-2">{icon}<span className="studio-text text-2xl font-black">{formatNumber(value)}</span></div><p className="studio-muted mt-1 text-[11px] font-bold uppercase tracking-wider">{label}</p></div>;
}