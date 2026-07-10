import type { IndieGameProfile, IndieGameFieldOverride } from "@shared/schema";

export type Profile = IndieGameProfile;
export type FieldMeta = Record<string, IndieGameFieldOverride & { isManualOverride: boolean }>;
export type SyncChange = { fieldName: string; currentValue: any; newValue: any; hasOverride: boolean };
export type SyncDecision = "keep" | "use" | "defer";
export type FieldType = "text" | "textarea" | "url" | "select" | "tag-array" | "url-array" | "platform-select";

export interface SharedFieldProps {
  profile: Profile | null;
  fieldMeta: FieldMeta;
  onSave: (fieldName: string, value: any) => void;
  onRevert: (fieldName: string) => void;
  isSaving: boolean;
}

export interface SectionWrapperProps extends SharedFieldProps {
  open: boolean;
  onToggle: () => void;
  filledCount: number;
  totalCount: number;
}

// Essential fields reflect the minimum for a useful public-facing profile
export const ESSENTIAL_FIELDS = ["gameName", "shortDescription", "headerImageUrl", "steamUrl", "epicUrl", "itchUrl"];
export const OPTIONAL_FIELDS = [
  "fullDescription", "releaseDate", "studioName", "studioFoundedYear", "studioTeamSize", "studioWebsite",
  "studioCountry", "genres", "tags", "platforms", "capsuleImageUrl", "trailerUrl", "screenshotUrls",
  "keyFeatures", "websiteUrl", "twitterUrl", "discordUrl", "price",
  "ageRating", "supportedLanguages", "contentDescriptors",
];

export const PLATFORM_OPTIONS = [
  { id: "windows", label: "Windows", icon: "Monitor" },
  { id: "mac", label: "macOS", icon: "Monitor" },
  { id: "linux", label: "Linux", icon: "Globe" },
  { id: "ps5", label: "PlayStation", icon: "Gamepad2" },
  { id: "xbox", label: "Xbox", icon: "Gamepad2" },
  { id: "switch", label: "Switch", icon: "Gamepad2" },
  { id: "ios", label: "iOS", icon: "Smartphone" },
  { id: "android", label: "Android", icon: "Smartphone" },
] as const;

export const RELEASE_STATUS_OPTIONS = [
  { value: "coming_soon", label: "Coming Soon" },
  { value: "early_access", label: "Early Access" },
  { value: "released", label: "Released" },
];

export const SOURCE_COLORS: Record<string, string> = {
  steam: "#66c0f4",
  epic: "#a855f7",
  itch: "#fa5c5c",
};

export function isFieldFilled(profile: Profile | null, field: string): boolean {
  if (!profile) return false;
  const val = (profile as any)[field];
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "boolean") return true;
  return val !== null && val !== undefined && val !== "";
}

export function formatFieldName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/Url$/, " URL")
    .replace(/Id$/, " ID")
    .trim();
}

export function formatValue(val: any): string {
  if (val === null || val === undefined || val === "") return "—";
  if (Array.isArray(val)) return val.length === 0 ? "—" : val.slice(0, 3).join(", ") + (val.length > 3 ? ` +${val.length - 3}` : "");
  if (typeof val === "boolean") return val ? "Yes" : "No";
  const s = String(val);
  return s.length > 80 ? s.slice(0, 77) + "…" : s;
}
