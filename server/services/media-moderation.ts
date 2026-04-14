import { db } from "../db";
import { mediaModerationQueue, mediaModerationThresholds, type ModerationLabel } from "@shared/schema";
import type {
  ModerationContext,
  ModerationProvider,
  ModerationResult,
  ModerationStatus,
  ProviderRawLabel,
} from "./moderation-providers/types";
import { StubModerationProvider } from "./moderation-providers/stub";
import { RekognitionModerationProvider } from "./moderation-providers/rekognition";

const PROVIDER_TIMEOUT_MS = Number(process.env.MODERATION_TIMEOUT_MS || 5000);

// Baked-in fallback thresholds. The DB table overrides these when rows are present.
const DEFAULT_THRESHOLDS: Record<string, { reject: number; flag: number; gamingSuppressed: boolean }> = {
  "Explicit Nudity":            { reject: 90, flag: 60, gamingSuppressed: false },
  "Nudity":                     { reject: 90, flag: 60, gamingSuppressed: false },
  "Suggestive":                 { reject: 95, flag: 70, gamingSuppressed: false },
  "Graphic Violence Or Gore":   { reject: 90, flag: 60, gamingSuppressed: false },
  "Violence":                   { reject: 95, flag: 80, gamingSuppressed: true },
  "Weapons":                    { reject: 95, flag: 85, gamingSuppressed: true },
  "Weapon Violence":            { reject: 95, flag: 80, gamingSuppressed: true },
  "Hate Symbols":               { reject: 85, flag: 55, gamingSuppressed: false },
  "Visually Disturbing":        { reject: 90, flag: 65, gamingSuppressed: false },
  "Drugs & Tobacco":            { reject: 92, flag: 70, gamingSuppressed: false },
  "Gambling":                   { reject: 92, flag: 70, gamingSuppressed: false },
};

type ThresholdMap = Record<string, { reject: number; flag: number; gamingSuppressed: boolean }>;

function selectProvider(): ModerationProvider {
  const name = (process.env.MODERATION_PROVIDER || "stub").toLowerCase();
  switch (name) {
    case "stub":
      return new StubModerationProvider();
    case "rekognition":
    case "aws-rekognition":
      return new RekognitionModerationProvider();
    default:
      console.warn(`[moderation] Unknown MODERATION_PROVIDER=${name}, falling back to stub`);
      return new StubModerationProvider();
  }
}

// Small in-process cache so we don't hit the DB on every upload. Reset on admin edits.
let thresholdCache: { fetchedAt: number; map: ThresholdMap } | null = null;
const THRESHOLD_CACHE_TTL_MS = 60_000;

export function invalidateThresholdCache(): void {
  thresholdCache = null;
}

async function loadThresholds(): Promise<ThresholdMap> {
  if (thresholdCache && Date.now() - thresholdCache.fetchedAt < THRESHOLD_CACHE_TTL_MS) {
    return thresholdCache.map;
  }
  try {
    const rows = await db.select().from(mediaModerationThresholds);
    const map: ThresholdMap = { ...DEFAULT_THRESHOLDS };
    for (const row of rows) {
      map[row.label] = {
        reject: Number(row.rejectThreshold),
        flag: Number(row.flagThreshold),
        gamingSuppressed: row.gamingSuppressed,
      };
    }
    thresholdCache = { fetchedAt: Date.now(), map };
    return map;
  } catch (err) {
    // Table may not exist yet (pre-migration) — fall back to defaults.
    console.warn("[moderation] Could not load thresholds from DB, using defaults", err);
    return DEFAULT_THRESHOLDS;
  }
}

function classify(
  rawLabels: ProviderRawLabel[],
  thresholds: ThresholdMap,
  isGaming: boolean,
): { status: ModerationStatus; confidenceMax: number; matched: ModerationLabel[] } {
  let worst: ModerationStatus = "approved";
  let confidenceMax = 0;
  const matched: ModerationLabel[] = [];

  for (const label of rawLabels) {
    const cfg = thresholds[label.name];
    if (!cfg) continue;

    // Gameplay content: raise the bar on suppressible labels (Violence, Weapons).
    const rejectAt = cfg.gamingSuppressed && isGaming ? Math.max(cfg.reject, 97) : cfg.reject;
    const flagAt = cfg.gamingSuppressed && isGaming ? Math.max(cfg.flag, 92) : cfg.flag;

    if (label.confidence >= rejectAt) {
      worst = "rejected";
      confidenceMax = Math.max(confidenceMax, label.confidence);
      matched.push(label);
    } else if (label.confidence >= flagAt && worst !== "rejected") {
      worst = "flagged";
      confidenceMax = Math.max(confidenceMax, label.confidence);
      matched.push(label);
    }
  }

  return { status: worst, confidenceMax, matched };
}

