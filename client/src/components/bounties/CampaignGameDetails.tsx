import { Link } from "wouter";
import { ExternalLink, Gamepad2, Users } from "lucide-react";
import { SiEpicgames, SiItchdotio, SiSteam } from "react-icons/si";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { GAME_PLATFORM_LINKS } from "@/lib/indie-game-links";

type CampaignGameDetailsProps = {
  campaign: Record<string, any>;
};

const label = "text-[10px] font-black uppercase tracking-[0.15em] text-white/45";

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
  const genres = hasGamePage
    ? Array.from(new Set([...strings(campaign.game_profile_genres), ...strings(campaign.game_profile_tags)]))
    : [];
  const features = hasGamePage ? strings(campaign.game_profile_key_features) : [];
  const platforms = hasGamePage ? strings(campaign.game_profile_platforms) : [];

  const storeLinks = [
    { name: "Steam", url: campaign.game_profile_steam_url, icon: SiSteam },
    { name: "Epic Games", url: campaign.game_profile_epic_url, icon: SiEpicgames },
    { name: "itch.io", url: campaign.game_profile_itch_url, icon: SiItchdotio },
  ].flatMap(store => {
    const href = hasGamePage ? safeLink(store.url) : null;
    return href ? [{ ...store, href }] : [];
  });

  const developerUsername = hasGamePage ? text(campaign.game_profile_developer_username) : null;
  const developerName = hasGamePage && (text(campaign.game_profile_studio_name)
    || text(campaign.game_profile_developer_display_name)
    || developerUsername);
  const { signedUrl: developerAvatar } = useSignedUrl(
    hasGamePage ? text(campaign.game_profile_developer_avatar_url) : null,
  );

  if (!description && !genres.length && !features.length && !platforms.length &&
      !storeLinks.length && !developerUsername) return null;

  return (
    <section className="border-b border-white/[0.12] py-8 sm:py-10" aria-label="About the game">
      <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-[#B8FF1B]">About the game</h2>
      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(240px,30%)] lg:gap-12">
        <div className="space-y-7">
          {description && <p className="max-w-3xl whitespace-pre-line text-sm leading-7 text-white/75 sm:text-[15px]">{description}</p>}
          {genres.length > 0 && (
            <div>
              <p className={label}>Genres &amp; tags</p>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
                {genres.map(genre => <span key={genre} className="text-xs font-semibold text-white/70">{genre}</span>)}
              </div>
            </div>
          )}
          {features.length > 0 && (
            <div>
              <p className={label}>Key features</p>
              <ul className="mt-3 grid gap-x-8 gap-y-2 text-sm text-white/70 sm:grid-cols-2">
                {features.map(feature => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 bg-[#B8FF1B]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {(platforms.length > 0 || storeLinks.length > 0 || developerUsername) && (
          <div className="space-y-6 border-t border-white/10 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          {platforms.length > 0 && (
            <div>
              <p className={label}>Platforms</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {platforms.map(platform => {
                  const item = GAME_PLATFORM_LINKS[platform.toLowerCase()];
                  const Icon = item?.icon || Gamepad2;
                  return <span key={platform} className="inline-flex items-center gap-1.5 text-xs text-white/75"><Icon size={14} />{item?.label || platform}</span>;
                })}
              </div>
            </div>
          )}
          {storeLinks.length > 0 && (
            <div>
              <p className={label}>Where to play</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
                {storeLinks.map(({ name, href, icon: Icon }) => (
                  <a key={name} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-white/80 transition hover:text-[#B8FF1B]">
                    <Icon size={16} />{name}<ExternalLink size={12} className="text-white/40" />
                  </a>
                ))}
              </div>
            </div>
          )}
          {developerUsername && (
            <div>
              <p className={label}>Developer</p>
              <Link href={`/profile/${encodeURIComponent(developerUsername)}`} className="mt-3 inline-flex items-center gap-3 text-sm text-white/80 hover:text-white">
                {developerAvatar
                  ? <img src={developerAvatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                  : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10"><Users size={16} /></span>}
                <span className="min-w-0">
                  <span className="block truncate font-bold">{developerName}</span>
                </span>
              </Link>
            </div>
          )}
          </div>
        )}
      </div>
    </section>
  );
}