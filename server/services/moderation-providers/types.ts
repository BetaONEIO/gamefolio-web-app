import type { ModerationLabel } from "@shared/schema";

export type ModerationStatus = "approved" | "flagged" | "rejected" | "pending" | "failed";

export interface ModerationContext {
  userId: number;
  contentType: "clip" | "screenshot" | "avatar" | "reel";
  contentId?: number;
  // If the content is gameplay (e.g., a clip from a known shooter), the service
  // raises the bar on Violence/Weapons labels. Upload routes set this when the
  // user has tagged the content with a game.
  isGaming?: boolean;
}

export interface ProviderRawLabel {
  name: string;
  confidence: number; // 0-100
  parentName?: string;
}

export interface ProviderResult {
  providerName: string;
  labels: ProviderRawLabel[];
}

export interface ModerationResult {
  status: ModerationStatus;
  labels: ModerationLabel[];
  provider: string;
  scannedAt: Date;
  // Highest confidence among labels that triggered the status change. Useful
  // for sorting the admin queue worst-first.
  confidenceMax: number;
}

// Implementations accept a raw image or frame buffer and return labels +
// confidences. Thresholding lives in media-moderation.ts so providers remain
// interchangeable.
export interface ModerationProvider {
  readonly name: string;
  scanImage(buffer: Buffer, context: ModerationContext): Promise<ProviderResult>;
}