async function runWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`moderation provider timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class MediaModerationService {
  private provider: ModerationProvider;

  constructor(provider?: ModerationProvider) {
    this.provider = provider ?? selectProvider();
  }

  get providerName(): string {
    return this.provider.name;
  }

  // Scan a single image buffer. Used for screenshots + avatars (sync pre-upload).
  async moderateImage(buffer: Buffer, context: ModerationContext): Promise<ModerationResult> {
    if ((process.env.MODERATION_ENABLED || "true").toLowerCase() === "false") {
      return this.approvedResult();
    }

    const thresholds = await loadThresholds();
    try {
      const raw = await runWithTimeout(this.provider.scanImage(buffer, context), PROVIDER_TIMEOUT_MS);
      const { status, confidenceMax, matched } = classify(raw.labels, thresholds, !!context.isGaming);
      return {
        status,
        confidenceMax,
        labels: matched.length ? matched : raw.labels,
        provider: raw.providerName,
        scannedAt: new Date(),
      };
    } catch (err) {
      console.error("[moderation] image scan failed, returning pending (fail-open)", err);
      return {
        status: "pending",
        confidenceMax: 0,
        labels: [],
        provider: this.provider.name,
        scannedAt: new Date(),
      };
    }
  }

  // Scan a sequence of frames (from video-processor.extractModerationFrames).
  // Returns the worst outcome across frames — any frame flagged flags the video.
  async moderateVideo(frames: Buffer[], context: ModerationContext): Promise<ModerationResult> {
    if ((process.env.MODERATION_ENABLED || "true").toLowerCase() === "false") {
      return this.approvedResult();
    }

    if (frames.length === 0) {
      return { ...this.approvedResult(), status: "pending" };
    }

    const thresholds = await loadThresholds();
    const aggregated: ProviderRawLabel[] = [];
    let failures = 0;

    for (const frame of frames) {
      try {
        const raw = await runWithTimeout(this.provider.scanImage(frame, context), PROVIDER_TIMEOUT_MS);
        aggregated.push(...raw.labels);
      } catch (err) {
        failures++;
        console.warn("[moderation] frame scan failed", err);
      }
    }

    // If every frame failed, surface as pending so it lands in the admin queue.
    if (failures === frames.length) {
      return {
        status: "pending",
        confidenceMax: 0,
        labels: [],
        provider: this.provider.name,
        scannedAt: new Date(),
      };
    }

    const { status, confidenceMax, matched } = classify(aggregated, thresholds, !!context.isGaming);
    return {
      status,
      confidenceMax,
      labels: matched.length ? matched : aggregated,
      provider: this.provider.name,
      scannedAt: new Date(),
    };
  }

  // Persist a review-queue entry for flagged / rejected / pending outcomes.
  // Skipped for approved results. Returns the queue id when inserted.
  async recordQueueEntry(
    result: ModerationResult,
    context: ModerationContext,
    contentId: number,
  ): Promise<number | null> {
    if (result.status === "approved") return null;

    const [row] = await db
      .insert(mediaModerationQueue)
      .values({
        contentType: context.contentType,
        contentId,
        userId: context.userId,
        status: "open",
        autoAction: result.status,
        labels: result.labels,
        confidenceMax: result.confidenceMax.toString(),
        provider: result.provider,
      })
      .returning({ id: mediaModerationQueue.id });

    return row?.id ?? null;
  }

  private approvedResult(): ModerationResult {
    return {
      status: "approved",
      confidenceMax: 0,
      labels: [],
      provider: this.provider.name,
      scannedAt: new Date(),
    };
  }
}

export const mediaModerationService = new MediaModerationService();
