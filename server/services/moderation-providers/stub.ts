import type { ModerationProvider, ProviderResult, ModerationContext } from "./types";

// Stub provider used until a real moderation vendor (e.g., AWS Rekognition,
// Sightengine) is wired in. Returns approved-by-default results and supports
// three override modes via env var MODERATION_STUB_MODE:
//   - "approve" (default): every scan returns no concerning labels
//   - "flag":              every scan returns a borderline Suggestive label
//   - "reject":            every scan returns a high-confidence Explicit Nudity label
//   - "error":             every scan throws, to exercise the fail-open path
// This lets us verify the full moderation pipeline end-to-end without spending
// cents on a real provider during development.
export class StubModerationProvider implements ModerationProvider {
  readonly name = "stub";

  async scanImage(_buffer: Buffer, _context: ModerationContext): Promise<ProviderResult> {
    const mode = (process.env.MODERATION_STUB_MODE || "approve").toLowerCase();

    if (mode === "error") {
      throw new Error("stub moderation provider: forced failure (MODERATION_STUB_MODE=error)");
    }

    if (mode === "reject") {
      return {
        providerName: this.name,
        labels: [
          { name: "Explicit Nudity", confidence: 98, parentName: "Nudity" },
        ],
      };
    }

    if (mode === "flag") {
      return {
        providerName: this.name,
        labels: [
          { name: "Suggestive", confidence: 75 },
        ],
      };
    }

    return { providerName: this.name, labels: [] };
  }
}
