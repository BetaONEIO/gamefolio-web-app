import { Link } from "wouter";
import { ExternalLink, Globe, Gamepad2, Users } from "lucide-react";
import { SiEpicgames, SiItchdotio, SiSteam } from "react-icons/si";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { GAME_PLATFORM_LINKS, GAME_SOCIAL_LINKS } from "@/lib/indie-game-links";

type CampaignGameDetailsProps = {
  campaign: Record<string, any>;
};

const surface = "border border-white/[0.09] bg-white/[0.035] p-5 sm:p-6";
const label = "text-[10px] font-black uppercase tracking-[0.15em] text-white/40";

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => !!text(item)).map(item => item.trim()) : [];
}

function safeLink(value: unknown): string | null {
  const url = text(value);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}

export function CampaignGameDetails({ campaign }: CampaignGameDetailsProps) {
  const hasGamePage = Boolean(campaign.game_id);
  const description = hasGamePage
    ? text(campaign.game_profile_full_description) || text(campaign.game_profile_short_description)
    : null;
  const genres = hasGamePage ? strings(campaign.game_profile_genres) : [];
  const features = hasGamePage ? strings(campaign.game_profile_key_features) : [];
  const platforms = hasGamePage ? strings(campaign.game_profile_platforms) : [];

  const storeLinks = [
    { name: "Steam", url: campaign.game_profile_steam_url, icon: SiSteam },
    { name: "Epic Games", url: campaign.game_profile_epic_url, icon: SiEpicgames },
    { name: "itch.io", url: campaign.game_profile_itch_url, icon: SiItchdotio },
    { name: "Official website", url: campaign.game_profile_website_url, icon: Globe },
  ].flatMap(store => {
    const href = hasGamePage ? safeLink(store.url) : null;
    return href ? [{ ...store, href }] : [];
  });

  const socialLinks = GAME_SOCIAL_LINKS.flatMap(({ field, label: name, icon: Icon }) => {
    const key = `game_profile_${field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)}`;
    const href = hasGamePage ? safeLink(campaign[key]) : null;
    return href ? [{ name, href, Icon }] : [];
  });

  const developerUsername = hasGamePage ? text(campaign.game_profile_developer_username) : null;
  const developerName = text(campaign.game_profile_studio_name)
    || text(campaign.game_profile_developer_display_name)
    || developerUsername;
  const { signedUrl: developerAvatar } = useSignedUrl(
    hasGamePage ? text(campaign.game_profile_developer_avatar_url) : null,
  );

  return (
    <section className="grid gap-4 border-b border-white/[0.12] py-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,34%)]" aria-label="Game page details">
      <div className={surface}>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#B8FF1B]">About the game</p>
        {description ? (
          <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-white/70">{description}</p>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-white/45">
            {hasGamePage
              ? "No description has been added for this linked game yet."
              : "This campaign is not linked to a game page yet. Game details will appear here when it is linked."}
          </p>
        )}
        {genres.length > 0 && (
          <div className="mt-5">
            <p className={label}>Genres</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {genres.map(genre => <span key={genre} className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-white/75">{genre}</span>)}
            </div>
          </div>
        )}
        {features.length > 0 && (
          <div className="mt-5">
            <p className={label}>Key features</p>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              {features.map(feature => (
                <li key={feature} className="flex items-start gap-2.5">
                  <img src="/attached_assets/gamefolio-logo-green.png" alt="" className="mt-0.5 h-4 w-4 shrink-0 object-contain" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {(platforms.length > 0 || socialLinks.length > 0 || storeLinks.length > 0 || developerUsername) && (
        <div className="space-y-4">
          {platforms.length > 0 && (
            <div className={surface}>
              <p className={label}>Platforms</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {platforms.map(platform => {
                  const item = GAME_PLATFORM_LINKS[platform.toLowerCase()];
                  const Icon = item?.icon || Gamepad2;
                  return <span key={platform} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-white/75"><Icon size={13} />{item?.label || platform}</span>;
                })}
              </div>
            </div>
          )}
          {socialLinks.length > 0 && (
            <div className={surface}>
              <p className={label}>Connect with us</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {socialLinks.map(({ name, href, Icon }) => (
                  <a key={name} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0A0A10]/70 px-3 py-1.5 text-xs font-semibold text-white/75 transition hover:border-[#B8FF1B]/40 hover:text-white">
                    <Icon size={14} />{name}
                  </a>
                ))}
              </div>
            </div>
          )}
          {storeLinks.length > 0 && (
            <div className={surface}>
              <p className={label}>Where to play</p>
              <div className="mt-3 space-y-2">
                {storeLinks.map(({ name, href, icon: Icon }) => (
                  <a key={name} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 border border-white/10 bg-[#0A0A10]/40 px-3 py-2.5 text-sm font-bold text-white/80 transition hover:border-white/25">
                    <Icon size={17} />{name}<ExternalLink size={13} className="ml-auto text-white/40" />
                  </a>
                ))}
              </div>
            </div>
          )}
          {developerUsername && (
            <div className={surface}>
              <p className={label}>Developer</p>
              <Link href={`/profile/${encodeURIComponent(developerUsername)}`} className="mt-3 flex items-center gap-3 text-sm text-white/80 hover:text-white">
                {developerAvatar
                  ? <img src={developerAvatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                  : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10"><Users size={17} /></span>}
                <span className="min-w-0">
                  <span className="block truncate font-bold">{developerName}</span>
                  <span className="block truncate text-xs text-white/45">@{developerUsername}</span>
                </span>
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}