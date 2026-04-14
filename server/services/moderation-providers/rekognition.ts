import {
  RekognitionClient,
  DetectModerationLabelsCommand,
  type ModerationLabel as AwsModerationLabel,
} from "@aws-sdk/client-rekognition";
import type { ModerationProvider, ProviderResult, ModerationContext } from "./types";

// AWS Rekognition adapter using DetectModerationLabels.
// Free tier covers 5,000 image scans / month; after that ~$1 per 1,000 images.
// Video moderation is not used — the caller samples frames via ffmpeg and
// calls scanImage per frame, which is cheaper than Rekognition's video API.
//
// Required env vars:
//   AWS_REGION           (e.g., "us-east-1")
//   AWS_ACCESS_KEY_ID
//   AWS_SECRET_ACCESS_KEY
// On Vercel you can alternatively use OIDC role assumption; the AWS SDK
// reads the standard credential chain so no special setup is needed when
// deployed with an attached IAM role.
export class RekognitionModerationProvider implements ModerationProvider {
  readonly name = "aws-rekognition";
  private client: RekognitionClient;

  // Only count labels above this confidence as even potentially interesting.
  // The thresholding in media-moderation.ts applies the real flag/reject
  // cutoffs per label.
  private readonly MIN_CONFIDENCE = 50;

  constructor() {
    this.client = new RekognitionClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
  }

  async scanImage(buffer: Buffer, _context: ModerationContext): Promise<ProviderResult> {
    const response = await this.client.send(
      new DetectModerationLabelsCommand({
        Image: { Bytes: buffer },
        MinConfidence: this.MIN_CONFIDENCE,
      }),
    );

    const labels = (response.ModerationLabels ?? [])
      .filter((l): l is AwsModerationLabel & { Name: string; Confidence: number } =>
        typeof l.Name === "string" && typeof l.Confidence === "number",
      )
      .map((l) => ({
        name: l.Name,
        confidence: l.Confidence,
        parentName: l.ParentName || undefined,
      }));

    return { providerName: this.name, labels };
  }
}
