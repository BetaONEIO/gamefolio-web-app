import { z } from 'zod';
import type { RasterBorderCalibration } from './avatar-frame';
import type { ProfileThemeValues } from './profile-theme';

export const exportRequestSchema = z.object({
  type: z.enum(['profile', 'leaderboard', 'game']),
  id: z.number().int().positive(),
  background: z.string().regex(/^creative-studio\/[a-f0-9-]+\.png$/).optional(),
  top: z.union([z.literal(3), z.literal(5), z.literal(10)]).default(3),
  showXp: z.boolean().default(true),
  showRank: z.boolean().default(true),
  showAvatar: z.boolean().default(true),
  showUsername: z.boolean().default(true),
  showBadge: z.boolean().default(true),
}).strict();
export type ExportRequest = z.infer<typeof exportRequestSchema>;
export interface StudioProfile extends ProfileThemeValues {
  id: number; username: string; displayName: string; level: number; xp: number;
  avatar?: string; banner?: string; avatarBorder?: string; profileBorder?: string;
  frameCalibration?: RasterBorderCalibration;
  nameTag?: string; verificationBadge?: string;
  profileFont?: string | null; profileFontEffect?: string | null; profileFontColor?: string | null;
  stats?: { followers: number; posts: number; views: number };
}
export interface StudioComposition {
  request: ExportRequest;
  title: string; subtitle: string; filename: string;
  background?: string;
  profile?: StudioProfile;
  entries?: { rank: number; xp: number; profile: StudioProfile }[];
  game?: { id: number; name: string; image?: string };
  warnings: string[];
}
export function exportFilename(type: string, name: string) {
  const slug = name.normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'graphic';
  return `gamefolio-${type}-${slug.toLowerCase()}.png`;
}
