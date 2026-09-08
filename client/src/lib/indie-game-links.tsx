import type { IconType } from "react-icons";
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
  SiTiktok,
  SiTwitch,
  SiYoutube,
} from "react-icons/si";
import { FaWindows, FaXbox, FaXTwitter } from "react-icons/fa6";

export const GAME_PLATFORM_LINKS: Record<string, { label: string; icon: IconType }> = {
  windows: { label: "Windows", icon: FaWindows },
  pc: { label: "PC", icon: FaWindows },
  mac: { label: "macOS", icon: SiMacos },
  macos: { label: "macOS", icon: SiMacos },
  linux: { label: "Linux", icon: SiLinux },
  ps5: { label: "PlayStation", icon: SiPlaystation },
  playstation: { label: "PlayStation", icon: SiPlaystation },
  xbox: { label: "Xbox", icon: FaXbox },
  switch: { label: "Switch", icon: SiNintendoswitch },
  ios: { label: "iOS", icon: SiIos },
  android: { label: "Android", icon: SiAndroid },
};

export const GAME_SOCIAL_LINKS = [
  {
    field: "twitterUrl",
    label: "X",
    inputLabel: "Twitter / X URL",
    placeholder: "https://x.com/…",
    color: "#000000",
    borderColor: "#3A3D49",
    icon: FaXTwitter,
  },
  {
    field: "discordUrl",
    label: "Discord",
    inputLabel: "Discord Server URL",
    placeholder: "https://discord.gg/…",
    color: "#5865F2",
    borderColor: "#5865F2",
    icon: SiDiscord,
  },
  {
    field: "youtubeUrl",
    label: "YouTube",
    inputLabel: "YouTube Channel URL",
    placeholder: "https://youtube.com/@…",
    color: "#FF0000",
    borderColor: "#FF0000",
    icon: SiYoutube,
  },
  {
    field: "twitchUrl",
    label: "Twitch",
    inputLabel: "Twitch Channel URL",
    placeholder: "https://twitch.tv/…",
    color: "#9146FF",
    borderColor: "#9146FF",
    icon: SiTwitch,
  },
  {
    field: "instagramUrl",
    label: "Instagram",
    inputLabel: "Instagram Profile URL",
    placeholder: "https://instagram.com/…",
    color: "#E1306C",
    borderColor: "#E1306C",
    icon: SiInstagram,
  },
  {
    field: "facebookUrl",
    label: "Facebook",
    inputLabel: "Facebook Page URL",
    placeholder: "https://facebook.com/…",
    color: "#1877F2",
    borderColor: "#1877F2",
    icon: SiFacebook,
  },
  {
    field: "tiktokUrl",
    label: "TikTok",
    inputLabel: "TikTok Profile URL",
    placeholder: "https://tiktok.com/@…",
    color: "#111111",
    borderColor: "#25F4EE",
    icon: SiTiktok,
  },
] as const;

export type GameSocialField = typeof GAME_SOCIAL_LINKS[number]["field"];

export function emptyGameSocialValues(): Record<GameSocialField, string> {
  return Object.fromEntries(GAME_SOCIAL_LINKS.map(({ field }) => [field, ""])) as Record<GameSocialField, string>;
}