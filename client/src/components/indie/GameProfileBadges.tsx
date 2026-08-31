import type { ElementType } from "react";
import {
  SiAndroid,
  SiDiscord,
  SiFacebook,
  SiInstagram,
  SiIos,
  SiLinux,
  SiMacos,
  SiNintendoswitch,
  SiPlaystation,
  SiSteam,
  SiEpicgames,
  SiTiktok,
  SiTwitch,
  SiYoutube,
} from "react-icons/si";
import { FaWindows, FaXbox, FaXTwitter } from "react-icons/fa6";
import { Check, Gamepad2 } from "lucide-react";
import { normalizeGameSocialUrl } from "@shared/store-urls";

export type GameSocialField =
  | "twitterUrl"
  | "discordUrl"
  | "youtubeUrl"
  | "twitchUrl"
  | "instagramUrl"
  | "facebookUrl"
  | "tiktokUrl";

export type GameSocialLinks = Partial<Record<GameSocialField, string | null | undefined>>;

export const GAME_SOCIAL_FIELDS: ReadonlyArray<{
  field: GameSocialField;
  label: string;
  Icon: ElementType;
  color: string;
  background: string;
  border: string;
  placeholder: string;
}> = [
  {
    field: "twitterUrl",
    label: "X",
    Icon: FaXTwitter,
    color: "#ffffff",
    background: "#000000",
    border: "rgba(255,255,255,0.22)",
    placeholder: "https://x.com/your-game",
  },
  {
    field: "discordUrl",
    label: "Discord",
    Icon: SiDiscord,
    color: "#ffffff",
    background: "#5865F2",
    border: "#5865F2",
    placeholder: "https://discord.gg/your-server",
  },
  {
    field: "youtubeUrl",
    label: "YouTube",
    Icon: SiYoutube,
    color: "#ffffff",
    background: "#FF0000",
    border: "#FF0000",
    placeholder: "https://youtube.com/@your-game",
  },
  {
    field: "twitchUrl",
    label: "Twitch",
    Icon: SiTwitch,
    color: "#ffffff",
    background: "#9146FF",
    border: "#9146FF",
    placeholder: "https://twitch.tv/your-game",
  },
  {
    field: "instagramUrl",
    label: "Instagram",
    Icon: SiInstagram,
    color: "#ffffff",
    background: "linear-gradient(135deg, #833AB4 0%, #E1306C 52%, #FCAF45 100%)",
    border: "#E1306C",
    placeholder: "https://instagram.com/your-game",
  },
  {
    field: "facebookUrl",
    label: "Facebook",
    Icon: SiFacebook,
    color: "#ffffff",
    background: "#1877F2",
    border: "#1877F2",
    placeholder: "https://facebook.com/your-game",
  },
  {
    field: "tiktokUrl",
    label: "TikTok",
    Icon: SiTiktok,
    color: "#ffffff",
    background: "#111111",
    border: "#25F4EE",
    placeholder: "https://tiktok.com/@your-game",
  },
];

export const GAME_PLATFORM_FIELDS: ReadonlyArray<{
  id: string;
  label: string;
  Icon: ElementType;
}> = [
  { id: "windows", label: "Windows", Icon: FaWindows },
  { id: "mac", label: "macOS", Icon: SiMacos },
  { id: "linux", label: "Linux", Icon: SiLinux },
  { id: "ps5", label: "PlayStation", Icon: SiPlaystation },
  { id: "xbox", label: "Xbox", Icon: FaXbox },
  { id: "switch", label: "Nintendo Switch", Icon: SiNintendoswitch },
  { id: "ios", label: "iOS", Icon: SiIos },
  { id: "android", label: "Android", Icon: SiAndroid },
];

const PLATFORM_ALIASES: Record<string, { label: string; Icon: ElementType }> = {
  windows: { label: "Windows", Icon: FaWindows },
  win: { label: "Windows", Icon: FaWindows },
  pc: { label: "PC", Icon: FaWindows },
  mac: { label: "macOS", Icon: SiMacos },
  macos: { label: "macOS", Icon: SiMacos },
  osx: { label: "macOS", Icon: SiMacos },
  linux: { label: "Linux", Icon: SiLinux },
  ps5: { label: "PlayStation", Icon: SiPlaystation },
  ps4: { label: "PlayStation", Icon: SiPlaystation },
  playstation: { label: "PlayStation", Icon: SiPlaystation },
  xbox: { label: "Xbox", Icon: FaXbox },
  xboxone: { label: "Xbox", Icon: FaXbox },
  switch: { label: "Nintendo Switch", Icon: SiNintendoswitch },
  nintendo: { label: "Nintendo Switch", Icon: SiNintendoswitch },
  ios: { label: "iOS", Icon: SiIos },
  android: { label: "Android", Icon: SiAndroid },
  mobile: { label: "Mobile", Icon: SiAndroid },
  steam: { label: "Steam", Icon: SiSteam },
  epic: { label: "Epic Games", Icon: SiEpicgames },
  epicgames: { label: "Epic Games", Icon: SiEpicgames },
};

export function GamePlatformBadges({ platforms }: { platforms?: string[] | null }) {
  const values = platforms ?? [];
  if (values.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Supported platforms">
      {values.map((platform, index) => {
        const key = String(platform).toLowerCase().replace(/[\s_-]+/g, "");
        const config = PLATFORM_ALIASES[key] ?? {
          label: String(platform).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          Icon: Gamepad2,
        };
        const Icon = config.Icon;
        return (
          <span
            key={`${key}-${index}`}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white/85"
            style={{
              background: "#0F101B",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            <Icon className="h-3.5 w-3.5 text-white/75" aria-hidden="true" />
            {config.label}
          </span>
        );
      })}
    </div>
  );
}

export function GamefolioPlatformButton({
  Icon,
  label,
  href,
  onClick,
  connected = true,
  className = "",
}: {
  Icon: ElementType;
  label: string;
  href?: string;
  onClick?: () => void;
  connected?: boolean;
  className?: string;
}) {
  const content = (
    <>
      <Icon className="h-3.5 w-3.5 shrink-0 text-white/85 transition-colors group-hover:text-[#B7FF18]" aria-hidden="true" />
      <span>{label}</span>
      {connected && <Check className="ml-0.5 h-3 w-3 text-[#B7FF18]" aria-hidden="true" />}
    </>
  );
  const sharedClassName = `group inline-flex items-center gap-1.5 rounded-lg border border-white/[0.14] bg-[#0F101B] px-3 py-1.5 text-[11px] font-bold text-white/85 transition-colors hover:border-[#B7FF18]/70 hover:bg-[#171A29] hover:text-white ${className}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={`Open ${label}`} className={sharedClassName}>
        {content}
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${label}`}
      className={sharedClassName}
    >
      {content}
    </a>
  );
}

export function GameSocialBadges({
  links,
  onOpen,
  className = "",
}: {
  links: GameSocialLinks;
  onOpen?: (url: string) => void;
  className?: string;
}) {
  const connected = GAME_SOCIAL_FIELDS.filter(({ field }) => Boolean(links[field]));
  if (connected.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {connected.map(({ field, label, Icon }) => {
        const url = normalizeGameSocialUrl(links[field]);

        if (onOpen) {
          return (
            <GamefolioPlatformButton
              key={field}
              Icon={Icon}
              label={label}
              onClick={() => onOpen(url)}
            >
            </GamefolioPlatformButton>
          );
        }

        return (
          <GamefolioPlatformButton
            key={field}
            Icon={Icon}
            label={label}
            href={url}
          />
        );
      })}
    </div>
  );
}